package com.example.Bakend.optimisation.categorisation;

import com.example.Bakend.dto.direction.SeuilsMl;
import com.example.Bakend.entity.CategorieProduit;
import com.example.Bakend.entity.ColisFeature;
import com.example.Bakend.entity.OptimisationRun;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.repository.CategorieProduitRepository;
import com.example.Bakend.repository.ColisFeatureRepository;
import com.example.Bakend.repository.OptimisationRunRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.Comparator;

/**
 * Infrence temps reel : assignation de categorie a un colis (V12 dynamique).
 * Parsing JSONB manuel (sans Jackson).
 *
 * Cascade :
 * 1. Regle seuils_ml (rapide, tracable)
 * 2. Fallback distance centroide (dernier run CLUSTERING)
 * 3. Defaut = classe majoritaire du tenant
 */
@Service
@Transactional
public class CategorisationInferenceService {

    private static final Logger log = LoggerFactory.getLogger(CategorisationInferenceService.class);

    private final CategorieProduitRepository categorieProduitRepository;
    private final ColisFeatureRepository colisFeatureRepository;
    private final OptimisationRunRepository optimisationRunRepository;

    public CategorisationInferenceService(CategorieProduitRepository categorieProduitRepository,
                                          ColisFeatureRepository colisFeatureRepository,
                                          OptimisationRunRepository optimisationRunRepository) {
        this.categorieProduitRepository = categorieProduitRepository;
        this.colisFeatureRepository = colisFeatureRepository;
        this.optimisationRunRepository = optimisationRunRepository;
    }

    /**
     * Prédit la classe d'un colis à partir de ses dimensions (sans colis persisté).
     * Utilisé pour la prédiction en temps réel lors de la création de commande.
     */
    public CategorieProduit predire(UUID tenantId, double poids, double volume, int fragilite, double valeur, boolean express) {
        List<CategorieProduit> categories = categorieProduitRepository
                .findByPmeClienteTenantIdAndActif(tenantId, true);
        if (categories.isEmpty()) return null;

        CategorieProduit matchRegle = matchByRegle(categories, poids, volume, fragilite, valeur, express);
        if (matchRegle != null) return matchRegle;

        CategorieProduit matchCentroide = matchByCentroid(tenantId, categories);
        if (matchCentroide != null) return matchCentroide;

        return categories.stream()
                .filter(c -> "B".equals(c.getClasseCode()))
                .findFirst()
                .orElse(categories.get(0));
    }

    /**
     * Categorise un colis existant dans colis_features.
     */
    public CategorieProduit categoriser(UUID tenantId, UUID colisId) {
        ColisFeature cf = colisFeatureRepository
                .findByColisColisIdAndPmeClienteTenantId(colisId, tenantId);
        if (cf == null || cf.getFragilite010() == null || cf.getValeurEstimeeAr() == null) {
            log.warn("Pas de features pour colis {} tenant {}", colisId, tenantId);
            return null;
        }

        double poids = cf.getColis().getPoidsKg().doubleValue();
        double volume = cf.getColis().getVolumeM3().doubleValue();
        int fragilite = cf.getFragilite010();
        double valeur = cf.getValeurEstimeeAr().doubleValue();
        boolean express = cf.getDelaiExpress();

        List<CategorieProduit> categories = categorieProduitRepository
                .findByPmeClienteTenantIdAndActif(tenantId, true);

        // 1. Regle seuils_ml (rapide)
        CategorieProduit matchRegle = matchByRegle(categories, poids, volume, fragilite, valeur, express);
        if (matchRegle != null) {
            updatePrediction(cf, matchRegle, BigDecimal.ZERO);
            log.debug("Colis {} matche par regle -> {}", colisId, matchRegle.getClasseCode());
            return matchRegle;
        }

        // 2. Fallback : distance au centroide le plus proche
        CategorieProduit matchCentroide = matchByCentroid(tenantId, categories);
        if (matchCentroide != null) {
            updatePrediction(cf, matchCentroide, BigDecimal.ONE);
            log.debug("Colis {} matche par centroide -> {}", colisId, matchCentroide.getClasseCode());
            return matchCentroide;
        }

        // 3. Defaut : classe B (standard)
        CategorieProduit defaut = categories.stream()
                .filter(c -> "B".equals(c.getClasseCode()))
                .findFirst()
                .orElse(categories.isEmpty() ? null : categories.get(0));
        if (defaut != null) {
            updatePrediction(cf, defaut, new BigDecimal("99.99"));
        }
        return defaut;
    }

