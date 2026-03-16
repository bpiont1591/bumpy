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
      statusNode.innerHTML = '⚠️ Brakuje D1 bindingu `DB` w `wrangler.toml` lub na środowisku.';
      return;
    }

    if (!data.hasBotInviteUrl && !data.hasBotClientId) {
      statusNode.classList.remove('hidden');
      statusNode.innerHTML = '⚠️ Brakuje sekretu `BOT_INVITE_URL` (lub `BOT_CLIENT_ID`) dla przycisku zaproszenia bota.';
    }
  } catch (_error) {
    statusNode.classList.remove('hidden');
    statusNode.innerHTML = '⚠️ Nie można połączyć się z API.';
  }
}

async function initInviteButton() {
  const inviteBtn = document.getElementById('invite-bot-btn');
  if (!inviteBtn) return;

  try {
    const res = await fetch('/api/public-config');
    const data = await res.json();

    if (!res.ok) {
      inviteBtn.title = data.error || 'Brak konfiguracji zaproszenia bota w sekretach.';
      inviteBtn.classList.add('btn--disabled');
      inviteBtn.removeAttribute('href');
      return;
    }

    inviteBtn.href = data.inviteUrl;
    inviteBtn.addEventListener('click', (event) => {
      event.preventDefault();
      window.open(data.inviteUrl, '_blank', 'noopener,noreferrer');
      window.location.href = '/panel.html?onboarding=1';
    });
  } catch (_error) {
    inviteBtn.title = 'Nie udało się pobrać konfiguracji zaproszenia bota.';
    inviteBtn.classList.add('btn--disabled');
    inviteBtn.removeAttribute('href');
  }
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

      const tags = (server.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6);
      const tagsHtml = tags.length
        ? `<div class="tags">${tags.map((t) => `<span class="pill">#${escapeHtml(t)}</span>`).join('')}</div>`
        : '';

      return `
        <article class="card">
          ${banner}
          <div class="card__head">
            <h4>${escapeHtml(server.guild_name)}</h4>
            <span class="pill">Bumpy: ${server.bumps_count}</span>
          </div>
          ${tagsHtml}
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
