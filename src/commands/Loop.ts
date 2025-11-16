import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Message } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName("loop")
        .setDescription("Loops current song or queue!"),
    alias: "l",
    async execute(client: Client, message: Message, args: string[]) {
        if (!message.channel.isSendable()) return;

        if (args.length === 0 || !["none", "single", "all"].includes(args[0].toLowerCase())) return message.channel.send(":x: | Please specify a valid loop mode: `none`, `single`, or `all`.");

        if (!message.member?.voice.channel) return message.channel.send(":x: | You are not in a voice channel!");
        if (!client.player.isUserInSameVoiceChannel(message)) return message.channel.send(":x: | You are not in my voice channel!");

        let queue = client.player.getQueue(message.guild!.id);
        if(!queue) return message.channel.send(`:x: | AirCon isn't on!`);

        client.player.setLoopMode(message, args[0].toLowerCase() as "none" | "single" | "all");
        message.channel.send(":white_check_mark: | Queue cleared!");
    },
};