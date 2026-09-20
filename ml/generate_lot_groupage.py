#!/usr/bin/env python3
"""
generate_lot_groupage.py — Genere des lots de test realistes pour le groupage comparatif.

Usage :
    python generate_lot_groupage.py --lot S --seed 42
    python generate_lot_groupage.py --lot M --seed 42
    python generate_lot_groupage.py --lot L --seed 42

Sortie :
    - lot_{S,M,L}.csv   (meme format que colis_mock.csv)
    - lot_{S,M,L}.sql    (INSERT INTO demande_transport + colis)
    - lot_{S,M,L}_colis_features.sql (INSERT INTO colis_features)

Lots :
    S : 30 colis / ~10 demandes  (cas nominal)
    M : 120 colis / ~40 demandes (journee hub)
    L : 400 colis / ~130 demandes (pic — declenche fallback FFD si >200/cluster)
"""

import argparse
import csv
import random
import uuid
import math
from datetime import datetime, timedelta

# ── Constantes ──

TENANT_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
CLIENT_ID = "cf000001-0000-4000-8000-000000000001"
HUB_TANA = "a0000001-0000-4000-8000-000000000001"
HUB_ANTSA = "a0000001-0000-4000-8000-000000000002"
HUB_FIANA = "a0000001-0000-4000-8000-000000000003"

CAT_A_ID = "c1000001-0000-4000-8000-000000000001"
CAT_B_ID = "c1000001-0000-4000-8000-000000000002"
CAT_C_ID = "c1000001-0000-4000-8000-000000000003"

LOTS = {"S": (30, 10), "M": (120, 40), "L": (400, 130)}

# Profils de colis (poids_kg, volume_m3, fragilite_0_10, valeur_ar, express_01, classe, designation, profil_source)
PROFILES = [
    # A : fragile / haute valeur
    {"poids": (0.3, 10), "volume": (0.005, 0.15), "frag": (7, 10), "valeur": (200000, 5000000),
     "express": 0.5, "classe": "A", "cat_id": CAT_A_ID, "desig": "Bijouterie artisanale", "src": "leger_valeur"},
    {"poids": (1, 8), "volume": (0.01, 0.12), "frag": (8, 10), "valeur": (300000, 3000000),
     "express": 0.5, "classe": "A", "cat_id": CAT_A_ID, "desig": "Composants electroniques", "src": "leger_valeur"},
    {"poids": (0.5, 5), "volume": (0.01, 0.08), "frag": (7, 9), "valeur": (500000, 2000000),
     "express": 0.4, "classe": "A", "cat_id": CAT_A_ID, "desig": "Documents admin Tana", "src": "leger_valeur"},

    # B : standard
    {"poids": (5, 25), "volume": (0.25, 1.0), "frag": (2, 6), "valeur": (10000, 300000),
     "express": 0.2, "classe": "B", "cat_id": CAT_B_ID, "desig": "Chaussures en carton", "src": "volumineux_moyen"},
    {"poids": (3, 20), "volume": (0.15, 0.8), "frag": (2, 5), "valeur": (20000, 250000),
     "express": 0.2, "classe": "B", "cat_id": CAT_B_ID, "desig": "Textile lamba et tissus", "src": "volumineux_moyen"},
    {"poids": (0.3, 2.5), "volume": (0.005, 0.05), "frag": (3, 7), "valeur": (10000, 500000),
     "express": 1.0, "classe": "B", "cat_id": CAT_B_ID, "desig": "Colis pharmacie de garde", "src": "express_petit"},

    # C : robuste / lourd
    {"poids": (40, 90), "volume": (0.5, 1.6), "frag": (0, 3), "valeur": (50000, 250000),
     "express": 0.05, "classe": "C", "cat_id": CAT_C_ID, "desig": "Sacs de riz", "src": "lourd_robuste"},
    {"poids": (50, 105), "volume": (0.6, 1.5), "frag": (0, 2), "valeur": (60000, 200000),
     "express": 0.05, "classe": "C", "cat_id": CAT_C_ID, "desig": "Briques et materiaux", "src": "lourd_robuste"},
    {"poids": (45, 80), "volume": (0.5, 1.4), "frag": (1, 3), "valeur": (40000, 180000),
     "express": 0.03, "classe": "C", "cat_id": CAT_C_ID, "desig": "Toles galvanisees", "src": "lourd_robuste"},

    # Outliers (5%)
    {"poids": (70, 120), "volume": (1.0, 2.5), "frag": (1, 5), "valeur": (100000, 1700000),
     "express": 0.1, "classe": "C", "cat_id": CAT_C_ID, "desig": "Instrument de musique", "src": "outlier"},
]

