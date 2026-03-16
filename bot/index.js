require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const API_BASE_URL = process.env.API_BASE_URL;
const BUMP_API_KEY = process.env.BUMP_API_KEY;

if (!BOT_TOKEN || !CLIENT_ID || !API_BASE_URL || !BUMP_API_KEY) {
  throw new Error('Brak wymaganych zmiennych środowiskowych dla bota.');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Ustaw kanał, na którym będzie dozwolona komenda /bump')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt
        .setName('kanał')
        .setDescription('Kanał do bumpowania i tworzenia zaproszenia')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Pobierz link do panelu serwera')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('bump')
    .setDescription('Wypromuj serwer na stronie NebulaNest')
].map((cmd) => cmd.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
}

async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bump-api-key': BUMP_API_KEY
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const apiMessage = data.error || data.message;
    const fallback = raw ? raw.slice(0, 240) : 'Wewnętrzny błąd API.';

    if (response.status >= 500) {
      throw new Error(
        `${apiMessage || fallback}. Sprawdź Cloudflare Pages Functions: D1 binding "DB", sekrety i logi deploymentu.`
      );
    }

    throw new Error(apiMessage || fallback || 'Błąd API.');
  }

  return data;
}

client.on('ready', () => {
  console.log(`Bot online jako ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'invite') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: '❌ Tylko admin serwera może użyć tej komendy.', ephemeral: true });
      return;
    }

    const channel = interaction.options.getChannel('kanał', true);
    await interaction.deferReply({ ephemeral: true });

    try {
      const cfg = await apiPost('/api/guild-config', {
        guildId: interaction.guildId,
        guildName: interaction.guild?.name || 'Nieznany serwer',
        channelId: channel.id
      });

      await interaction.editReply(
        `✅ Kanał bumpa ustawiony na ${channel}.\n` +
        'Od teraz `/bump` działa tylko tam i bot automatycznie tworzy link zaproszenia z tego kanału.\n' +
        `Panel serwera: ${cfg.panelUrl}`
      );
    } catch (error) {
      await interaction.editReply(`❌ Błąd: ${error.message}`);
    }

    return;
  }

  if (interaction.commandName === 'panel') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: '❌ Tylko admin serwera może użyć tej komendy.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const data = await apiPost('/api/panel-link', {
        guildId: interaction.guildId,
        guildName: interaction.guild?.name || 'Nieznany serwer'
      });

      await interaction.editReply(`🛠️ Link do panelu serwera:\n${data.panelUrl}`);
    } catch (error) {
      await interaction.editReply(`❌ Błąd: ${error.message}`);
    }

    return;
  }

  if (interaction.commandName === 'bump') {
    await interaction.deferReply({ ephemeral: true });

    try {
      const channel = interaction.channel;

      if (!channel || !('createInvite' in channel)) {
        throw new Error('Ta komenda działa tylko na kanale tekstowym serwera.');
      }

      const botPerms = channel.permissionsFor(interaction.client.user.id);
      if (!botPerms?.has(PermissionFlagsBits.CreateInstantInvite)) {
        throw new Error('Bot nie ma uprawnienia "Tworzenie zaproszeń" na tym kanale.');
      }

      const invite = await channel.createInvite({
        maxAge: 0,
        maxUses: 0,
        unique: true,
        reason: `Bump serwera ${interaction.guild?.name || interaction.guildId}`
      });

      const data = await apiPost('/api/bump', {
        guildId: interaction.guildId,
        guildName: interaction.guild?.name || 'Nieznany serwer',
        channelId: interaction.channelId,
        inviteUrl: `https://discord.gg/${invite.code}`
      });

      await interaction.editReply(
        `✅ Bump wykonany! Twój serwer został odświeżony na liście.\nPanel: ${data.panelUrl}`
      );
    } catch (error) {
      await interaction.editReply(`❌ Błąd: ${error.message}`);
    }
  }
});

registerCommands()
  .then(() => client.login(BOT_TOKEN))
  .catch((error) => {
    console.error('Nie udało się uruchomić bota:', error);
    process.exit(1);
  });
