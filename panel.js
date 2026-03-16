const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
const queryParams = new URLSearchParams(window.location.search);

const guildId = hashParams.get('guild') || queryParams.get('guild');
const token = hashParams.get('token') || queryParams.get('token');
const onboardingMode = queryParams.get('onboarding') === '1';

const statusNode = document.getElementById('panel-status');
const form = document.getElementById('panel-form');

if (!guildId) {
  if (onboardingMode) {
    showOnboardingAccessForm().catch((error) => {
      statusNode.textContent = error.message;
    });
  } else {
    statusNode.textContent = 'Brak identyfikatora serwera.';
  }
} else {
  init().catch((error) => {
    statusNode.textContent = error.message;
  });
}

async function showOnboardingAccessForm() {
  const oauthState = queryParams.get('oauth');
  if (oauthState === 'failed' || oauthState === 'expired' || oauthState === 'token_error' || oauthState === 'user_error') {
    statusNode.textContent = 'Logowanie Discord nie powiodło się. Spróbuj ponownie.';
  } else {
    statusNode.textContent = 'Zaloguj się Discordem i wybierz serwer, którego jesteś ownerem.';
  }

  const meRes = await fetch('/api/auth/me');

  if (meRes.status === 401) {
    const loginWrap = document.createElement('div');
    loginWrap.className = 'panel-form';
    loginWrap.innerHTML = `
      <p>Aby wejść do panelu WWW, zaloguj się kontem Discord i wybierz swój serwer.</p>
      <a class="btn" href="/api/auth/discord/start">Zaloguj się Discordem</a>
      <small>Po zalogowaniu wrócisz tutaj i wybierzesz serwer z listy ownera.</small>
    `;
    form.classList.add('hidden');
    form.insertAdjacentElement('beforebegin', loginWrap);
    return;
  }

  const meData = await meRes.json();
  if (!meRes.ok || !meData.ownerGuilds) {
    throw new Error(meData.error || 'Nie udało się pobrać listy serwerów z Discord.');
  }

  if (!meData.ownerGuilds.length) {
    const emptyWrap = document.createElement('div');
    emptyWrap.className = 'panel-form';
    emptyWrap.innerHTML = '<p>Nie znaleziono serwerów, których jesteś ownerem.</p>';
    form.classList.add('hidden');
    form.insertAdjacentElement('beforebegin', emptyWrap);
    return;
  }

  const options = meData.ownerGuilds
    .map((g) => `<option value="${g.id}">${g.name}</option>`)
    .join('');

  const pickForm = document.createElement('form');
  pickForm.className = 'panel-form';
  pickForm.innerHTML = `
    <label>
      Wybierz serwer, którego jesteś ownerem
      <select name="guildId" required>${options}</select>
    </label>

    <button class="btn" type="submit">Przejdź do panelu serwera</button>
    <small>Po zapisaniu panelu użyj w Discordzie: <b>/invite</b> i potem <b>/bump</b>.</small>
  `;

  form.classList.add('hidden');
  form.insertAdjacentElement('beforebegin', pickForm);

  pickForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    statusNode.textContent = 'Tworzenie dostępu do panelu...';

    const payload = { guildId: pickForm.guildId.value };
    const res = await fetch('/api/user-panel-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      statusNode.textContent = data.error || 'Nie udało się utworzyć dostępu do panelu.';
      return;
    }

    window.location.href = data.panelUrl;
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
    if (!sessionRes.ok) throw new Error(sessionData.error || 'Nie udało się rozpocząć sesji panelu.');

    history.replaceState({}, '', `/panel.html?guild=${encodeURIComponent(guildId)}`);
  }

  const res = await fetch(`/api/panel/${encodeURIComponent(guildId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Błąd pobierania panelu.');

  statusNode.textContent = `Edytujesz serwer: ${data.server.guild_name}`;
  form.description.value = data.server.description || '';
  form.tags.value = data.server.tags || '';
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
    tags: form.tags.value,
    adTitle: form.adTitle.value,
    adBody: form.adBody.value,
    inviteUrl: form.inviteUrl.value,
    bannerUrl: form.bannerUrl.value
  };

  const res = await fetch(`/api/panel/${encodeURIComponent(guildId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    statusNode.textContent = data.error || 'Nie udało się zapisać zmian.';
    return;
  }

  statusNode.textContent = 'Zapisano ustawienia serwera.';
});
