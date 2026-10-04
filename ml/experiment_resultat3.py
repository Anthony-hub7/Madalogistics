#!/usr/bin/env python3
"""
experiment_resultat3.py — Expérience Résultat 3 : sans optimisation vs MadaLogistix.

Enchaine les VRAIS algorithmes du projet (backend Spring Boot) sur un lot de donnees :

  0. Reinitialisation du tenant de demonstration + chargement du lot (SQL)
  1. Catégorisation   POST /api/optimisation/categorisation            (K-Means)
  2. Groupage         POST /api/optimisation/groupage/comparer         (FFD vs Knapsack)
                      POST /api/optimisation/groupage/preview + /valider-edite
  3. Affectation      POST /api/optimisation/affectation/preview + /valider
  4. Tournées         POST /api/optimisation/vrp/preview + /valider    (OR-Tools)
  5. Gains            GET  /api/direction/gains                       (baseline vs optimise)

Sortie : results/experiment_<lot>.json  (a reporter dans docs/RESULTAT3-comparaison.md)

Usage :
    python3 experiment_resultat3.py --lot S
    python3 experiment_resultat3.py --lot M
    python3 experiment_resultat3.py --lot L

Prerequis : stack docker levee (db + backend), lot genere (ml/generate_lot_groupage.py),
utilisateur DIRECTION du tenant de demonstration (auto-cree par --init-users).
"""

import argparse
import datetime as dt
import json
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

import jwt as pyjwt

# ── Configuration ────────────────────────────────────────────────────────────
BASE = "http://localhost:8081/api"
TENANT = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"      # MadTrans Démo
DB = {"container": "madalogistics-db", "user": "madalogistics", "name": "madalogistics"}

HUB_TANA = "a0000001-0000-4000-8000-000000000001"
HUB_ANTSA = "a0000001-0000-4000-8000-000000000002"
HUB_FIANA = "a0000001-0000-4000-8000-000000000003"

HUBS = {
    HUB_TANA: "Hub Antananarivo (RN7)",
    HUB_ANTSA: "Hub Antsirabe",
    HUB_FIANA: "Hub Fianarantsoa",
}

# Hypothèses de calcul (README-Phases §6-14) — identiques aux 2 scénarios
HYPOTHESES = {
    "vitesseKmh": 40,
    "consoL100km": 8,
    "prixFuelArParL": 5900,
    "facteurCo2KgParL": 2.68,
    "coutHoraireAr": 0,
}

# Hypothèse déclarée pour la catégorisation manuelle (non mesurée par le système) :
# temps moyen de classement d'un colis par un opérateur.
T_MANUEL_S_PAR_COLIS = 10.0

GERANT_EMAIL = "gestionnaire@test.mg"
DIRECTION_EMAIL = "direction@test.mg"
DIRECTION_PASSWORD = "Direction2026!"


# ── Infra : base de donnees ─────────────────────────────────────────────────

def psql(sql: str) -> str:
    """Exécute un SQL sur le conteneur PostgreSQL (mode non interactif)."""
    proc = subprocess.run(
        ["docker", "exec", "-i", DB["container"], "psql", "-v", "ON_ERROR_STOP=1",
         "-U", DB["user"], "-d", DB["name"], "-t", "-A", "-f", "-"],
        input=sql, capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"SQL échoué : {proc.stderr.strip()}")
    return proc.stdout.strip()


def init_users() -> None:
    """Crée (si absent) l'utilisateur DIRECTION du tenant de démonstration."""
    import bcrypt
    h = bcrypt.hashpw(DIRECTION_PASSWORD.encode(), bcrypt.gensalt(rounds=10)).decode()
    psql(f"""
    INSERT INTO utilisateur (utilisateur_id, tenant_id, nom, email, mot_de_passe_hash, role, habilite_valeur, created_at)
    VALUES ('e0000001-0000-0000-0000-000000000009'::uuid, '{TENANT}'::uuid,
            'Direction Démo', '{DIRECTION_EMAIL}', '{h}', 'DIRECTION', false, now())
    ON CONFLICT (email) DO UPDATE SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash;
    """)
    print(f"[init] utilisateur DIRECTION {DIRECTION_EMAIL} prêt")


