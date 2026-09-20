-- V22 : indisponibilites chauffeur/vehicule + dates depart sac/tournee
-- Ne jamais modifier V1 existant

-- 1. Indisponibilite chauffeur
CREATE TABLE indisponibilite_chauffeur (
    indispo_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    chauffeur_id     UUID NOT NULL REFERENCES chauffeur(chauffeur_id) ON DELETE CASCADE,
    debut            TIMESTAMP NOT NULL,
    fin              TIMESTAMP NOT NULL,
    motif            TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT chk_indispo_chauffeur_dates CHECK (fin > debut)
);

CREATE INDEX idx_indispo_chauffeur_tenant ON indisponibilite_chauffeur(tenant_id);
CREATE INDEX idx_indispo_chauffeur_cible ON indisponibilite_chauffeur(chauffeur_id, debut, fin);

-- 2. Indisponibilite vehicule
CREATE TABLE indisponibilite_vehicule (
    indispo_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    vehicule_id      UUID NOT NULL REFERENCES vehicule(vehicule_id) ON DELETE CASCADE,
    debut            TIMESTAMP NOT NULL,
    fin              TIMESTAMP NOT NULL,
    motif            TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT chk_indispo_vehicule_dates CHECK (fin > debut)
);

CREATE INDEX idx_indispo_vehicule_tenant ON indisponibilite_vehicule(tenant_id);
CREATE INDEX idx_indispo_vehicule_cible ON indisponibilite_vehicule(vehicule_id, debut, fin);

-- 3. Dates depart sur sac
ALTER TABLE sac
    ADD COLUMN date_depart_plafond DATE,
    ADD COLUMN date_depart_prevue DATE;

-- 4. Date depart sur tournee
ALTER TABLE tournee
    ADD COLUMN date_depart_prevue TIMESTAMP;
