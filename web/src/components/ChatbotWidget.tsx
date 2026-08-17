import type { ChatHistoryMessage } from '@c3-digital/shared';
import type { SVGProps } from 'react';
import { useState } from 'react';
import { useChat } from '../hooks/useApi';

/**
 * Chatbot d'assistance (PROMPT 8, point 3) — widget flottant disponible
 * sur toutes les pages, tous rôles. Interroge `POST /ai/chat`, qui
 * répond uniquement via des outils déjà restreints au périmètre du rôle
 * connecté (voir `ChatbotToolsService`, backend) — ce composant n'a donc
 * pas de logique de permission à dupliquer.
 */
export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatHistoryMessage[]>([]);
  const [input, setInput] = useState('');
  const chat = useChat();

  function send() {
    const text = input.trim();
    if (!text || chat.isPending) return;

    const history = messages;
    setMessages([...history, { role: 'user', content: text }]);
    setInput('');

    chat.mutate(
      { message: text, history },
      {
        onSuccess: (data) => {
          setMessages((current) => [...current, { role: 'assistant', content: data.reply }]);
        },
        onError: () => {
          setMessages((current) => [
            ...current,
            { role: 'assistant', content: "Le chatbot n'est pas disponible pour le moment." },
          ]);
        },
      },
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le chatbot d'assistance"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition hover:opacity-90"
      >
        <ChatIcon className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface shadow-2xl">
      <div className="flex items-center justify-between bg-brand-primary px-4 py-3 text-white">
        <span className="text-sm font-semibold">Assistant c3-digital</span>
        <button onClick={() => setIsOpen(false)} aria-label="Fermer" className="text-white/80 hover:text-white">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-xs text-brand-muted">
            Posez une question sur vos données (ex : "combien d'inspections ce mois-ci ?") ou sur l'utilisation de
            l'application.
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              message.role === 'user'
                ? 'ml-auto bg-brand-primary text-white'
                : 'bg-brand-bg text-slate-800'
            }`}
          >
            {message.content}
          </div>
        ))}
        {chat.isPending && <div className="max-w-[85%] rounded-xl bg-brand-bg px-3 py-2 text-sm text-brand-muted">…</div>}
      </div>

      <div className="flex gap-2 border-t border-brand-outline p-3">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && send()}
          placeholder="Votre question…"
          className="flex-1 rounded-lg border border-brand-outline px-3 py-2 text-sm"
        />
        <button
          onClick={send}
          disabled={chat.isPending || input.trim().length === 0}
          className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}

function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
