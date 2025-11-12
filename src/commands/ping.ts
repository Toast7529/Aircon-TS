import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Message, TextBasedChannel } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),
    alias: "pong",
    async execute(client: Client, message: Message, args: string[]) {
        if (!message.channel.isSendable()) return;

        message.channel.send(`🏓 Pong\n__**API Latency**__\n${Math.round(client.ws.ping)}ms`);
        
    },
};