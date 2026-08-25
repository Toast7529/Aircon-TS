import { ActionRowBuilder, ButtonBuilder, ContainerBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { ButtonStyle, Client, ComponentType, Message, MessageFlags, resolveColor, TextBasedChannel } from 'discord.js';
import { config } from '../config.js';
import { formatDuration, generateProgressBar } from '../utils/formatting.js';

export default {
    data: new SlashCommandBuilder()
        .setName("nowplaying")
        .setDescription("Shows the currently playing song."),
    alias: "np",
    async execute(client: Client, message: Message & { channel: TextBasedChannel }, args: string[]) {
        if (!message.channel.isSendable()) return;

        if (!message.member?.voice.channel) return message.channel.send(":x: | You are not in a voice channel!");
        if (!client.player.isUserInSameVoiceChannel(message)) return message.channel.send(":x: | You are not in my voice channel!");

        const queue = client.player.getQueue(message.guild!.id);
        if(!queue) return message.channel.send(`:x: | AirCon isn't on!`);

        if (!queue.getCurrentSong()) return message.channel.send(":x: | Nothing is currently playing.");

        // Rebuilt on every button press so the progress bar and loop state stay current:
        const generateComponents = (withButtons = true) => {
            const currentSong = queue.getCurrentSong()!;
            const currentSeconds = client.player.getCurrentDuration(message.guild!.id);
            const totalSeconds = currentSong.duration ?? 0;
            const progressBar = generateProgressBar(currentSeconds, totalSeconds, 25);
            const formattedCurrent = formatDuration(currentSeconds);
            const formattedTotal = totalSeconds > 0 ? formatDuration(totalSeconds) : "LIVE";
            const requester = currentSong.requestedBy ?? "Unknown User";
            const thumbnailUrl = currentSong.thumbnailUrl || config.iconUrl;

            const container = new ContainerBuilder()
                .setAccentColor(resolveColor(config.color))
                .addSectionComponents((section) =>
                    section
                        .setThumbnailAccessory((thumbnail) => thumbnail.setURL(thumbnailUrl))
                        .addTextDisplayComponents(
                            (textDisplay) => textDisplay.setContent(`### Now Playing\n[${currentSong.title}](${currentSong.url})\n\n`),
                            (textDisplay) => textDisplay.setContent(`Requested by: ${requester} | In: ${queue.voiceChannel}\n\n-# \`${formattedCurrent} / ${formattedTotal}\``),
                            (textDisplay) => textDisplay.setContent(`\u200B\n${progressBar}`)
                        )
                );

            if (withButtons) {
                container.addActionRowComponents(
                    new ActionRowBuilder<ButtonBuilder>().addComponents([
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji({ name: "next", id: "1481064832856752190" })
                            .setCustomId("np_skip"),
                        new ButtonBuilder()
                            .setStyle(queue.loopMode === "none" ? ButtonStyle.Secondary : ButtonStyle.Primary)
                            .setEmoji({ name: "loop", id: "1481064862636310598" })
                            .setCustomId("np_loop")
                    ]),
                );
            }

            return [container];
        };

        const msg = await message.channel.send({
            components: generateComponents(),
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] }
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author!.id) return interaction.deferUpdate();

            switch (interaction.customId) {
                case "np_skip":
                    client.player.skip(message);
                    break;
                case "np_loop": {
                    const nextMode = queue.loopMode === "none" ? "all" : queue.loopMode === "all" ? "single" : "none";
                    client.player.setLoopMode(message, nextMode);
                    break;
                }
            }

            if (!queue.getCurrentSong()) return collector.stop();

            await interaction.update({
                components: generateComponents(),
                flags: MessageFlags.IsComponentsV2
            });
        });

        collector.on('end', () => {
            if (!queue.getCurrentSong()) return;
            msg.edit({ components: generateComponents(false), flags: MessageFlags.IsComponentsV2 });
        });
    },
};
