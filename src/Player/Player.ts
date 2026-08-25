import { Client, Collection, GuildMember, TextChannel, VoiceBasedChannel, Message } from 'discord.js';
import { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus, VoiceConnectionStatus, entersState, StreamType, getVoiceConnection} from "@discordjs/voice";
import { Queue } from './Queue.js';
import { Song } from './Song.js';
import { Readable } from 'stream';
import { EventEmitter } from 'events';
import { BaseExtractor } from './extractors/BaseExtractor.js';

/**
 * Options used to configure a Player instance.
 */
export interface PlayerOptions {
    extractors: BaseExtractor[];
}

/**
 * Coordinates queue state, source extraction, and voice playback.
 *
 * Related types:
 * - {@link Queue}
 * - {@link Song}
 * - {@link BaseExtractor}
 */
export class Player extends EventEmitter {
    private queues: Collection<string, Queue>;
    private extractors: BaseExtractor[];
    private client: Client;

    /**
     * Creates a new player and attaches global voice listeners once per client.
     *
     * @param client - Discord client used for event wiring.
     * @param options - Player configuration.
     */
    constructor(client: Client, options: PlayerOptions) {
        super();
        this.queues = new Collection();
        this.client = client;
        this.extractors = options.extractors;

        this.setupGlobalVoiceListeners();
    }

    private setupGlobalVoiceListeners(): void {
        if (this.client.__playerVoiceListenersAttached) return;
        this.client.__playerVoiceListenersAttached = true;

        this.client.on('voiceStateUpdate', (oldState, newState) => {
            const guildId = newState.guild.id;
            const queue = this.queues.get(guildId);
            if (!queue) return;

            const botId = this.client.user!.id;
            const isBot = newState.id === botId;

            // Bot moved to a different voice channel:
            if (isBot && oldState.channelId !== newState.channelId) {

                // Bot disconnected entirely
                if (!newState.channelId) {
                    this.destroyQueue(guildId);
                    return;
                }

                // Bot moved to a different voice channel:
                const newChannel = newState.guild.channels.cache.get(newState.channelId) as VoiceBasedChannel;
                if (newChannel) queue.voiceChannel = newChannel;
            }

            // Check if bot is alone (ignore other bots):
            const botChannel = queue.voiceChannel;
            if (!botChannel) return;

            const nonBotMembers = botChannel.members.filter(member => !member.user.bot);
            if (nonBotMembers.size === 0) {
                this.emit("channelEmpty", queue);
            }
        });
    }

    /**
     * Gets the queue for a guild.
     *
     * @param guildId - Target guild ID.
     * @returns The queue for the guild, or undefined if none exists.
     */
    public getQueue(guildId: string): Queue | undefined {
        return this.queues.get(guildId);
    }

    /**
     * Extracts songs from a query and adds them to the target guild queue.
     *
     * @param guildId - Target guild ID.
     * @param query - Search text or source URL.
     * @param textChannel - Channel used for error and playback messages.
     * @param member - Member requesting playback.
     */
    public async addSongToQueue(guildId: string, query: string, textChannel: TextChannel, member: GuildMember): Promise<void> {
        try {
            const songs = await this.extractSongs(query);
            if (!songs.length) throw new Error("No songs could be extracted from the query.");
            let queue = this.queues.get(guildId);

            if (!queue) {
                if(!member.voice.channel) throw new Error("Member is not in a voice channel.");
                queue = await this.createQueue(guildId, textChannel, member.voice.channel!, member);
            }

            if (songs.length > 1) {
                this.emit('playlistAdded', queue, songs);
            } else {
                this.emit('addSong', queue, songs[0]);
            }

            for (const song of songs) {
                if (!song.requestedBy) song.requestedBy = member;
                queue.addSong(song);
            }

            if (!queue.player || queue.player.state.status === AudioPlayerStatus.Idle) {
                await this.play(queue, queue.getCurrentSong()!);
            }

        } catch (error) {
            console.log("Error adding song to queue:", error);
            this.emit('error', error, textChannel);
        }
    }

    /**
     * Creates a queue and joins the requested voice channel.
     *
     * @param guildId - Target guild ID.
     * @param textChannel - Channel used for playback messages.
     * @param voiceChannel - Voice channel to join.
     * @param member - Optional requesting member.
     * @returns A ready queue bound to the voice connection.
     */
    public async createQueue(guildId: string, textChannel: TextChannel, voiceChannel: VoiceBasedChannel, member?: GuildMember): Promise<Queue> {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        // Wait for connection to be ready:
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

        const queue = new Queue(this.client, textChannel, voiceChannel, member);
        queue.connection = connection;
        queue.player = createAudioPlayer();
        connection.subscribe(queue.player);

        // Handle when a song ends:
        queue.player.on(AudioPlayerStatus.Idle, async () => {
            if(queue.preventAdvance) {
                queue.preventAdvance = false;
            } else {
                queue.moveToHistory();
            }

            const nextSong = queue.getCurrentSong();
            if (nextSong && nextSong.getStream) {
                await this.play(queue,nextSong);
            } else {
                this.emit('finish', queue);     // Destroy queue when event is listened to
            }
        });

        this.queues.set(guildId, queue);
        return queue;
    }

