import { ActionRowBuilder, ButtonBuilder, ContainerBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { ButtonStyle, Client, ComponentType, Message, MessageFlags } from 'discord.js';
import { Song } from '../Player/Song.js';
import { Queue } from '../Player/Queue.js';

export default {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Plays a song!"),
    alias: "q",
    async execute(client: Client, message: Message, args: string[]) {
        if (!message.channel.isSendable()) return;

        if (!message.member?.voice.channel) return message.channel.send(":x: | You are not in a voice channel!");
        if (!client.player.isUserInSameVoiceChannel(message)) return message.channel.send(":x: | You are not in my voice channel!");

        let queue: Queue = client.player.getQueue(message.guild!.id);
        if(!queue) return message.channel.send(`:x: | AirCon isn't on!`);

        console.log(queue.upcoming[0]);
        const perPage = 10;
        const total = queue.upcoming.length;
        const totalPages = Math.ceil(total / perPage);
        let currentPage = 0;

        const generateEmbed = (page: number) => {
            const start = page * perPage;
            const pageSongs = queue.upcoming.slice(start, start + perPage);

            const container = new ContainerBuilder()
            
                .addSectionComponents((section) =>
                    section.addTextDisplayComponents((textDisplay) => textDisplay.setContent(`## Queue for ${message.guild?.name}`))
                    .setThumbnailAccessory((thumbnail) => thumbnail.setURL(queue.upcoming[0].thumbnailUrl || ''))
                )
            
                .addSeparatorComponents((separator) => separator)

                .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`### Now Playing\n[${queue.upcoming[0].title}](${queue.upcoming[0].url})`))

                .addSeparatorComponents((separator) => separator)
                pageSongs.forEach((song: Song, i: number) => {
                    const index = start + i + 1;
                    if (index === 1) return; // Skip the currently playing song
                    container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(`${index}. [${song.title}](${song.url})`))
                        .addSeparatorComponents((separator) => separator)
                });
                
            return container;
        }

        const firstBtn = new ButtonBuilder()
            .setCustomId("queue_first")
            .setLabel("First")
            .setStyle(ButtonStyle.Secondary)

        const nextBtn = new ButtonBuilder()
            .setCustomId("queue_next")
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)

        const prevBtn = new ButtonBuilder()
            .setCustomId("queue_prev")
            .setLabel("Back")
            .setStyle(ButtonStyle.Secondary)

        const lastBtn = new ButtonBuilder()
            .setCustomId("queue_last")
            .setLabel("Last")
            .setStyle(ButtonStyle.Secondary)

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents([firstBtn, prevBtn, nextBtn, lastBtn]);

        const msg = await message.channel.send({components: [generateEmbed(currentPage), row], flags: MessageFlags.IsComponentsV2 });

        const collector = msg.createMessageComponentCollector({componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author!.id) return;

            switch (interaction.customId) {
                case "queue_first":
                    currentPage = 0;
                    break;
                case "queue_prev":
                    if (currentPage > 0) currentPage--;
                    break;
                case "queue_next":
                    if (currentPage < totalPages - 1) currentPage++;
                    break;
                case "queue_last":
                    currentPage = totalPages - 1;
                    break;
            }
            await interaction.update({
                components: [generateEmbed(currentPage), row],
                flags: MessageFlags.IsComponentsV2
            });
        });

        collector.on('end', () => {
            msg.edit({ components: [generateEmbed(currentPage)], flags: MessageFlags.IsComponentsV2});
        });
    },
};