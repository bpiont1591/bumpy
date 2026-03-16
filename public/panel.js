const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
const queryParams = new URLSearchParams(window.location.search);

const guildId = hashParams.get('guild') || queryParams.get('guild');
const token = hashParams.get('token') || queryParams.get('token');

const statusNode = document.getElementById('panel-status');
const form = document.getElementById('panel-form');

if (!guildId) {
  statusNode.textContent = 'Brak identyfikatora serwera.';
} else {
  init().catch((error) => {
    statusNode.textContent = error.message;
  });
}

function validateInvite(urlString) {
  try {
    const url = new URL(urlString);
    return (
      url.protocol === 'https:' &&
      ['discord.gg', 'discord.com', 'www.discord.com'].includes(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

async function init() {
  if (token) {
    const sessionRes = await fetch('/api/panel/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, token })
    });

    const sessionData = await sessionRes.json();
    if (!sessionRes.ok) {
      throw new Error(sessionData.error || 'Nie udało się rozpocząć sesji panelu.');
    }

    history.replaceState({}, '', `/panel.html?guild=${encodeURIComponent(guildId)}`);
  }

  const res = await fetch(`/api/panel/${encodeURIComponent(guildId)}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Błąd pobierania panelu.');
  }

  statusNode.textContent = `Edytujesz serwer: ${data.server.guild_name}`;
  form.description.value = data.server.description || '';
  form.adTitle.value = data.server.ad_title || '';
  form.adBody.value = data.server.ad_body || '';
  form.inviteUrl.value = data.server.invite_url || '';
  form.bannerUrl.value = data.server.banner_url || '';
  form.classList.remove('hidden');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!validateInvite(form.inviteUrl.value)) {
    statusNode.textContent = 'Podaj poprawny link zaproszenia Discord (https://discord.gg/... ).';
    return;
  }

  const payload = {
    description: form.description.value,
    adTitle: form.adTitle.value,
    adBody: form.adBody.value,
    inviteUrl: form.inviteUrl.value,
    bannerUrl: form.bannerUrl.value
  };

  const res = await fetch(`/api/panel/${encodeURIComponent(guildId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    statusNode.textContent = data.error || 'Nie udało się zapisać zmian.';
    return;
  }

  statusNode.textContent = 'Zapisano ustawienia serwera.';
});