def reset_tenant() -> None:
    """Remet le tenant à l'état « données brutes » (aucun groupage/affectation/tournée)."""
    psql(f"""
    BEGIN;
    DELETE FROM tournee   WHERE tenant_id = '{TENANT}';
    DELETE FROM sac       WHERE tenant_id = '{TENANT}';
    DELETE FROM optimisation_run WHERE tenant_id = '{TENANT}';
    UPDATE colis              SET sac_id = NULL, etat = 'EN_ATTENTE' WHERE tenant_id = '{TENANT}';
    UPDATE demande_transport  SET statut = 'EN_ATTENTE_GROUPAGE'     WHERE tenant_id = '{TENANT}';
    UPDATE vehicule           SET statut = 'DISPONIBLE'
        WHERE tenant_id = '{TENANT}' AND statut IN ('AFFECTE', 'EN_TOURNEE');
    UPDATE chauffeur           SET disponible = true  WHERE tenant_id = '{TENANT}';
    COMMIT;
    """)
    print("[reset] sacs / tournées / runs supprimés, ressources remises à DISPONIBLE")


def load_lot(lot: str) -> None:
    """Charge un lot (demandes + colis + features) après avoir purgé les anciens."""
    psql(f"""
    BEGIN;
    DELETE FROM demande_transport WHERE tenant_id = '{TENANT}';
    COMMIT;
    """)
    for suffix in ("demandes", "colis", "colis_features"):
        path = f"/home/hakari/Documents/MadaLogistix/ml/lot_{lot}_{suffix}.sql"
        with open(path) as f:
            psql(f.read())
    row = psql(f"""
        SELECT count(*) || ' demandes, ' ||
               (SELECT count(*) FROM colis WHERE tenant_id = '{TENANT}') || ' colis'
        FROM demande_transport WHERE tenant_id = '{TENANT}';
    """)
    print(f"[lot {lot}] chargé : {row}")


def set_seuil(valeur: float) -> None:
    """Fixe le seuil de remplissage minimal du tenant (paramètre configuré, identique
    pour les deux scénarios — déclaré dans le tableau des données expérimentales)."""
    psql(f"UPDATE pme_cliente SET seuil_remplissage_min = {float(valeur)} "
         f"WHERE tenant_id = '{TENANT}';")
    print(f"[setup] seuil_remplissage_min = {valeur} %")


# Flotte de démonstration : un véhicule / un chauffeur par tournée possible.
# Les capacités max par hub sont conservées (3 500/15 à Tana et Fiana, 10 000/30
# à Tana) afin que le groupage ne soit pas modifié par cet ajout.
VEHICULES_CIBLES = {
    # Tana : 2 camions 30 m³, car le groupage FFD y produit plusieurs sacs
    # dont le volume vaut exactement la capacité max du hub (10 t / 30 m³).
    HUB_TANA:  (4, 10000, 30, "12.0", "TANA"),
    HUB_ANTSA: (5, 5000, 20, "7.0", "ANTSA"),
    HUB_FIANA: (7, 3500, 15, "5.0", "FIANA"),
}
CHAUFFEURS_VALIDES_CIBLES = 15


