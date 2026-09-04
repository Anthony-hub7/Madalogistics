import { lazy } from 'react'

import AdminSaaSLayout from '../layouts/AdminSaaSLayout'
import GestionnaireLayout from '../layouts/GestionnaireLayout'
import ClientLayout from '../layouts/ClientLayout'
import ChauffeurLayout from '../layouts/ChauffeurLayout'
import DirectionLayout from '../layouts/DirectionLayout'

const TenantsAdminPage = lazy(() => import('../pages/admin/TenantsAdminPage'))
const AdminDashboardPage = lazy(() => import('../pages/admin-systeme/AdminDashboardPage'))
const AgencesDemandesPage = lazy(() => import('../pages/admin-systeme/AgencesDemandesPage'))
const AgencesListePage = lazy(() => import('../pages/admin-systeme/AgencesListePage'))
const AgenceDetailPage = lazy(() => import('../pages/admin-systeme/AgenceDetailPage'))
const FreelancesDemandesPage = lazy(() => import('../pages/admin-systeme/FreelancesDemandesPage'))
const FreelancesListePage = lazy(() => import('../pages/admin-systeme/FreelancesListePage'))
const FreelanceDetailPage = lazy(() => import('../pages/admin-systeme/FreelanceDetailPage'))
const DashboardGestionnairePage = lazy(() => import('../pages/dashboard/DashboardGestionnairePage'))
const DecisionsPage = lazy(() => import('../pages/dashboard/DecisionsPage'))
const EquipePage = lazy(() => import('../pages/dashboard/EquipePage'))
const ParametresTarifairesPage = lazy(() => import('../pages/dashboard/ParametresTarifairesPage'))
const HubsPage = lazy(() => import('../pages/dashboard/HubsPage'))
const ChauffeursRattachesPage = lazy(() => import('../pages/dashboard/ChauffeursRattachesPage'))
const ChauffeurDetailPage = lazy(() => import('../pages/dashboard/ChauffeurDetailPage'))
const DemandesListPage = lazy(() => import('../pages/demandes/DemandesListPage'))
const NouvelleDemandePage = lazy(() => import('../pages/demandes/NouvelleDemandePage'))
const MesCommandesPage = lazy(() => import('../pages/demandes/MesCommandesPage'))
const DetailCommandePage = lazy(() => import('../pages/demandes/DetailCommandePage'))
const FlottePage = lazy(() => import('../pages/flotte/FlottePage'))
const OptimisationPage = lazy(() => import('../pages/optimisation/OptimisationPage'))
const MissionsProposeesPage = lazy(() => import('../pages/chauffeur/MissionsProposeesPage'))
const MesMissionsPage = lazy(() => import('../pages/chauffeur/MesMissionsPage'))
const DetailLivraisonPage = lazy(() => import('../pages/chauffeur/DetailLivraisonPage'))
const CarteHubsPage = lazy(() => import('../pages/carte/CarteHubsPage'))
const CarteOptimisationPage = lazy(() => import('../pages/carte/CarteOptimisationPage'))
const CarteMissionsPage = lazy(() => import('../pages/carte/CarteMissionsPage'))
const DemoPreviewPage = lazy(() => import('../pages/DemoPreviewPage'))

