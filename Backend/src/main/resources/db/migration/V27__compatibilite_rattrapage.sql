-- Rattrapage : creer les lignes de compatibilite manquantes
-- Chauffeurs VALIDEE × vehicules existants, compatible=true par defaut
INSERT INTO compatibilite_chauffeur_vehicule (chauffeur_id, vehicule_id, tenant_id, compatible)
SELECT c.chauffeur_id, v.vehicule_id, c.tenant_id, true
FROM chauffeur c
JOIN vehicule v ON v.tenant_id = c.tenant_id
WHERE c.statut_dossier = 'VALIDEE'
  AND NOT EXISTS (
    SELECT 1 FROM compatibilite_chauffeur_vehicule cc
    WHERE cc.chauffeur_id = c.chauffeur_id AND cc.vehicule_id = v.vehicule_id
  )
ON CONFLICT DO NOTHING;