def setup_ressources() -> None:
    """Complète la flotte de démonstration pour que tous les sacs puissent être
    affectés (1 sac = 1 chauffeur = 1 véhicule). Idempotent : les véhicules
    T-DEMO-* sont recréés à chaque exécution selon la spécification courante."""
    import uuid as _uuid

    n_veh = 0
    for hub_id, (cible, kg, m3, ptac, prefix) in VEHICULES_CIBLES.items():
        psql(f"""
            DELETE FROM vehicule
            WHERE tenant_id='{TENANT}' AND hub_id='{hub_id}'
              AND immatriculation LIKE 'T-DEMO-%';""")
        existants = int(psql(
            f"SELECT count(*) FROM vehicule WHERE tenant_id='{TENANT}' AND hub_id='{hub_id}';"))
        for i in range(existants + 1, cible + 1):
            immat = f"T-DEMO-{prefix}{i:02d}"
            psql(f"""
                INSERT INTO vehicule (vehicule_id, tenant_id, hub_id, immatriculation,
                    capacite_poids_kg, capacite_volume_m3, statut, type_vehicule,
                    ptac_tonnes, annee, marque_modele)
                VALUES ('{_uuid.uuid4()}', '{TENANT}', '{hub_id}', '{immat}',
                        {kg}, {m3}, 'DISPONIBLE', 'CAMION', {ptac}, 2023, 'Demo');
            """)
            n_veh += 1

    valides = int(psql(f"""
        SELECT count(*) FROM chauffeur
        WHERE tenant_id='{TENANT}' AND statut_dossier='VALIDEE'
          AND permis_expiration > CURRENT_DATE;"""))
    mdp = psql(f"""
        SELECT mot_de_passe_hash FROM utilisateur
        WHERE tenant_id='{TENANT}' AND role='CHAUFFEUR' LIMIT 1;""").strip()
    n_ch = 0
    for i in range(valides + 1, CHAUFFEURS_VALIDES_CIBLES + 1):
        uid, fid = _uuid.uuid4(), _uuid.uuid4()
        psql(f"""
            INSERT INTO utilisateur (utilisateur_id, tenant_id, nom, email,
                mot_de_passe_hash, role, habilite_valeur)
            VALUES ('{uid}', '{TENANT}', 'Chauffeur Demo {i:02d}',
                    'chauffeur.demo{i:02d}@madalogistix.mg', '{mdp}',
                    'CHAUFFEUR', true);
            INSERT INTO chauffeur (chauffeur_id, tenant_id, utilisateur_id,
                permis_categories, permis_expiration, statut_dossier, disponible,
                type_chauffeur, experience_annees)
            VALUES ('{fid}', '{TENANT}', '{uid}', 'B,C', '2030-12-31',
                    'VALIDEE', true, 'RATTACHE', 3);
        """)
        n_ch += 1

    psql(f"""
        INSERT INTO compatibilite_chauffeur_vehicule (tenant_id, chauffeur_id, vehicule_id, compatible)
        SELECT f.tenant_id, f.chauffeur_id, v.vehicule_id, true
        FROM chauffeur f CROSS JOIN vehicule v
        WHERE f.tenant_id='{TENANT}' AND v.tenant_id='{TENANT}'
        ON CONFLICT DO NOTHING;
    """)

    tot_veh = int(psql(f"SELECT count(*) FROM vehicule WHERE tenant_id='{TENANT}';"))
    tot_ch = int(psql(f"SELECT count(*) FROM chauffeur WHERE tenant_id='{TENANT}';"))
    if n_veh or n_ch:
        print(f"[setup] flotte complétée : +{n_veh} véhicule(s) → {tot_veh}, "
              f"+{n_ch} chauffeur(s) → {tot_ch}")


def capacites_par_hub() -> dict:
    """Capacité du plus grand véhicule DISPONIBLE par hub (règle GroupageFfdClusterService)."""
    rows = psql(f"""
        SELECT hub_id::text, max(capacite_poids_kg), max(capacite_volume_m3)
        FROM vehicule
        WHERE tenant_id = '{TENANT}' AND statut = 'DISPONIBLE' AND hub_id IS NOT NULL
        GROUP BY hub_id;
    """)
    cap = {}
    for line in rows.splitlines():
        hid, kg, m3 = line.split("|")
        cap[hid] = (float(kg), float(m3))
    for hid in HUBS:
        cap.setdefault(hid, (5000.0, 20.0))   # fallback documenté si aucun véhicule
    return cap


