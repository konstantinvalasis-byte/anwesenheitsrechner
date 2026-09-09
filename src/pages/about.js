import { renderNavbar } from '../components/navbar.js';

const CHANGELOG = [
  {
    date: 'September 2026',
    items: [
      'Kalender: Mehrere Tage per Klick/Ziehen auswählen, Wochentag-Filter für Serien (z.B. alle Mittwoche)',
      'Registrierung ohne Team möglich, Teambeitritt kann später erfolgen',
      'Jahresübersicht, Team-Kalender und Serieneintrag hinzugefügt',
      'Statistik-Bugs behoben und Sicherheitslücke (XSS) geschlossen',
      'Schema-Fehler bei Datenbank-Migration behoben'
    ]
  },
  {
    date: 'Mai 2026',
    items: [
      'Passwort-vergessen-Funktion hinzugefügt',
      'Konfigurierbares Anwesenheitsziel pro Team',
      '"Über die App"-Seite ergänzt',
      'Präsentation und Schulung zur Landingpage hinzugefügt'
    ]
  },
  {
    date: 'April/Mai 2026',
    items: [
      'Team-Verwaltung eingeführt, Admin-Seite entfernt',
      'Teilzeit-Unterstützung und Einstellungs-Seite',
      'Datenschutz-Opt-out für Teamstatistik',
      'Schulferien-Daten ergänzt und Kalender-Anzeige verbessert',
      'Mobile-Ansicht grundlegend optimiert (Bottom-Nav, Layout, Kontrast)'
    ]
  }
];

export function renderAbout(profile) {
  document.getElementById('app').innerHTML = `
    <div id="navbar" class="navbar"></div>
    <div class="page fade-in">
      <div class="container" style="max-width:640px">
        <div class="page-header">
          <h1 class="page-title">Über diese App</h1>
        </div>
        <div class="card">
          <div class="card-body" style="line-height:1.7;display:flex;flex-direction:column;gap:16px">
            <p>Der Anwesenheitsrechner ist aus einer ganz einfachen Eigenmotivation entstanden: Ich wollte eine unkomplizierte Möglichkeit schaffen, den Überblick über die eigene Büropräsenz zu behalten – ohne Excel-Tabellen, manuelles Nachrechnen oder ständiges Nachfragen, wie viele Tage noch fehlen.</p>
            <p>Die Idee dahinter war nie, andere zu kontrollieren oder zu „tracken". Im Mittelpunkt steht die eigene Transparenz und ein entspannterer Umgang mit Präsenzvorgaben im Arbeitsalltag. Die Teamfunktion ist deshalb auch bewusst nur als kleines, anonymes Zusatzfeature gedacht – eher für ein allgemeines Stimmungsbild als zur Einsicht in individuelle Daten.</p>
            <div style="border-top:1px solid var(--border);padding-top:16px;display:flex;flex-direction:column;gap:4px">
              <p style="color:var(--text-muted);font-size:0.875rem">Ersteller: <strong style="color:var(--text)">Konstantin Valasis</strong></p>
              <p style="color:var(--text-muted);font-size:0.875rem">Powered by <strong style="color:var(--text)">Claude Code</strong></p>
            </div>
          </div>
        </div>
        <div class="card" style="margin-top:16px">
          <div class="card-body" style="display:flex;flex-direction:column;gap:16px">
            <h2 style="font-size:1.1rem;margin:0">Changelog</h2>
            ${CHANGELOG.map(entry => `
              <div style="display:flex;flex-direction:column;gap:4px">
                <div style="display:flex;align-items:baseline;gap:8px">
                  <span style="color:var(--text-muted);font-size:0.8rem;white-space:nowrap">${entry.date}</span>
                </div>
                <ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:2px">
                  ${entry.items.map(item => `<li style="font-size:0.9rem">${item}</li>`).join('')}
                </ul>
              </div>
            `).join('<div style="border-top:1px solid var(--border)"></div>')}
          </div>
        </div>
      </div>
    </div>
  `;

  renderNavbar(profile, 'about');
}
