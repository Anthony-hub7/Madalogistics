package com.example.Bakend.optimisation.groupage;

import com.example.Bakend.dto.optimisation.SacPipelineResponse;
import com.example.Bakend.entity.Sac;
import com.example.Bakend.repository.SacRepository;
import com.example.Bakend.repository.TourneeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Pipeline : lister tous les sacs d'un tenant pour le dashboard optimisation.
 */
@Service
public class SacPipelineService {

    private static final Logger log = LoggerFactory.getLogger(SacPipelineService.class);

    private final SacRepository sacRepository;
    private final TourneeRepository tourneeRepository;

    public SacPipelineService(SacRepository sacRepository,
                              TourneeRepository tourneeRepository) {
        this.sacRepository = sacRepository;
        this.tourneeRepository = tourneeRepository;
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
                    s.getDateDepartPlafond() != null ? s.getDateDepartPlafond().toString() : null
            );
        }).toList();
    }
}
