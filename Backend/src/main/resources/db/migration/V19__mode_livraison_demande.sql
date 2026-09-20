-- V19 : colonne mode_livraison sur demande_transport (Phase 3bis)

-- 1. Ajouter la colonne
ALTER TABLE demande_transport
    ADD COLUMN mode_livraison VARCHAR(20)
    CHECK (mode_livraison IN ('AGENCE','FREELANCE'));

-- 2. Backfill : les commandes déjà validées/ensuite passent en AGENCE par défaut
UPDATE demande_transport
    SET mode_livraison = 'AGENCE'
    WHERE mode_livraison IS NULL AND statut != 'CREEE';

-- 3. Index pour filtrage par mode lors de l'affectation (Phase 5/5bis)
CREATE INDEX idx_demande_mode_livraison ON demande_transport(tenant_id, mode_livraison)
    WHERE mode_livraison IS NOT NULL;
