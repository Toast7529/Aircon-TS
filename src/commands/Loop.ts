import { ActionRowBuilder, ButtonBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { ButtonStyle, Client, ComponentType, EmbedBuilder, Message } from 'discord.js';
import { config } from '../config.js';

export default {
    data: new SlashCommandBuilder()
        .setName("loop")
        .setDescription("Loops current song or queue!"),
    alias: "l",
    async execute(client: Client, message: Message, args: string[]) {
        if (!message.channel.isSendable()) return;

        if (!message.member?.voice.channel) return message.channel.send(":x: | You are not in a voice channel!");
        if (!client.player.isUserInSameVoiceChannel(message)) return message.channel.send(":x: | You are not in my voice channel!");

        let queue = client.player.getQueue(message.guild!.id);
        if(!queue) return message.channel.send(`:x: | AirCon isn't on!`);

        const generateEmbed = (mode: "none" | "single" | "all") => {
            const option = mode === "all" ? "Queue" : mode === "single" ? "Song" : "Disabled";

            return new EmbedBuilder()
                .setDescription(mode === "none" ? `Looping is now **${option}**` : `Now looping the **${option}**`)
                .setColor(config.color);
        };

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
            new ButtonBuilder()
                .setCustomId("loop_queue")
                .setLabel("Queue")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("loop_song")
                .setLabel("Song")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("loop_disable")
                .setLabel("Disable")
                .setStyle(ButtonStyle.Danger)
        ]);

        const msg = await message.channel.send({ embeds: [generateEmbed(queue.loopMode)], components: [row] });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author!.id) return interaction.deferUpdate();

            const mode = interaction.customId === "loop_queue" ? "all" : interaction.customId === "loop_song" ? "single" : "none";
            client.player.setLoopMode(message, mode);

            await interaction.update({ embeds: [generateEmbed(mode)], components: [row] });
        });

        collector.on('end', () => {
            msg.edit({ components: [] });
        });
    },
};