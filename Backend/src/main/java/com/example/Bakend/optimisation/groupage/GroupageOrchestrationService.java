package com.example.Bakend.optimisation.groupage;

import com.example.Bakend.entity.*;
import com.example.Bakend.entity.enums.DemandeStatut;
import com.example.Bakend.entity.enums.SacStatut;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.entity.enums.VehiculeStatut;
import com.example.Bakend.optimisation.delai.DelaiService;
import com.example.Bakend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Orchestrateur du groupage : FFD BinPacking + creation Sacs + liens colis.
 * Miroir de VrpOrchestrationService.
 */
@Service
public class GroupageOrchestrationService {

    private static final Logger log = LoggerFactory.getLogger(GroupageOrchestrationService.class);

    private static final long SCALE = 100; // kg × 100, m3 × 100 pour long

    private final DemandeTransportRepository demandeRepository;
    private final ColisRepository colisRepository;
    private final VehiculeRepository vehiculeRepository;
    private final SacRepository sacRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final OptimisationRunRepository optimisationRunRepository;
    private final BinPackingService binPackingService;
    private final KnapsackSolverService knapsackSolverService;

    public GroupageOrchestrationService(DemandeTransportRepository demandeRepository,
                                         ColisRepository colisRepository,
                                         VehiculeRepository vehiculeRepository,
                                         SacRepository sacRepository,
                                         PMEClienteRepository pmeClienteRepository,
                                         OptimisationRunRepository optimisationRunRepository,
                                         BinPackingService binPackingService,
                                         KnapsackSolverService knapsackSolverService) {
        this.demandeRepository = demandeRepository;
        this.colisRepository = colisRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.sacRepository = sacRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.optimisationRunRepository = optimisationRunRepository;
        this.binPackingService = binPackingService;
        this.knapsackSolverService = knapsackSolverService;
    }

    /**
     * Resultat du groupage pour une demande API.
     */
    public record GroupageResult(UUID runId, List<SacInfo> sacs, int nbNonGroupes, String justification) {}

    public record SacInfo(UUID sacId, double tauxRemplissage, int nbColis,
                           LocalDate dateDepartPlafond, boolean departForce) {}

    /**
     * Lance le groupage pour un hub : FFD sur les demandes EN_ATTENTE_GROUPAGE.
     */
    @Transactional
    public GroupageResult lancerGroupage(UUID tenantId, UUID hubId) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant introuvable : " + tenantId));

        // 1. Charger les demandes en attente, triees par urgence
        List<DemandeTransport> demandes = demandeRepository
                .rechercherParHubEtStatutOrderByDateDepart(tenantId, hubId, DemandeStatut.EN_ATTENTE_GROUPAGE);

        if (demandes.isEmpty()) {
            return new GroupageResult(null, List.of(), 0, "Aucune demande en attente de groupage.");
        }

        // 2. Extraire tous les colis
        List<Colis> tousColis = new ArrayList<>();
        Map<UUID, DemandeTransport> demandeParColis = new LinkedHashMap<>();
        Map<UUID, LocalDate> dateDepartParDemande = new LinkedHashMap<>();

        for (DemandeTransport d : demandes) {
            List<Colis> colisDemande = colisRepository.findByDemandeDemandeId(d.getDemandeId());
            for (Colis c : colisDemande) {
                tousColis.add(c);
                demandeParColis.put(c.getColisId(), d);
            }
            dateDepartParDemande.put(d.getDemandeId(),
                    d.getDateDepartCalculee() != null ? d.getDateDepartCalculee() : LocalDate.now().plusDays(7));
        }

        if (tousColis.isEmpty()) {
            return new GroupageResult(null, List.of(), 0, "Les demandes selectionnees ne contiennent aucun colis.");
        }

        // 3. Capacite = plus grand vehicule disponible du hub
        List<Vehicule> vehicules = vehiculeRepository.rechercherDisponiblesParHub(
                tenantId, hubId, VehiculeStatut.DISPONIBLE);
        long capPoidsMax = 0;
        long capVolumeMax = 0;
        for (Vehicule v : vehicules) {
            long p = v.getCapacitePoidsKg().multiply(BigDecimal.valueOf(SCALE)).longValue();
            long vol = v.getCapaciteVolumeM3().multiply(BigDecimal.valueOf(SCALE)).longValue();
            if (p > capPoidsMax) capPoidsMax = p;
            if (vol > capVolumeMax) capVolumeMax = vol;
        }
        // Fallback si aucun vehicule : 5000 kg, 20 m3
        if (capPoidsMax == 0) capPoidsMax = 5000 * SCALE;
        if (capVolumeMax == 0) capVolumeMax = 20 * SCALE;

