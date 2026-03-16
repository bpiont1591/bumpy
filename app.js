const BOT_CLIENT_ID = 'YOUR_CLIENT_ID';

function escapeHtml(value) {
  if (typeof value !== 'string') return '';
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function checkSetupStatus() {
  const statusNode = document.getElementById('setup-status');
  if (!statusNode) return;

  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    if (!res.ok || !data.ok) {
      statusNode.classList.remove('hidden');
      statusNode.innerHTML = '⚠️ API jest niedostępne. Sprawdź deploy Functions.';
      return;
    }

    if (!data.hasDbBinding) {
      statusNode.classList.remove('hidden');
      statusNode.innerHTML = '⚠️ Brakuje D1 bindingu. Ustaw w Cloudflare Pages: Functions → D1 bindings (`DB`).';
      return;
    }
  } catch (_error) {
    statusNode.classList.remove('hidden');
    statusNode.innerHTML = '⚠️ Nie można połączyć się z API.';
  }
}

function initInviteButton() {
  const inviteBtn = document.getElementById('invite-bot-btn');
  if (!inviteBtn) return;

  if (BOT_CLIENT_ID === 'YOUR_CLIENT_ID') {
    inviteBtn.title = 'Podmień YOUR_CLIENT_ID w app.js na ID aplikacji Discord bota.';
  }

  inviteBtn.href = `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(BOT_CLIENT_ID)}&scope=bot%20applications.commands&permissions=268435456`;
}

async function loadServers() {
  const listNode = document.getElementById('server-list');
  listNode.innerHTML = '<div class="empty">Ładowanie listy serwerów...</div>';

  try {
    const res = await fetch('/api/servers');
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Błąd API');

    if (!data.servers?.length) {
      listNode.innerHTML = '<div class="empty">Brak serwerów. 1) Zaproś bota 2) Ustaw kanał komendą <code>/invite</code> 3) Użyj <code>/bump</code>.</div>';
      return;
    }

    listNode.innerHTML = data.servers.map((server) => {
      const banner = server.banner_url
        ? `<img class="banner" src="${escapeHtml(server.banner_url)}" alt="Banner ${escapeHtml(server.guild_name)}" loading="lazy" />`
        : '';

      return `
        <article class="card">
          ${banner}
          <div class="card__head">
            <h4>${escapeHtml(server.guild_name)}</h4>
            <span class="pill">Bumpy: ${server.bumps_count}</span>
          </div>
          <p>${escapeHtml(server.description || 'Brak opisu serwera.')}</p>
          ${server.ad_title ? `<h5>${escapeHtml(server.ad_title)}</h5>` : ''}
          ${server.ad_body ? `<p>${escapeHtml(server.ad_body)}</p>` : ''}
          <div class="meta">Ostatni bump: ${new Date(server.bumped_at).toLocaleString('pl-PL')}</div>
          <a class="btn" target="_blank" rel="noreferrer" href="${escapeHtml(server.invite_url)}">Dołącz do serwera</a>
        </article>
      `;
    }).join('');
  } catch (_error) {
    listNode.innerHTML = '<div class="empty">Nie udało się pobrać serwerów. Odśwież stronę za chwilę.</div>';
  }
}

initInviteButton();
checkSetupStatus();
loadServers();