def donnees_brutes() -> dict:
    """Agrégats SQL des données brutes (identiques pour les 2 scénarios)."""
    out = {}
    out["demandes"] = int(psql(
        f"SELECT count(*) FROM demande_transport WHERE tenant_id='{TENANT}';"))
    out["colis"] = int(psql(
        f"SELECT count(*) FROM colis WHERE tenant_id='{TENANT}';"))
    out["poids_total_kg"] = float(psql(
        f"SELECT coalesce(round(sum(poids_kg)::numeric,2),0) FROM colis WHERE tenant_id='{TENANT}';"))
    out["volume_total_m3"] = float(psql(
        f"SELECT coalesce(round(sum(volume_m3)::numeric,3),0) FROM colis WHERE tenant_id='{TENANT}';"))
    out["par_hub"] = {}
    rows = psql(f"""
        SELECT d.hub_id::text, count(DISTINCT d.demande_id), count(c.colis_id)
        FROM demande_transport d LEFT JOIN colis c ON c.demande_id = d.demande_id
        WHERE d.tenant_id = '{TENANT}' GROUP BY d.hub_id;
    """)
    for line in rows.splitlines():
        hid, nd, nc = line.split("|")
        out["par_hub"][HUBS.get(hid, hid)] = {"demandes": int(nd), "colis": int(nc)}
    return out


def demandes_couvertes() -> set | None:
    """Demandes atteintes par les étapes de livraison (périmètre commun, protocole §21).
    Retourne None si aucune tournée n'existe (pas de restriction)."""
    rows = psql(f"""
        SELECT DISTINCT d.demande_id::text
        FROM etape_livraison e
        JOIN colis c ON c.colis_id = e.colis_id
        JOIN demande_transport d ON d.demande_id = c.demande_id
        WHERE e.tenant_id = '{TENANT}';
    """)
    ids = {r for r in rows.splitlines() if r}
    return ids or None


def _filtre(couvertes: set | None) -> str:
    if not couvertes:
        return ""
    ids = ",".join(f"'{i}'" for i in sorted(couvertes))
    return f" AND d.demande_id IN ({ids})"


def taux_baseline(cap: dict, couvertes: set | None = None) -> dict:
    """Taux de remplissage du scénario SANS groupage : 1 colis = 1 contenant."""
    res = {}
    filtre = _filtre(couvertes)
    for hid, hub_name in HUBS.items():
        kg_cap, m3_cap = cap.get(hid, (5000.0, 20.0))
        rows = psql(f"""
            SELECT c.poids_kg, c.volume_m3
            FROM colis c JOIN demande_transport d ON d.demande_id = c.demande_id
            WHERE c.tenant_id = '{TENANT}' AND d.hub_id = '{hid}'{filtre};
        """)
        taux = []
        for line in rows.splitlines():
            p, v = line.split("|")
            taux.append(max(float(p) / kg_cap, float(v) / m3_cap) * 100)
        if taux:
            res[hub_name] = {
                "nb_contenants": len(taux),
                "taux_moyen_pct": round(sum(taux) / len(taux), 2),
            }
    return res


# ── Infra : API ─────────────────────────────────────────────────────────────

def _secret() -> str:
    with open("/home/hakari/Documents/MadaLogistix/.env") as f:
        for line in f:
            if line.startswith("JWT_SECRET="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("JWT_SECRET introuvable dans .env")


def token(email: str) -> str:
    now = int(time.time())
    return pyjwt.encode(
        {"sub": email, "tenant_id": TENANT, "role": "GESTIONNAIRE" if email == GERANT_EMAIL else "DIRECTION",
         "iat": now, "exp": now + 3600},
        _secret(), algorithm="HS256")


def call(method: str, path: str, tok: str, params: dict | None = None,
         body: dict | None = None, retries: int = 1):
    url = f"{BASE}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {tok}")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        payload = e.read().decode(errors="replace")
        if retries > 0 and e.code in (500, 502, 503):
            time.sleep(2)
            return call(method, path, tok, params, body, retries - 1)
        raise RuntimeError(f"{method} {path} → HTTP {e.code} : {payload[:500]}")


