require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');

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
    .setName('bump')
    .setDescription('Wypromuj serwer na stronie GuildLift')
    .addStringOption(opt =>
      opt.setName('invite')
        .setDescription('Link zaproszenia Discord')
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
}

client.on('ready', () => {
  console.log(`Bot online jako ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'bump') return;

  const inviteUrl = interaction.options.getString('invite', true);
  await interaction.deferReply({ ephemeral: true });

  try {
    const response = await fetch(`${API_BASE_URL}/api/bump`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bump-api-key': BUMP_API_KEY
      },
      body: JSON.stringify({
        guildId: interaction.guildId,
        guildName: interaction.guild?.name || 'Nieznany serwer',
        inviteUrl
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Nie udało się wykonać bumpa.');
    }

    await interaction.editReply(
      `✅ Bump wykonany! Twój serwer został odświeżony na liście.\nPanel: ${data.panelUrl}`
    );
  } catch (error) {
    await interaction.editReply(`❌ Błąd: ${error.message}`);
  }
});

registerCommands()
  .then(() => client.login(BOT_TOKEN))
  .catch((error) => {
    console.error('Nie udało się uruchomić bota:', error);
    process.exit(1);
  });
