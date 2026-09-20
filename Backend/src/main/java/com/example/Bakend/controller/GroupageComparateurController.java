package com.example.Bakend.controller;

import com.example.Bakend.config.TenantContext;
import com.example.Bakend.optimisation.groupage.GroupageFfdClusterService;
import com.example.Bakend.optimisation.groupage.GroupageKnapsackService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Endpoint de comparaison FFD par cluster vs Knapsack iteratif.
 *
 * POST /api/optimisation/groupage/comparer?hubId={uuid}
 *
 * Lance les deux algorithmes en simulation pure (pas de Sac persiste)
 * et retourne cote a cote les resultats pour decision du gestionnaire.
 *
 * Le gestionnaire choisit ensuite via :
 * POST /api/optimisation/groupage/valider?runId={uuid}
 */
@RestController
@RequestMapping("/api/optimisation/groupage")
public class GroupageComparateurController {

    private static final Logger log = LoggerFactory.getLogger(GroupageComparateurController.class);

    private final GroupageFfdClusterService ffdClusterService;
    private final GroupageKnapsackService knapsackService;

    public GroupageComparateurController(GroupageFfdClusterService ffdClusterService,
                                          GroupageKnapsackService knapsackService) {
        this.ffdClusterService = ffdClusterService;
        this.knapsackService = knapsackService;
    }

    /**
     * Compare FFD par cluster vs Knapsack iteratif sur les memes donnees.
     *
     * POST /api/optimisation/groupage/comparer?hubId={uuid}
     */
    @PostMapping("/comparer")
    public ResponseEntity<Map<String, Object>> comparerGroupage(@RequestParam UUID hubId) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Comparaison groupage tenant {} hub {}", tenantId, hubId);

        try {
            // Option A : FFD par cluster
            GroupageFfdClusterService.FfdClusterResult ffdResult =
                    ffdClusterService.lancerFfdParCluster(tenantId, hubId);

            // Option B : Knapsack iteratif
            GroupageKnapsackService.KnapsackClusterResult ksResult =
                    knapsackService.lancerKnapsackParCluster(tenantId, hubId);

            // Determiner le gagnant par taux de remplissage moyen
            double tauxMoyenFfd = ffdResult.sacs().isEmpty() ? 0 :
                    ffdResult.sacs().stream()
                            .mapToDouble(GroupageFfdClusterService.FfdClusterSacInfo::tauxRemplissage)
                            .average().orElse(0);
            double tauxMoyenKs = ksResult.sacs().isEmpty() ? 0 :
                    ksResult.sacs().stream()
                            .mapToDouble(GroupageKnapsackService.KnapsackSacInfo::tauxRemplissage)
                            .average().orElse(0);

            String gagnant = "EQUAL";
            if (tauxMoyenKs > tauxMoyenFfd + 0.5) {
                gagnant = "KNAPSACK";
            } else if (tauxMoyenFfd > tauxMoyenKs + 0.5) {
                gagnant = "FFD";
            }

            double deltaTaux = Math.round((tauxMoyenKs - tauxMoyenFfd) * 100.0) / 100.0;

            // Construire la reponse
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("hub_id", hubId.toString());

            // FFD
            Map<String, Object> ffdMap = new LinkedHashMap<>();
            ffdMap.put("algo", ffdResult.algo());
            ffdMap.put("run_id", ffdResult.runId() != null ? ffdResult.runId().toString() : null);
            ffdMap.put("nb_sacs", ffdResult.sacs().size());
            ffdMap.put("nb_colis_groupes", ffdResult.nbColisGroupes());
            ffdMap.put("nb_colis_totaux", ffdResult.nbColisTotaux());
            ffdMap.put("taux_moyen", Math.round(tauxMoyenFfd * 100.0) / 100.0);
            ffdMap.put("duree_ms", ffdResult.dureeMs());
            ffdMap.put("sacs", ffdResult.sacs().stream().map(s -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("cluster", s.cluster());
                m.put("nb_colis", s.nbColis());
                m.put("taux_remplissage", s.tauxRemplissage());
                m.put("poids_kg", s.poidsTotalKg());
                m.put("volume_m3", s.volumeTotalM3());
                m.put("date_depart", s.dateDepartPlafond().toString());
                m.put("depart_force", s.departForce());
                return m;
            }).toList());
            ffdMap.put("justification", ffdResult.justification());
            response.put("ffd", ffdMap);

            // Knapsack
            Map<String, Object> ksMap = new LinkedHashMap<>();
            ksMap.put("algo", ksResult.algo());
            ksMap.put("run_id", ksResult.runId() != null ? ksResult.runId().toString() : null);
            ksMap.put("nb_sacs", ksResult.sacs().size());
            ksMap.put("nb_colis_groupes", ksResult.nbColisGroupes());
            ksMap.put("nb_colis_totaux", ksResult.nbColisTotaux());
            ksMap.put("taux_moyen", Math.round(tauxMoyenKs * 100.0) / 100.0);
            ksMap.put("duree_ms", ksResult.dureeMs());
            ksMap.put("scale", ksResult.parametres().get("scale"));
            ksMap.put("fallback_ffd", ksResult.parametres().get("fallback_ffd"));
            ksMap.put("sacs", ksResult.sacs().stream().map(s -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("cluster", s.cluster());
                m.put("nb_colis", s.nbColis());
                m.put("taux_remplissage", s.tauxRemplissage());
                m.put("poids_kg", s.poidsTotalKg());
                m.put("volume_m3", s.volumeTotalM3());
                m.put("date_depart", s.dateDepartPlafond().toString());
                m.put("depart_force", s.departForce());
                m.put("valeur_optimale", s.valeurOptimale());
                m.put("fallback_ffd", s.fallbackFfd());
                return m;
            }).toList());
            ksMap.put("justification", ksResult.justification());
            response.put("knapsack", ksMap);

            // Comparaison
            Map<String, Object> comparison = new LinkedHashMap<>();
            comparison.put("gagnant", gagnant);
            comparison.put("delta_taux_moyen", deltaTaux);
            comparison.put("delta_duree_ms", ffdResult.dureeMs() - ksResult.dureeMs());
            comparison.put("delta_nb_sacs", ffdResult.sacs().size() - ksResult.sacs().size());
            response.put("comparaison", comparison);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Comparaison echouee tenant {} hub {}", tenantId, hubId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }
}
