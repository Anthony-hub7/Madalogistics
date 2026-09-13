-- Migration V9 : Ajout du type CLUSTERING pour les runs d'optimisation
-- Nécessaire pour tracer les résultats du clustering non supervisé (K-Means / DBSCAN)

-- 1. Supprimer l'ancien CHECK constraint
ALTER TABLE optimisation_run DROP CONSTRAINT IF EXISTS optimisation_run_type_algorithme_check;

-- 2. Ajouter le nouveau CHECK avec CLUSTERING inclus
ALTER TABLE optimisation_run ADD CONSTRAINT optimisation_run_type_algorithme_check
    CHECK (type_algorithme IN ('KNAPSACK','BIN_PACKING','AFFECTATION','VRP','CLUSTERING'));

-- 3. Ajouter des colonnes pour le clustering dans parametres JSONB (déjà JSONB, pas de changement structurel)
-- Les résultats clustering seront stockés dans resultat JSONB avec la structure :
-- {
--   "inertie": [...],           // WCSS pour chaque k testé
--   "silhouette": [...],        // Score silhouette moyen par k
--   "davies_bouldin": [...],   // Index Davies-Bouldin par k
--   "meilleur_k": 3,           // k choisi
--   "centroides": [[...],...], // Centroïdes dénormalisés
--   "labels": [...],           // Cluster assigné à chaque colis
--   "confusion_matrix": {...}  // Matrice confusion cluster x categorie_declaree (validation)
-- }
