package com.example.Bakend.optimisation.affectation;

import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.SacStatut;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.entity.enums.VehiculeStatut;
import com.example.Bakend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Phase 5 — Affectation bipartite chauffeur × vehicule.
 *
 * Algorithme glouton V1 :
 *   1. Trier les sacs par nbColis descendant (sacs les plus pleins d'abord)
 *   2. Pour chaque sac, trouver toutes les paires (chauffeur, vehicule) autorisees
 *      via PermisService (permis, PTAC, type, matrice, habilite, dispo)
 *   3. Choisir la paire qui maximise compat(s,p) - λ * |ecart_charge|
 *   4. Marquer le chauffeur comme utilise (1 chauffeur = 1 sac max)
 *   5. Persister : sac.chauffeur, sac.vehicule, sac.runAffectation, sac.statut = AFFECTE
 *
 * Formule : max ΣΣ compat(s,p)·y(s,p) - λ·ecart_charge
 *   s.c. Σ_p y(s,p) = 1 par sac ; Σ_s y(s,p) ≤ 1 par paire ; y=0 si non autorise
 *
 * V2 : hongrois si > 20 sacs.
 */
@Service
public class AffectationService {

    private static final Logger log = LoggerFactory.getLogger(AffectationService.class);
    private static final double LAMBDA = 0.1;

    private final SacRepository sacRepository;
    private final ChauffeurRepository chauffeurRepository;
    private final VehiculeRepository vehiculeRepository;
    private final CompatibiliteChauffeurVehiculeRepository compatibiliteRepository;
    private final OptimisationRunRepository optimisationRunRepository;
    private final PMEClienteRepository pmeClienteRepository;

    public AffectationService(SacRepository sacRepository,
                               ChauffeurRepository chauffeurRepository,
                               VehiculeRepository vehiculeRepository,
                               CompatibiliteChauffeurVehiculeRepository compatibiliteRepository,
                               OptimisationRunRepository optimisationRunRepository,
                               PMEClienteRepository pmeClienteRepository) {
        this.sacRepository = sacRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.compatibiliteRepository = compatibiliteRepository;
        this.optimisationRunRepository = optimisationRunRepository;
        this.pmeClienteRepository = pmeClienteRepository;
    }

    public record AffectationResult(
            UUID runId,
            List<AffectationDetail> affectations,
            int nbSacsAffectes,
            int nbSacsNonAffectes,
            String justification
    ) {}

    public record AffectationDetail(
            UUID sacId,
            UUID chauffeurId,
            String chauffeurNom,
            UUID vehiculeId,
            String immatriculation,
            boolean affecte,
            String motifRefus
    ) {}

    /**
     * Affecte les sacs aux chauffeurs × vehicules.
     *
     * @param tenantId ID du tenant (isolation multi-tenant)
     * @param hubId    ID du hub cible
     * @return AffectationResult avec les details de chaque affectation
     */
    @Transactional
    public AffectationService.AffectationResult affecter(UUID tenantId, UUID hubId) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant introuvable : " + tenantId));

        // 1. Charger les sacs CONSTITUE du hub
        List<Sac> sacs = sacRepository.rechercherParHubEtStatut(tenantId, hubId, SacStatut.CONSTITUE);
        if (sacs.isEmpty()) {
            return new AffectationResult(null, List.of(), 0, 0,
                    "Aucun sac en attente d'affectation pour ce hub.");
        }

        // 2. Charger les chauffeurs disponibles (rattaches au tenant, statutDossier=VALIDE)
        List<Chauffeur> chauffeurs = chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId)
                .stream()
                .filter(c -> "VALIDEE".equals(c.getStatutDossier()))
                .collect(Collectors.toList());

        // 3. Charger les vehicules DISPONIBLES du hub
        List<Vehicule> vehicules = vehiculeRepository.rechercherDisponiblesParHub(
                        tenantId, hubId, VehiculeStatut.DISPONIBLE);

        // 4. Charger la matrice de compatibilite
        Map<UUID, Map<UUID, Boolean>> matrice = chargerMatrice(tenantId);

        // 5. Trier les sacs par nbColis descendant (sacs les plus pleins d'abord)
        sacs.sort(Comparator.comparingInt((Sac s) -> s.getColis().size()).reversed());

        // 6. Glouton : affecter chaque sac
        Set<UUID> chauffeursUtilises = new HashSet<>();
        List<AffectationDetail> details = new ArrayList<>();
        int nbAffectes = 0;
        int nbNonAffectes = 0;

        double chargeTotaleMoyenne = calculerChargeMoyenne(sacs);

        for (Sac sac : sacs) {
            String catDom = sac.getCategorieDominante() != null ? sac.getCategorieDominante() : "STANDARD";

            // Calculer poids/volume total du sac
            Double poidsSac = null;
            Double volumeSac = null;
            if (sac.getColis() != null && !sac.getColis().isEmpty()) {
                poidsSac = sac.getColis().stream()
                        .mapToDouble(c -> c.getPoidsKg() != null ? c.getPoidsKg().doubleValue() : 0).sum();
                volumeSac = sac.getColis().stream()
                        .mapToDouble(c -> c.getVolumeM3() != null ? c.getVolumeM3().doubleValue() : 0).sum();
            }

            // Trouver la meilleure paire autorisee
            Optional<AffectationDetail> meilleur = Optional.empty();
            double meilleurScore = Double.NEGATIVE_INFINITY;

            for (Chauffeur ch : chauffeurs) {
                if (chauffeursUtilises.contains(ch.getChauffeurId())) continue;

                for (Vehicule v : vehicules) {
                    PermisService.Autorisation auth = PermisService.verifier(
                            ch, v, matrice, catDom, poidsSac, volumeSac);

                    if (!auth.autorise()) continue;

                    // Calculer le score : compat - λ * |ecart_charge|
                    double compat = 1.0; // si autorise, compat = 1
                    double ecartCharge = Math.abs(sac.getColis().size() - chargeTotaleMoyenne);
                    double score = compat - LAMBDA * ecartCharge;

                    if (score > meilleurScore) {
                        meilleurScore = score;
                        meilleur = Optional.of(new AffectationDetail(
                                sac.getSacId(),
                                ch.getChauffeurId(),
                                ch.getUtilisateur() != null ? ch.getUtilisateur().getNom() : "N/A",
                                v.getVehiculeId(),
                                v.getImmatriculation(),
                                true,
                                null));
                    }
                }
            }

            if (meilleur.isPresent()) {
                AffectationDetail d = meilleur.get();
                details.add(d);

                // Persiste l'affectation
                sac.setChauffeur(chauffeurRepository.findById(d.chauffeurId()).orElse(null));
                sac.setVehicule(vehiculeRepository.findById(d.vehiculeId()).orElse(null));
                sac.setStatut(SacStatut.AFFECTE);
                sacRepository.save(sac);

                chauffeursUtilises.add(d.chauffeurId());
                nbAffectes++;
            } else {
                details.add(new AffectationDetail(
                        sac.getSacId(), null, null, null, null,
                        false, "Aucune paire chauffeur-vehicule autorisee."));
                nbNonAffectes++;
            }
        }

        // 7. Persister OptimisationRun
        String justification = buildJustification(details, sacs.size(), nbAffectes, nbNonAffectes);

        OptimisationRun run = new OptimisationRun();
        run.setPmeCliente(tenant);
        run.setHub(new Hub());
        run.getHub().setHubId(hubId);
        run.setTypeAlgorithme(TypeAlgorithme.AFFECTATION);
        run.setParametres(buildParametresJson(sacs.size(), chauffeurs.size(), vehicules.size()));
        run.setResultat(buildResultatJson(details));
        run.setJustificationDocument(justification);
        run.setDureeCalculMs(0);
        optimisationRunRepository.save(run);

        // Lier les sacs au runAffectation
        for (Sac sac : sacs) {
            if (sac.getStatut() == SacStatut.AFFECTE) {
                sac.setRunAffectation(run);
                sacRepository.save(sac);
            }
        }

        log.info("Affectation hub {} : {}/{} sacs affectes, run {}", hubId, nbAffectes, sacs.size(), run.getRunId());

        return new AffectationResult(run.getRunId(), details, nbAffectes, nbNonAffectes, justification);
    }

    // ── Utilitaires ──

    private Map<UUID, Map<UUID, Boolean>> chargerMatrice(UUID tenantId) {
        Map<UUID, Map<UUID, Boolean>> matrice = new HashMap<>();
        List<CompatibiliteChauffeurVehicule> compatList = compatibiliteRepository.findByPmeClienteTenantId(tenantId);
        for (CompatibiliteChauffeurVehicule c : compatList) {
            matrice.computeIfAbsent(c.getChauffeurId(), k -> new HashMap<>())
                    .put(c.getVehiculeId(), c.isCompatible());
        }
        return matrice;
    }

    private double calculerChargeMoyenne(List<Sac> sacs) {
        if (sacs.isEmpty()) return 0;
        int totalColis = sacs.stream().mapToInt(s -> s.getColis().size()).sum();
        return (double) totalColis / sacs.size();
    }

    private String buildJustification(List<AffectationDetail> details, int totalSacs,
                                       int nbAffectes, int nbNonAffectes) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== Phase 5 : Affectation bipartite chauffeur x vehicule ===\n\n");
        sb.append("Algorithme : glouton V1 (meilleure paire autorisee)\n");
        sb.append("Formule : max ΣΣ compat(s,p)·y(s,p) - λ·ecart_charge\n");
        sb.append("λ = ").append(LAMBDA).append("\n\n");
        sb.append("Sacs : ").append(totalSacs).append(" total\n");
        sb.append("Affectes : ").append(nbAffectes).append("\n");
        sb.append("Non affectes : ").append(nbNonAffectes).append("\n\n");

        for (AffectationDetail d : details) {
            sb.append("Sac ").append(d.sacId()).append(" : ");
            if (d.affecte()) {
                sb.append("CHAUFFEUR=").append(d.chauffeurNom())
                        .append(" (").append(d.chauffeurId()).append(")")
                        .append(" / VEHICULE=").append(d.immatriculation())
                        .append(" (").append(d.vehiculeId()).append(")");
            } else {
                sb.append("NON AFFECTE — ").append(d.motifRefus());
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    private String buildParametresJson(int nbSacs, int nbChauffeurs, int nbVehicules) {
        return "{" +
                "\"nb_sacs\":" + nbSacs +
                ",\"nb_chauffeurs\":" + nbChauffeurs +
                ",\"nb_vehicules\":" + nbVehicules +
                ",\"lambda\":" + LAMBDA +
                ",\"algo\":\"GLOUTON_V1\"" +
                "}";
    }

    private String buildResultatJson(List<AffectationDetail> details) {
        StringBuilder sb = new StringBuilder("{\"affectations\":[");
        for (int i = 0; i < details.size(); i++) {
            if (i > 0) sb.append(",");
            AffectationDetail d = details.get(i);
            sb.append("{");
            sb.append("\"sac_id\":\"").append(d.sacId()).append("\"");
            if (d.affecte()) {
                sb.append(",\"chauffeur_id\":\"").append(d.chauffeurId()).append("\"");
                sb.append(",\"vehicule_id\":\"").append(d.vehiculeId()).append("\"");
            }
            sb.append(",\"affecte\":").append(d.affecte());
            if (d.motifRefus() != null) {
                sb.append(",\"motif_refus\":\"").append(d.motifRefus().replace("\"", "\\\"")).append("\"");
            }
            sb.append("}");
        }
        sb.append("]}");
        return sb.toString();
    }
}
