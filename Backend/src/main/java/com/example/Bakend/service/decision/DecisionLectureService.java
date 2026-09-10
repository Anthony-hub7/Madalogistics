package com.example.Bakend.service.decision;

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

    public List<OptimisationRun> lister(UUID tenantId, UUID hubId, TypeAlgorithme type) {
        verifierTenant(tenantId);

        if (hubId != null && type != null) {
            List<OptimisationRun> runs = optimisationRunRepository.findByPmeClienteTenantIdAndHubHubId(tenantId, hubId);
            return runs.stream()
                    .filter(r -> r.getTypeAlgorithme() == type)
                    .toList();
        }

        if (hubId != null) {
            return optimisationRunRepository.findByPmeClienteTenantIdAndHubHubId(tenantId, hubId);
        }

        if (type != null) {
            return optimisationRunRepository.findByPmeClienteTenantIdAndTypeAlgorithme(tenantId, type);
        }

        return optimisationRunRepository.rechercherParTenant(tenantId);
    }

    private void verifierTenant(UUID tenantId) {
        if (!pmeClienteRepository.existsByTenantId(tenantId)) {
            throw new ResourceNotFoundException("Tenant introuvable : " + tenantId);
        }
    }
}