HUBS = [HUB_TANA, HUB_ANTSA, HUB_FIANA]
HUB_COORDS = {
    HUB_TANA: (-18.914, 47.541),
    HUB_ANTSA: (-19.866, 47.035),
    HUB_FIANA: (-21.453, 47.085),
}


def random_date(rng, today):
    """dateSouhaitee = today + 1..5 jours."""
    return today + timedelta(days=rng.randint(1, 5))


def random_coords(rng, hub_id):
    """Jitter ±0.05 deg autour du hub."""
    base_lat, base_lon = HUB_COORDS[hub_id]
    return base_lat + rng.uniform(-0.05, 0.05), base_lon + rng.uniform(-0.05, 0.05)


def pick_profile(rng):
    """Choisit un profil (5% outliers, 30% A, 35% B, 30% C)."""
    r = rng.random()
    if r < 0.05:
        return PROFILES[9]  # outlier
    elif r < 0.35:
        return rng.choice(PROFILES[0:3])  # A
    elif r < 0.70:
        return rng.choice(PROFILES[3:6])  # B
    else:
        return rng.choice(PROFILES[6:9])  # C


def gen_lot(lot_name, seed):
    rng = random.Random(seed)
    n_colis, n_demandes = LOTS[lot_name]
    today = datetime.now().date()

    demandes = []
    all_colis = []

    # Generer les demandes
    for i in range(n_demandes):
        demande_id = str(uuid.uuid4())
        hub_id = rng.choice(HUBS)
        date_souhaitee = random_date(rng, today)
        # dateDepartCalculee ≈ dateSouhaitee - 2j (DelaiService realiste)
        date_depart_calc = date_souhaitee - timedelta(days=2)
        lat_coll, lon_coll = random_coords(rng, hub_id)
        lat_liv, lon_liv = random_coords(rng, hub_id)

        demandes.append({
            "demande_id": demande_id,
            "hub_id": hub_id,
            "lat_coll": lat_coll, "lon_coll": lon_coll,
            "lat_liv": lat_liv, "lon_liv": lon_liv,
            "date_souhaitee": date_souhaitee,
            "date_depart_calculee": date_depart_calc,
        })

    # Generer les colis (repartis sur les demandes)
    colis_per_demande = n_colis // n_demandes
    extra = n_colis % n_demandes
    idx_colis = 0

    for d in demandes:
        nb = colis_per_demande + (1 if idx_colis < extra else 0)
        for _ in range(nb):
            p = pick_profile(rng)
            poids = round(rng.uniform(*p["poids"]), 2)
            volume = round(rng.uniform(*p["volume"]), 3)
            frag = rng.randint(*p["frag"])
            valeur = rng.randint(*p["valeur"])
            express = 1 if rng.random() < p["express"] else 0

            all_colis.append({
                "colis_id": str(uuid.uuid4()),
                "demande_id": d["demande_id"],
                "hub_id": d["hub_id"],
                "poids_kg": poids,
                "volume_m3": volume,
                "fragilite": frag,
                "valeur": valeur,
                "express": express,
                "classe": p["classe"],
                "cat_id": p["cat_id"],
                "designation": p["desig"],
                "profil_source": p["src"],
                "lat_liv": d["lat_liv"],
                "lon_liv": d["lon_liv"],
                "date_souhaitee": d["date_souhaitee"],
                "date_depart_calculee": d["date_depart_calculee"],
            })
            idx_colis += 1

    return demandes, all_colis


def write_csv(lot_name, colis_list):
    path = f"lot_{lot_name}.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["colis_id", "poids_kg", "volume_m3", "fragilite_0_10", "valeur_estimee_ar",
                     "delai_express", "categorie_declaree", "designation", "profil_source"])
        for c in colis_list:
            w.writerow([c["colis_id"], c["poids_kg"], c["volume_m3"], c["fragilite"],
                        c["valeur"], c["express"], c["classe"], c["designation"], c["profil_source"]])
    return path


