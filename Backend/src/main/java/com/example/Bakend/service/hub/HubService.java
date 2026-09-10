package com.example.Bakend.service.hub;

import com.example.Bakend.dto.direction.HubRequest;
import com.example.Bakend.entity.Hub;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.HubRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class HubService {

    private final HubRepository hubRepository;
    private final PMEClienteRepository pmeClienteRepository;

    public HubService(HubRepository hubRepository, PMEClienteRepository pmeClienteRepository) {
        this.hubRepository = hubRepository;
        this.pmeClienteRepository = pmeClienteRepository;
    }

    @Transactional(readOnly = true)
    public List<Hub> lister(UUID tenantId) {
        verifierTenant(tenantId);
        return hubRepository.findByPmeClienteTenantId(tenantId);
    }

    public Hub creer(UUID tenantId, HubRequest request) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));

        if (hubRepository.existsByPmeClienteTenantIdAndNom(tenantId, request.nom())) {
            throw new BusinessException("Un hub portant ce nom existe déjà pour ce tenant");
        }

        Hub hub = new Hub();
        hub.setPmeCliente(tenant);
        hub.setNom(request.nom());
        hub.setAdresse(request.adresse());
        hub.setLatitude(request.latitude());
        hub.setLongitude(request.longitude());
        hub.setZoneSecuriseeDispo(request.zoneSecuriseeDispo());
        hub.setActif(true);
        return hubRepository.save(hub);
    }

    public Hub modifier(UUID tenantId, UUID hubId, HubRequest request) {
        Hub hub = obtenir(tenantId, hubId);

        if (!hub.getNom().equals(request.nom())
                && hubRepository.existsByPmeClienteTenantIdAndNom(tenantId, request.nom())) {
            throw new BusinessException("Un hub portant ce nom existe déjà pour ce tenant");
        }

        hub.setNom(request.nom());
        hub.setAdresse(request.adresse());
        hub.setLatitude(request.latitude());
        hub.setLongitude(request.longitude());
        hub.setZoneSecuriseeDispo(request.zoneSecuriseeDispo());
        return hubRepository.save(hub);
    }

    public void supprimer(UUID tenantId, UUID hubId) {
        Hub hub = obtenir(tenantId, hubId);
        hubRepository.delete(hub);
    }

    public Hub toggleActif(UUID tenantId, UUID hubId) {
        Hub hub = obtenir(tenantId, hubId);
        hub.setActif(!hub.isActif());
        return hubRepository.save(hub);
    }

    @Transactional(readOnly = true)
    public Hub obtenir(UUID tenantId, UUID hubId) {
        return hubRepository.findByPmeClienteTenantIdAndHubId(tenantId, hubId)
                .orElseThrow(() -> new ResourceNotFoundException("Hub introuvable : " + hubId));
    }

    private void verifierTenant(UUID tenantId) {
        if (!pmeClienteRepository.existsByTenantId(tenantId)) {
            throw new ResourceNotFoundException("Tenant introuvable : " + tenantId);
        }
    }
}
