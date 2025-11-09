import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, Events, EmbedBuilder, Message, TextBasedChannel } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { config } from './config'
import { pathToFileURL } from 'url';
import { Player } from './Player/Player';
import { MP3Extractor } from "./Player/extractors/MP3Extractor";

// Client Set up:
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Types:
interface Command {
    data: { name: string };
    alias?: string;
    execute: (client: Client, message: Message & { channel: TextBasedChannel }, args: string[]) => void;
}

declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, Command>;
        aliases: Collection<string, Command>;
        player: Player;
    }
}

// Initialize Player
client.player = new Player(client, {
    extractors: [ 
        new MP3Extractor(),
    ]
});


// Command Collection:
client.commands = new Collection<string, Command>();
client.aliases = new Collection<string, Command>();


// Load Command Files:
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        import(pathToFileURL(filePath).href)
            .then(cmdModule => {
                const cmd: Command = cmdModule.default || cmdModule;
                if ('data' in cmd && 'execute' in cmd) {
                    client.commands.set(cmd.data.name, cmd);
                    if (cmd.alias) client.aliases.set(cmd.alias, cmd);
                        console.log(`[CMD] Loaded ${file}`);
                }
            });
    }
}

// Ready Event
client.once(Events.ClientReady, () => {
    console.log(`AirCon is grooving!\nServers: ${client.guilds.cache.size}`);
  
    client.user?.setPresence({
        activities: [{ name: 'music 🎶', type: 2 }], 
        status: 'idle',
    });
});

// Message Command Handler:
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(config.prefix)) return;
  
    const args = message.content.trim().split(/\s+/);
    const commandName = args.shift()!.slice(config.prefix.length).toLowerCase();
  
    const cmd = client.commands.get(commandName) || client.aliases.get(commandName);
    if (!cmd) return;
  
    try {
        await cmd.execute(client, message, args);
    } catch (err) {
        console.error(`❌ Error executing ${commandName}:`, err);
        const errorEmbed = new EmbedBuilder()
            .setTitle('Error!')
            .setDescription('There was an error executing that command.')
            .setColor('#ff0000');
        await message.channel.send({ embeds: [errorEmbed] });
    }
});

// Client Player Events:
client.player.on('songAdded', (queue, song) => {
    queue.textChannel.send(`🎵 Added to queue: **${song.title}**`);
});

client.player.on('playlistAdded', (queue, songs) => {
    queue.textChannel.send(`🎵 Added playlist with **${songs.length}** songs to the queue!`);
});

client.player.on('songEnd', (queue, song) => {
    console.log(`Finished playing: ${song.title}`);
});

client.player.on('queueEnd', (queue) => {
    queue.textChannel.send('🏁 Queue has ended!');
});

client.player.on('nextSong', (queue, song) => {
    queue.textChannel.send(`▶ Now playing: **[${song.title}](${song.url})**`);
});

client.login(process.env.TOKEN);
