# MVP_master

Application MadaLogistics - Plateforme de gestion logistique multi-rôles (Admin SaaS, Gestionnaire de flotte, Client, Chauffeur, Direction PME).

## Stack

- React 19 + Vite
- Tailwind CSS
- Routage par état (sans react-router)

## Structure

```
src/
├── app/          # Router racine + config des pages par rôle
├── pages/        # Pages par module (auth, dashboard, demandes, flotte...)
├── layouts/      # Layouts par rôle (sidebar / bottom-nav mobile)
├── components/   # Composants réutilisables (Sidebar, Header, DataTable...)
├── context/      # Contextes (Auth, AppState)
├── guards/       # Gardes de protection de routes
├── hooks/        # Hooks réutilisables
├── services/     # Couche API/services
├── types/        # Définitions de rôles
└── offline/      # Support hors-ligne (SW, sync queue)
```

## Démarrage

```bash
npm install
npm run dev
```
