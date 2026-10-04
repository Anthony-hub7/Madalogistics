package com.example.Bakend.optimisation.groupage;

import com.example.Bakend.dto.optimisation.SacDetailResponse;
import com.example.Bakend.dto.optimisation.SacPipelineResponse;
import com.example.Bakend.entity.*;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Pipeline : lister tous les sacs d'un tenant pour le dashboard optimisation,
 * et fournir le detail complet (chauffeur, clients, colis, etapes) pour l'historique.
 */
@Service
public class SacPipelineService {

    private static final Logger log = LoggerFactory.getLogger(SacPipelineService.class);

    private final SacRepository sacRepository;
    private final TourneeRepository tourneeRepository;
    private final ColisRepository colisRepository;
    private final EtapeLivraisonRepository etapeLivraisonRepository;
    private final FactureRepository factureRepository;

    public SacPipelineService(SacRepository sacRepository,
                              TourneeRepository tourneeRepository,
                              ColisRepository colisRepository,
                              EtapeLivraisonRepository etapeLivraisonRepository,
                              FactureRepository factureRepository) {
        this.sacRepository = sacRepository;
        this.tourneeRepository = tourneeRepository;
        this.colisRepository = colisRepository;
        this.etapeLivraisonRepository = etapeLivraisonRepository;
        this.factureRepository = factureRepository;
    }

    @Transactional(readOnly = true)
    public List<SacPipelineResponse> listerParTenant(UUID tenantId) {
        List<Sac> sacs = sacRepository.findByPmeClienteTenantId(tenantId);

        return sacs.stream().map(s -> {
            double poids = 0;
            double volume = 0;
            int nbColis = 0;

            if (s.getColis() != null && !s.getColis().isEmpty()) {
                nbColis = s.getColis().size();
                poids = s.getColis().stream()
                        .mapToDouble(c -> c.getPoidsKg() != null ? c.getPoidsKg().doubleValue() : 0)
                        .sum();
                volume = s.getColis().stream()
                        .mapToDouble(c -> c.getVolumeM3() != null ? c.getVolumeM3().doubleValue() : 0)
                        .sum();
            }

            long nbTournees = tourneeRepository.compterParSac(s.getSacId());

            UUID tourneeId = null;
            if (nbTournees > 0) {
                var tournees = tourneeRepository.findBySacSacId(s.getSacId());
                if (!tournees.isEmpty()) {
                    tourneeId = tournees.get(0).getTourneeId();
                }
            }

            return new SacPipelineResponse(
                    s.getSacId(),
                    s.getHub() != null ? s.getHub().getHubId() : null,
                    s.getHub() != null ? s.getHub().getNom() : null,
                    s.getStatut() != null ? s.getStatut().name() : null,
                    s.getCategorieDominante(),
                    nbColis,
                    poids,
                    volume,
                    s.getTauxRemplissage() != null ? s.getTauxRemplissage().doubleValue() : 0,
                    s.getChauffeur() != null ? s.getChauffeur().getChauffeurId() : null,
                    s.getChauffeur() != null && s.getChauffeur().getUtilisateur() != null
                            ? s.getChauffeur().getUtilisateur().getNom() : null,
                    s.getVehicule() != null ? s.getVehicule().getVehiculeId() : null,
                    s.getVehicule() != null ? s.getVehicule().getImmatriculation() : null,
                    nbTournees > 0,
                    tourneeId,
                    s.getDateDepartPlafond() != null ? s.getDateDepartPlafond().toString() : null,
                    estFreelance(s)
            );
        }).toList();
    }

    /** Un sac est freelance si au moins un de ses colis vient d'une demande FREELANCE. */
    private boolean estFreelance(Sac s) {
        if (s.getColis() == null) return false;
        return s.getColis().stream()
                .anyMatch(c -> c.getDemande() != null
                        && c.getDemande().getModeLivraison() == com.example.Bakend.entity.enums.ModeLivraison.FREELANCE);
    }

