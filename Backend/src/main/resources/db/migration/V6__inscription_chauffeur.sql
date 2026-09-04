-- V6 : Inscription chauffeur full — identité, permis, workflow dossier, véhicule étendu
--      + tenant plateforme (porteur des véhicules freelance en attente d'affectation)

-- =====================================================================
-- 1. Tenant PLATEFORME (porteur véhicules freelance, tenant_id NULL en attente)
-- =====================================================================
-- On crée un tenant dédié pour les chauffeurs freelance et véhicules en attente.
-- seed fixe : on récupère le UUID via subquery dans les inserts qui suivent.
-- Pas d'UNIQUE sur nom_entreprise → INSERT simple, idempotent via DO block.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pme_cliente WHERE nom_entreprise = 'PLATEFORME MADALOGISTIX') THEN
    INSERT INTO pme_cliente (tenant_id, nom_entreprise, seuil_remplissage_min, statut_dossier)
    VALUES (uuid_generate_v4(), 'PLATEFORME MADALOGISTIX', 80.00, 'VALIDEE');
  END IF;
END $$;

-- =====================================================================
-- 2. Identité étendue sur utilisateur (NULLables pour comptes existants)
-- =====================================================================
ALTER TABLE utilisateur
  ADD COLUMN cin             VARCHAR(20),
  ADD COLUMN date_naissance  DATE,
  ADD COLUMN sexe            CHAR(1) CHECK (sexe IN ('M','F')),
  ADD COLUMN adresse         VARCHAR(500);

CREATE UNIQUE INDEX idx_utilisateur_cin ON utilisateur(cin) WHERE cin IS NOT NULL;

-- =====================================================================
-- 3. Dossier chauffeur sur chauffeur
-- =====================================================================
ALTER TABLE chauffeur
  ADD COLUMN permis_numero      VARCHAR(50),
  ADD COLUMN permis_categorie   VARCHAR(10),
  ADD COLUMN permis_categories  VARCHAR(50),
  ADD COLUMN permis_expiration  DATE,
  ADD COLUMN permis_scan        BYTEA,
  ADD COLUMN experience_annees  INTEGER CHECK (experience_annees >= 0),
  ADD COLUMN type_chauffeur     VARCHAR(20) CHECK (type_chauffeur IN ('RATTACHE','FREELANCE')),
  ADD COLUMN statut_dossier     VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE'
    CHECK (statut_dossier IN ('EN_ATTENTE','VALIDEE','REFUSEE')),
  ADD COLUMN motif_refus        TEXT,
  ADD COLUMN agence_cible_id    UUID REFERENCES pme_cliente(tenant_id) ON DELETE SET NULL;

CREATE INDEX idx_chauffeur_statut ON chauffeur(statut_dossier);
CREATE INDEX idx_chauffeur_type   ON chauffeur(type_chauffeur);

-- =====================================================================
-- 4. Détail véhicule étendu + hub nullable (freelance sans hub)
-- =====================================================================
ALTER TABLE vehicule
  ADD COLUMN marque_modele  VARCHAR(255),
  ADD COLUMN type_vehicule  VARCHAR(100),
  ADD COLUMN annee          INTEGER CHECK (annee BETWEEN 1990 AND 2100),
  ADD COLUMN ptac_tonnes    NUMERIC(6,2),
  ALTER COLUMN hub_id       DROP NOT NULL;
