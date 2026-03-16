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
        .setDescription('Kanał do bumpowania')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('bump')
    .setDescription('Wypromuj serwer na stronie NebulaNest')
    .addStringOption((opt) =>
      opt.setName('invite')
        .setDescription('Link zaproszenia Discord')
        .setRequired(true)
    )
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

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Błąd API (${response.status})`);
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
      await apiPost('/api/guild-config', {
        guildId: interaction.guildId,
        guildName: interaction.guild?.name || 'Nieznany serwer',
        channelId: channel.id
      });

      await interaction.editReply(`✅ Kanał bumpa ustawiony na ${channel}. Od teraz /bump działa tylko tam.`);
    } catch (error) {
      await interaction.editReply(`❌ Błąd: ${error.message}`);
    }

    return;
  }

  if (interaction.commandName === 'bump') {
    const inviteUrl = interaction.options.getString('invite', true);
    await interaction.deferReply({ ephemeral: true });

    try {
      const data = await apiPost('/api/bump', {
        guildId: interaction.guildId,
        guildName: interaction.guild?.name || 'Nieznany serwer',
        channelId: interaction.channelId,
        inviteUrl
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
