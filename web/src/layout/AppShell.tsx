import { Outlet } from 'react-router-dom';
import { ChatbotWidget } from '../components/ChatbotWidget';
import { Sidebar } from './Sidebar';

/**
 * Enveloppe commune des écrans authentifiés : sidebar + zone de contenu
 * défilante + chatbot d'assistance flottant (PROMPT 8, point 3 — tous
 * rôles, voir `ChatbotWidget`).
 */
export function AppShell() {
  return (
    <div className="flex min-h-screen bg-brand-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
      <ChatbotWidget />
    </div>
  );
}
