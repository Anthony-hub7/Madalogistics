-- V20 : delais et date de depart calculee sur demande_transport
-- Ne jamais modifier V1 existant

-- 1. Colonnes delais
ALTER TABLE demande_transport
    ADD COLUMN delai_transit_jours NUMERIC(6,2),
    ADD COLUMN duree_trajet_heures NUMERIC(8,2),
    ADD COLUMN source_delai VARCHAR(20) CHECK (source_delai IN ('OSRM','HAVERSINE_FALLBACK')),
    ADD COLUMN date_depart_calculee DATE;

-- 2. Verification : delai >= 0
ALTER TABLE demande_transport
    ADD CONSTRAINT chk_delai_positif CHECK (delai_transit_jours IS NULL OR delai_transit_jours >= 0);

-- 3. Index pour tri urgence (date_depart_calculee croissante)
CREATE INDEX idx_demande_date_depart ON demande_transport(tenant_id, date_depart_calculee)
    WHERE date_depart_calculee IS NOT NULL;
