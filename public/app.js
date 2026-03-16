async function loadServers() {
  const listNode = document.getElementById('server-list');
  listNode.innerHTML = '<p>Ładowanie...</p>';

  try {
    const res = await fetch('/api/servers');
    const data = await res.json();

    if (!data.servers?.length) {
      listNode.innerHTML = '<p>Brak serwerów. Użyj /bump aby dodać swój serwer.</p>';
      return;
    }

    listNode.innerHTML = data.servers.map((s) => {
      const banner = s.banner_url
        ? `<img class="banner" src="${s.banner_url}" alt="Banner ${s.guild_name}" />`
        : '';

      return `
        <article class="card">
          ${banner}
          <h4>${s.guild_name}</h4>
          <p>${s.description || 'Brak opisu.'}</p>
          ${s.ad_title ? `<h5>${s.ad_title}</h5>` : ''}
          ${s.ad_body ? `<p>${s.ad_body}</p>` : ''}
          <div class="meta">
            <span>Bumpy: ${s.bumps_count}</span>
            <span>Ostatni bump: ${new Date(s.bumped_at).toLocaleString('pl-PL')}</span>
          </div>
          <a class="btn small" target="_blank" rel="noreferrer" href="${s.invite_url}">Dołącz</a>
        </article>
      `;
    }).join('');
  } catch (error) {
    listNode.innerHTML = '<p>Błąd podczas pobierania listy serwerów.</p>';
  }
}

loadServers();