def write_sql_demandes(lot_name, demandes):
    path = f"lot_{lot_name}_demandes.sql"
    lines = []
    for d in demandes:
        coll_lat = round(d["lat_coll"], 6)
        coll_lon = round(d["lon_coll"], 6)
        liv_lat = round(d["lat_liv"], 6)
        liv_lon = round(d["lon_liv"], 6)
        ds = d["date_souhaitee"]
        dd = d["date_depart_calculee"]
        lines.append(
            f"INSERT INTO demande_transport "
            f"(demande_id, tenant_id, client_final_id, hub_id, "
            f"latitude_collecte, longitude_collecte, latitude_livraison, longitude_livraison, "
            f"date_souhaitee, date_depart_calculee, statut, created_at) "
            f"VALUES ('{d['demande_id']}'::uuid, '{TENANT_ID}'::uuid, '{CLIENT_ID}'::uuid, "
            f"'{d['hub_id']}'::uuid, {coll_lat}, {coll_lon}, {liv_lat}, {liv_lon}, "
            f"'{ds}', '{dd}', 'EN_ATTENTE_GROUPAGE', now());"
        )
    with open(path, "w") as f:
        f.write("\n".join(lines))
    return path


def write_sql_colis(lot_name, colis_list):
    path = f"lot_{lot_name}_colis.sql"
    lines = []
    for c in colis_list:
        lines.append(
            f"INSERT INTO colis "
            f"(colis_id, tenant_id, demande_id, categorie_id, poids_kg, volume_m3, etat, created_at) "
            f"VALUES ('{c['colis_id']}'::uuid, '{TENANT_ID}'::uuid, '{c['demande_id']}'::uuid, "
            f"'{c['cat_id']}'::uuid, {c['poids_kg']}, {c['volume_m3']}, 'EN_ATTENTE', now());"
        )
    with open(path, "w") as f:
        f.write("\n".join(lines))
    return path


def write_sql_colis_features(lot_name, colis_list):
    path = f"lot_{lot_name}_colis_features.sql"
    lines = []
    for c in colis_list:
        cf_id = str(uuid.uuid4())
        lines.append(
            f"INSERT INTO colis_features "
            f"(colis_id, tenant_id, fragilite_0_10, valeur_estimee_ar, delai_express, "
            f"categorie_predite_id, created_at) "
            f"VALUES ('{c['colis_id']}'::uuid, '{TENANT_ID}'::uuid, {c['fragilite']}, "
            f"{c['valeur']}, {'true' if c['express'] else 'false'}, '{c['cat_id']}'::uuid, now());"
        )
    with open(path, "w") as f:
        f.write("\n".join(lines))
    return path


def main():
    parser = argparse.ArgumentParser(description="Genere des lots de test pour le groupage comparatif")
    parser.add_argument("--lot", required=True, choices=["S", "M", "L"], help="Taille du lot (S=30, M=120, L=400)")
    parser.add_argument("--seed", type=int, default=42, help="Seed aleatoire (reproductible)")
    args = parser.parse_args()

    demandes, colis_list = gen_lot(args.lot, args.seed)

    # Stats
    clusters = {}
    for c in colis_list:
        cl = c["classe"]
        clusters[cl] = clusters.get(cl, 0) + 1

    print(f"\n=== Lot {args.lot} ({len(colis_list)} colis, {len(demandes)} demandes, seed={args.seed}) ===")
    print(f"Distribution clusters : {dict(sorted(clusters.items()))}")
    print(f"Hub distribution : {len([d for d in demandes if d['hub_id']==HUB_TANA])} Tana, "
          f"{len([d for d in demandes if d['hub_id']==HUB_ANTSA])} Antsa, "
          f"{len([d for d in demandes if d['hub_id']==HUB_FIANA])} Fiana")

    csv_path = write_csv(args.lot, colis_list)
    sql_demandes = write_sql_demandes(args.lot, demandes)
    sql_colis = write_sql_colis(args.lot, colis_list)
    sql_features = write_sql_colis_features(args.lot, colis_list)

    print(f"\nFichiers generes :")
    print(f"  {csv_path}")
    print(f"  {sql_demandes}")
    print(f"  {sql_colis}")
    print(f"  {sql_features}")


if __name__ == "__main__":
    main()
