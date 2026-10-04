package com.example.Bakend.service.decision;

import com.example.Bakend.dto.direction.DecisionResponse;
import com.example.Bakend.entity.OptimisationRun;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.OptimisationRunRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class DecisionLectureService {

    private final OptimisationRunRepository optimisationRunRepository;
    private final PMEClienteRepository pmeClienteRepository;

    public DecisionLectureService(OptimisationRunRepository optimisationRunRepository,
                                   PMEClienteRepository pmeClienteRepository) {
        this.optimisationRunRepository = optimisationRunRepository;
        this.pmeClienteRepository = pmeClienteRepository;
    }

    public List<DecisionResponse> lister(UUID tenantId, UUID hubId, TypeAlgorithme type) {
        verifierTenant(tenantId);

        List<OptimisationRun> runs;
        if (hubId != null && type != null) {
            runs = optimisationRunRepository.findByPmeClienteTenantIdAndHubHubId(tenantId, hubId)
                    .stream()
                    .filter(r -> r.getTypeAlgorithme() == type)
                    .toList();
        } else if (hubId != null) {
            runs = optimisationRunRepository.findByPmeClienteTenantIdAndHubHubId(tenantId, hubId);
        } else if (type != null) {
            runs = optimisationRunRepository.findByPmeClienteTenantIdAndTypeAlgorithme(tenantId, type);
        } else {
            runs = optimisationRunRepository.rechercherParTenant(tenantId);
        }

        // Mapping DTO dans la transaction : les relations lazy (hub) sont initialisables ici.
        return runs.stream()
                .map(DecisionResponse::new)
                .toList();
    }

    private void verifierTenant(UUID tenantId) {
        if (!pmeClienteRepository.existsByTenantId(tenantId)) {
            throw new ResourceNotFoundException("Tenant introuvable : " + tenantId);
        }
    }
}
