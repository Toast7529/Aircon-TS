import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Message } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Plays a song!"),
    alias: "p",
    async execute(client: Client, message: Message, args: string[]) {
        if (!message.channel.isSendable()) return;

        let query: string = args.join(" ");
        if (!query) return message.channel.send("Please provide a song name or URL to play!");
        
        if (!message.member?.voice.channel) return message.channel.send(":x: | You are not in a voice channel!");
        if (!client.player.isUserInSameVoiceChannel(message)) return message.channel.send(":x: | You are not in my voice channel!");

        client.player.addSongToQueue(message.member!.guild.id, query, message.channel as any, message.member!);
    },
};