        // 4. Convertir en long[] pour le solveur + valider chaque colis
        List<Long> poids = new ArrayList<>();
        List<Long> volumes = new ArrayList<>();
        for (Colis c : tousColis) {
            long p = c.getPoidsKg().multiply(BigDecimal.valueOf(SCALE)).longValue();
            long v = c.getVolumeM3().multiply(BigDecimal.valueOf(SCALE)).longValue();
            poids.add(p);
            volumes.add(v);

            // Garde-fou : colis physiquement impossible (> 40 000 kg ou > 200 m³)
            if (c.getPoidsKg().doubleValue() > 40_000 || c.getVolumeM3().doubleValue() > 200) {
                throw new IllegalStateException(
                    "Colis " + c.getColisId() + " : dimensions impossibles (" +
                    c.getPoidsKg() + " kg, " + c.getVolumeM3() + " m³). Veuillez corriger la commande.");
            }
            // Garde-fou : colis dépasse la flotte du hub
            if (p > capPoidsMax || v > capVolumeMax) {
                throw new IllegalStateException(
                    "Votre agence n'a pas le véhicule pour transporter ce colis (" +
                    c.getPoidsKg() + " kg, " + c.getVolumeM3() + " m³) — capacité max du hub : " +
                    (capPoidsMax / SCALE) + " kg / " + (capVolumeMax / SCALE) + " m³.");
            }
        }

        // 5. Lancer FFD BinPacking
        BinPackingService.BinPackingResult bpResult = binPackingService.solve(
                poids, volumes, capPoidsMax, capVolumeMax);

        // 6. Calculer dateDepartLot = min(dateDepartCalculee_i) de chaque sac
        // et appliquer la regle de depart double
        LocalDate today = LocalDate.now();
        BigDecimal seuilRemplissage = tenant.getSeuilRemplissageMin();
        List<SacInfo> sacsInfo = new ArrayList<>();
        List<Sac> sacsPersistes = new ArrayList<>();

        int sacIndex = 0;
        for (BinPackingService.SacFfd sacFfd : bpResult.sacs()) {
            // Calculer dateDepartLot pour ce sac
            LocalDate dateDepartLot = sacFfd.indicesColis().stream()
                    .map(i -> demandeParColis.get(tousColis.get(i).getColisId()))
                    .filter(Objects::nonNull)
                    .map(d -> d.getDateDepartCalculee() != null ? d.getDateDepartCalculee() : LocalDate.now().plusDays(7))
                    .min(Comparator.naturalOrder())
                    .orElse(LocalDate.now().plusDays(7));

            // Calculer taux remplissage (sur le max : poids ou volume)
            double tauxPoids = (double) sacFfd.poidsTotal() / capPoidsMax * 100;
            double tauxVolume = (double) sacFfd.volumeTotal() / capVolumeMax * 100;
            double taux = Math.max(tauxPoids, tauxVolume);

            // Regle de depart double
            boolean departForce = today.isAfter(dateDepartLot) || today.isEqual(dateDepartLot);
            boolean seuilAtteint = BigDecimal.valueOf(taux).compareTo(seuilRemplissage) >= 0;
            boolean shouldGroup = seuilAtteint || departForce;

            if (!shouldGroup) {
                continue; // Sac sous seuil et pas encore urgent
            }

            // Creer le Sac
            Sac sac = new Sac();
            sac.setPmeCliente(tenant);
            sac.setHub(new Hub());
            sac.getHub().setHubId(hubId);
            sac.setTauxRemplissage(BigDecimal.valueOf(taux).setScale(2, RoundingMode.HALF_UP));
            sac.setDateDepartPlafond(dateDepartLot);
            sac.setDateDepartPrevue(dateDepartLot);
            sac.setStatut(SacStatut.CONSTITUE);

            // Categorie dominante (premiere rencontre)
            Set<String> categories = new HashSet<>();
            for (int idx : sacFfd.indicesColis()) {
                Colis c = tousColis.get(idx);
                if (c.getCategorie() != null) {
                    categories.add(c.getCategorie().getLibelle());
                }
            }
            sac.setCategorieDominante(categories.isEmpty() ? "STANDARD" :
                    categories.iterator().next());

            sac = sacRepository.save(sac);
            sacsPersistes.add(sac);

            // Lier les colis au sac
            for (int idx : sacFfd.indicesColis()) {
                Colis c = tousColis.get(idx);
                c.setSac(sac);
                colisRepository.save(c);
            }

            // Marquer les demandes concernees comme GROUPEE
            Set<UUID> demandeIds = sacFfd.indicesColis().stream()
                    .map(i -> demandeParColis.get(tousColis.get(i).getColisId()))
                    .filter(Objects::nonNull)
                    .map(DemandeTransport::getDemandeId)
                    .collect(Collectors.toSet());

            for (UUID dId : demandeIds) {
                DemandeTransport d = demandeRepository.findById(dId).orElse(null);
                if (d != null && d.getStatut() == DemandeStatut.EN_ATTENTE_GROUPAGE) {
                    d.setStatut(DemandeStatut.GROUPEE);
                    demandeRepository.save(d);
                }
            }

            sacsInfo.add(new SacInfo(
                    sac.getSacId(), taux, sacFfd.indicesColis().size(),
                    dateDepartLot, departForce));

            sacIndex++;
        }

