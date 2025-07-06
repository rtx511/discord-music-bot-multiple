const { Client, Collection, GatewayIntentBits, Partials, Colors, EmbedBuilder, ActivityType } = require("discord.js");
const { DisTube } = require("distube");
const { SoundCloudPlugin } = require("@distube/soundcloud");
const { YtDlpPlugin } = require("@distube/yt-dlp");
const path = require("path");
const fs = require("fs");
const { registerCustomFonts } = require("./src/utils/registerFonts");
const config = require("./config.js");
const tokens = require("./tokens.json");
const sodium = require('libsodium-wrappers');
const Localization = require("./src/utils/localization");

async function startBot({ token, clientId, voiceChannelId, logChannelId, main }) {
    try {
        await sodium.ready;

        registerCustomFonts();

        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
            partials: [Partials.Channel],
        });

        client.config = { ...config, token, clientId, voiceChannelId, logChannelId };
        if (!main) {
            client.config.enableLogging = false;
        }
        client.isMain = !!main;

        client.log = async (msg) => {
            if (!client.config.enableLogging) return;
            console.log(msg);
            if (client.isMain && client.config.logChannelId) {
                try {
                    const channel = await client.channels.fetch(client.config.logChannelId);
                    if (channel && typeof channel.send === 'function') {
                        await channel.send(msg);
                    }
                } catch (err) {
                    console.error('❌ Failed to send log message:', err);
                }
            }
        };

        client.localization = new Localization(client);

        client.commands = new Collection();

        const commandsPath = path.join(__dirname, "src", "commands");
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ("name" in command && "execute" in command) {
                client.commands.set(command.name, command);
                client.log(`✅ Loaded command: ${command.name}`);

                const aliases = config.aliases[command.name];
                if (aliases && Array.isArray(aliases)) {
                    aliases.forEach(alias => {
                        client.commands.set(alias, command);
                        client.log(`✅ Registered alias '${alias}' for command '${command.name}'`);
                    });
                }
            } else {
                console.warn(`[WARNING] The command at ${filePath} is missing a required "name" or "execute" property.`);
            }
        }

        const eventsPath = path.join(__dirname, "src", "events");
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                    client.log(`📂 Loaded event (once): ${event.name} from ${filePath}`);
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                    client.log(`📂 Loaded event: ${event.name} from ${filePath}`);
                }
        }

        client.distube = new DisTube(client, {
            emitNewSongOnly: true,
            emitAddSongWhenCreatingQueue: false,
            plugins: [
                new SoundCloudPlugin(),
                new YtDlpPlugin(),
            ],
            emitAddListWhenCreatingQueue: false,
        });

        client.distube
            .on("playSong", async (queue, song) => {
                try {
                    if (!queue.textChannel && song.metadata && song.metadata.message && song.metadata.message.channel) {
                        queue.textChannel = song.metadata.message.channel;
                    }

                    if (client.config.enableLogging) {
                        client.log(client.localization.get('events.playSong', { song: song.name, user: song.user.tag }));
                    }

                    if (queue.currentMessage) {
                        await queue.currentMessage.delete().catch((err) => {
                            if (client.config.enableLogging) console.error("❌ Error deleting previous message:", err);
                        });
                        queue.currentMessage = undefined;
                        queue.initiatorId = undefined;
                    }

                    await require("./src/utils/sendMusicCard")(queue, song, client.localization);
                } catch (error) {
                    console.error("❌ Error in playSong event:", error);
                }
            })
            .on("addSong", (queue, song) => {
                try {
                    if (!queue.textChannel && song.metadata && song.metadata.message && song.metadata.message.channel) {
                        queue.textChannel = song.metadata.message.channel;
                    }

                    if (client.config.enableLogging) {
                        client.log(client.localization.get('events.addSong', { song: song.name, duration: formatTime(song.duration), user: song.user.tag }));
                    }

                    if (queue.textChannel && typeof queue.textChannel.send === "function") {
                        const embed = new EmbedBuilder()
                            .setColor(Colors.Blue)
                            .setDescription(client.localization.get('events.addSong', { song: song.name, duration: formatTime(song.duration), user: song.user.tag }));

                        queue.textChannel.send({ embeds: [embed] }).catch(console.error);
                    } else {
                        console.error("❌ AddSong event queue text channel is not text-based.");
                    }
                } catch (error) {
                    console.error("❌ Error in addSong event:", error);
                }
            })
        await client.login(token);
        client.log(`🚀 Bot ${client.user.tag} is online!`);
        return client;
    } catch (error) {
        console.error("❌ Failed to initialize the bot:", error);
    }
}

const tokensToUse = Array.isArray(tokens) ? tokens : [];
if (tokensToUse.length === 0) {
    console.error('❌ No bot tokens found in tokens.json');
    process.exit(1);
}

const clients = [];
let mainClient;

(async () => {
    for (const botConfig of tokensToUse) {
        const client = await startBot(botConfig);
        if (client) {
            clients.push(client);
            if (botConfig.main && !mainClient) {
                mainClient = client;
            }
        }
    }
})();

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled Rejection:', error);
});