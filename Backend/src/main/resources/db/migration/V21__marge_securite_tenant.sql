-- V21 : marge de securite sur pme_cliente (pas de vitesse ni heures — constantes code)
-- Ne jamais modifier V1 existant

ALTER TABLE pme_cliente
    ADD COLUMN marge_securite_pct NUMERIC(5,2) NOT NULL DEFAULT 15.00;

ALTER TABLE pme_cliente
    ADD CONSTRAINT chk_marge_securite CHECK (marge_securite_pct >= 0 AND marge_securite_pct <= 100);
