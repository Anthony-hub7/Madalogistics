package com.example.Bakend.dto.direction;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Reponse du dashboard « Vue d'ensemble » (Direction).
 *
 * Resume en lecture seule de tout ce que gere le responsable logistique :
 * activite (commandes, sacs, tournees), flotte (vehicules, incidents),
 * tarification (grilles, prix, factures) et equipe (chauffeurs, dossiers).
 *
 * Aucun calcul d'optimisation n'est relance ici (cf. GainsService, page Gains) :
 * ce DTO est une agregation de comptes et de sommes deja stockees.
 *
 * @param activite     commandes, sacs, tournees + dernieres commandes
 * @param flotte       vehicules par statut + alertes incident non lues
 * @param tarification grilles actives, prix moyens, chiffre d'affaires
 * @param equipe       chauffeurs par statut de dossier et par type
 */
public record TableauDeBordDirectionResponse(
        Activite activite,
        Flotte flotte,
        Tarification tarification,
        Equipe equipe) {

    /**
     * Volumes traites par le responsable logistique.
     *
     * @param commandesParStatut      repartition des demandes par statut
     * @param tauxRemplissageMoyen    moyenne des taux de remplissage sacs (null si aucun sac)
     * @param nbColis                 nombre total de colis embarques dans les sacs
     * @param tourneesParStatut       repartition des tournees par statut
     * @param kmTotal                 somme des distances des tournees (null = non renseignee)
     * @param dernieresCommandes      5 dernieres demandes triees date de creation desc
     */
    public record Activite(
            long nbCommandes,
            Map<String, Long> commandesParStatut,
            long nbSacs,
            Map<String, Long> sacsParStatut,
            Double tauxRemplissageMoyen,
            long nbColis,
            long nbTournees,
            Map<String, Long> tourneesParStatut,
            double kmTotal,
            List<DerniereCommande> dernieresCommandes) {}

    /**
     * Ligne de commande pour le tableau « dernières commandes ».
     */
    public record DerniereCommande(
            UUID demandeId,
            String destination,
            String statut,
            LocalDateTime createdAt) {}

    /**
     * Etat de la flotte + incidents signales.
     *
     * @param nbDisponibles    vehicules DISPONIBLE
     * @param incidentsNonLus  alertes INCIDENT_DECLARE non lues du tenant
     * @param derniersIncidents 5 dernieres alertes (lues ou non)
     */
    public record Flotte(
            long nbVehicules,
            Map<String, Long> vehiculesParStatut,
            long nbDisponibles,
            long incidentsNonLus,
            List<IncidentResume> derniersIncidents) {}

    /**
     * Alerte d'incident vehicule/sac affichee dans le tableau de bord.
     */
    public record IncidentResume(
            UUID notificationId,
            UUID sacId,
            String titre,
            String message,
            boolean lu,
            LocalDateTime createdAt) {}

    /**
     * Grilles tarifaires actives et chiffre d'affaires facture.
     *
     * @param prixMoyenKg  moyenne des grilles actives renseignees (null si aucune)
     * @param caPaye       somme des factures PAYEE
     * @param caEnAttente  somme des factures EMISE (a encaisser)
     * @param caAnnule      somme des factures ANNULEE
     * @param facturesEnAttente 5 dernieres factures EMISE
     */
    public record Tarification(
            long nbGrillesActives,
            Double prixMoyenKg,
            Double prixMoyenM3,
            Double prixMoyenKm,
            Double prixMinimumMoyen,
            BigDecimal caPaye,
            BigDecimal caEnAttente,
            BigDecimal caAnnule,
            long nbFacturesPayees,
            long nbFacturesEmises,
            long nbFacturesAnnulees,
            List<FactureResume> facturesEnAttente) {}

    /**
     * Ligne de facture pour le tableau « factures à encaisser ».
     */
    public record FactureResume(
            UUID factureId,
            BigDecimal montantTotal,
            String statut,
            LocalDateTime dateEmission,
            String clientNom,
            String adresseLivraison) {}

    /**
     * Dossiers chauffeurs suivis par le responsable logistique.
     *
     * @param parStatutDossier repartition EN_ATTENTE / VALIDEE / REFUSEE / ...
     * @param parType          repartition INTERNE / FREELANCE / ...
     * @param nbDisponibles    chauffeurs disponibles
     */
    public record Equipe(
            long nbChauffeurs,
            Map<String, Long> parStatutDossier,
            Map<String, Long> parType,
            long nbDisponibles,
            long nbDossiersEnAttente) {}
}
