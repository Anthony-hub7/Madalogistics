-- =====================================================================
-- V12 : Referentiel dynamique versionne pour categories + clustering
-- =====================================================================
-- Decisions verrouillees :
--   - N min = 30, plancher dur 10 (CHECK seuil_ml_min_colis >= 10)
--   - seuils_ml JSONB avec schema strict (validé en Java)
--   - CLUSTERING tenant-scoped (hub_id nullable, CHECK type_algorithme)
--   - colis_features denormalise (categorie_predite_id + distance_prediction)
--   - Double-ecriture classe_valeur(A/B/C) + classe_code(VARCHAR(20))
-- =====================================================================


-- =====================================================================
-- 1. pme_cliente — seuil ML + dirty flag + version referentiel
-- =====================================================================
ALTER TABLE pme_cliente
  ADD COLUMN seuil_ml_min_colis  INT NOT NULL DEFAULT 30
    CHECK (seuil_ml_min_colis >= 10),
  ADD COLUMN clustering_dirty    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN referentiel_version INT NOT NULL DEFAULT 1;


-- =====================================================================
-- 2. categorie_produit — classe_code + seuils_ml + habilite_requis
-- =====================================================================
-- 2a. Ajout classe_code (nullable temporaire pour backfill)
ALTER TABLE categorie_produit
  ADD COLUMN classe_code         VARCHAR(20),
  ADD COLUMN seuils_ml           JSONB,
  ADD COLUMN version             INT NOT NULL DEFAULT 1,
  ADD COLUMN habilite_requis     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN ml_activable        BOOLEAN NOT NULL DEFAULT true;

-- 2b. Backfill classe_code depuis classe_valeur (double-ecriture)
UPDATE categorie_produit SET classe_code = classe_valeur::TEXT;
ALTER TABLE categorie_produit ALTER COLUMN classe_code SET NOT NULL;
ALTER TABLE categorie_produit ADD CONSTRAINT uq_categorie_tenant_code
  UNIQUE (tenant_id, classe_code);

-- 2c. Backfill habilite_requis = true pour les anciennes classe A (Fragile/Valeur)
UPDATE categorie_produit SET habilite_requis = true WHERE classe_valeur = 'A';

-- 2d. Backfill seuils_ml initiaux derives des seeds V10/V11
--     Chaque classe A/B/C recoit les seuils qui matchent les seuils en dur
--     du CategorisationService.interpreteClusters() actuel.
UPDATE categorie_produit SET seuils_ml = '{
  "poids_min": null, "poids_max": null,
  "volume_min": null, "volume_max": null,
  "fragilite_min": 7, "fragilite_max": 10,
  "valeur_min": 200000, "valeur_max": null,
  "delai_max_h": null
}'::JSONB
WHERE classe_valeur = 'A';

UPDATE categorie_produit SET seuils_ml = '{
  "poids_min": null, "poids_max": null,
  "volume_min": null, "volume_max": null,
  "fragilite_min": null, "fragilite_max": null,
  "valeur_min": null, "valeur_max": null,
  "delai_max_h": null
}'::JSONB
WHERE classe_valeur = 'B';

UPDATE categorie_produit SET seuils_ml = '{
  "poids_min": 40, "poids_max": null,
  "volume_min": null, "volume_max": null,
  "fragilite_min": null, "fragilite_max": null,
  "valeur_min": null, "valeur_max": null,
  "delai_max_h": null
}'::JSONB
WHERE classe_valeur = 'C';

-- 2e. Index pour le matching ML (GIN pour recherche JSONB)
CREATE INDEX idx_categorie_seuils_ml ON categorie_produit USING GIN (seuils_ml);
CREATE INDEX idx_categorie_classe_code ON categorie_produit(classe_code);


-- =====================================================================
-- 3. sac — categorie_dominante etendue de CHAR(1) a VARCHAR(20)
-- =====================================================================
-- 3a. Supprimer l'ancien CHECK avant alteration du type
ALTER TABLE sac DROP CONSTRAINT IF EXISTS sac_categorie_dominante_check;

-- 3b. Conversion du type : CHAR(1) -> VARCHAR(20)
--     Les valeurs 'A','B','C' existantes sont preserveses.
ALTER TABLE sac ALTER COLUMN categorie_dominante TYPE VARCHAR(20)
  USING categorie_dominante::TEXT;


-- =====================================================================
-- 4. colis_features — features ML denormalisees (table separee)
-- =====================================================================
-- Pas de modification de colis (table métier, trop de dependances FK).
-- Table dediee avec cle composite (colis_id, tenant_id) pour RLS + requis ML.
CREATE TABLE colis_features (
  colis_id              UUID NOT NULL REFERENCES colis(colis_id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
  fragilite_0_10        SMALLINT CHECK (fragilite_0_10 BETWEEN 0 AND 10),
  valeur_estimee_ar     NUMERIC(12,2),
  delai_express         BOOLEAN NOT NULL DEFAULT false,
  categorie_predite_id  UUID REFERENCES categorie_produit(categorie_id) ON DELETE SET NULL,
  distance_prediction   NUMERIC(8,4),
  correction_manuelle   BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMP NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (colis_id, tenant_id)
);
CREATE INDEX idx_cf_tenant ON colis_features(tenant_id);
CREATE INDEX idx_cf_predite ON colis_features(categorie_predite_id)
  WHERE categorie_predite_id IS NOT NULL;

-- RLS
ALTER TABLE colis_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_colis_features ON colis_features
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );


-- =====================================================================
-- 5. optimisation_run — hub_id nullable pour CLUSTERING tenant-scoped
-- =====================================================================
-- 5a. Rendre hub_id nullable (les autres types restent NOT NULL via CHECK)
ALTER TABLE optimisation_run ALTER COLUMN hub_id DROP NOT NULL;

-- 5b. Ajouter CHECK : CLUSTERING -> hub_id IS NULL, sinon hub_id requis
--     L'ancien CHECK (type_algorithme) est deja present depuis V9.
ALTER TABLE optimisation_run
  ADD CONSTRAINT chk_clustering_hub
  CHECK (type_algorithme <> 'CLUSTERING' OR hub_id IS NULL);
