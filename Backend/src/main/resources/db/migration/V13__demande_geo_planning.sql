-- V13 : enrichir demande_transport avec géolocalisation, planning, destinataire, refus
-- Ne jamais modifier V1 existant

-- 1. Élargir le CHECK statut : +VALIDEE, REFUSEE, ANNULEE (garde les 6 existants pour compat groupage/facturation)
ALTER TABLE demande_transport DROP CONSTRAINT IF EXISTS demande_transport_statut_check;
ALTER TABLE demande_transport
    ADD CONSTRAINT demande_transport_statut_check
    CHECK (statut IN ('CREEE','VALIDEE','REFUSEE','ANNULEE','EN_ATTENTE_GROUPAGE','GROUPEE','EN_TRANSIT','LIVREE','INCIDENT'));

-- 2. Colonnes géolocalisation collecte / livraison
ALTER TABLE demande_transport
    ADD COLUMN latitude_collecte   DOUBLE PRECISION,
    ADD COLUMN longitude_collecte  DOUBLE PRECISION,
    ADD COLUMN latitude_livraison  DOUBLE PRECISION,
    ADD COLUMN longitude_livraison DOUBLE PRECISION;

-- 3. Colonnes planning (date souhaitée, créneau horaire)
ALTER TABLE demande_transport
    ADD COLUMN date_souhaitee DATE,
    ADD COLUMN creneau        VARCHAR(30);

-- 4. Colonnes destinataire
ALTER TABLE demande_transport
    ADD COLUMN nom_destinataire  VARCHAR(255),
    ADD COLUMN tel_destinataire  VARCHAR(50);

-- 5. Colonnes validation / refus
ALTER TABLE demande_transport
    ADD COLUMN motif_refus  TEXT,
    ADD COLUMN valide_par   UUID REFERENCES utilisateur(utilisateur_id) ON DELETE SET NULL,
    ADD COLUMN grille_id    UUID REFERENCES grille_tarifaire(grille_id) ON DELETE SET NULL;

-- 6. Lier un CLIENT_FINAL utilisateur à son client_final
ALTER TABLE utilisateur
    ADD COLUMN client_final_id UUID REFERENCES client_final(client_final_id) ON DELETE SET NULL;
CREATE INDEX idx_utilisateur_client_final ON utilisateur(client_final_id)
    WHERE client_final_id IS NOT NULL;

-- 7. Index pour le planning (recherche par date souhaitée)
CREATE INDEX idx_demande_date_souhaitee ON demande_transport(tenant_id, date_souhaitee)
    WHERE date_souhaitee IS NOT NULL;
