package com.example.Bakend.service.tarification;

import com.example.Bakend.dto.direction.SeuilRequest;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.PMEClienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@Transactional
public class SeuilRemplissageService {

    private final PMEClienteRepository pmeClienteRepository;

    public SeuilRemplissageService(PMEClienteRepository pmeClienteRepository) {
        this.pmeClienteRepository = pmeClienteRepository;
    }

    @Transactional(readOnly = true)
    public BigDecimal obtenir(UUID tenantId) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));
        return tenant.getSeuilRemplissageMin();
    }

    public BigDecimal mettreAJour(UUID tenantId, SeuilRequest request) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));
        tenant.setSeuilRemplissageMin(BigDecimal.valueOf(request.seuil()));
        return pmeClienteRepository.save(tenant).getSeuilRemplissageMin();
    }
}
