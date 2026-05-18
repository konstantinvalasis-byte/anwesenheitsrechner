import { renderNavbar } from '../components/navbar.js';

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
      </div>
    </div>
  `;

  renderNavbar(profile, 'about');
}
