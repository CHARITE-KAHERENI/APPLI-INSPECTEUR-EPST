import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppShell } from './layout/AppShell';
import { AbonnementsPage } from './pages/AbonnementsPage';
import { AnalyseIaPage } from './pages/AnalyseIaPage';
import { AssistantIaPage } from './pages/AssistantIaPage';
import { DashboardPage } from './pages/DashboardPage';
import { EtablissementDetailPage } from './pages/EtablissementDetailPage';
import { EtablissementsPage } from './pages/EtablissementsPage';
import { InspecteurDetailPage } from './pages/InspecteurDetailPage';
import { InspecteursPage } from './pages/InspecteursPage';
import { InspectionsPage } from './pages/InspectionsPage';

export function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inspections" element={<InspectionsPage />} />
        <Route path="/etablissements" element={<EtablissementsPage />} />
        <Route path="/etablissements/:id" element={<EtablissementDetailPage />} />
        <Route path="/inspecteurs" element={<InspecteursPage />} />
        <Route path="/inspecteurs/:id" element={<InspecteurDetailPage />} />
        <Route path="/abonnements" element={<AbonnementsPage />} />
        <Route path="/assistant-ia" element={<AssistantIaPage />} />
        <Route path="/analyse-ia" element={<AnalyseIaPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
