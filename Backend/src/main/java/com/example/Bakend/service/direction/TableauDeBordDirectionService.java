package com.example.Bakend.service.direction;

import com.example.Bakend.dto.direction.TableauDeBordDirectionResponse;
import com.example.Bakend.dto.direction.TableauDeBordDirectionResponse.Activite;
import com.example.Bakend.dto.direction.TableauDeBordDirectionResponse.DerniereCommande;
import com.example.Bakend.dto.direction.TableauDeBordDirectionResponse.Equipe;
import com.example.Bakend.dto.direction.TableauDeBordDirectionResponse.FactureResume;
import com.example.Bakend.dto.direction.TableauDeBordDirectionResponse.Flotte;
import com.example.Bakend.dto.direction.TableauDeBordDirectionResponse.IncidentResume;
import com.example.Bakend.dto.direction.TableauDeBordDirectionResponse.Tarification;
import com.example.Bakend.entity.Chauffeur;
import com.example.Bakend.entity.Facture;
import com.example.Bakend.entity.GrilleTarifaire;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.service.NotificationService;
import com.example.Bakend.repository.ChauffeurRepository;
import com.example.Bakend.repository.DemandeTransportRepository;
import com.example.Bakend.repository.FactureRepository;
import com.example.Bakend.repository.GrilleTarifaireRepository;
import com.example.Bakend.repository.NotificationRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.SacRepository;
import com.example.Bakend.repository.TourneeRepository;
import com.example.Bakend.repository.VehiculeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Dashboard « Vue d'ensemble » (Direction) — resume en lecture seule
 * de l'activite geree par le responsable logistique.
 *
 * Regroupe en un seul appel : commandes / sacs / tournees (groupage), flotte
 * et incidents, grilles tarifaires et facturation, dossiers chauffeurs.
 * Aucune simulation n'est relancee : la comparaison baseline/optimise reste
 * sur la page Gains (cf. GainsService).
 */
@Service
@Transactional(readOnly = true)
public class TableauDeBordDirectionService {

    private static final int NB_DERNIERES_LIGNES = 5;

    private final PMEClienteRepository pmeClienteRepository;
    private final DemandeTransportRepository demandeRepository;
    private final SacRepository sacRepository;
    private final TourneeRepository tourneeRepository;
    private final VehiculeRepository vehiculeRepository;
    private final NotificationRepository notificationRepository;
    private final GrilleTarifaireRepository grilleTarifaireRepository;
    private final FactureRepository factureRepository;
    private final ChauffeurRepository chauffeurRepository;

    public TableauDeBordDirectionService(PMEClienteRepository pmeClienteRepository,
                                         DemandeTransportRepository demandeRepository,
                                         SacRepository sacRepository,
                                         TourneeRepository tourneeRepository,
                                         VehiculeRepository vehiculeRepository,
                                         NotificationRepository notificationRepository,
                                         GrilleTarifaireRepository grilleTarifaireRepository,
                                         FactureRepository factureRepository,
                                         ChauffeurRepository chauffeurRepository) {
        this.pmeClienteRepository = pmeClienteRepository;
        this.demandeRepository = demandeRepository;
        this.sacRepository = sacRepository;
        this.tourneeRepository = tourneeRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.notificationRepository = notificationRepository;
        this.grilleTarifaireRepository = grilleTarifaireRepository;
        this.factureRepository = factureRepository;
        this.chauffeurRepository = chauffeurRepository;
    }

    public TableauDeBordDirectionResponse construire(UUID tenantId) {
        verifierTenant(tenantId);

        return new TableauDeBordDirectionResponse(
                activite(tenantId),
                flotte(tenantId),
                tarification(tenantId),
                equipe(tenantId));
    }

    /** Commandes, sacs, tournees + 5 dernieres commandes. */
    private Activite activite(UUID tenantId) {
        var demandes = demandeRepository.findByPmeClienteTenantId(tenantId);

        List<DerniereCommande> dernieresCommandes = demandes.stream()
                .sorted(Comparator.comparing(
                        d -> d.getCreatedAt() != null ? d.getCreatedAt() : LocalDateTime.MIN,
                        Comparator.reverseOrder()))
                .limit(NB_DERNIERES_LIGNES)
                .map(d -> new DerniereCommande(
                        d.getDemandeId(),
                        d.getAdresseLivraison() != null
                                ? d.getAdresseLivraison()
                                : d.getNomDestinataire(),
                        d.getStatut() != null ? d.getStatut().name() : null,
                        d.getCreatedAt()))
                .toList();

        var sacs = sacRepository.findByPmeClienteTenantId(tenantId);
        double tauxMoyen = sacs.stream()
                .map(s -> s.getTauxRemplissage())
                .filter(Objects::nonNull)
                .mapToDouble(BigDecimal::doubleValue)
                .average()
                .orElse(Double.NaN);
        Double tauxRemplissageMoyen = Double.isNaN(tauxMoyen)
                ? null
                : BigDecimal.valueOf(tauxMoyen).setScale(1, RoundingMode.HALF_UP).doubleValue();
        long nbColis = sacs.stream().mapToLong(s -> s.getColis().size()).sum();

        var tournees = tourneeRepository.findByPmeClienteTenantId(tenantId);
        double kmTotal = tournees.stream()
                .map(t -> t.getDistanceTotaleKm())
                .filter(Objects::nonNull)
                .mapToDouble(BigDecimal::doubleValue)
                .sum();

        return new Activite(
                demandes.size(),
                compterParStatut(demandes, d -> d.getStatut() != null ? d.getStatut().name() : "INCONNUE"),
                sacs.size(),
                compterParStatut(sacs, s -> s.getStatut() != null ? s.getStatut().name() : "INCONNUE"),
                tauxRemplissageMoyen,
                nbColis,
                tournees.size(),
                compterParStatut(tournees, t -> t.getStatut() != null ? t.getStatut().name() : "INCONNUE"),
                kmTotal,
                dernieresCommandes);
    }

