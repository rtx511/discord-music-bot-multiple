const { ActivityType } = require("discord.js");
const chalk = require("chalk");
const moment = require("moment");
require("moment-duration-format");
const os = require("os");
const config = require("../../config.js");

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        try {
            const banner = `
${chalk.blueBright(`
██╗    ██╗██╗ ██████╗██╗  ██╗    ███████╗████████╗██╗   ██╗██████╗ ██╗ ██████╗ 
██║    ██║██║██╔════╝██║ ██╔╝    ██╔════╝╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗
██║ █╗ ██║██║██║     █████╔╝     ███████╗   ██║   ██║   ██║██║  ██║██║██║   ██║
██║███╗██║██║██║     ██╔═██╗     ╚════██║   ██║   ██║   ██║██║  ██║██║██║   ██║
╚███╔███╔╝██║╚██████╗██║  ██╗    ███████║   ██║   ╚██████╔╝██████╔╝██║╚██████╔╝
 ╚══╝╚══╝ ╚═╝ ╚═════╝╚═╝  ╚═╝    ╚══════╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝ 
`)}
${chalk.greenBright("            © Wick® Studio")}    
`;
            if (client.config.enableLogging) {
                client.log(banner);
                client.log(chalk.yellowBright(`✅ Logged in as ${client.user.tag}!`));
                client.log('Code by Wick Studio');
                client.log('join us at : discord.gg/wicks');
            }

            const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const uptime = moment.duration(client.uptime).format(" D [days], H [hrs], m [mins], s [secs]");
            const cpuLoad = os.loadavg()[0].toFixed(2);

            if (client.config.enableLogging) {
                client.log(chalk.cyanBright(`📁 Guilds: ${client.guilds.cache.size}`));
                client.log(chalk.cyanBright(`👥 Users: ${client.users.cache.size}`));
                client.log(chalk.cyanBright(`🖥️ Memory Usage: ${memoryUsage} MB`));
                client.log(chalk.cyanBright(`🖥️ CPU Load (1m): ${cpuLoad}`));
                client.log(chalk.cyanBright(`⏱️ Uptime: ${uptime}`));
            }

            try {
                const presence = await client.user.setActivity("🔊 Discord Player!", { type: ActivityType.Playing });
                if (presence.activities.length > 0) {
                    if (client.config.enableLogging) client.log(chalk.magentaBright(`🔔 Activity set to "${presence.activities[0].name}"`));
                } else {
                    if (client.config.enableLogging) client.log(chalk.magentaBright(`🔔 Activity set to "🔊 Discord Player!"`));
                }
            } catch (err) {
                console.error(chalk.redBright("❌ Failed to set initial activity:"), err);
            }
            if (client.config.enableLogging) {
                client.log(chalk.greenBright("✅ Bot is fully operational and ready to serve!"));
                client.log(chalk.yellowBright("📜 Copyright Wick® Studio"));
            }

            if (client.config.voiceChannelId) {
                try {
                    const channel = await client.channels.fetch(client.config.voiceChannelId);
                    if (channel && channel.isVoiceBased()) {
                        await client.distube.voices.join(channel, { selfDeaf: false });
                        if (client.config.enableLogging) {
                            client.log(chalk.cyanBright(`🔊 Joined voice channel: ${channel.name}`));
                        }
                    } else if (client.config.enableLogging) {
                        client.log(chalk.redBright("❌ Provided voiceChannelId is not voice based."));
                    }
                } catch (err) {
                    console.error(chalk.redBright("❌ Failed to join voice channel:"), err);
                }
            }
        } catch (error) {
            console.error(chalk.redBright("❌ Error in ready event:"), error);
        }
    },
};