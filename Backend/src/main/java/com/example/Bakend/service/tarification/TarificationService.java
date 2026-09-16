package com.example.Bakend.service.tarification;

import com.example.Bakend.dto.demande.DemandeColisRequest;
import com.example.Bakend.dto.demande.DemandeDevisRequest;
import com.example.Bakend.dto.demande.DemandeDevisResponse;
import com.example.Bakend.entity.CategorieProduit;
import com.example.Bakend.entity.GrilleTarifaire;
import com.example.Bakend.entity.Hub;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.maps.DistanceProvider;
import com.example.Bakend.repository.CategorieProduitRepository;
import com.example.Bakend.repository.GrilleTarifaireRepository;
import com.example.Bakend.repository.HubRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Service de tarification V16 — calcul par grille reliée à catégorie + distance tournée 3 segments.
 *
 * Résolution par colis :
 *   grille = grille active liée à la catégorie du colis, sinon grille de repli global (categorie NULL)
 *   tarif = MAX(Σ(poids×prix_kg + volume×prix_m3) + dist×MAX(prix_km), MAX(prix_minimum))
 *           × 1.10 si assurance × 1.25 si express
 *
 * Erreur explicite si aucun tarif applicable.
 * Distance : Haversine vol d'oiseau × 1.35 (route 3 segments : hub→collecte→livraison→hub).
 * OsrmDistanceProvider branchable plus tard sans toucher les appelants.
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class TarificationService {

    private final GrilleTarifaireRepository grilleTarifaireRepository;
    private final CategorieProduitRepository categorieProduitRepository;
    private final HubRepository hubRepository;
    private final DistanceProvider distanceProvider;

    public TarificationService(GrilleTarifaireRepository grilleTarifaireRepository,
                               CategorieProduitRepository categorieProduitRepository,
                               HubRepository hubRepository,
                               DistanceProvider distanceProvider) {
        this.grilleTarifaireRepository = grilleTarifaireRepository;
        this.categorieProduitRepository = categorieProduitRepository;
        this.hubRepository = hubRepository;
        this.distanceProvider = distanceProvider;
    }

    // ========================================================================
    // DEVIS
    // ========================================================================

    public DemandeDevisResponse calculerDevis(UUID tenantId, DemandeDevisRequest request) {
        List<DemandeDevisRequest.DevisColisRequest> colisList =
                request.colis() != null ? request.colis() : List.of();

        if (colisList.isEmpty()) {
            throw new BusinessException("La commande doit contenir au moins un colis", 400);
        }

        // Résoudre le hub et calculer la distance tournée 3 segments
        double[] hubCoords = resoudreHubCoords(tenantId, request.hubId());
        BigDecimal distanceKm = distanceProvider.calculerTourneeKm(
                hubCoords[0], hubCoords[1],
                safeDouble(request.latitudeCollecte()), safeDouble(request.longitudeCollecte()),
                safeDouble(request.latitudeLivraison()), safeDouble(request.longitudeLivraison()));

        // Résoudre la grille de repli global (une seule pour le tenant)
        GrilleTarifaire grilleRepli = grilleTarifaireRepository
                .findByPmeClienteTenantIdAndCategorieIsNullAndActifTrue(tenantId)
                .orElse(null);

        // Résoudre les catégories
        Map<UUID, CategorieProduit> categoriesParId = resoudreCategories(tenantId, colisList);

        // Résoudre les grilles par colis
        Map<UUID, GrilleTarifaire> grillesParColis = new LinkedHashMap<>();
        for (DemandeDevisRequest.DevisColisRequest c : colisList) {
            GrilleTarifaire grille = resoudreGrille(tenantId, c.categorieId(), grilleRepli);
            grillesParColis.put(c.categorieId() != null ? c.categorieId() : UUID.randomUUID(), grille);
        }

        // Regrouper colis par grille utilisée (pour calcul groupé)
        Map<UUID, List<DemandeDevisRequest.DevisColisRequest>> parGrille = new LinkedHashMap<>();
        for (DemandeDevisRequest.DevisColisRequest c : colisList) {
            UUID grilleKey = c.categorieId() != null ? c.categorieId() : UUID.randomUUID();
            parGrille.computeIfAbsent(grilleKey, k -> new ArrayList<>()).add(c);
        }

        // Calculer par grille
        List<DemandeDevisResponse.DetailCategorie> details = new ArrayList<>();
        BigDecimal totalColis = BigDecimal.ZERO;
        BigDecimal maxPrixMinimum = BigDecimal.ZERO;
        BigDecimal maxPrixKm = BigDecimal.ZERO;

        for (Map.Entry<UUID, List<DemandeDevisRequest.DevisColisRequest>> entry : parGrille.entrySet()) {
            UUID grilleKey = entry.getKey();
            List<DemandeDevisRequest.DevisColisRequest> colisGrp = entry.getValue();
            GrilleTarifaire grille = grillesParColis.get(grilleKey);

            BigDecimal prixKg = safe(grille != null ? grille.getPrixParKg() : null);
            BigDecimal prixM3 = safe(grille != null ? grille.getPrixParM3() : null);
            BigDecimal prixKm = safe(grille != null ? grille.getPrixParKm() : null);
            BigDecimal prixMin = safe(grille != null ? grille.getPrixMinimum() : null);

            BigDecimal poidsTotal = colisGrp.stream()
                    .map(c -> safe(c.poidsKg()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal volumeTotal = colisGrp.stream()
                    .map(c -> safe(c.volumeM3()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal partPoids = poidsTotal.multiply(prixKg);
            BigDecimal partVolume = volumeTotal.multiply(prixM3);
            BigDecimal partCategorie = partPoids.add(partVolume);

            maxPrixMinimum = maxPrixMinimum.max(prixMin);
            maxPrixKm = maxPrixKm.max(prixKm);
            totalColis = totalColis.add(partCategorie);

            // Nom de la catégorie
            CategorieProduit cat = categoriesParId.get(grilleKey);
            String catLabel = grille != null && grille.getCategorie() != null
                    ? grille.getCategorie().getLibelle()
                    : (cat != null ? cat.getLibelle() : "Repli global");
            String classeCode = grille != null && grille.getCategorie() != null
                    ? grille.getCategorie().getClasseCode()
                    : (cat != null ? cat.getClasseCode() : "-");

            details.add(new DemandeDevisResponse.DetailCategorie(
                    catLabel, classeCode, colisGrp.size(),
                    poidsTotal, volumeTotal, partPoids, partVolume, partCategorie
            ));
        }

        // Part distance
        BigDecimal partDistance = distanceKm.multiply(maxPrixKm);

        // Total brut
        BigDecimal base = totalColis.add(partDistance);
        BigDecimal tarif = base.max(maxPrixMinimum);

        // Assurances / express
        if (request.assurance()) tarif = tarif.multiply(new BigDecimal("1.10"));
        if (request.express()) tarif = tarif.multiply(new BigDecimal("1.25"));
        tarif = tarif.setScale(2, RoundingMode.HALF_UP);

        return new DemandeDevisResponse(
                tarif, "Tarification tournée 3 segments (V16)",
                null, null, null,
                distanceKm.setScale(2, RoundingMode.HALF_UP),
                details, maxPrixMinimum
        );
    }

    // ========================================================================
    // CRÉATION
    // ========================================================================

    public ResultatTarification calculerPourCreation(UUID tenantId,
                                                     UUID hubId,
                                                     List<DemandeColisRequest> colisList,
                                                     boolean assurance, boolean express,
                                                     Double latCollecte, Double lonCollecte,
                                                     Double latLivraison, Double lonLivraison) {
        double[] hubCoords = resoudreHubCoords(tenantId, hubId);
        BigDecimal distanceKm = distanceProvider.calculerTourneeKm(
                hubCoords[0], hubCoords[1],
                safeDouble(latCollecte), safeDouble(lonCollecte),
                safeDouble(latLivraison), safeDouble(lonLivraison));

        GrilleTarifaire grilleRepli = grilleTarifaireRepository
                .findByPmeClienteTenantIdAndCategorieIsNullAndActifTrue(tenantId)
                .orElse(null);

        Map<UUID, CategorieProduit> categoriesParId = new HashMap<>();
        for (DemandeColisRequest c : colisList) {
            if (c.categorieId() != null && !categoriesParId.containsKey(c.categorieId())) {
                categorieProduitRepository
                        .findByPmeClienteTenantIdAndCategorieId(tenantId, c.categorieId())
                        .ifPresent(cat -> categoriesParId.put(c.categorieId(), cat));
            }
        }

        BigDecimal totalColis = BigDecimal.ZERO;
        BigDecimal maxPrixMinimum = BigDecimal.ZERO;
        BigDecimal maxPrixKm = BigDecimal.ZERO;

        for (DemandeColisRequest c : colisList) {
            GrilleTarifaire grille = resoudreGrille(tenantId, c.categorieId(), grilleRepli);
            BigDecimal prixKg = safe(grille != null ? grille.getPrixParKg() : null);
            BigDecimal prixM3 = safe(grille != null ? grille.getPrixParM3() : null);
            BigDecimal prixKm = safe(grille != null ? grille.getPrixParKm() : null);
            BigDecimal prixMin = safe(grille != null ? grille.getPrixMinimum() : null);

            BigDecimal poids = safe(c.poidsKg());
            BigDecimal volume = safe(c.volumeM3());
            totalColis = totalColis.add(poids.multiply(prixKg).add(volume.multiply(prixM3)));
            maxPrixMinimum = maxPrixMinimum.max(prixMin);
            maxPrixKm = maxPrixKm.max(prixKm);
        }

        BigDecimal partDistance = distanceKm.multiply(maxPrixKm);
        BigDecimal base = totalColis.add(partDistance);
        BigDecimal tarif = base.max(maxPrixMinimum);

        if (assurance) tarif = tarif.multiply(new BigDecimal("1.10"));
        if (express) tarif = tarif.multiply(new BigDecimal("1.25"));
        tarif = tarif.setScale(2, RoundingMode.HALF_UP);

        return new ResultatTarification(tarif, distanceKm);
    }

    // ========================================================================
    // RÉSOLUTION GRILLE
    // ========================================================================

    /**
     * Résout la grille applicable pour un colis donné.
     * 1. Grille active liée à la catégorie
     * 2. Grille de repli global (catégorie NULL)
     * 3. Erreur explicite si aucune
     */
    private GrilleTarifaire resoudreGrille(UUID tenantId, UUID categorieId, GrilleTarifaire grilleRepli) {
        if (categorieId != null) {
            Optional<GrilleTarifaire> grille = grilleTarifaireRepository
                    .findByPmeClienteTenantIdAndCategorieCategorieIdAndActifTrue(tenantId, categorieId);
            if (grille.isPresent()) {
                return grille.get();
            }
        }

        if (grilleRepli != null) {
            return grilleRepli;
        }

        throw new BusinessException(
                "Aucune grille tarifaire active pour cette catégorie. " +
                "Configurez une grille dans Paramètres > Tarifs ou une grille de repli global.",
                422);
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Résout les coords du hub (latitude, longitude). Si le hub n'a pas de coords, retourne [0,0].
     */
    private double[] resoudreHubCoords(UUID tenantId, UUID hubId) {
        if (hubId == null) {
            return new double[]{0, 0};
        }
        return hubRepository.findByPmeClienteTenantIdAndHubId(tenantId, hubId)
                .map(h -> new double[]{
                        h.getLatitude() != null ? h.getLatitude() : 0,
                        h.getLongitude() != null ? h.getLongitude() : 0
                })
                .orElse(new double[]{0, 0});
    }

    private static double safeDouble(Double val) {
        return val != null ? val : 0;
    }

    private Map<UUID, CategorieProduit> resoudreCategories(UUID tenantId,
                                                           List<DemandeDevisRequest.DevisColisRequest> colisList) {
        Map<UUID, CategorieProduit> result = new HashMap<>();
        Set<UUID> catIds = colisList.stream()
                .map(DemandeDevisRequest.DevisColisRequest::categorieId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        for (UUID catId : catIds) {
            categorieProduitRepository
                    .findByPmeClienteTenantIdAndCategorieId(tenantId, catId)
                    .ifPresent(cat -> result.put(catId, cat));
        }
        return result;
    }

    private static BigDecimal safe(BigDecimal val) {
        return val != null ? val : BigDecimal.ZERO;
    }

    public record ResultatTarification(BigDecimal tarif, BigDecimal distanceKm) {}
}
