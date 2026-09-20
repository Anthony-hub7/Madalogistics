package com.example.Bakend.service;

import com.example.Bakend.entity.Chauffeur;
import com.example.Bakend.entity.CompatibiliteChauffeurVehicule;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.Vehicule;
import com.example.Bakend.repository.ChauffeurRepository;
import com.example.Bakend.repository.CompatibiliteChauffeurVehiculeRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.VehiculeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service de remplissage auto de la matrice compatibilite chauffeur <-> vehicule.
 * Par defaut, toute paire est compatible (compatible=true).
 * Le refus est conservable en passant une ligne a false.
 */
@Service
public class CompatibiliteService {

    private static final Logger log = LoggerFactory.getLogger(CompatibiliteService.class);

    private final CompatibiliteChauffeurVehiculeRepository compatibiliteRepository;
    private final ChauffeurRepository chauffeurRepository;
    private final VehiculeRepository vehiculeRepository;
    private final PMEClienteRepository pmeClienteRepository;

    public CompatibiliteService(
            CompatibiliteChauffeurVehiculeRepository compatibiliteRepository,
            ChauffeurRepository chauffeurRepository,
            VehiculeRepository vehiculeRepository,
            PMEClienteRepository pmeClienteRepository) {
        this.compatibiliteRepository = compatibiliteRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.pmeClienteRepository = pmeClienteRepository;
    }

    /**
     * Quand un chauffeur est valide : creer les lignes avec tous les vehicules du tenant.
     */
    @Transactional
    public void initialiserPourChauffeur(UUID tenantId, UUID chauffeurId) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId).orElse(null);
        if (tenant == null) return;

        List<Vehicule> vehicules = vehiculeRepository.findByPmeClienteTenantId(tenantId);
        int created = 0;
        for (Vehicule v : vehicules) {
            if (compatibiliteRepository.findById(
                    new com.example.Bakend.entity.id.CompatibiliteId(chauffeurId, v.getVehiculeId())).isEmpty()) {
                CompatibiliteChauffeurVehicule c = new CompatibiliteChauffeurVehicule();
                c.setChauffeurId(chauffeurId);
                c.setVehiculeId(v.getVehiculeId());
                c.setPmeCliente(tenant);
                c.setCompatible(true);
                compatibiliteRepository.save(c);
                created++;
            }
        }
        if (created > 0) {
            log.info("Matrice : {} lignes creees pour chauffeur {} (tenant {})", created, chauffeurId, tenantId);
        }
    }

    /**
     * Quand un vehicule est cree : creer les lignes avec tous les chauffeurs VALIDEE du tenant.
     */
    @Transactional
    public void initialiserPourVehicule(UUID tenantId, UUID vehiculeId) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId).orElse(null);
        if (tenant == null) return;

        List<Chauffeur> chauffeurs = chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId)
                .stream()
                .filter(c -> "VALIDEE".equals(c.getStatutDossier()))
                .toList();
        int created = 0;
        for (Chauffeur ch : chauffeurs) {
            if (compatibiliteRepository.findById(
                    new com.example.Bakend.entity.id.CompatibiliteId(ch.getChauffeurId(), vehiculeId)).isEmpty()) {
                CompatibiliteChauffeurVehicule c = new CompatibiliteChauffeurVehicule();
                c.setChauffeurId(ch.getChauffeurId());
                c.setVehiculeId(vehiculeId);
                c.setPmeCliente(tenant);
                c.setCompatible(true);
                compatibiliteRepository.save(c);
                created++;
            }
        }
        if (created > 0) {
            log.info("Matrice : {} lignes creees pour vehicule {} (tenant {})", created, vehiculeId, tenantId);
        }
    }

    /**
     * Rattrapage : creer les lignes manquantes pour tous les chauffeurs VALIDEE d'un tenant.
     */
    @Transactional
    public void rattraperPourTenant(UUID tenantId) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId).orElse(null);
        if (tenant == null) return;

        List<Chauffeur> chauffeurs = chauffeurRepository.findByPmeClienteTenantIdAndDisponibleTrue(tenantId)
                .stream()
                .filter(c -> "VALIDEE".equals(c.getStatutDossier()))
                .toList();
        List<Vehicule> vehicules = vehiculeRepository.findByPmeClienteTenantId(tenantId);

        int created = 0;
        for (Chauffeur ch : chauffeurs) {
            for (Vehicule v : vehicules) {
                if (compatibiliteRepository.findById(
                        new com.example.Bakend.entity.id.CompatibiliteId(ch.getChauffeurId(), v.getVehiculeId())).isEmpty()) {
                    CompatibiliteChauffeurVehicule c = new CompatibiliteChauffeurVehicule();
                    c.setChauffeurId(ch.getChauffeurId());
                    c.setVehiculeId(v.getVehiculeId());
                    c.setPmeCliente(tenant);
                    c.setCompatible(true);
                    compatibiliteRepository.save(c);
                    created++;
                }
            }
        }
        if (created > 0) {
            log.info("Matrice rattrapage : {} lignes creees pour tenant {}", created, tenantId);
        }
    }
}
