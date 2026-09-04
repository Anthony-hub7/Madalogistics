ALTER TABLE pme_cliente
  ADD COLUMN statut_dossier VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE'
    CHECK (statut_dossier IN ('EN_ATTENTE','VALIDEE','REFUSEE')),
  ADD COLUMN motif_refus TEXT;

CREATE INDEX idx_pme_cliente_statut ON pme_cliente(statut_dossier);
