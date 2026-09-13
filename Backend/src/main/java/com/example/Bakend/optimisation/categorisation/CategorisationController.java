package com.example.Bakend.optimisation.categorisation;

import com.example.Bakend.config.TenantContext;
import com.example.Bakend.entity.OptimisationRun;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.Hub;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.repository.OptimisationRunRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.HubRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * API de catégorisation non supervisée des colis.
 *
 * POST /api/optimisation/categorisation — lance le clustering K-Means sur le dataset mock
 *
 * Les résultats sont tracés dans optimisation_run (type CLUSTERING, JSONB resultat)
 * si le contexte tenant est disponible.
 */
@RestController
@RequestMapping("/api/optimisation/categorisation")
public class CategorisationController {

    private static final Logger log = LoggerFactory.getLogger(CategorisationController.class);

    private final CategorisationService categorisationService;
    private final OptimisationRunRepository optimisationRunRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final HubRepository hubRepository;

    public CategorisationController(CategorisationService categorisationService,
                                     OptimisationRunRepository optimisationRunRepository,
                                     PMEClienteRepository pmeClienteRepository,
                                     HubRepository hubRepository) {
        this.categorisationService = categorisationService;
        this.optimisationRunRepository = optimisationRunRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.hubRepository = hubRepository;
    }

    /**
     * Lance le clustering non supervisé sur le dataset mock.
     * Trace le run dans optimisation_run pour audit si contexte tenant dispo.
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> runClustering() {
        log.info("Demande de clustering reçue");

        try {
            CategorisationResult result = categorisationService.runClustering();

            // Persistance du run d'optimisation (si tenant + hub disponibles)
            persistRunIfPossible(result);

            // Réponse API
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("meilleur_k", result.getMeilleurK());
            response.put("nb_colis", result.getNbColis());
            response.put("k_testes", result.getKTestes());
            response.put("inertie", result.getInertie());
            response.put("silhouette", result.getSilhouette());
            response.put("davies_bouldin", result.getDaviesBouldin());
            response.put("centroides", result.getCentroides());
            response.put("cluster_labels", result.getClusterLabels());
            response.put("confusion_matrix", result.getConfusionMatrix());
            response.put("categories_uniques", result.getCategoriesUniques());
            response.put("purete", result.getPurete());
            response.put("affectations", result.getAffectations());
            response.put("duree_calcul_ms", result.getDureeCalculMs());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Erreur clustering", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()
            ));
        }
    }

    private void persistRunIfPossible(CategorisationResult result) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) return;

        try {
            PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId).orElse(null);
            List<Hub> hubs = hubRepository.findByPmeClienteTenantId(tenantId);
            Hub hub = hubs.isEmpty() ? null : hubs.get(0);

            if (tenant == null || hub == null) return;

            OptimisationRun run = new OptimisationRun();
            run.setPmeCliente(tenant);
            run.setHub(hub);
            run.setTypeAlgorithme(TypeAlgorithme.CLUSTERING);

            // parametres JSONB
            run.setParametres("{\"k_testes\":[3,4,5],\"features\":[\"poids\",\"volume\",\"log1p(valeur)\",\"fragilite\",\"delai\"],\"preprocessing\":\"log1p(valeur)+standardizer\",\"source\":\"csv_mock\"}");

            // resultat JSONB
            int idx = result.getKTestes().indexOf(result.getMeilleurK());
            double silVal = idx >= 0 ? result.getSilhouette().get(idx) : 0;
            run.setResultat("{\"meilleur_k\":" + result.getMeilleurK()
                    + ",\"purete\":" + result.getPurete()
                    + ",\"silhouette\":" + silVal
                    + ",\"nb_colis\":" + result.getNbColis() + "}");

            run.setDureeCalculMs((int) result.getDureeCalculMs());
            run.setJustificationDocument(
                    "Clustering non supervisé K-Means sur " + result.getNbColis() + " colis. " +
                    "Meilleur k=" + result.getMeilleurK() +
                    " (silhouette=" + silVal + ", pureté=" + result.getPurete() + "). " +
                    "Features : poids, volume, log1p(valeur), fragilité, délai. " +
                    "Catégorie déclarée exclue de l'input (validation uniquement)."
            );

            optimisationRunRepository.save(run);
            log.info("Run CLUSTERING #{} persisté pour tenant {}", run.getRunId(), tenantId);
        } catch (Exception e) {
            log.warn("Persistance run clustering échouée (non bloquant): {}", e.getMessage());
        }
    }
}