export const ROLE_CONFIG = {
  admin: {
    Layout: AdminSaaSLayout,
    defaultPage: 'dashboard',
    pages: {
      dashboard: { component: AdminDashboardPage },
      agences_demandes: { component: AgencesDemandesPage },
      agences_liste: { component: AgencesListePage },
      agence_detail: { component: AgenceDetailPage },
      freelances_demandes: { component: FreelancesDemandesPage },
      freelances_liste: { component: FreelancesListePage },
      freelance_detail: { component: FreelanceDetailPage },
      demo: { component: DemoPreviewPage },
    },
    getNavItems: () => [
      { key: 'dashboard', label: 'Vue d\'ensemble', icon: 'space_dashboard' },
      { key: 'agences_demandes', label: 'Demandes agences', icon: 'pending_actions' },
      { key: 'agences_liste', label: 'Agences actives', icon: 'apartment' },
      { key: 'freelances_demandes', label: 'Demandes freelances', icon: 'badge' },
      { key: 'freelances_liste', label: 'Freelances actifs', icon: 'hail' },
      { key: 'demo', label: 'Design Preview', icon: 'palette' },
    ],
  },
  logistics: {
    Layout: GestionnaireLayout,
    defaultPage: 'dashboard',
    pages: {
      dashboard: { component: DashboardGestionnairePage },
      commandes: { component: DemandesListPage },
      chauffeurs_rattaches: { component: ChauffeursRattachesPage },
      chauffeur_detail: { component: ChauffeurDetailPage },
      optimisation: { component: OptimisationPage },
      flotte: { component: FlottePage },
      carte_optimisation: { component: CarteOptimisationPage },
      demo: { component: DemoPreviewPage },
    },
    getNavItems: () => [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { key: 'commandes', label: 'Commandes', icon: 'calendar_today' },
      { key: 'chauffeurs_rattaches', label: 'Chauffeurs', icon: 'badge' },
      { key: 'optimisation', label: 'Optimisation', icon: 'auto_graph' },
      { key: 'flotte', label: 'Flotte', icon: 'local_shipping' },
      { key: 'carte_optimisation', label: 'Carte', icon: 'map' },
      { key: 'demo', label: 'Design Preview', icon: 'palette' },
    ],
  },
  client: {
    Layout: ClientLayout,
    defaultPage: 'nouvelle_demande',
    pages: {
      nouvelle_demande: { component: NouvelleDemandePage },
      mes_commandes: { component: MesCommandesPage },
      detail_commande: { component: DetailCommandePage },
      demo: { component: DemoPreviewPage },
    },
    getNavItems: () => [
      { key: 'nouvelle_demande', label: 'Nouvelle expédition', icon: 'add_box' },
      { key: 'mes_commandes', label: 'Mes expéditions', icon: 'local_shipping' },
      { key: 'demo', label: 'Design Preview', icon: 'palette' },
    ],
  },
  driver: {
    Layout: ChauffeurLayout,
    defaultPage: 'missions_proposees',
    pages: {
      missions_proposees: { component: MissionsProposeesPage },
      missions: { component: MesMissionsPage },
      detail_livraison: { component: DetailLivraisonPage },
      carte_missions: { component: CarteMissionsPage },
      demo: { component: DemoPreviewPage },
    },
    getNavItems: () => [
      { key: 'missions_proposees', label: 'Proposées', icon: 'inbox_customize' },
      { key: 'missions', label: 'Mes missions', icon: 'route' },
      { key: 'carte_missions', label: 'Ma tournée', icon: 'map' },
      { key: 'demo', label: 'Design Preview', icon: 'palette' },
    ],
  },
  direction: {
    Layout: DirectionLayout,
    defaultPage: 'equipe',
    pages: {
      equipe: { component: EquipePage },
      hubs: { component: HubsPage },
      carte_hubs: { component: CarteHubsPage },
      decisions: { component: DecisionsPage },
      parametres_tarifaires: { component: ParametresTarifairesPage },
      demo: { component: DemoPreviewPage },
    },
    getNavItems: () => [
      { key: 'equipe', label: 'Équipe', icon: 'groups' },
      { key: 'hubs', label: 'Hubs', icon: 'location_on' },
      { key: 'carte_hubs', label: 'Carte Hubs', icon: 'map' },
      { key: 'decisions', label: 'Décisions', icon: 'insights' },
      { key: 'parametres_tarifaires', label: 'Paramètres tarifaires', icon: 'payments' },
      { key: 'demo', label: 'Design Preview', icon: 'palette' },
    ],
  },
}
