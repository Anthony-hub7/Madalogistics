package com.example.Bakend.service;

import com.example.Bakend.dto.request.VehiculeRequest;
import com.example.Bakend.entity.Hub;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.Sac;
import com.example.Bakend.entity.Vehicule;
import com.example.Bakend.entity.enums.SacStatut;
import com.example.Bakend.entity.enums.VehiculeStatut;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.HubRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.SacRepository;
import com.example.Bakend.repository.VehiculeRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class VehiculeService {

    private final VehiculeRepository vehiculeRepository;
    private final HubRepository hubRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final SacRepository sacRepository;
    private final CompatibiliteService compatibiliteService;

    public VehiculeService(VehiculeRepository vehiculeRepository,
                           HubRepository hubRepository,
                           PMEClienteRepository pmeClienteRepository,
                           SacRepository sacRepository,
                           CompatibiliteService compatibiliteService) {
        this.vehiculeRepository = vehiculeRepository;
        this.hubRepository = hubRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.sacRepository = sacRepository;
        this.compatibiliteService = compatibiliteService;
    }

    @Transactional(readOnly = true)
    public List<Vehicule> lister(UUID tenantId, String statut, UUID hubId) {
        verifierTenantExiste(tenantId);
        // Pas de filtre explicite → TOUS les vehicules (sinon les AFFECTE/EN_TOURNEE
        // seraient invisibles dans la liste par defaut)
        VehiculeStatut filtreStatut = (statut == null || statut.isBlank())
                ? null : parseStatut(statut);

        if (hubId != null && filtreStatut != null) {
            return vehiculeRepository.rechercherDisponiblesParHub(tenantId, hubId, filtreStatut);
        }
        if (hubId != null) {
            return vehiculeRepository.findByPmeClienteTenantId(tenantId).stream()
                    .filter(v -> v.getHub() != null && v.getHub().getHubId().equals(hubId))
                    .toList();
        }
        if (filtreStatut != null) {
            return vehiculeRepository.findByPmeClienteTenantIdAndStatut(tenantId, filtreStatut);
        }
        return vehiculeRepository.findByPmeClienteTenantId(tenantId);
    }

    @Transactional(readOnly = true)
    public Vehicule obtenir(UUID tenantId, UUID vehiculeId) {
        return vehiculeRepository.findByPmeClienteTenantIdAndVehiculeId(tenantId, vehiculeId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vehicule introuvable : " + vehiculeId));
    }

    public Vehicule creer(UUID tenantId, VehiculeRequest req) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));

        Hub hub = hubRepository.findByPmeClienteTenantIdAndHubId(tenantId, req.getHubId())
                .orElseThrow(() -> new ResourceNotFoundException("Hub introuvable : " + req.getHubId()));

        Vehicule vehicule = new Vehicule();
        vehicule.setPmeCliente(tenant);
        vehicule.setHub(hub);
        vehicule.setImmatriculation(req.getImmatriculation().trim().toUpperCase());
        vehicule.setCapacitePoidsKg(req.getCapacitePoidsKg());
        vehicule.setCapaciteVolumeM3(req.getCapaciteVolumeM3());
        vehicule.setMarqueModele(req.getMarqueModele());
        vehicule.setTypeVehicule(req.getTypeVehicule());
        vehicule.setAnnee(req.getAnnee());
        vehicule.setPtacTonnes(req.getPtacTonnes());
        vehicule.setStatut(parseStatut(req.getStatut()));

        try {
            Vehicule saved = vehiculeRepository.save(vehicule);
            compatibiliteService.initialiserPourVehicule(tenantId, saved.getVehiculeId());
            return saved;
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(
                    "Un vehicule avec l'immatriculation " + vehicule.getImmatriculation()
                            + " existe deja dans cette agence", 409);
        }
    }

    public Vehicule modifier(UUID tenantId, UUID vehiculeId, VehiculeRequest req) {
        Vehicule vehicule = obtenir(tenantId, vehiculeId);

        Hub hub = hubRepository.findByPmeClienteTenantIdAndHubId(tenantId, req.getHubId())
                .orElseThrow(() -> new ResourceNotFoundException("Hub introuvable : " + req.getHubId()));

        vehicule.setHub(hub);
        vehicule.setImmatriculation(req.getImmatriculation().trim().toUpperCase());
        vehicule.setCapacitePoidsKg(req.getCapacitePoidsKg());
        vehicule.setCapaciteVolumeM3(req.getCapaciteVolumeM3());
        vehicule.setMarqueModele(req.getMarqueModele());
        vehicule.setTypeVehicule(req.getTypeVehicule());
        vehicule.setAnnee(req.getAnnee());
        vehicule.setPtacTonnes(req.getPtacTonnes());

        if (req.getStatut() != null) {
            VehiculeStatut nouveau = parseStatut(req.getStatut());
            if (nouveau != vehicule.getStatut()) {
                verifierNonReserve(vehicule);
            }
            vehicule.setStatut(nouveau);
        }

        try {
            return vehiculeRepository.save(vehicule);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(
                    "Un vehicule avec l'immatriculation " + vehicule.getImmatriculation()
                            + " existe deja dans cette agence", 409);
        }
    }

    public void supprimer(UUID tenantId, UUID vehiculeId) {
        Vehicule vehicule = obtenir(tenantId, vehiculeId);

        // Reserve = des affecte a un sac actif (AFFECTE ou EN_TRANSIT) → 409
        verifierNonReserve(vehicule);

        vehicule.setStatut(VehiculeStatut.HORS_SERVICE);
        vehicule.setHub(null);
        vehiculeRepository.save(vehicule);
    }

    public Vehicule changerStatut(UUID tenantId, UUID vehiculeId, String nouveauStatut) {
        Vehicule vehicule = obtenir(tenantId, vehiculeId);
        VehiculeStatut statut = parseStatut(nouveauStatut);

        if (statut != vehicule.getStatut()) {
            verifierNonReserve(vehicule);
        }
        vehicule.setStatut(statut);
        return vehiculeRepository.save(vehicule);
    }

    /**
     * Un vehicule rattache a un sac AFFECTE ou EN_TRANSIT est reserve :
     * son statut ne peut plus etre modifie manuellement (il est gere par
     * l'affectation et les missions, qui le libèrent eux-mêmes).
     */
    private void verifierNonReserve(Vehicule vehicule) {
        long sacsActifs = sacRepository.findByVehiculeVehiculeId(vehicule.getVehiculeId()).stream()
                .filter(s -> s.getStatut() == SacStatut.AFFECTE || s.getStatut() == SacStatut.EN_TRANSIT)
                .count();

        if (sacsActifs > 0) {
            throw new BusinessException(
                    "Ce vehicule est reserve par " + sacsActifs
                            + " sac(s) actif(s) : le supprimer ou le desaffecter d'abord", 409);
        }
    }

    private VehiculeStatut parseStatut(String statut) {
        if (statut == null || statut.isBlank()) {
            return VehiculeStatut.DISPONIBLE;
        }
        try {
            return VehiculeStatut.valueOf(statut.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Statut invalide : " + statut, 400);
        }
    }

    private void verifierTenantExiste(UUID tenantId) {
        pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant introuvable : " + tenantId));
    }
}
