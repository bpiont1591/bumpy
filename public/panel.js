const params = new URLSearchParams(window.location.search);
const guildId = params.get('guild');
const token = params.get('token');

const statusNode = document.getElementById('panel-status');
const form = document.getElementById('panel-form');

if (!guildId || !token) {
  statusNode.textContent = 'Brak wymaganych parametrów panelu (guild, token).';
} else {
  init();
}

async function init() {
  try {
    const res = await fetch(`/api/panel/${guildId}?token=${encodeURIComponent(token)}`);
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
  } catch (error) {
    statusNode.textContent = error.message;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    token,
    description: form.description.value,
    adTitle: form.adTitle.value,
    adBody: form.adBody.value,
    inviteUrl: form.inviteUrl.value,
    bannerUrl: form.bannerUrl.value
  };

  const res = await fetch(`/api/panel/${guildId}`, {
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