    /**
     * Detail complet d'un sac (historique) : chauffeur, vehicule, clients distincts,
     * colis avec commande d'origine, etapes avec preuves de livraison, factures liees.
     */
    @Transactional(readOnly = true)
    public SacDetailResponse detail(UUID tenantId, UUID sacId) {
        Sac sac = sacRepository.findById(sacId)
                .filter(s -> s.getPmeCliente() != null
                        && s.getPmeCliente().getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Sac introuvable : " + sacId));

        // Resume (meme calcul que listerParTenant)
        double poids = 0;
        double volume = 0;
        List<Colis> colisList = colisRepository.findBySacSacId(sacId);
        if (!colisList.isEmpty()) {
            poids = colisList.stream()
                    .mapToDouble(c -> c.getPoidsKg() != null ? c.getPoidsKg().doubleValue() : 0)
                    .sum();
            volume = colisList.stream()
                    .mapToDouble(c -> c.getVolumeM3() != null ? c.getVolumeM3().doubleValue() : 0)
                    .sum();
        }

        // Tournee
        List<Tournee> tournees = tourneeRepository.findBySacSacId(sacId);
        Tournee tournee = tournees.isEmpty() ? null : tournees.get(0);

        // Etapes de toutes les tournees du sac, ordonnees
        List<EtapeLivraison> etapes = new ArrayList<>();
        for (Tournee t : tournees) {
            etapes.addAll(etapeLivraisonRepository.rechercherParTourneeOrdonnees(t.getTourneeId()));
        }
        etapes.sort(Comparator.comparingInt(e -> e.getOrdre() != null ? e.getOrdre() : 0));

        // Colis + demandes d'origine + clients distincts
        List<SacDetailResponse.ColisDetail> colisDetails = new ArrayList<>();
        Map<UUID, DemandeTransport> demandes = new LinkedHashMap<>();
        for (Colis c : colisList) {
            DemandeTransport d = c.getDemande();
            String clientNom = d != null && d.getClientFinal() != null ? d.getClientFinal().getNom() : null;
            if (d != null) {
                demandes.putIfAbsent(d.getDemandeId(), d);
            }
            colisDetails.add(new SacDetailResponse.ColisDetail(
                    c.getColisId(),
                    c.getPoidsKg() != null ? c.getPoidsKg().doubleValue() : 0,
                    c.getVolumeM3() != null ? c.getVolumeM3().doubleValue() : 0,
                    c.getEtat() != null ? c.getEtat().name() : null,
                    c.getCategorie() != null ? c.getCategorie().getLibelle() : "Colis",
                    d != null ? d.getDemandeId() : null,
                    clientNom,
                    d != null ? d.getAdresseLivraison() : null
            ));
        }

        List<String> clients = colisDetails.stream()
                .map(SacDetailResponse.ColisDetail::clientNom)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        // Demandes + factures liees
        List<SacDetailResponse.DemandeDetail> demandeDetails = new ArrayList<>();
        for (DemandeTransport d : demandes.values()) {
            var facture = factureRepository.findByDemandeDemandeId(d.getDemandeId()).orElse(null);
            demandeDetails.add(new SacDetailResponse.DemandeDetail(
                    d.getDemandeId(),
                    d.getStatut() != null ? d.getStatut().name() : null,
                    d.getTarif() != null ? d.getTarif().doubleValue() : 0,
                    d.getClientFinal() != null ? d.getClientFinal().getNom() : null,
                    d.getAdresseLivraison(),
                    facture != null ? facture.getFactureId() : null,
                    facture != null && facture.getStatut() != null ? facture.getStatut().name() : null
            ));
        }

        List<SacDetailResponse.EtapeDetail> etapeDetails = etapes.stream()
                .map(e -> {
                    Colis colis = e.getColis();
                    DemandeTransport d = colis != null ? colis.getDemande() : null;
                    return new SacDetailResponse.EtapeDetail(
                            e.getEtapeId(),
                            e.getOrdre() != null ? e.getOrdre() : 0,
                            e.getTypeEtape() != null ? e.getTypeEtape().name() : null,
                            e.getDateHeureReelle() != null ? e.getDateHeureReelle().toString() : null,
                            e.getSignatureNom(),
                            e.getPhotoPreuve() != null && e.getPhotoPreuve().length > 0,
                            colis != null ? colis.getColisId() : null,
                            d != null && d.getClientFinal() != null ? d.getClientFinal().getNom() : null
                    );
                })
                .toList();

        Chauffeur ch = sac.getChauffeur();
        Vehicule v = sac.getVehicule();

        return new SacDetailResponse(
                sac.getSacId(),
                sac.getHub() != null ? sac.getHub().getHubId() : null,
                sac.getHub() != null ? sac.getHub().getNom() : null,
                sac.getStatut() != null ? sac.getStatut().name() : null,
                sac.getCategorieDominante(),
                colisList.size(),
                poids,
                volume,
                sac.getTauxRemplissage() != null ? sac.getTauxRemplissage().doubleValue() : 0,
                ch != null ? ch.getChauffeurId() : null,
                ch != null && ch.getUtilisateur() != null ? ch.getUtilisateur().getNom() : null,
                v != null ? v.getVehiculeId() : null,
                v != null ? v.getImmatriculation() : null,
                tournee != null,
                tournee != null ? tournee.getTourneeId() : null,
                tournee != null && tournee.getStatut() != null ? tournee.getStatut().name() : null,
                sac.getDateDepartPlafond() != null ? sac.getDateDepartPlafond().toString() : null,
                clients,
                colisDetails,
                etapeDetails,
                demandeDetails
        );
    }
}