    /** Vehicules par statut + alertes incident non lues. */
    private Flotte flotte(UUID tenantId) {
        var vehicules = vehiculeRepository.findByPmeClienteTenantId(tenantId);
        Map<String, Long> parStatut = compterParStatut(
                vehicules, v -> v.getStatut() != null ? v.getStatut().name() : "INCONNUE");
        long nbDisponibles = parStatut.getOrDefault("DISPONIBLE", 0L);

        var incidents = notificationRepository.rechercherParType(
                tenantId, NotificationService.TYPE_INCIDENT_DECLARE);
        long nonLus = incidents.stream().filter(n -> !n.isLu()).count();
        List<IncidentResume> derniersIncidents = incidents.stream()
                .limit(NB_DERNIERES_LIGNES)
                .map(n -> new IncidentResume(
                        n.getNotificationId(),
                        n.getSac() != null ? n.getSac().getSacId() : null,
                        n.getTitre(),
                        n.getMessage(),
                        n.isLu(),
                        n.getCreatedAt()))
                .toList();

        return new Flotte(
                vehicules.size(),
                parStatut,
                nbDisponibles,
                nonLus,
                derniersIncidents);
    }

    /** Grilles actives, prix moyens et chiffre d'affaires facture. */
    private Tarification tarification(UUID tenantId) {
        var grilles = grilleTarifaireRepository
                .findByPmeClienteTenantIdAndActifTrueOrderByLibelleAsc(tenantId);
        long nbGrillesActives = grilles.size();

        var factures = factureRepository.findByPmeClienteTenantId(tenantId);
        Map<String, Long> facturesParStatut = compterParStatut(
                factures, f -> f.getStatut() != null ? f.getStatut().name() : "INCONNUE");

        List<FactureResume> facturesEnAttente = factures.stream()
                .filter(f -> f.getStatut() != null && f.getStatut().name().equals("EMISE"))
                .sorted(Comparator.comparing(
                        f -> f.getDateEmission() != null ? f.getDateEmission() : LocalDateTime.MIN,
                        Comparator.reverseOrder()))
                .limit(NB_DERNIERES_LIGNES)
                .map(TableauDeBordDirectionService::toFactureResume)
                .toList();

        return new Tarification(
                nbGrillesActives,
                moyenne(grilles, g -> g.getPrixParKg()),
                moyenne(grilles, g -> g.getPrixParM3()),
                moyenne(grilles, g -> g.getPrixParKm()),
                moyenne(grilles, g -> g.getPrixMinimum()),
                sommeParStatut(factures, "PAYEE"),
                sommeParStatut(factures, "EMISE"),
                sommeParStatut(factures, "ANNULEE"),
                facturesParStatut.getOrDefault("PAYEE", 0L),
                facturesParStatut.getOrDefault("EMISE", 0L),
                facturesParStatut.getOrDefault("ANNULEE", 0L),
                facturesEnAttente);
    }

    /** Dossiers chauffeurs suivis (statut de dossier + type interne/freelance). */
    private Equipe equipe(UUID tenantId) {
        var chauffeurs = chauffeurRepository.findByPmeClienteTenantId(tenantId);
        Map<String, Long> parStatutDossier = compterParStatut(
                chauffeurs, c -> c.getStatutDossier() != null ? c.getStatutDossier() : "INCONNUE");
        Map<String, Long> parType = compterParStatut(
                chauffeurs, c -> c.getTypeChauffeur() != null ? c.getTypeChauffeur() : "INCONNU");

        return new Equipe(
                chauffeurs.size(),
                parStatutDossier,
                parType,
                chauffeurs.stream().filter(Chauffeur::isDisponible).count(),
                parStatutDossier.getOrDefault("EN_ATTENTE", 0L));
    }

    private static FactureResume toFactureResume(Facture f) {
        var demande = f.getDemande();
        return new FactureResume(
                f.getFactureId(),
                f.getMontantTotal(),
                f.getStatut() != null ? f.getStatut().name() : null,
                f.getDateEmission(),
                demande != null && demande.getClientFinal() != null
                        ? demande.getClientFinal().getNom()
                        : null,
                demande != null ? demande.getAdresseLivraison() : null);
    }

    private static <T> Map<String, Long> compterParStatut(List<T> elements, Function<T, String> libelle) {
        return elements.stream()
                .collect(Collectors.groupingBy(libelle, TreeMap::new, Collectors.counting()));
    }

    /** Somme des montants (null ignores) d'une liste de factures pour un statut. */
    private static BigDecimal sommeParStatut(List<Facture> factures, String statut) {
        return factures.stream()
                .filter(f -> f.getStatut() != null && f.getStatut().name().equals(statut))
                .map(Facture::getMontantTotal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Moyenne des grilles actives dont le prix est renseigne (null sinon). */
    private static Double moyenne(List<GrilleTarifaire> grilles,
                                  Function<GrilleTarifaire, BigDecimal> prix) {
        var valeurs = grilles.stream()
                .map(prix)
                .filter(Objects::nonNull)
                .toList();
        if (valeurs.isEmpty()) {
            return null;
        }
        double moyenne = valeurs.stream().mapToDouble(BigDecimal::doubleValue).average().orElse(Double.NaN);
        return BigDecimal.valueOf(moyenne).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private void verifierTenant(UUID tenantId) {
        if (!pmeClienteRepository.existsByTenantId(tenantId)) {
            throw new ResourceNotFoundException("Tenant introuvable : " + tenantId);
        }
    }
}
