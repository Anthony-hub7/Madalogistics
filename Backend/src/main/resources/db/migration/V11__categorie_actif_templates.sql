-- V11 : Ajout du flag actif (soft delete) + seed des 3 catégories standards par tenant
-- MODELE : snapshot one-shot, pas de resync automatique.
-- Chaque agence recoit ses 3 categories au seed ; les modifications locales
-- (libelle/justification) ne sont JAMAIS ecrasees par les templates futurs.
-- La condition NOT EXISTS verifie l'absence de categorie active, pas l'absence de ligne,
-- pour eviter de re-seeder un tenant qui a volontairement supprime ses categories.

-- 1. Flag actif pour soft delete (convention maison : identique a grille_tarifaire.actif)
ALTER TABLE categorie_produit
  ADD COLUMN actif BOOLEAN NOT NULL DEFAULT true;

-- Index partiel pour les requetes d'assignation (seules les actives importent)
CREATE INDEX idx_categorie_produit_actif ON categorie_produit(categorie_id) WHERE actif = true;

-- 2. Seed des 3 categories standards pour les tenants qui n'en ont aucune active
--    (agences sans seed post-V10 + agences dont le hook n'a pas tourne)
--    UN SEUL INSERT pour les 3 lignes (NOT EXISTS verifie 1 fois, pas 3)

INSERT INTO categorie_produit (categorie_id, tenant_id, libelle, classe_valeur, justification, actif)
SELECT uuid_generate_v4(), t.tenant_id, x.libelle, x.classe_valeur, x.justification, true
FROM pme_cliente t
CROSS JOIN (VALUES
  ('Fragile / Haute valeur', 'A', 'Colis contenant des marchandises fragiles ou de grande valeur (bijoux, electronique, art). Obligation de manipulation precautionneuse, emballage renforce, pas de superposition. Affectation reservee aux chauffeurs habilites (habilite_valeur=true).'),
  ('Standard', 'B', 'Colis de poids et volume moyens, pas de contrainte de manipulation particuliere. Correspond a la majorite des envois (vetiments, petit commerce, documents). Groupage standard avec n''importe quel type.'),
  ('Robuste / Lourd', 'C', 'Colis lourds ou encombrants, resistant a la manipulation (sacs de riz, briques, ferraille, engrais). Aucune contrainte de fragilite, mais necessite un vehicule a forte capacite ponderale.')
) AS x(libelle, classe_valeur, justification)
WHERE t.statut_dossier = 'VALIDEE'
  AND NOT EXISTS (
    SELECT 1 FROM categorie_produit c
    WHERE c.tenant_id = t.tenant_id AND c.actif = true
)
ON CONFLICT DO NOTHING;