# ── Pipeline d'optimisation ─────────────────────────────────────────────────

def run_categorisation(tok: str) -> dict:
    r = call("POST", "/optimisation/categorisation", tok)
    return {
        "meilleur_k": r.get("meilleur_k"),
        "nb_colis": r.get("nb_colis"),
        "silhouette": r.get("silhouette"),
        "davies_bouldin": r.get("davies_bouldin"),
        "purete": r.get("purete"),
        "inertie": r.get("inertie"),
        "confusion_matrix": r.get("confusion_matrix"),
        "categories_uniques": r.get("categories_uniques"),
        "duree_calcul_ms": r.get("duree_calcul_ms"),
        "referentiel_version": r.get("referentiel_version"),
    }


def run_groupage(tok: str, winner_pref: str = "auto") -> dict:
    """Par hub : comparateur FFD/Knapsack, puis preview + validation du gagnant."""
    resultats = {}
    for hid, hub_name in HUBS.items():
        cmp_ = call("POST", "/optimisation/groupage/comparer", tok, {"hubId": hid})
        ffd, ks, comp = cmp_["ffd"], cmp_["knapsack"], cmp_["comparaison"]

        gagnant = comp["gagnant"]
        algo = {"FFD": "BIN_PACKING", "KNAPSACK": "KNAPSACK"}.get(gagnant, "BIN_PACKING")
        if winner_pref != "auto":
            algo = winner_pref
            gagnant = "FFD" if winner_pref == "BIN_PACKING" else "KNAPSACK"

        # Voie opérationnelle du système : preview (simulation) puis validation
        preview = call("POST", "/optimisation/groupage/preview", tok,
                       {"hubId": hid, "algo": algo})
        sacs_edit = [{"tmpSacId": s["tmpSacId"], "colisIds": s["colisIds"], "supprime": False}
                     for s in preview["sacs"]]
        valider = (call("POST", "/optimisation/groupage/valider-edite", tok,
                        body={"runId": preview["runId"], "sacs": sacs_edit})
                   if sacs_edit else {"sacsCrees": [], "colisLies": 0, "demandesGroupees": 0})

        resultats[hub_name] = {
            "ffd": {k: ffd[k] for k in ("nb_sacs", "nb_colis_groupes", "nb_colis_totaux",
                                        "taux_moyen", "duree_ms")},
            "knapsack": {k: ks[k] for k in ("nb_sacs", "nb_colis_groupes", "nb_colis_totaux",
                                            "taux_moyen", "duree_ms", "scale", "fallback_ffd")},
            "gagnant": gagnant,
            "delta_taux_moyen": comp["delta_taux_moyen"],
            "delta_nb_sacs": comp["delta_nb_sacs"],
            "algo_retenu": algo,
            "preview": {
                "nb_sacs": preview["meta"]["nbSacs"],
                "nb_colis_groupes": preview["meta"]["nbColisGroupes"],
                "nb_colis_totaux": preview["meta"]["nbColisTotaux"],
                "capacite_poids_kg": preview["meta"]["capacitePoidsKg"],
                "capacite_volume_m3": preview["meta"]["capaciteVolumeM3"],
                "seuil_remplissage": preview["meta"]["seuilRemplissage"],
                "duree_calcul_ms": preview["meta"]["dureeCalculMs"],
                "taux_moyen_pct": round(
                    sum(float(s["tauxRemplissage"]) for s in preview["sacs"]) / len(preview["sacs"]), 2)
                if preview["sacs"] else 0,
            },
            "valider": {
                "sacs_crees": len(valider.get("sacsCrees") or []),
                "colis_lies": valider.get("colisLies"),
                "demandes_groupees": valider.get("demandesGroupees"),
                "justification": (valider.get("justification") or "")[:400],
            },
        }
        print(f"  [groupage] {hub_name}: {algo} → {resultats[hub_name]['valider']['sacs_crees']} sac(s), "
              f"taux moyen {resultats[hub_name]['preview']['taux_moyen_pct']}%")
    return resultats


