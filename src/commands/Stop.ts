import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Message, TextBasedChannel } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Ends the queue"),
    alias: "",
    async execute(client: Client, message: Message, args: string[]) {
        if (!message.channel.isSendable()) return;

        message.react("👋");   
        client.player.stop(message);
    },
};