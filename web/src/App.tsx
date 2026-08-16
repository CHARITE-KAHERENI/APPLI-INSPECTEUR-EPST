import { FORM_CODES } from '@c3-digital/shared';
import './App.css';

/**
 * Point d'entrée provisoire de l'app web c3-digital.
 * L'interface de saisie/consultation des formulaires (basée sur le modèle
 * partagé `@c3-digital/shared`) sera construite dans une prochaine itération.
 */
function App() {
  return (
    <main className="app">
      <h1>c3-digital</h1>
      <p>
        Numérisation des formulaires d'inspection de l'Inspection Générale de
        l'Enseignement (IGE) — RDC.
      </p>
      <ul className="form-codes">
        {FORM_CODES.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
    </main>
  );
}

export default App;
