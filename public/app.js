function escapeHtml(value) {
  if (typeof value !== 'string') return '';
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadServers() {
  const listNode = document.getElementById('server-list');
  listNode.innerHTML = '<div class="empty">Ładowanie listy serwerów...</div>';

  try {
    const res = await fetch('/api/servers');
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Błąd API');

    if (!data.servers?.length) {
      listNode.innerHTML = '<div class="empty">Brak serwerów. Dodaj bota NebulaNest i użyj <code>/bump</code>.</div>';
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

loadServers();
