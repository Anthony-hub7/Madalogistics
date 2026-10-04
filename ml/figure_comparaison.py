#!/usr/bin/env python3
"""
figure_comparaison.py — Génère la Figure 1 du Résultat 3
(comparaison scénario sans optimisation vs MadaLogistix).

Usage :
    python figure_comparaison.py --lot S
    python figure_comparaison.py --lot M
    python figure_comparaison.py --lot L
    python figure_comparaison.py --all          # les 3 lots

Sortie : figure_comparaison_L.png (et/ou figure_comparaison_all.png)

Les données doivent être obtenues au préalable via l'API
GET /api/direction/gains?hubId=…&vitesseKmh=40&consoL100km=8&…
(dans GainsResponse : baseline, optimise, gains, perimetre).

Ce script peut :
  (a) lire un JSON d'entrée (à produire manuellement depuis l'API), ou
  (b) utiliser des valeurs par défaut si aucun JSON n'est fourni (à remplacer).

Dépendance : matplotlib (pip install matplotlib)
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
except ImportError:
    print("Erreur : matplotlib est requis. Installer avec : pip install matplotlib", file=sys.stderr)
    sys.exit(1)

# ── Couleurs (cohérentes avec GainsDirectionPage.jsx) ──
COULEUR_BASELINE = "#94a3b8"   # gris (sans optimisation)
COULEUR_OPTIMISE = "#e8433d"   # rouge (MadaLogistix)


# ── Données d'exemple (À REMPLACER par les vraies valeurs de GainsService) ──
EXEMPLE = {
    "S": {
        "baseline": {"distanceKm": 120.0, "tempsH": 3.0, "vehicules": 10, "carburantL": 9.6, "co2Kg": 25.7, "coutAr": 59000.0},
        "optimise": {"distanceKm": 85.0, "tempsH": 2.1, "vehicules": 4, "carburantL": 6.8, "co2Kg": 18.2, "coutAr": 42300.0},
        "perimetre": {"nbDemandes": 10, "nbTournees": 4, "nbTourneesFallback": 0},
    },
    "M": {
        "baseline": {"distanceKm": 480.0, "tempsH": 12.0, "vehicules": 40, "carburantL": 38.4, "co2Kg": 102.9, "coutAr": 236000.0},
        "optimise": {"distanceKm": 310.0, "tempsH": 7.8, "vehicules": 12, "carburantL": 24.8, "co2Kg": 66.5, "coutAr": 158000.0},
        "perimetre": {"nbDemandes": 40, "nbTournees": 12, "nbTourneesFallback": 0},
    },
    "L": {
        "baseline": {"distanceKm": 1600.0, "tempsH": 40.0, "vehicules": 130, "carburantL": 128.0, "co2Kg": 343.0, "coutAr": 788000.0},
        "optimise": {"distanceKm": 980.0, "tempsH": 24.5, "vehicules": 35, "carburantL": 78.4, "co2Kg": 210.1, "coutAr": 488000.0},
        "perimetre": {"nbDemandes": 130, "nbTournees": 35, "nbTourneesFallback": 2},
    },
}
"""
Structure réelle à fournir via JSON :
{
  "<lot>": {
    "baseline": {"distanceKm": float, "tempsH": float, "vehicules": int, "carburantL": float, "co2Kg": float, "coutAr": float},
    "optimise": {"distanceKm": float, "tempsH": float, "vehicules": int, "carburantL": float, "co2Kg": float, "coutAr": float},
    "perimetre": {"nbDemandes": int, "nbTournees": int, "nbTourneesFallback": int}
  }
}
"""


def charger_donnees(chemin: str | None, lot: str) -> dict:
    """Charge les données depuis un fichier JSON ou utilise l'exemple."""
    if chemin:
        with open(chemin) as f:
            raw = json.load(f)
    else:
        raw = EXEMPLE
    if lot not in raw:
        raise ValueError(f"Lot '{lot}' introuvable. Lots disponibles : {list(raw.keys())}")
    return raw[lot]