        // 7. Creer OptimisationRun
        String justification = buildJustification(sacsInfo, capPoidsMax / SCALE, capVolumeMax / SCALE,
                seuilRemplissage, today);

        OptimisationRun run = new OptimisationRun();
        run.setPmeCliente(tenant);
        run.setHub(new Hub());
        run.getHub().setHubId(hubId);
        run.setTypeAlgorithme(TypeAlgorithme.BIN_PACKING);
        run.setParametres(buildParametresJson(tousColis.size(), capPoidsMax, capVolumeMax, seuilRemplissage));
        run.setResultat(buildResultatJson(sacsInfo, bpResult.nbNonGroupes()));
        run.setJustificationDocument(justification);
        run.setDureeCalculMs(0);
        optimisationRunRepository.save(run);

        // Lier chaque Sac au runGroupage
        for (Sac s : sacsPersistes) {
            s.setRunGroupage(run);
            sacRepository.save(s);
        }

        log.info("Groupage FFD hub {} : {} sacs, {} colis, run {}",
                hubId, sacsInfo.size(), tousColis.size(), run.getRunId());

        return new GroupageResult(run.getRunId(), sacsInfo, bpResult.nbNonGroupes(), justification);
    }

    private String buildJustification(List<SacInfo> sacs, long capPoidsKg, long capVolumeM3,
                                       BigDecimal seuil, LocalDate today) {
        StringBuilder sb = new StringBuilder();
        sb.append("Groupage FFD (First Fit Decreasing) — Bin Packing 2 contraintes.\n\n");
        sb.append("Capacite vehicule : ").append(capPoidsKg).append(" kg / ").append(capVolumeM3).append(" m3.\n");
        sb.append("Seuil remplissage min : ").append(seuil).append("%.\n");
        sb.append("Date du jour : ").append(today).append(".\n\n");

        for (int i = 0; i < sacs.size(); i++) {
            SacInfo s = sacs.get(i);
            sb.append("Sac ").append(i + 1).append(" : ")
                    .append(s.nbColis()).append(" colis, ")
                    .append(String.format("%.1f", s.tauxRemplissage())).append("% rempli");
            if (s.departForce()) {
                sb.append(" [DEPART FORCE]");
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    private String buildParametresJson(int nbColis, long capPoids, long capVolume, BigDecimal seuil) {
        return "{" +
                "\"nb_colis\":" + nbColis +
                ",\"capacite_poids\":" + (capPoids / SCALE) +
                ",\"capacite_volume\":" + (capVolume / SCALE) +
                ",\"seuil_remplissage\":" + seuil +
                ",\"algo\":\"FFD_BIN_PACKING\"" +
                "}";
    }

    private String buildResultatJson(List<SacInfo> sacs, int nbNonGroupes) {
        StringBuilder sb = new StringBuilder("{\"sacs\":[");
        for (int i = 0; i < sacs.size(); i++) {
            if (i > 0) sb.append(",");
            SacInfo s = sacs.get(i);
            sb.append("{\"sac_id\":\"").append(s.sacId()).append("\"");
            sb.append(",\"taux\":").append(s.tauxRemplissage());
            sb.append(",\"nb_colis\":").append(s.nbColis());
            sb.append(",\"date_depart\":\"").append(s.dateDepartPlafond()).append("\"");
            sb.append(",\"depart_force\":").append(s.departForce());
            sb.append("}");
        }
        sb.append("],\"nb_non_groupes\":").append(nbNonGroupes).append("}");
        return sb.toString();
    }
}