    /**
     * Starts playback for a single song.
     *
     * @param queue - Target queue.
     * @param song - Song to play.
     */
    private async play(queue: Queue, song: Song): Promise<void> {
        if (!song.getStream) throw new Error("Song does not have a stream generator.");

        const stream: Readable = await song.getStream();
        const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
        queue.player!.play(resource);
        this.emit('playSong', queue, song);

        // Clean up stream:
        queue.player!.once(AudioPlayerStatus.Idle, () => {
            stream.destroy();
            this.emit('songEnd', queue, song);
        });
    }

    /**
     * Destroys and removes a queue for a guild.
     *
     * @param guildId - Target guild ID.
     */
    public destroyQueue(guildId: string): void {
        const queue = this.queues.get(guildId);
        if (!queue) return;

        queue.player?.stop();
        this.queues.delete(queue.voiceChannel.guild.id);
        queue.connection?.destroy();
        console.log("Voice connection destroyed. Queue cleaned up.");
    }

    /**
     * Finds the first extractor that accepts the query and returns songs.
     *
     * @param query - Search text or source URL.
     * @returns A list of extracted songs, or an empty array if none match.
     */
    private async extractSongs(query: string): Promise<Song[]> {
        for (const extractor of this.extractors) {
            if (!extractor.validate(query)) continue;
            const result = await extractor.extract(query);
            if (result) return result;
        }
        return [];
    }

    /**
     * Checks whether the command author is in the same voice channel as the bot.
     * Returns true if the bot has no active connection yet.
     *
     * @param message - Command message.
     * @returns True when the user and bot share a voice channel, or the bot has no connection.
     */
    public isUserInSameVoiceChannel(message: Message): boolean {
        const userChannel = message.member?.voice.channel;
        if (!userChannel) return false;

        const connection = getVoiceConnection(message.guild!.id);
        if (!connection) return true;   // Ideally we want to make a connection if none exists

        return connection.joinConfig.channelId === userChannel.id;
    }
    
    /**
     * Returns playback duration in seconds for the active resource.
     *
     * @param guildId - Target guild ID.
     * @returns Current playback duration in seconds.
     */
    public getCurrentDuration(guildId: string): number {
        const queue = this.queues.get(guildId);
        if (!queue) return 0;
        
        const player = queue.player;
        if (!player) return 0;

        if (player.state.status !== AudioPlayerStatus.Playing) return 0;
        const resource = player.state.resource;
        if (!resource) return 0;

        return resource.playbackDuration / 1000; // Convert to seconds
    }

    /**
     * Stops playback and clears the queue for the current guild.
     *
     * @param message - Command message.
     */
    public stop(message: Message): void {
        const guildId = message.guild!.id;
        const queue = this.queues.get(guildId);
        if (!queue) return;

        this.destroyQueue(guildId);

        console.log("Playback stopped and queue cleared.");
    }

    /**
     * Skips the current song if a next song exists.
     *
     * @param message - Command message.
     * @returns True when the skip succeeds.
     */
    public skip(message: Message): boolean {
        const queue = this.queues.get(message.guild!.id);
        if (!queue) return false;

        if (!queue.skipSong()) return false;
        queue.player?.stop();
        return true;
    }

    /**
     * Plays the previous song if one exists in history.
     *
     * @param message - Command message.
     * @returns True when the previous song is restored.
     */
    public previous(message: Message): boolean {
        const queue = this.queues.get(message.guild!.id);
        if (!queue) return false;

        if (!queue.previousSong()) return false;
        queue.player?.stop();
        return true;
    }

    /**
     * Pauses playback for the current guild.
     *
     * @param message - Command message.
     * @returns True when playback is paused.
     */
    public pause(message: Message): boolean {
        const queue = this.queues.get(message.guild!.id);
        if (!queue) return false;

        if (queue.player?.state.status !== AudioPlayerStatus.Playing) return false;
        queue.player?.pause();
        return true;
    }

    /**
     * Resumes playback for the current guild.
     *
     * @param message - Command message.
     * @returns True when playback is resumed.
     */
    public resume(message: Message): boolean {
        const queue = this.queues.get(message.guild!.id);
        if (!queue) return false;

        if (queue.player?.state.status !== AudioPlayerStatus.Paused) return false;
        queue.player?.unpause();
        return true;
    }

    /**
     * Clears the upcoming queue while keeping the current song.
     *
     * @param message - Command message.
     */
    public clear(message: Message): void {
        const queue = this.queues.get(message.guild!.id);
        if (!queue) return;

        queue.clearQueue();
    }

    /**
     * Shuffles all queued songs except the current one.
     *
     * @param message - Command message.
     */
    public shuffle(message: Message): void {
        const queue = this.queues.get(message.guild!.id);
        if (!queue) return;
        queue.shuffle();
    }

    /**
     * Updates the loop mode for the current guild queue.
     *
     * @param message - Command message.
     * @param mode - Loop mode to set.
     */
    public setLoopMode(message: Message, mode: "none" | "single" | "all"): void {
        const queue = this.queues.get(message.guild!.id);
        if (!queue) return;
        queue.setLoopMode(mode);
    }

    /**
     * Removes a song from the current guild queue by index.
     *
     * @param message - Command message.
     * @param index - Zero-based song index.
     * @returns The removed song, or undefined if nothing was removed.
     */
    public remove(message: Message, index: number): Song | undefined {
        const queue = this.queues.get(message.guild!.id);
        if (!queue) return undefined;
        return queue.removeSong(index);
    }
}