-- Ajout des colonnes adresse, géolocalisation et actif sur hub
-- pour unifier HubsPage et CarteHubsPage sur la base BDD.

ALTER TABLE hub ADD COLUMN adresse VARCHAR(500);
ALTER TABLE hub ADD COLUMN latitude DOUBLE PRECISION;
ALTER TABLE hub ADD COLUMN longitude DOUBLE PRECISION;
ALTER TABLE hub ADD COLUMN actif BOOLEAN NOT NULL DEFAULT TRUE;
