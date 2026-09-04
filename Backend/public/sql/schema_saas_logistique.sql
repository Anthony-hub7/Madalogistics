-- =====================================================================
-- SCHEMA SQL — SaaS de gestion logistique et de flotte pour PME (Madagascar)
-- Multi-tenant : shared database / shared schema, discriminant tenant_id
-- SGBD cible : PostgreSQL (extension pgvector requise pour les embeddings)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pour justification_embedding (OptimisationRun)

-- =====================================================================
-- 1. PMECliente (tenant)
-- =====================================================================
CREATE TABLE pme_cliente (
    tenant_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_entreprise        VARCHAR(255) NOT NULL,
    seuil_remplissage_min NUMERIC(5,2) NOT NULL DEFAULT 80.00 CHECK (seuil_remplissage_min BETWEEN 0 AND 100),
    created_at            TIMESTAMP NOT NULL DEFAULT now(),
    updated_at            TIMESTAMP NOT NULL DEFAULT now()
);

-- =====================================================================
-- 2. Hub
-- =====================================================================
CREATE TABLE hub (
    hub_id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    nom                  VARCHAR(255) NOT NULL,
    zone_securisee_dispo BOOLEAN NOT NULL DEFAULT false,
    created_at           TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_hub_tenant ON hub(tenant_id);

-- =====================================================================
-- 3. ClientFinal
-- =====================================================================
CREATE TABLE client_final (
    client_final_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    nom             VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_final_tenant ON client_final(tenant_id);

-- =====================================================================
-- 4. CategorieProduit
-- =====================================================================
CREATE TABLE categorie_produit (
    categorie_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    libelle       VARCHAR(255) NOT NULL,
    classe_valeur CHAR(1) NOT NULL CHECK (classe_valeur IN ('A','B','C'))
);
CREATE INDEX idx_categorie_produit_tenant ON categorie_produit(tenant_id);

-- =====================================================================
-- 5. Utilisateur (gestionnaire, chauffeur, direction, admin_saas)
-- =====================================================================
CREATE TABLE utilisateur (
    utilisateur_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE, -- NULL si ADMIN_SAAS (transverse)
    nom             VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role            VARCHAR(30) NOT NULL CHECK (role IN ('GESTIONNAIRE','CHAUFFEUR','DIRECTION','ADMIN_SAAS','CLIENT_FINAL')),
    habilite_valeur BOOLEAN DEFAULT false, -- pertinent si role = CHAUFFEUR
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_utilisateur_tenant ON utilisateur(tenant_id);
CREATE INDEX idx_utilisateur_role ON utilisateur(role);

-- =====================================================================
-- 6. Vehicule
-- =====================================================================
CREATE TABLE vehicule (
    vehicule_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id          UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    hub_id             UUID NOT NULL REFERENCES hub(hub_id) ON DELETE CASCADE,
    immatriculation    VARCHAR(50) NOT NULL,
    capacite_poids_kg  NUMERIC(10,2) NOT NULL,
    capacite_volume_m3 NUMERIC(10,2) NOT NULL,
    statut             VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE',
    created_at         TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicule_tenant ON vehicule(tenant_id);
CREATE INDEX idx_vehicule_hub ON vehicule(hub_id);

-- =====================================================================
-- 7. Chauffeur (détail métier, lié à Utilisateur)
-- =====================================================================
CREATE TABLE chauffeur (
    chauffeur_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    utilisateur_id  UUID NOT NULL UNIQUE REFERENCES utilisateur(utilisateur_id) ON DELETE CASCADE,
    vehicule_id     UUID REFERENCES vehicule(vehicule_id) ON DELETE SET NULL, -- véhicule habituellement affecté
    telephone       VARCHAR(30),
    disponible      BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_chauffeur_tenant ON chauffeur(tenant_id);

-- Compatibilité chauffeur <-> véhicule (a_ij dans le modèle mathématique)
CREATE TABLE compatibilite_chauffeur_vehicule (
    tenant_id    UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    chauffeur_id UUID NOT NULL REFERENCES chauffeur(chauffeur_id) ON DELETE CASCADE,
    vehicule_id  UUID NOT NULL REFERENCES vehicule(vehicule_id) ON DELETE CASCADE,
    compatible   BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (chauffeur_id, vehicule_id)
);

-- =====================================================================
-- 8. Grille tarifaire (par tenant)
-- =====================================================================
CREATE TABLE grille_tarifaire (
    grille_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    libelle        VARCHAR(255) NOT NULL,
    prix_par_kg    NUMERIC(10,2),
    prix_par_m3    NUMERIC(10,2),
    prix_minimum   NUMERIC(10,2),
    actif          BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_grille_tarifaire_tenant ON grille_tarifaire(tenant_id);

-- =====================================================================
-- 9. DemandeTransport
-- =====================================================================
CREATE TABLE demande_transport (
    demande_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    client_final_id UUID NOT NULL REFERENCES client_final(client_final_id) ON DELETE CASCADE,
    hub_id         UUID NOT NULL REFERENCES hub(hub_id) ON DELETE CASCADE,
    adresse_collecte  VARCHAR(500),
    adresse_livraison VARCHAR(500),
    tarif          NUMERIC(10,2),
    statut         VARCHAR(30) NOT NULL DEFAULT 'CREEE'
                   CHECK (statut IN ('CREEE','EN_ATTENTE_GROUPAGE','GROUPEE','EN_TRANSIT','LIVREE','INCIDENT')),
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_demande_tenant ON demande_transport(tenant_id);
CREATE INDEX idx_demande_hub ON demande_transport(hub_id);
CREATE INDEX idx_demande_statut ON demande_transport(statut);

-- =====================================================================
-- 10. OptimisationRun (run Knapsack / Bin Packing / Affectation / VRP)
-- =====================================================================
CREATE TABLE optimisation_run (
    run_id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    hub_id                  UUID NOT NULL REFERENCES hub(hub_id) ON DELETE CASCADE,
    type_algorithme         VARCHAR(30) NOT NULL CHECK (type_algorithme IN ('KNAPSACK','BIN_PACKING','AFFECTATION','VRP')),
    parametres              JSONB,
    resultat                JSONB,
    justification_document  TEXT,          -- raisonnement en langage clair
    justification_embedding VECTOR(1536),  -- recherche sémantique, sans recours à un LLM à l'exécution
    duree_calcul_ms         INTEGER,
    created_at              TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_optim_run_tenant ON optimisation_run(tenant_id);
CREATE INDEX idx_optim_run_hub ON optimisation_run(hub_id);
CREATE INDEX idx_optim_run_type ON optimisation_run(type_algorithme);

-- =====================================================================
-- 11. Sac (unité opérationnelle du groupage)
-- =====================================================================
CREATE TABLE sac (
    sac_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id          UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    hub_id             UUID NOT NULL REFERENCES hub(hub_id) ON DELETE CASCADE,
    vehicule_id        UUID REFERENCES vehicule(vehicule_id) ON DELETE SET NULL,  -- null tant que non affecté
    chauffeur_id       UUID REFERENCES chauffeur(chauffeur_id) ON DELETE SET NULL, -- null tant que non affecté
    categorie_dominante CHAR(1) CHECK (categorie_dominante IN ('A','B','C')), -- dérivée du contenu
    taux_remplissage   NUMERIC(5,2),
    run_groupage_id    UUID REFERENCES optimisation_run(run_id) ON DELETE SET NULL,
    run_affectation_id UUID REFERENCES optimisation_run(run_id) ON DELETE SET NULL,
    statut             VARCHAR(30) NOT NULL DEFAULT 'CONSTITUE'
                       CHECK (statut IN ('CONSTITUE','AFFECTE','EN_TRANSIT','LIVRE')),
    created_at         TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_sac_tenant ON sac(tenant_id);
CREATE INDEX idx_sac_hub ON sac(hub_id);
CREATE INDEX idx_sac_vehicule ON sac(vehicule_id);
CREATE INDEX idx_sac_chauffeur ON sac(chauffeur_id);

-- =====================================================================
-- 12. Colis (unité physique de marchandise composant une DemandeTransport)
-- =====================================================================
CREATE TABLE colis (
    colis_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    demande_id   UUID NOT NULL REFERENCES demande_transport(demande_id) ON DELETE CASCADE,
    categorie_id UUID REFERENCES categorie_produit(categorie_id) ON DELETE SET NULL,
    sac_id       UUID REFERENCES sac(sac_id) ON DELETE SET NULL, -- null tant que non groupé
    poids_kg     NUMERIC(10,2) NOT NULL,
    volume_m3    NUMERIC(10,2) NOT NULL,
    etat         VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
    created_at   TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_colis_tenant ON colis(tenant_id);
CREATE INDEX idx_colis_demande ON colis(demande_id);
CREATE INDEX idx_colis_sac ON colis(sac_id);

-- =====================================================================
-- 13. Incident
-- =====================================================================
CREATE TABLE incident (
    incident_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    colis_id      UUID NOT NULL REFERENCES colis(colis_id) ON DELETE CASCADE,
    type_incident VARCHAR(50) NOT NULL, -- ex: CASSE, RETARD, PERTE
    description   TEXT,
    statut        VARCHAR(30) NOT NULL DEFAULT 'DECLARE' CHECK (statut IN ('DECLARE','EN_COURS','RESOLU')),
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_incident_tenant ON incident(tenant_id);
CREATE INDEX idx_incident_colis ON incident(colis_id);

-- =====================================================================
-- 14. Facture
-- =====================================================================
CREATE TABLE facture (
    facture_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    demande_id    UUID NOT NULL UNIQUE REFERENCES demande_transport(demande_id) ON DELETE CASCADE,
    montant_total NUMERIC(12,2) NOT NULL,
    statut        VARCHAR(30) NOT NULL DEFAULT 'EMISE' CHECK (statut IN ('EMISE','PAYEE','ANNULEE')),
    date_emission TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_facture_tenant ON facture(tenant_id);

-- =====================================================================
-- 15. Tournee (optionnelle en V1, peuplée si VRP activé)
-- =====================================================================
CREATE TABLE tournee (
    tournee_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    sac_id            UUID NOT NULL REFERENCES sac(sac_id) ON DELETE CASCADE,
    run_vrp_id        UUID REFERENCES optimisation_run(run_id) ON DELETE SET NULL, -- null tant que VRP non actif
    distance_totale_km NUMERIC(10,2),
    statut            VARCHAR(30) NOT NULL DEFAULT 'PLANIFIEE'
                      CHECK (statut IN ('PLANIFIEE','EN_COURS','TERMINEE')),
    created_at        TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_tournee_tenant ON tournee(tenant_id);
CREATE INDEX idx_tournee_sac ON tournee(sac_id);

-- =====================================================================
-- 16. EtapeLivraison
-- =====================================================================
CREATE TABLE etape_livraison (
    etape_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id          UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    tournee_id         UUID NOT NULL REFERENCES tournee(tournee_id) ON DELETE CASCADE,
    colis_id           UUID NOT NULL REFERENCES colis(colis_id) ON DELETE CASCADE,
    ordre              INTEGER NOT NULL,
    type_etape         VARCHAR(20) NOT NULL CHECK (type_etape IN ('COLLECTE','LIVRAISON')),
    date_heure_prevue  TIMESTAMP,
    date_heure_reelle  TIMESTAMP
);
CREATE INDEX idx_etape_tenant ON etape_livraison(tenant_id);
CREATE INDEX idx_etape_tournee ON etape_livraison(tournee_id);

-- =====================================================================
-- 17. Audit / traçabilité (BNF-08)
-- =====================================================================
CREATE TABLE audit_log (
    audit_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    utilisateur_id UUID REFERENCES utilisateur(utilisateur_id) ON DELETE SET NULL,
    entite        VARCHAR(100) NOT NULL,   -- ex: DemandeTransport, Sac, Facture
    entite_id     UUID NOT NULL,
    action        VARCHAR(30) NOT NULL,    -- CREATION, MODIFICATION, VALIDATION, SUPPRESSION
    details       JSONB,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_entite ON audit_log(entite, entite_id);

-- =====================================================================
-- FIN DU SCHEMA
-- =====================================================================
