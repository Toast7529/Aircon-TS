import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, Events, EmbedBuilder, Message, TextBasedChannel, TextChannel } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { config } from './config'
import { pathToFileURL } from 'url';
import { Player } from './Player/Player';
import { MP3Extractor } from "./Player/extractors/MP3Extractor";
import { Queue } from './Player/Queue';
import { Song } from './Player/Song';
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
client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(config.prefix)) return;
  
    const args: string[] = message.content.trim().split(/\s+/);
    const commandName: string = args.shift()!.slice(config.prefix.length).toLowerCase();
  
    const cmd = client.commands.get(commandName) || client.aliases.get(commandName);
    if (!cmd) return;
  
    try {
        await cmd.execute(client, message, args);
    } catch (err) {
        console.error(`Error executing ${commandName}:`, err);
        if (!message.channel.isSendable()) return;
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('Error!')
            .setDescription('There was an error executing that command.')
            .setColor('#ff0000');
        await message.channel.send({ embeds: [errorEmbed] });
    }
});

// Client Player Events:
client.player.on('error', (error: Error, textChannel: TextChannel) => {
    let errorEmbed = new EmbedBuilder()
        .setTitle(`Error encountered: ${error.message}`)
        .setColor("#ff0000")
    textChannel.send({embeds: [errorEmbed]});
})
.on('playSong', (queue: Queue, song: Song) => {
    let nowPlayingEmbed = new EmbedBuilder()
        .setDescription(`Now playing [${song.title}](${song.url})`)
        .setColor(config.color);

    queue.textChannel.send({ embeds: [nowPlayingEmbed] })
        .then((sentMessage: Message) => {
            setTimeout(() => {
                sentMessage.delete().catch(() => {});
            }, 600000);
        })
        .catch((err: Error) => console.log(err));
})
.on('addSong', (queue: Queue, song: Song) => {
    if (queue.upcoming.length === 0) return;

    let addedSongEmbed = new EmbedBuilder()
        .setDescription(`Added [${song.title}](${song.url}) to queue!`)
        .setColor(config.color);
    queue.textChannel.send({embeds: [addedSongEmbed]});
})
.on('playlistAdded', (queue: Queue, songs: Song[]) => {
    if (queue.upcoming.length === 0) return;

    let addedSongEmbed = new EmbedBuilder()
        .setDescription("Added `" + songs.length + "` to queue")
        .setColor(config.color);
    queue.textChannel.send({embeds: [addedSongEmbed]});
})
.on('finish', async (queue: Queue) => {
    console.log("Queue ended");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
    if (queue.getCurrentSong()) return; // A song was added during the wait
    client.player.destroyQueue(queue.voiceChannel.guild.id);
})
.on('channelEmpty', (queue: Queue) => {
    setTimeout(() => {
        if (queue.voiceChannel.members.filter(m => !m.user.bot).size === 0) {
            client.player.destroyQueue(queue.voiceChannel.guild.id);
        }
    }, 30000); // 30 seconds
});

client.login(process.env.TOKEN);
