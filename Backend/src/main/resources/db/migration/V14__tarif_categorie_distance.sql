-- V14 : Tarification par catégorie (prix kg/m3/km/minimum) + distance sur demande_transport
-- Prix NULL = non configuré (traite comme 0 côté calcul, erreur explicite si tout à 0)

-- Ajout des colonnes prix sur categorie_produit
ALTER TABLE categorie_produit ADD COLUMN prix_par_kg   NUMERIC(10,2);
ALTER TABLE categorie_produit ADD COLUMN prix_par_m3   NUMERIC(10,2);
ALTER TABLE categorie_produit ADD COLUMN prix_par_km   NUMERIC(10,2);
ALTER TABLE categorie_produit ADD COLUMN prix_minimum  NUMERIC(10,2);

-- Ajout distance persistée sur demande_transport
ALTER TABLE demande_transport ADD COLUMN distance_km NUMERIC(10,2);
