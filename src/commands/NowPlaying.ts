import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Message, TextBasedChannel } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName("nowplaying")
        .setDescription("Plays a song!"),
    alias: "np",
    async execute(client: Client, message: Message & { channel: TextBasedChannel }, args: string[]) {
        if (!message.channel.isSendable()) return;

        if (!message.member?.voice.channel) return message.channel.send(":x: | You are not in a voice channel!");
        if (!client.player.isUserInSameVoiceChannel(message)) return message.channel.send(":x: | You are not in my voice channel!");

        message.channel.send("Check console");   
        console.log(client.player.getCurrentDuration(message.member!.guild.id))
        console.log(client.player.getQueue(message.member!.guild.id)?.getCurrentSong());
    },
};