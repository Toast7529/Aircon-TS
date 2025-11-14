import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Message } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Clears upcoming queue!"),
    alias: "",
    async execute(client: Client, message: Message, args: string[]) {
        if (!message.channel.isSendable()) return;

        if (!message.member?.voice.channel) return message.channel.send(":x: | You are not in a voice channel!");
        if (!client.player.isUserInSameVoiceChannel(message)) return message.channel.send(":x: | You are not in my voice channel!");

        let queue = client.player.getQueue(message.guild!.id);
        if(!queue) return message.channel.send(`:x: | AirCon isn't on!`);

        client.player.clear(message);
        message.channel.send(":white_check_mark: | Queue cleared!");
    },
};