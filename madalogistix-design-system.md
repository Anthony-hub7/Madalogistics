# Design System — MadaLogistix (Dark Logistics)

## Contexte
Application SaaS multi-tenant de logistique (groupage de fret) avec 5 rôles : Client, Gestionnaire, Chauffeur, Direction PME, Administrateur SaaS. Le style cible s'inspire d'un dashboard de tracking de livraison dark-mode, dense en données, avec carte plein écran et cards flottantes.

Applique ce design system à tous les écrans existants (Dashboard, Commandes, Optimisation, Flotte, Mes missions, Nouvelle expédition, Mes expéditions) en respectant les adaptations par rôle décrites plus bas.

---

## Couleurs

| Rôle | Hex | Usage |
|---|---|---|
| Fond principal | `#0D0D0F` | Fond de page, noir profond (pas noir pur) |
| Surface / Card | `#1A1A1E` | Sidebar, panneaux, cards inactives |
| Accent marque | `#E8433D` | CTA principaux, éléments actifs, logo |
| Texte principal | `#F5F5F0` | Titres, contenu clé (blanc cassé) |
| Texte secondaire | `#8A8A92` | Labels, metadata, légendes |
| Statut secondaire | `#3B82F6` | Badges "reçu/en attente" (bleu — jamais confondu avec le rouge d'alerte) |
| Statut succès | `#22C55E` | Badges "livré/validé" (vert, à ajouter si besoin) |

Règle importante : le rouge accent est réservé à l'élément "actif" ou "urgent". Ne pas l'utiliser pour des statuts neutres (utiliser bleu/vert à la place) pour éviter la confusion avec une alerte.

## Typographie

- **Display / Titres** : sans-serif géométrique à forte présence (Inter Tight, General Sans, ou équivalent), Semibold/Bold
- **Corps / Labels** : même famille, Regular/Medium, tailles réduites pour metadata
- **Chiffres / Data** : variante tabular-nums pour aligner proprement prix, poids, distances, IDs de commande dans les tableaux

## Layout

- Sidebar icônes fixe à gauche pour la navigation (une icône = un onglet/rôle)
- Contenu principal en deux zones : liste de cards (gauche/centre) + zone contextuelle (carte, détail, graphique) en fond ou à droite
- Card "active" (item sélectionné ou en cours) : fond accent rouge, barre de progression si applicable, infos étendues (contact, chiffres clés, actions rapides)
- Cards "inactives" : fond gris foncé neutre (`#1A1A1E`), badge de statut coloré, contenu collapsé (titre + ID + badge uniquement)
- Bandeau résumé en bas d'écran ou de card pour les infos critiques de trajet/statut (from/to/current/reste à parcourir)

## Signature visuelle

L'élément à répliquer sur tous les écrans à listes (commandes, missions, flotte, expéditions) : **la card qui s'étend et change de couleur quand elle devient active**, avec badge de statut circulaire coloré. C'est le fil conducteur visuel de toute l'app.

---

## Variante Light (White/Red)

Alternative claire au thème dark, même logique de card "active" mais inversée :

| Rôle | Hex | Usage |
|---|---|---|
| Fond principal | `#FAFAF9` | Fond de page, blanc cassé (pas blanc pur) |
| Surface / Card | `#FFFFFF` | Cards, panneaux (avec ombre légère pour la profondeur) |
| Bordure / séparateur | `#E5E5E3` | Lignes, contours de card inactive |
| Accent marque | `#E8433D` | CTA principaux, card active, logo — même rouge que la version dark |
| Texte principal | `#1A1A1E` | Titres, contenu clé (quasi-noir) |
| Texte secondaire | `#75757C` | Labels, metadata |
| Statut secondaire | `#2563EB` | Badges "reçu/en attente" |
| Statut succès | `#16A34A` | Badges "livré/validé" |

Règles d'adaptation :
- La card "active" passe de fond rouge plein (dark) à fond blanc + bordure/liseré rouge + accent rouge sur les éléments clés (barre de progression, badge, CTA) — évite un bloc rouge trop agressif sur fond clair
- Les ombres portées remplacent les contrastes de fond sombre pour hiérarchiser les cards (ombre plus marquée sur la card active)
- Garder la carte en fond sombre même en mode light si elle reste visible (contraste utile), ou proposer une carte en style clair/minimal selon le rendu
- Le rouge doit rester réservé à "actif/urgent" — encore plus important en light mode car il ressort davantage sur fond blanc

Utiliser la version **Dark** pour Direction/Logistics/Dashboard (aspect "cockpit" pro), et envisager la version **Light** pour Client (plus rassurant, moins intense) — à valider avec l'utilisateur avant application définitive.

## Adaptation par rôle

### Direction / Logistics / Dashboard (desktop)
Reprendre le style quasi tel quel : dense, carte/graphique en fond, sidebar complète, tableaux avec tabular-nums.

### Chauffeur (PWA offline)
Garder dark + accent rouge mais simplifier fortement :
- Une seule card géante = la mission en cours (pas de liste à scroller en conduisant)
- Boutons très larges (zone tactile XXL)
- Contraste renforcé pour lisibilité en plein soleil/terrain
- Pas de sidebar — navigation minimale en bas d'écran

### Client
Version allégée et moins dense :
- Focus sur une seule expédition active à la fois (même logique de card "active" que le dashboard)
- Moins de metadata visible par défaut, détails accessibles au clic
- Ton plus rassurant, moins "opérationnel" que la vue Direction

---

## Consignes générales
- Respecter l'accessibilité : contraste suffisant entre texte gris secondaire et fond sombre (viser AA minimum)
- Garder la cohérence des badges de statut à travers tous les rôles (mêmes couleurs = mêmes significations partout)
- Ne pas dupliquer le rouge accent comme code couleur de statut ET comme couleur de marque sans distinction claire
