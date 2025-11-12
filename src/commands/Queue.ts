import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Message, TextBasedChannel } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Plays a song!"),
    alias: "q",
    async execute(client: Client, message: Message, args: string[]) {
        if (!message.channel.isSendable()) return;

        message.channel.send("Check console");   
        console.log(client.player.getQueue(message.member!.guild.id)?.songs);
    },
};