-- V7 : Ajout du statut DESACTIVEE pour desactivation/soft-delete
--      des agences et chauffeurs par l'admin SAAS.

-- Re-creation des CHECK constraints avec DESACTIVEE inclus
ALTER TABLE pme_cliente
  DROP CONSTRAINT IF EXISTS pme_cliente_statut_dossier_check,
  ADD CONSTRAINT pme_cliente_statut_dossier_check
    CHECK (statut_dossier IN ('EN_ATTENTE','VALIDEE','REFUSEE','DESACTIVEE'));

ALTER TABLE chauffeur
  DROP CONSTRAINT IF EXISTS chauffeur_statut_dossier_check,
  ADD CONSTRAINT chauffeur_statut_dossier_check
    CHECK (statut_dossier IN ('EN_ATTENTE','VALIDEE','REFUSEE','DESACTIVEE'));
