-- V28 : preuve de livraison par etape (photo BYTEA)
-- Photo de clôture stockée en BDD (même modèle que permis_scan)

ALTER TABLE etape_livraison
    ADD COLUMN photo_preuve BYTEA NULL;

CREATE INDEX idx_etape_photo_preuve ON etape_livraison(tenant_id) WHERE photo_preuve IS NOT NULL;
