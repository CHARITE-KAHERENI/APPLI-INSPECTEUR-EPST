import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppShell } from './layout/AppShell';
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
