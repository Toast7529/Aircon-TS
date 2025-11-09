import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Message, TextBasedChannel } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Plays a song!"),
    alias: "p",
    async execute(client: Client, message: Message & { channel: TextBasedChannel }, args: string[]) {

        let query: string = args.join(" ");
        if (!query) return message.channel.send("Please provide a song name or URL to play!");
        
        client.player.addSongToQueue(message.member!.guild.id, query, message.channel as any, message.member!);
        message.channel.send("Added song to queue!");   
    },
};