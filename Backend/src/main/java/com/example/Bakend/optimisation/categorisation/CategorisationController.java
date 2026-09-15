package com.example.Bakend.optimisation.categorisation;

import com.example.Bakend.config.TenantContext;
import com.example.Bakend.entity.OptimisationRun;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.repository.OptimisationRunRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * API de categorisation non supervisee des colis (V12 dynamique).
 * Serialisation JSONB manuelle (sans Jackson).
 */
@RestController
@RequestMapping("/api/optimisation/categorisation")
public class CategorisationController {

    private static final Logger log = LoggerFactory.getLogger(CategorisationController.class);

    private final CategorisationService categorisationService;
    private final OptimisationRunRepository optimisationRunRepository;
    private final PMEClienteRepository pmeClienteRepository;

    public CategorisationController(CategorisationService categorisationService,
                                     OptimisationRunRepository optimisationRunRepository,
                                     PMEClienteRepository pmeClienteRepository) {
        this.categorisationService = categorisationService;
        this.optimisationRunRepository = optimisationRunRepository;
        this.pmeClienteRepository = pmeClienteRepository;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> runClustering() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Contexte tenant manquant"));
        }

        log.info("Demande clustering tenant {}", tenantId);

        try {
            CategorisationResult result = categorisationService.runClustering(tenantId);
            persistRun(tenantId, result);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("meilleur_k", result.getMeilleurK());
            response.put("nb_colis", result.getNbColis());
            response.put("k_testes", result.getKTestes());
            response.put("inertie", result.getInertie());
            response.put("silhouette", result.getSilhouette());
            response.put("davies_bouldin", result.getDaviesBouldin());
            response.put("centroides", result.getCentroides());
            response.put("cluster_mapping", result.getClusterMapping());
            response.put("confusion_matrix", result.getConfusionMatrix());
            response.put("categories_uniques", result.getCategoriesUniques());
            response.put("purete", result.getPurete());
            response.put("affectations", result.getAffectations());
            response.put("duree_calcul_ms", result.getDureeCalculMs());
            response.put("referentiel_version", result.getReferentielVersion());
            response.put("nb_categories_ref", result.getNbCategoriesRef());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Erreur clustering tenant {}", tenantId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()
            ));
        }
    }

    /**
     * Persiste le run CLUSTERING dans optimisation_run (hub_id=NULL).
     * JSONB construit manuellement (sans Jackson).
     */
    private void persistRun(UUID tenantId, CategorisationResult result) {
        try {
            PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId).orElse(null);
            if (tenant == null) return;

            OptimisationRun run = new OptimisationRun();
            run.setPmeCliente(tenant);
            run.setHub(null); // V12 : CLUSTERING tenant-scoped
            run.setTypeAlgorithme(TypeAlgorithme.CLUSTERING);

            // parametres JSONB (manuel)
            run.setParametres(buildParamsJson(result));

            // resultat JSONB (manuel)
            run.setResultat(buildResultatJson(result));

            run.setDureeCalculMs((int) result.getDureeCalculMs());
            run.setJustificationDocument(
                    "Clustering non supervise K-Means sur " + result.getNbColis() + " colis. " +
                    "Referentiel v" + result.getReferentielVersion() + " (" + result.getNbCategoriesRef() + " categories). " +
                    "Meilleur k=" + result.getMeilleurK() +
                    " (silhouette=" + getSilVal(result) + ", purete=" + result.getPurete() + "). " +
                    "Features : poids, volume, log1p(valeur), fragilite, delai. " +
                    "Matching centroide vs seuils_ml (distance euclidienne normalisee)."
            );

            optimisationRunRepository.save(run);
            log.info("Run CLUSTERING #{} persiste pour tenant {} (referentiel v{})",
                    run.getRunId(), tenantId, result.getReferentielVersion());
        } catch (Exception e) {
            log.warn("Persistance run clustering echouee (non bloquant): {}", e.getMessage());
        }
    }

    private double getSilVal(CategorisationResult result) {
        int idx = result.getKTestes().indexOf(result.getMeilleurK());
        return idx >= 0 ? result.getSilhouette().get(idx) : 0;
    }

    private String buildParamsJson(CategorisationResult r) {
        StringBuilder sb = new StringBuilder("{");
        sb.append("\"k_testes\":").append(listIntToJson(r.getKTestes()));
        sb.append(",\"features\":[\"poids\",\"volume\",\"log1p(valeur)\",\"fragilite\",\"delai\"]");
        sb.append(",\"preprocessing\":\"log1p(valeur)+standardizer\"");
        sb.append(",\"source\":\"colis_features_bdd\"");
        sb.append(",\"referentiel_version\":").append(r.getReferentielVersion());
        sb.append(",\"nb_categories_ref\":").append(r.getNbCategoriesRef());
        sb.append("}");
        return sb.toString();
    }

    private String buildResultatJson(CategorisationResult r) {
        StringBuilder sb = new StringBuilder("{");
        sb.append("\"meilleur_k\":").append(r.getMeilleurK());
        sb.append(",\"purete\":").append(r.getPurete());
        sb.append(",\"silhouette\":").append(getSilVal(r));
        sb.append(",\"nb_colis\":").append(r.getNbColis());
        sb.append(",\"referentiel_version\":").append(r.getReferentielVersion());
        // cluster_mapping serialise manuellement
        sb.append(",\"cluster_mapping\":").append(clusterMappingToJson(r));
        sb.append("}");
        return sb.toString();
    }

    private String clusterMappingToJson(CategorisationResult r) {
        if (r.getClusterMapping() == null) return "{}";
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (var entry : r.getClusterMapping().entrySet()) {
            if (!first) sb.append(",");
            first = false;
            sb.append("\"").append(entry.getKey()).append("\":{");
            CategorisationService.ClusterMatch m = entry.getValue();
            sb.append("\"categorieId\":\"").append(m.categorieId() != null ? m.categorieId() : "").append("\"");
            sb.append(",\"classeCode\":\"").append(m.classeCode()).append("\"");
            sb.append(",\"libelle\":\"").append(escapeJson(m.libelle())).append("\"");
            sb.append(",\"distance\":").append(m.distance());
            sb.append("}");
        }
        sb.append("}");
        return sb.toString();
    }

    private String listIntToJson(java.util.List<Integer> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(list.get(i));
        }
        sb.append("]");
        return sb.toString();
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
