package com.example.Bakend.service;

import com.example.Bakend.dto.facture.FactureListResponse;
import com.example.Bakend.entity.Facture;
import com.example.Bakend.entity.enums.FactureStatut;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.repository.EtapeLivraisonRepository;
import com.example.Bakend.repository.FactureRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Historique facturation (onglet Factures de la page Historique).
 * Liste les factures du tenant avec la commande liee et la presence
 * de preuves de livraison, plus des filtres statut / periode.
 */
@Service
public class FactureHistoriqueService {

    private static final Logger log = LoggerFactory.getLogger(FactureHistoriqueService.class);

    private final FactureRepository factureRepository;
    private final EtapeLivraisonRepository etapeLivraisonRepository;

    public FactureHistoriqueService(FactureRepository factureRepository,
                                    EtapeLivraisonRepository etapeLivraisonRepository) {
        this.factureRepository = factureRepository;
        this.etapeLivraisonRepository = etapeLivraisonRepository;
    }

    @Transactional(readOnly = true)
    public List<FactureListResponse> lister(UUID tenantId, String statut, LocalDate from, LocalDate to) {
        FactureStatut filtreStatut = null;
        if (statut != null && !statut.isBlank()) {
            try {
                filtreStatut = FactureStatut.valueOf(statut.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BusinessException("Statut de facture invalide : " + statut, 400);
            }
        }
        final FactureStatut statutFiltre = filtreStatut;

        // Nombre de preuves par demande en une seule requete (pas de N+1)
        Map<UUID, Integer> preuvesParDemande = new HashMap<>();
        for (Object[] row : etapeLivraisonRepository.compterPreuvesParDemande(tenantId)) {
            preuvesParDemande.put((UUID) row[0], ((Number) row[1]).intValue());
        }

        LocalDateTime debut = from != null ? from.atStartOfDay() : null;
        LocalDateTime fin = to != null ? to.plusDays(1).atStartOfDay() : null;

        return factureRepository.rechercherParTenant(tenantId).stream()
                .filter(f -> statutFiltre == null || f.getStatut() == statutFiltre)
                .filter(f -> debut == null || !f.getDateEmission().isBefore(debut))
                .filter(f -> fin == null || f.getDateEmission().isBefore(fin))
                .map(f -> toResponse(f, preuvesParDemande))
                .toList();
    }

    private FactureListResponse toResponse(Facture f, Map<UUID, Integer> preuvesParDemande) {
        var demande = f.getDemande();
        return new FactureListResponse(
                f.getFactureId(),
                f.getMontantTotal(),
                f.getStatut() != null ? f.getStatut().name() : null,
                f.getDateEmission(),
                demande != null ? demande.getDemandeId() : null,
                demande != null && demande.getClientFinal() != null ? demande.getClientFinal().getNom() : null,
                demande != null ? demande.getAdresseLivraison() : null,
                demande != null && demande.getStatut() != null ? demande.getStatut().name() : null,
                demande != null ? preuvesParDemande.getOrDefault(demande.getDemandeId(), 0) : 0
        );
    }
}