def run_affectation(tok: str) -> dict:
    """Affectation automatique : algorithme glouton du projet (AffectationService.affecter)."""
    resultats = {}
    total_sacs = total_affectes = total_non = 0
    for hid, hub_name in HUBS.items():
        resp = call("POST", "/optimisation/affectation", tok, {"hubId": hid})
        if resp.get("run_id") is None:
            resultats[hub_name] = {"nb_sacs": 0, "note": resp.get("justification")}
            continue
        affectes = [a for a in resp.get("affectations", []) if a.get("affecte")]
        refus = [{"sac_id": a["sac_id"], "motif": a.get("motif_refus")}
                 for a in resp.get("affectations", []) if not a.get("affecte")]
        resultats[hub_name] = {
            "nb_sacs": len(resp.get("affectations", [])),
            "nb_affectes": resp.get("nb_sacs_affectes"),
            "nb_non_affectes": resp.get("nb_sacs_non_affectes"),
            "motifs_refus": refus,
            "affectations": [{"sac_id": a["sac_id"], "chauffeur": a.get("chauffeur_nom"),
                              "immatriculation": a.get("immatriculation")}
                             for a in affectes],
            "justification": (resp.get("justification") or "")[:600],
        }
        total_sacs += len(resp.get("affectations", []))
        total_affectes += resp.get("nb_sacs_affectes") or 0
        total_non += resp.get("nb_sacs_non_affectes") or 0
        print(f"  [affectation] {hub_name}: {resp.get('nb_sacs_affectes')}/"
              f"{len(resp.get('affectations', []))} sac(s) affecté(s)")
    resultats["_total"] = {"sacs": total_sacs, "affectes": total_affectes, "non_affectes": total_non}
    return resultats


def run_vrp(tok: str) -> dict:
    """1 sac = 1 tournée (VEHICLE_COUNT=1 en dur dans VrpOrchestrationService)."""
    rows = psql(f"SELECT sac_id::text FROM sac WHERE tenant_id='{TENANT}' ORDER BY created_at;")
    sacs = [r for r in rows.splitlines() if r]
    tours, distances, erreurs, durees = [], [], [], []
    for sid in sacs:
        try:
            prev = call("POST", "/optimisation/vrp/preview", tok, {"sacId": sid})
            etapes = [{"ordre": e["ordre"], "colisId": e["colisId"]} for e in prev["etapes"]]
            val = call("POST", "/optimisation/vrp/valider", tok,
                       body={"sacId": sid, "etapes": etapes})
            tours.append(val.get("tourneeId"))
            distances.append(float(val.get("distanceTotaleKm") or prev["distanceTotaleKm"]))
            durees.append(prev["meta"]["solveTimeMs"])
        except Exception as e:  # noqa: BLE001 — on consigne et on continue
            erreurs.append({"sac": sid, "erreur": str(e)[:200]})
    return {
        "nb_sacs": len(sacs),
        "nb_tournees": len(tours),
        "distance_totale_km": round(sum(distances), 2),
        "solve_time_ms": durees,
        "erreurs": erreurs,
    }


def run_gains(tok: str) -> dict:
    params = "&".join(f"{k}={v}" for k, v in HYPOTHESES.items())
    return call("GET", f"/direction/gains?{params}", tok)


# ── Scénario de référence (calculé par formules README-Phases §3) ───────────

