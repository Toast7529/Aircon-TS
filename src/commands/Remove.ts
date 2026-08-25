import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, EmbedBuilder, Message } from 'discord.js';
import { config } from '../config.js'
export default {
    data: new SlashCommandBuilder()
        .setName("remove")
        .setDescription("Removes the selected song!"),
    alias: "rm",
    async execute(client: Client, message: Message, args: string[]) {
        if (!message.channel.isSendable()) return;

        if (!message.member?.voice.channel) return message.channel.send(":x: | You are not in a voice channel!");
        if (!client.player.isUserInSameVoiceChannel(message)) return message.channel.send(":x: | You are not in my voice channel!");

        let queue = client.player.getQueue(message.guild!.id);
        if(!queue) return message.channel.send(`:x: | AirCon isn't on!`);

        if (Number.isInteger(args[0])) return message.channel.send(':x: | Please use a number!');
        if (args[0] > queue.upcoming.length || parseInt(args[0]) <= 1) return message.channel.send(`Please choose a number in the queue!`);

        const removedSong = client.player.remove(message, parseInt(args[0]) - 1);
        if (!removedSong) return message.channel.send(`:x: | Could not remove the song!`);
        let removedEmbed = new EmbedBuilder()
            .setDescription(`Removed [${removedSong.title}](${removedSong.url})`)
            .setColor(config.color)

        message.channel.send({ embeds: [removedEmbed]});
    },
};