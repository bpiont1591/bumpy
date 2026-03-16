async function loadServers() {
  const listNode = document.getElementById('server-list');
  listNode.innerHTML = '<div class="empty">Ładowanie listy serwerów...</div>';

  try {
    const res = await fetch('/api/servers');
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Błąd API');
    }

    if (!data.servers?.length) {
      listNode.innerHTML = '<div class="empty">Brak serwerów. Użyj <code>/bump</code> aby dodać swój serwer.</div>';
      return;
    }

    listNode.innerHTML = data.servers.map((s) => {
      const banner = s.banner_url
        ? `<img class="banner" src="${s.banner_url}" alt="Banner ${s.guild_name}" loading="lazy" />`
        : '';

      return `
        <article class="card">
          ${banner}
          <div class="card__head">
            <h4>${s.guild_name}</h4>
            <span class="pill">Bumpy: ${s.bumps_count}</span>
          </div>
          <p>${s.description || 'Brak opisu.'}</p>
          ${s.ad_title ? `<h5>${s.ad_title}</h5>` : ''}
          ${s.ad_body ? `<p>${s.ad_body}</p>` : ''}
          <div class="meta">
            <span>Ostatni bump: ${new Date(s.bumped_at).toLocaleString('pl-PL')}</span>
          </div>
          <a class="btn small" target="_blank" rel="noreferrer" href="${s.invite_url}">Dołącz do serwera</a>
        </article>
      `;
    }).join('');
  } catch (_error) {
    listNode.innerHTML = '<div class="empty">Nie udało się pobrać listy serwerów. Spróbuj ponownie później.</div>';
  }
}

loadServers();