def construire_figure(lot: str, donnees: dict, sortie: Path) -> None:
    """Construit la Figure 1 : 4 sous-graphiques en barres groupées."""
    b = donnees["baseline"]
    o = donnees["optimise"]
    p = donnees.get("perimetre", {})

    labels = ["Distance\n(km)", "Véhicules", "Tournées", "Durée\n(h)"]
    nb_demandes_base = p.get("nbDemandes", b["vehicules"])
    baseline_vals = [b["distanceKm"], b["vehicules"], nb_demandes_base, b["tempsH"]]
    optimise_vals = [o["distanceKm"], o["vehicules"], p.get("nbTournees", o["vehicules"]), o["tempsH"]]

    width = 0.6
    pos = [0.5 - width / 2, 0.5 + width / 2]

    fig, axes = plt.subplots(1, 4, figsize=(18, 5))
    fig.suptitle(
        f"Figure {FIGURE_NUM} — Comparaison des performances : Sans optimisation vs MadaLogistix (Lot {lot})",
        fontsize=14, fontweight="bold", y=1.02,
    )

    def _fmt(h, spec):
        if spec == "d":
            return str(int(round(h)))
        return f"{h:{spec}}"

    fmts = [".2f", "d", "d", ".2f"]      # distance, véhicules, tournées, durée
    for i, ax in enumerate(axes):
        vals = [baseline_vals[i], optimise_vals[i]]
        bars = ax.bar([pos[0]], [vals[0]], width,
                      label="Sans optimisation", color=COULEUR_BASELINE)
        bars2 = ax.bar([pos[1]], [vals[1]], width,
                       label="MadaLogistix", color=COULEUR_OPTIMISE)
        ax.set_title(labels[i], fontsize=11, fontweight="bold")
        ax.set_xlim(-0.05, 1.05)
        ax.set_xticks([])
        ax.legend(fontsize=8, loc="upper right")
        ax.tick_params(axis="y", labelsize=8)
        ax.grid(axis="y", linestyle="--", alpha=0.5)
        ax.set_axisbelow(True)

        # Annotations des valeurs
        for bar, val in ((bars[0], vals[0]), (bars2[0], vals[1])):
            ax.annotate(_fmt(val, fmts[i]),
                        xy=(bar.get_x() + bar.get_width() / 2, val),
                        xytext=(0, 3), textcoords="offset points",
                        ha="center", va="bottom", fontsize=8, fontweight="bold")

        # Écart relatif (gain), sous le titre
        if vals[0]:
            delta = (vals[1] - vals[0]) / vals[0] * 100
            ax.text(0.5, -0.08, f"{delta:+.1f} %", transform=ax.transAxes,
                    ha="center", va="top", fontsize=9, fontweight="bold",
                    color="#15803d" if delta < 0 else "#b91c1c")

    fig.text(0.5, -0.02,
             "Source : Auteur, sortie GainsService (GET /api/direction/gains). "
             f"Périmètre : {p.get('nbDemandes', '?')} demandes, {p.get('nbTournees', '?')} tournées.",
             ha="center", fontsize=8, style="italic", color="#666666")

    plt.tight_layout()
    plt.savefig(sortie, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Figure enregistrée : {sortie}")


FIGURE_NUM = 1


# ── Figures d'annexe (2 et 3) ────────────────────────────────────────────────

LOTS = ["S", "M", "L"]


def _fr(v: float, dec: int = 0) -> str:
    """Formatage français : séparateur d'unités = espace, décimale = virgule."""
    return f"{v:,.{dec}f}".replace(",", "\u202f").replace(".", ",")


def construire_figure_taux(toutes: dict, sortie: Path) -> None:
    """Figure 2 (annexe) — taux de remplissage moyen : baseline vs optimisé."""
    base = [toutes[l].get("taux_remplissage", {}).get("baseline_pct", 0.0) for l in LOTS]
    opti = [toutes[l].get("taux_remplissage", {}).get("optimise_pct", 0.0) for l in LOTS]

    fig, ax = plt.subplots(figsize=(8, 5))
    w = 0.35
    xs = list(range(len(LOTS)))
    b1 = ax.bar([x - w / 2 for x in xs], base, w,
                label="Sans optimisation", color=COULEUR_BASELINE)
    b2 = ax.bar([x + w / 2 for x in xs], opti, w,
                label="MadaLogistix", color=COULEUR_OPTIMISE)

    for bars, vals in ((b1, base), (b2, opti)):
        for bar, val in zip(bars, vals):
            ax.annotate(_fr(val, 2) + " %",
                        xy=(bar.get_x() + bar.get_width() / 2, val),
                        xytext=(0, 3), textcoords="offset points",
                        ha="center", va="bottom", fontsize=9, fontweight="bold")
    for x, bv, ov in zip(xs, base, opti):
        ax.text(x, -0.16, f"{ov - bv:+.2f} pts".replace(".", ","),
                transform=ax.get_xaxis_transform(),
                ha="center", va="top", fontsize=9, fontweight="bold", color="#15803d")

    ax.set_title("Figure 2 — Taux de remplissage moyen par lot",
                 fontsize=12, fontweight="bold")
    ax.set_xticks(xs)
    ax.set_xticklabels([f"Lot {l}" for l in LOTS])
    ax.set_ylabel("Taux de remplissage (%)")
    ax.set_ylim(0, max(opti) * 1.18)
    ax.legend(fontsize=9)
    ax.grid(axis="y", linestyle="--", alpha=0.5)
    ax.set_axisbelow(True)
    fig.text(0.5, -0.02,
             "Source : Auteur — baseline : 1 colis = 1 contenant ; MadaLogistix : 1 sac = 1 unité "
             "(moyenne des taux par unité transportée).",
             ha="center", fontsize=8, style="italic", color="#666666")
    plt.tight_layout()
    plt.savefig(sortie, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Figure enregistrée : {sortie}")


def construire_figure_kpi(toutes: dict, sortie: Path) -> None:
    """Figure 3 (annexe) — KPI de synthèse (README-Phases §23)."""
    eco = [toutes[l]["baseline"]["coutAr"] - toutes[l]["optimise"]["coutAr"] for l in LOTS]
    dist = [(toutes[l]["baseline"]["distanceKm"] - toutes[l]["optimise"]["distanceKm"])
            / toutes[l]["baseline"]["distanceKm"] * 100 for l in LOTS]
    temps = [toutes[l]["baseline"]["tempsH"] - toutes[l]["optimise"]["tempsH"] for l in LOTS]
    veh = [toutes[l]["baseline"]["vehicules"] - toutes[l]["optimise"]["vehicules"] for l in LOTS]
    co2 = [toutes[l]["baseline"]["co2Kg"] - toutes[l]["optimise"]["co2Kg"] for l in LOTS]

    specs = [
        ("Économie (Ar)", eco, lambda v: _fr(v, 0)),
        ("Réduction distance (%)", dist, lambda v: _fr(v, 1) + " %"),
        ("Temps gagné (h)", temps, lambda v: _fr(v, 2)),
        ("Véhicules évités", veh, lambda v: _fr(v, 0)),
        ("CO₂ évité (kg)", co2, lambda v: _fr(v, 2)),
    ]

    fig, axes = plt.subplots(1, len(specs), figsize=(20, 4.5))
    fig.suptitle("Figure 3 — KPI de synthèse des gains (baseline → MadaLogistix)",
                 fontsize=14, fontweight="bold", y=1.03)
    xs = list(range(len(LOTS)))
    for ax, (titre, vals, fmt) in zip(axes, specs):
        bars = ax.bar(xs, vals, 0.55, color=COULEUR_OPTIMISE)
        for bar, val in zip(bars, vals):
            ax.annotate(fmt(val), xy=(bar.get_x() + bar.get_width() / 2, val),
                        xytext=(0, 3), textcoords="offset points",
                        ha="center", va="bottom", fontsize=9, fontweight="bold")
        ax.set_title(titre, fontsize=10, fontweight="bold")
        ax.set_xticks(xs)
        ax.set_xticklabels(LOTS)
        ax.tick_params(axis="y", labelsize=8)
        ax.grid(axis="y", linestyle="--", alpha=0.5)
        ax.set_axisbelow(True)
        ax.set_ylim(0, max(vals) * 1.22 if max(vals) else 1)

    fig.text(0.5, -0.04,
             "Source : Auteur, sortie GainsService — lot S / M / L, seuil de remplissage 10 %, "
             "coût horaire 0 Ar/h (le gain coût suit donc le gain carburant).",
             ha="center", fontsize=8, style="italic", color="#666666")
    plt.tight_layout()
    plt.savefig(sortie, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Figure enregistrée : {sortie}")


def main():
    parser = argparse.ArgumentParser(description="Génère la Figure 1 du Résultat 3.")
    parser.add_argument("--lot", choices=["S", "M", "L"], default="S", help="Lot à traiter")
    parser.add_argument("--all", action="store_true", help="Générer les 3 lots")
    parser.add_argument("--json", type=str, default=None, help="Chemin vers le JSON des données GainsService")
    parser.add_argument("--output-dir", type=str, default=".", help="Répertoire de sortie")
    args = parser.parse_args()

    sortie_dir = Path(args.output_dir)
    sortie_dir.mkdir(parents=True, exist_ok=True)

    lots = ["S", "M", "L"] if args.all else [args.lot]

    for lot in lots:
        donnees = charger_donnees(args.json, lot)
        sortie = sortie_dir / f"figure_comparaison_{lot}.png"
        construire_figure(lot, donnees, sortie)

    if args.all:
        # Figure synthèse multi-lots
        fig, axes = plt.subplots(1, 4, figsize=(20, 5))
        fig.suptitle("Figure 1 — Comparaison des performances (Synthèse S / M / L)", fontsize=14, fontweight="bold", y=1.02)
        labels = ["Distance (km)", "Véhicules", "Tournées", "Durée (h)"]
        metric_keys = ["distanceKm", "vehicules", "nbTournees", "tempsH"]

        for i, ax in enumerate(axes):
            x = range(3)
            base_vals, opt_vals = [], []
            for lot in lots:
                d = charger_donnees(args.json, lot)
                p = d.get("perimetre", {})
                if metric_keys[i] == "nbTournees":
                    base_vals.append(p.get("nbDemandes", d["baseline"]["vehicules"]))
                    opt_vals.append(p.get("nbTournees", d["optimise"]["vehicules"]))
                else:
                    base_vals.append(d["baseline"][metric_keys[i]])
                    opt_vals.append(d["optimise"][metric_keys[i]])

            width = 0.35
            ax.bar([xi - width for xi in x], base_vals, width, label="Sans optimisation", color=COULEUR_BASELINE)
            ax.bar([xi + width for xi in x], opt_vals, width, label="MadaLogistix", color=COULEUR_OPTIMISE)
            ax.set_title(labels[i], fontsize=10, fontweight="bold")
            ax.set_xticks(list(x))
            ax.set_xticklabels(lots)
            ax.legend(fontsize=8)
            ax.tick_params(axis="y", labelsize=8)
            ax.grid(axis="y", linestyle="--", alpha=0.5)
            ax.set_axisbelow(True)

        fig.text(0.5, -0.02,
                 "Source : Auteur, sortie GainsService. Lots S (30 colis), M (120 colis), L (393 colis).",
                 ha="center", fontsize=8, style="italic", color="#666666")
        plt.tight_layout()
        syn = sortie_dir / "figure_comparaison_all.png"
        plt.savefig(syn, dpi=150, bbox_inches="tight")
        plt.close()
        print(f"Figure synthèse enregistrée : {syn}")

        # Figures d'annexe : 2 (taux de remplissage) et 3 (KPI §23)
        toutes = {lot: charger_donnees(args.json, lot) for lot in lots}
        construire_figure_taux(toutes, sortie_dir / "figure_taux_remplissage.png")
        construire_figure_kpi(toutes, sortie_dir / "figure_kpi_gains.png")


if __name__ == "__main__":
    main()