    private CategorieProduit matchByRegle(List<CategorieProduit> categories,
                                          double poids, double volume, int fragilite,
                                          double valeur, boolean express) {
        // Trier par spécificité décroissante : plus de bornes non-null = testé en premier
        // Empêche B (Standard, tous-null) de capturer les colis qui matchent A ou C
        List<CategorieProduit> tries = categories.stream()
                .sorted(Comparator.comparingInt((CategorieProduit c) -> {
                    SeuilsMl s = SeuilsMl.fromJson(c.getSeuilsMl());
                    if (s == null) return 0;
                    int bornes = 0;
                    if (s.getPoidsMin() != null) bornes++;
                    if (s.getPoidsMax() != null) bornes++;
                    if (s.getVolumeMin() != null) bornes++;
                    if (s.getVolumeMax() != null) bornes++;
                    if (s.getFragiliteMin() != null) bornes++;
                    if (s.getFragiliteMax() != null) bornes++;
                    if (s.getValeurMin() != null) bornes++;
                    if (s.getValeurMax() != null) bornes++;
                    if (s.getDelaiMaxH() != null) bornes++;
                    return bornes;
                }).reversed())
                .toList();

        for (CategorieProduit cat : tries) {
            SeuilsMl seuils = SeuilsMl.fromJson(cat.getSeuilsMl());
            if (seuils != null && seuils.matches(poids, volume, fragilite, valeur, express)) {
                return cat;
            }
        }
        return null;
    }

    /**
     * Fallback : lit le cluster_mapping du dernier run CLUSTERING (JSONB, parsing manuel).
     */
    private CategorieProduit matchByCentroid(UUID tenantId, List<CategorieProduit> categories) {
        List<OptimisationRun> runs = optimisationRunRepository
                .findByPmeClienteTenantIdAndTypeAlgorithme(tenantId, TypeAlgorithme.CLUSTERING);
        if (runs.isEmpty()) return null;

        OptimisationRun lastRun = runs.get(runs.size() - 1);
        if (lastRun.getResultat() == null) return null;

        // Parser le JSONB resultat pour extraire cluster_mapping
        // Format : {"meilleur_k":3,"purete":0.85,...,"cluster_mapping":{"0":{"classeCode":"A","distance":0.08},...}}
        String json = lastRun.getResultat();
        String classeCode = extractFirstClasseCode(json);
        if (classeCode == null) return null;

        String finalCode = classeCode;
        return categories.stream()
                .filter(c -> finalCode.equals(c.getClasseCode()))
                .findFirst()
                .orElse(null);
    }

    /**
     * Extrait le premier classeCode du cluster_mapping dans le JSONB.
     * Parsing basique : cherche "classeCode":"X" dans le bloc cluster_mapping.
     */
    private String extractFirstClasseCode(String json) {
        int cmIdx = json.indexOf("\"cluster_mapping\"");
        if (cmIdx < 0) return null;

        // Trouver le premier "classeCode" apres cluster_mapping
        int codeIdx = json.indexOf("\"classeCode\"", cmIdx);
        if (codeIdx < 0) return null;

        int colonIdx = json.indexOf(":", codeIdx);
        int startQuote = json.indexOf("\"", colonIdx + 1);
        int endQuote = json.indexOf("\"", startQuote + 1);

        if (startQuote < 0 || endQuote < 0) return null;
        return json.substring(startQuote + 1, endQuote);
    }

    private void updatePrediction(ColisFeature cf, CategorieProduit predite, BigDecimal distance) {
        cf.setCategoriePredite(predite);
        cf.setDistancePrediction(distance);
        colisFeatureRepository.save(cf);
    }
}
