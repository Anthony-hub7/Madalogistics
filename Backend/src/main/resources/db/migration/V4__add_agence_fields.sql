-- V4 : Ajout des colonnes d'inscription agence (nif, stat, telephone, adresse, site_web)
--      et stockage des documents administratifs en BYTEA

ALTER TABLE pme_cliente
  ADD COLUMN nif                    VARCHAR(50),
  ADD COLUMN stat                   VARCHAR(50),
  ADD COLUMN telephone              VARCHAR(30),
  ADD COLUMN adresse                VARCHAR(500),
  ADD COLUMN site_web               VARCHAR(255),
  ADD COLUMN document_kbis          BYTEA,
  ADD COLUMN document_attestation   BYTEA,
  ADD COLUMN document_assurance     BYTEA;