def baseline_independant(couvertes: set | None = None) -> dict:
    """Aller-retour individuel dépôt → client → dépôt, distances Haversine."""
    rows = psql(f"""
        SELECT d.hub_id::text, h.latitude, h.longitude, d.latitude_livraison, d.longitude_livraison
        FROM demande_transport d JOIN hub h ON h.hub_id = d.hub_id
        WHERE d.tenant_id = '{TENANT}'
          AND d.latitude_livraison IS NOT NULL AND d.longitude_livraison IS NOT NULL
          {_filtre(couvertes)};
    """)
    def hav(a_lat, a_lon, b_lat, b_lon):
        from math import radians, sin, cos, sqrt, atan2
        R = 6371.0
        dlat = radians(b_lat - a_lat); dlon = radians(b_lon - a_lon)
        x = sin(dlat / 2) ** 2 + cos(radians(a_lat)) * cos(radians(b_lat)) * sin(dlon / 2) ** 2
        return 2 * R * atan2(sqrt(x), sqrt(1 - x))

    dist, nb = 0.0, 0
    par_hub = {}
    for line in rows.splitlines():
        hid, hla, hlo, lla, llo = line.split("|")
        d = 2 * hav(float(hla), float(hlo), float(lla), float(llo))
        dist += d; nb += 1
        par_hub[HUBS.get(hid, hid)] = round(par_hub.get(HUBS.get(hid, hid), 0) + d, 2)
    return {"nb_livraisons": nb, "distance_km": round(dist, 2), "par_hub_km": par_hub}


