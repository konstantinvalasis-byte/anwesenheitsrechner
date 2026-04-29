import { supabase } from '../supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';

const WORK_DAY_LABELS = [
  { dow: 1, label: 'Mo' },
  { dow: 2, label: 'Di' },
  { dow: 3, label: 'Mi' },
  { dow: 4, label: 'Do' },
  { dow: 5, label: 'Fr' },
];

export async function renderSettings(profile) {
  const workDays = profile.work_days || [1,2,3,4,5];

  document.getElementById('app').innerHTML = `
    <div id="navbar" class="navbar"></div>
    <div class="page fade-in">
      <div class="container" style="max-width:520px">
        <div class="page-header">
          <h1 class="page-title">Einstellungen</h1>
          <p class="page-subtitle">Deine persönlichen Arbeitszeiten</p>
        </div>

        <div class="card" style="margin-bottom:16px">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:6px">Name</h3>
          <p class="text-muted text-sm" style="margin-bottom:14px">Wird im Team und in der Navbar angezeigt.</p>
          <input id="input-name" class="form-input" type="text" value="${escapeHtml(profile.name || '')}" maxlength="60" placeholder="Dein Name" />
        </div>

        <div class="card">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:6px">Arbeitstage</h3>
          <p class="text-muted text-sm" style="margin-bottom:18px">
            Wähle die Tage, an denen du arbeitest. Vollzeitkräfte lassen alle Haken gesetzt.
            Nicht gewählte Wochentage werden im Kalender ausgegraut und bei der Berechnung ignoriert.
          </p>
          <div class="workdays-row">
            ${WORK_DAY_LABELS.map(({ dow, label }) => `
              <label class="workday-toggle ${workDays.includes(dow) ? 'active' : ''}">
                <input type="checkbox" value="${dow}" ${workDays.includes(dow) ? 'checked' : ''} onchange="updateWorkdayToggle(this)" />
                ${label}
              </label>`).join('')}
          </div>
          <p class="text-muted text-xs" style="margin-top:12px" id="workdays-hint">${workdayHint(workDays)}</p>
        </div>

        <div style="margin-top:20px;display:flex;gap:10px">
          <button class="btn btn-ghost" onclick="navigate('dashboard')">Abbrechen</button>
          <button class="btn btn-primary" id="btn-save" onclick="saveSettings()">Speichern</button>
        </div>
      </div>
    </div>
  `;

  renderNavbar(profile, 'settings');
}

window.updateWorkdayToggle = function(checkbox) {
  const label = checkbox.closest('.workday-toggle');
  label.classList.toggle('active', checkbox.checked);
  const selected = getSelectedDays();
  document.getElementById('workdays-hint').textContent = workdayHint(selected);
};

window.saveSettings = async function() {
  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = 'Speichern…';

  const name = document.getElementById('input-name').value.trim();
  const workDays = getSelectedDays();

  if (!name) {
    showToast('❌ Name darf nicht leer sein', 'error');
    btn.disabled = false;
    btn.textContent = 'Speichern';
    return;
  }
  if (workDays.length === 0) {
    showToast('❌ Mindestens ein Arbeitstag muss gewählt sein', 'error');
    btn.disabled = false;
    btn.textContent = 'Speichern';
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('profiles')
    .update({ name, work_days: workDays })
    .eq('id', user.id);

  if (error) {
    showToast('❌ Fehler beim Speichern', 'error');
    btn.disabled = false;
    btn.textContent = 'Speichern';
    return;
  }

  showToast('✅ Einstellungen gespeichert', 'success');
  window.__profileNeedsRefresh = true;
  setTimeout(() => navigate('dashboard'), 600);
};

function getSelectedDays() {
  return [...document.querySelectorAll('.workday-toggle input:checked')]
    .map(cb => parseInt(cb.value))
    .sort();
}

function workdayHint(days) {
  if (days.length === 5) return 'Vollzeit (Mo–Fr)';
  const labels = WORK_DAY_LABELS.filter(d => days.includes(d.dow)).map(d => d.label);
  return `Teilzeit: ${labels.join(', ')} (${days.length} Tage/Woche)`;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
