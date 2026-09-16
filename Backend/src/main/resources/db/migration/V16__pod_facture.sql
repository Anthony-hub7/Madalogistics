-- V16 : Preuve de livraison (POD) + horaires hub
-- Phase client : photo/signature côté chauffeur, horaires d'affichage côté client

-- Étape livraison : colonnes POD
ALTER TABLE etape_livraison
    ADD COLUMN IF NOT EXISTS photo_url TEXT,
    ADD COLUMN IF NOT EXISTS signature_nom VARCHAR(255),
    ADD COLUMN IF NOT EXISTS date_signature TIMESTAMP;

-- Hub : horaires d'ouverture (pour affichage côté client)
ALTER TABLE hub
    ADD COLUMN IF NOT EXISTS horaires VARCHAR(100);