# ── Main ────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description="Expérience Résultat 3 (H3)")
    ap.add_argument("--lot", choices=["S", "M", "L"], default="S")
    ap.add_argument("--init-users", action="store_true",
                    help="crée l'utilisateur DIRECTION du tenant de démonstration")
    ap.add_argument("--skip-reset", action="store_true",
                    help="ne recharge pas les données du lot (état existant)")
    ap.add_argument("--algo", choices=["auto", "BIN_PACKING", "KNAPSACK"], default="auto",
                    help="algorithme de groupage retenu (auto = gagnant du /comparer)")
    ap.add_argument("--seuil", type=float, default=10.0,
                    help="seuil_remplissage_min du tenant (%%, défaut 10)")
    ap.add_argument("--outdir", default="/home/hakari/Documents/MadaLogistix/results")
    args = ap.parse_args()

    if args.init_users:
        init_users()

    tok_g = token(GERANT_EMAIL)
    tok_d = token(DIRECTION_EMAIL)

    print(f"═══ Expérience Résultat 3 — Lot {args.lot} ═══")

    set_seuil(args.seuil)
    setup_ressources()
    if not args.skip_reset:
        reset_tenant()
        load_lot(args.lot)

    cap = capacites_par_hub()
    brutes = donnees_brutes()

    print("── 1. Catégorisation (K-Means) ──")
    cat = run_categorisation(tok_g)

    print("── 2. Groupage (FFD / Knapsack) ──")
    grp = run_groupage(tok_g, args.algo)

    print("── 3. Affectation ──")
    aff = run_affectation(tok_g)

    print("── 4. Tournées (VRP) ──")
    vrp = run_vrp(tok_g)

    print("── 5. Gains (baseline vs optimisé) ──")
    gains = run_gains(tok_d)

    # Baseline calculée sur le MÊME périmètre que l'optimisé (protocole §21)
    couvertes = demandes_couvertes()
    base_ref = baseline_independant(couvertes)
    base_taux = taux_baseline(cap, couvertes)

    # Agrégats groupage : moyennes pondérées (sacs / contenants)
    sacs_grp = sum(v.get("valider", {}).get("sacs_crees") or 0
                   for v in grp.values() if isinstance(v, dict))
    num_opt = den_opt = 0
    for v in grp.values():
        if isinstance(v, dict) and v.get("preview"):
            n = v["preview"]["nb_sacs"]
            num_opt += v["preview"]["taux_moyen_pct"] * n
            den_opt += n
    taux_opt_moyen = round(num_opt / den_opt, 2) if den_opt else None

    num_base = den_base = 0
    for v in base_taux.values():
        num_base += v["taux_moyen_pct"] * v["nb_contenants"]
        den_base += v["nb_contenants"]
    taux_base_moyen = round(num_base / den_base, 2) if den_base else None

    result = {
        "lot": args.lot,
        "horodatage": dt.datetime.now().isoformat(timespec="seconds"),
        "tenant_id": TENANT,
        "algorithme_groupage": args.algo,
        "seuil_remplissage_min": args.seuil,
        "hypotheses": HYPOTHESES,
        "donnees_entree": brutes,
        "capacites_hub_kg_m3": {HUBS.get(k, k): list(v) for k, v in cap.items()},
        "scenario_sans_optimisation": {
            "reference": "aller-retour individuel (README-Phases §3), 1 contenant par colis (§15)",
            "distance_km": base_ref["distance_km"],
            "nb_livraisons": base_ref["nb_livraisons"],
            "par_hub_km": base_ref["par_hub_km"],
            "nb_contenants": brutes["colis"],
            "nb_contenants_perimetre": sum(v["nb_contenants"] for v in base_taux.values()),
            "taux_remplissage_moyen_pct": taux_base_moyen,
            "taux_par_hub": base_taux,
            "perimetre": "demandes couvertes par les tournées (protocole §21)"
                         if couvertes else "toutes les demandes",
            "t_manuel_hypothese_s": round(T_MANUEL_S_PAR_COLIS
                                          * sum(v["nb_contenants"] for v in base_taux.values()), 1),
            "t_manuel_hypothese_par_colis": T_MANUEL_S_PAR_COLIS,
        },
        "scenario_madalogistix": {
            "categorisation": cat,
            "groupage": grp,
            "groupage_sacs_totaux": sacs_grp,
            "groupage_taux_moyen_pct": taux_opt_moyen,
            "groupage_colis_groupes": sum(v.get("valider", {}).get("colis_lies") or 0
                                          for v in grp.values() if isinstance(v, dict)),
            "affectation": aff,
            "vrp": vrp,
            "t_ml_ms": cat.get("duree_calcul_ms"),
        },
        "gains_service": gains,
    }

    import os
    os.makedirs(args.outdir, exist_ok=True)
    out = os.path.join(args.outdir, f"experiment_{args.lot}.json")
    with open(out, "w") as f:
        json.dump(result, f, ensure_ascii=False, indent=2, default=str)
    print(f"Résultats écrits : {out}")

    # Agrégat multi-lots consommé par ml/figure_comparaison.py
    summary_path = os.path.join(args.outdir, "gains_summary.json")
    summary = {}
    if os.path.exists(summary_path):
        with open(summary_path) as f:
            summary = json.load(f)
    b, o, p = gains["baseline"], gains["optimise"], gains["perimetre"]
    summary[args.lot] = {
        "baseline": {k: b[k] for k in ("distanceKm", "tempsH", "vehicules",
                                       "carburantL", "co2Kg", "coutAr")},
        "optimise": {k: o[k] for k in ("distanceKm", "tempsH", "vehicules",
                                       "carburantL", "co2Kg", "coutAr")},
        "perimetre": {"nbDemandes": p["nbDemandes"], "nbTournees": p["nbTournees"],
                      "nbTourneesFallback": p["nbTourneesFallback"]},
        "taux_remplissage": {"baseline_pct": taux_base_moyen, "optimise_pct": taux_opt_moyen},
    }
    with open(summary_path, "w") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"Synthèse figure : {summary_path}")

    g = gains.get("gains", {})
    print(f"Distance  : {gains['baseline']['distanceKm']} km → {gains['optimise']['distanceKm']} km "
          f"(gain {g.get('distancePct')}%)")
    print(f"Véhicules : {gains['baseline']['vehicules']} → {gains['optimise']['vehicules']}")
    print(f"Coût      : {gains['baseline']['coutAr']} Ar → {gains['optimise']['coutAr']} Ar "
          f"(gain {g.get('coutPct')}%)")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"\nERREUR : {e}", file=sys.stderr)
        sys.exit(1)
