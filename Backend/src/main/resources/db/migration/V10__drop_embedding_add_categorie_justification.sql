-- Migration V10 : justification par catégorie + suppression embedding vectoriel
-- Supprime pgvector / justification_embedding (non utilisé), ajoute justification TEXT à categorie_produit

-- 1. Supprimer l'embedding vectoriel (jamais alimenté, recherche sémantique non implémentée)
ALTER TABLE optimisation_run DROP COLUMN IF EXISTS justification_embedding;

-- 2. Supprimer l'extension pgvector (puisque la seule colonne VECTOR est supprimée)
DROP EXTENSION IF EXISTS vector;

-- 3. Ajouter la justification saisie par la DIRECTION à chaque catégorie
ALTER TABLE categorie_produit ADD COLUMN justification TEXT;

-- 4. Seed : 3 catégories initiales par tenant existant
-- (INSERT uniquement si des tenants existent déjà ; les nouveaux tenants seront seedés par le code d'onboarding)
INSERT INTO categorie_produit (categorie_id, tenant_id, libelle, classe_valeur, justification)
SELECT uuid_generate_v4(), t.tenant_id, 'Fragile / Haute valeur', 'A',
       'Colis contenant des marchandises fragiles ou de grande valeur (bijoux, électronique, art). Obligation de manipulation précautionneuse, emballage renforcé, pas de superposition. Affectation réservée aux chauffeurs habilites (habilite_valeur=true).'
FROM pme_cliente t
WHERE NOT EXISTS (
    SELECT 1 FROM categorie_produit c
    WHERE c.tenant_id = t.tenant_id AND c.libelle = 'Fragile / Haute valeur'
)
ON CONFLICT DO NOTHING;

INSERT INTO categorie_produit (categorie_id, tenant_id, libelle, classe_valeur, justification)
SELECT uuid_generate_v4(), t.tenant_id, 'Standard', 'B',
       'Colis de poids et volume moyens, pas de contrainte de manipulation particulière. Correspond a la majorite des envois (vetiments, petit commerce, documents). Groupage standard avec n''importe quel type.'
FROM pme_cliente t
WHERE NOT EXISTS (
    SELECT 1 FROM categorie_produit c
    WHERE c.tenant_id = t.tenant_id AND c.libelle = 'Standard'
)
ON CONFLICT DO NOTHING;

INSERT INTO categorie_produit (categorie_id, tenant_id, libelle, classe_valeur, justification)
SELECT uuid_generate_v4(), t.tenant_id, 'Robuste / Lourd', 'C',
       'Colis lourds ou encombrants, resistant a la manipulation (sacs de riz, briques, ferraille, engrais). Aucune contrainte de fragilite, mais necessite un vehicule a forte capacite ponderale.'
FROM pme_cliente t
WHERE NOT EXISTS (
    SELECT 1 FROM categorie_produit c
    WHERE c.tenant_id = t.tenant_id AND c.libelle = 'Robuste / Lourd'
)
ON CONFLICT DO NOTHING;
