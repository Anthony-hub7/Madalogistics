package com.example.Bakend.controller;

import com.example.Bakend.config.TenantContext;
import com.example.Bakend.entity.*;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@RestController
@RequestMapping("/api/indisponibilites")
public class IndisponibiliteController {

    private final IndisponibiliteChauffeurRepository indispoChauffeurRepo;
    private final IndisponibiliteVehiculeRepository indispoVehiculeRepo;
    private final ChauffeurRepository chauffeurRepository;
    private final VehiculeRepository vehiculeRepository;
    private final PMEClienteRepository pmeClienteRepository;

    public IndisponibiliteController(
            IndisponibiliteChauffeurRepository indispoChauffeurRepo,
            IndisponibiliteVehiculeRepository indispoVehiculeRepo,
            ChauffeurRepository chauffeurRepository,
            VehiculeRepository vehiculeRepository,
            PMEClienteRepository pmeClienteRepository) {
        this.indispoChauffeurRepo = indispoChauffeurRepo;
        this.indispoVehiculeRepo = indispoVehiculeRepo;
        this.chauffeurRepository = chauffeurRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.pmeClienteRepository = pmeClienteRepository;
    }

    // ═══════════════════════════════════════════════════════════════
    // CHAUFFEURS
    // ═══════════════════════════════════════════════════════════════

    @GetMapping("/chauffeurs")
    public ResponseEntity<?> listerChauffeurs(
            @RequestParam UUID chauffeurId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Contexte tenant manquant"));
        }

        LocalDateTime dateFrom = from != null ? LocalDate.parse(from).atStartOfDay() : LocalDateTime.of(LocalDate.now().withDayOfYear(1), LocalTime.MIN);
        LocalDateTime dateTo = to != null ? LocalDate.parse(to).atTime(LocalTime.MAX) : LocalDateTime.of(LocalDate.now().withMonth(12).withDayOfMonth(31), LocalTime.MAX);

        List<IndisponibiliteChauffeur> indispos = indispoChauffeurRepo
                .findChevauchement(tenantId, chauffeurId, dateFrom, dateTo);

        List<Map<String, Object>> result = indispos.stream().map(i -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("indispoId", i.getIndispoId());
            m.put("chauffeurId", i.getChauffeur().getChauffeurId());
            m.put("debut", i.getDebut());
            m.put("fin", i.getFin());
            m.put("motif", i.getMotif());
            return m;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @PostMapping("/chauffeurs")
    public ResponseEntity<?> creerChauffeur(@RequestBody Map<String, Object> body) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Contexte tenant manquant"));
        }

        UUID chauffeurId = UUID.fromString((String) body.get("chauffeurId"));
        LocalDateTime debut = LocalDateTime.parse((String) body.get("debut"));
        LocalDateTime fin = LocalDateTime.parse((String) body.get("fin"));
        String motif = (String) body.getOrDefault("motif", "");

        Chauffeur chauffeur = chauffeurRepository.findByPmeClienteTenantIdAndChauffeurId(tenantId, chauffeurId)
                .orElseThrow(() -> new BusinessException("Chauffeur introuvable"));

        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new BusinessException("Tenant introuvable"));

        IndisponibiliteChauffeur indispo = new IndisponibiliteChauffeur();
        indispo.setPmeCliente(tenant);
        indispo.setChauffeur(chauffeur);
        indispo.setDebut(debut);
        indispo.setFin(fin);
        indispo.setMotif(motif);

        indispoChauffeurRepo.save(indispo);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "indispoId", indispo.getIndispoId(),
                "message", "Indisponibilite enregistree"
        ));
    }

    @DeleteMapping("/chauffeurs/{indispoId}")
    public ResponseEntity<?> supprimerChauffeur(
            @PathVariable UUID indispoId,
            @RequestParam UUID chauffeurId) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Contexte tenant manquant"));
        }

        indispoChauffeurRepo.deleteById(indispoId);
        return ResponseEntity.ok(Map.of("message", "Indisponibilite supprimee"));
    }

    // ═══════════════════════════════════════════════════════════════
    // VEHICULES
    // ═══════════════════════════════════════════════════════════════

    @GetMapping("/vehicules")
    public ResponseEntity<?> listerVehicules(
            @RequestParam UUID vehiculeId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Contexte tenant manquant"));
        }

        LocalDateTime dateFrom = from != null ? LocalDate.parse(from).atStartOfDay() : LocalDateTime.of(LocalDate.now().withDayOfYear(1), LocalTime.MIN);
        LocalDateTime dateTo = to != null ? LocalDate.parse(to).atTime(LocalTime.MAX) : LocalDateTime.of(LocalDate.now().withMonth(12).withDayOfMonth(31), LocalTime.MAX);

        List<IndisponibiliteVehicule> indispos = indispoVehiculeRepo
                .findChevauchement(tenantId, vehiculeId, dateFrom, dateTo);

        List<Map<String, Object>> result = indispos.stream().map(i -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("indispoId", i.getIndispoId());
            m.put("vehiculeId", i.getVehicule().getVehiculeId());
            m.put("debut", i.getDebut());
            m.put("fin", i.getFin());
            m.put("motif", i.getMotif());
            return m;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @PostMapping("/vehicules")
    public ResponseEntity<?> creerVehicule(@RequestBody Map<String, Object> body) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Contexte tenant manquant"));
        }

        UUID vehiculeId = UUID.fromString((String) body.get("vehiculeId"));
        LocalDateTime debut = LocalDateTime.parse((String) body.get("debut"));
        LocalDateTime fin = LocalDateTime.parse((String) body.get("fin"));
        String motif = (String) body.getOrDefault("motif", "");

        Vehicule vehicule = vehiculeRepository.findByPmeClienteTenantIdAndVehiculeId(tenantId, vehiculeId)
                .orElseThrow(() -> new BusinessException("Vehicule introuvable"));

        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new BusinessException("Tenant introuvable"));

        IndisponibiliteVehicule indispo = new IndisponibiliteVehicule();
        indispo.setPmeCliente(tenant);
        indispo.setVehicule(vehicule);
        indispo.setDebut(debut);
        indispo.setFin(fin);
        indispo.setMotif(motif);

        indispoVehiculeRepo.save(indispo);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "indispoId", indispo.getIndispoId(),
                "message", "Indisponibilite enregistree"
        ));
    }

    @DeleteMapping("/vehicules/{indispoId}")
    public ResponseEntity<?> supprimerVehicule(
            @PathVariable UUID indispoId,
            @RequestParam UUID vehiculeId) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Contexte tenant manquant"));
        }

        indispoVehiculeRepo.deleteById(indispoId);
        return ResponseEntity.ok(Map.of("message", "Indisponibilite supprimee"));
    }
}
