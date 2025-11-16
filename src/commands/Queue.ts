import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Message, TextBasedChannel } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Plays a song!"),
    alias: "q",
    async execute(client: Client, message: Message, args: string[]) {
        if (!message.channel.isSendable()) return;

        if (!message.member?.voice.channel) return message.channel.send(":x: | You are not in a voice channel!");
        if (!client.player.isUserInSameVoiceChannel(message)) return message.channel.send(":x: | You are not in my voice channel!");

        message.channel.send("Check console");   
        console.log("Queue for guild:", message.member!.guild.id, client.player.getQueue(message.member!.guild.id)?.upcoming);
        console.log("History for guild:", message.member!.guild.id, client.player.getQueue(message.member!.guild.id)?.history);
    },
};