import { Client, Collection, GuildMember, TextChannel, VoiceBasedChannel, Message } from 'discord.js';
import { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus, VoiceConnectionStatus, entersState, StreamType, getVoiceConnection} from "@discordjs/voice";
import { Queue } from './Queue';
import { Song } from './Song';
import { Readable } from 'stream';
import { EventEmitter } from 'events';
import { BaseExtractor } from './extractors/BaseExtractor';

export interface PlayerOptions {
    extractors: BaseExtractor[];
}

export class Player extends EventEmitter {
    private queues: Collection<string, Queue>;
    private extractors: BaseExtractor[];
    private client: Client;

    constructor(client: Client, options: PlayerOptions) {
        super();
        this.queues = new Collection();
        this.client = client;
        this.extractors = options.extractors;
    }

    public getQueue(guildId: string): Queue | undefined {
        return this.queues.get(guildId);
    }

    public async addSongToQueue(guildId: string, query: string, textChannel: TextChannel, member: GuildMember): Promise<void> {
        const songs = await this.extractSongs(query);
        if (!songs) throw new Error("No songs could be extracted from the query.");
        let queue = this.queues.get(guildId);

        if (!queue) {
            if(!member.voice.channel) throw new Error("Member is not in a voice channel.");
            queue = await this.createQueue(guildId, textChannel, member.voice.channel!, member);
        }

        if (songs.length > 1) {
            this.emit('playlistAdded', queue, songs);
        } else {
            this.emit('songAdded', queue, songs[0]);
        }
        
        for (const song of songs) {
            queue.addSong(song);

            if (!queue.isPlaying) {
                await this.play(queue, song);
            }
        }

    }

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
                queue.advanceCurrentIndex();
            }

            const nextSong = queue.getCurrentSong();
            if (nextSong && nextSong.getStream) {
                this.emit('nextSong', queue, nextSong);
                await this.play(queue,nextSong);
            } else {
                this.emit('queueEnd', queue);
                queue.isPlaying = false;
                queue.connection?.destroy();
                this.queues.delete(guildId);
            }
        });

        this.setupEventListeners(queue);

        this.queues.set(guildId, queue);
        return queue;
    }

    private async play(queue: Queue, song: Song): Promise<void> {
        if (!song.getStream) throw new Error("Song does not have a stream generator.");

        const stream: Readable = await song.getStream();
        const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
        queue.player!.play(resource);
        queue.isPlaying = true;

        // Clean up stream:
        queue.player!.once(AudioPlayerStatus.Idle, () => {
            stream.destroy();
            this.emit('songEnd', queue, song);
        });
    }

    private setupEventListeners(queue: Queue): void {       // Why is it doing it 3 times?? (I disconnected twice)
        queue.connection!.on(VoiceConnectionStatus.Disconnected, () => {
            queue.player?.stop();
            this.queues.delete(queue.voiceChannel.guild.id);
            queue.connection?.destroy(); 
            console.log("Voice connection destroyed. Queue cleaned up.");
        });
    }

    private async extractSongs(query: string): Promise<Song[] | null> {
        for (const extractor of this.extractors) {
            try {
                if (!extractor.validate(query)) continue;
                const result = await extractor.extract(query);
                if (result) {
                    return result;
                }
            } catch (err) {
                console.error(`Error in extractor ${extractor.name}:`, err);
            }
        }
        return null;
    }

    public isUserInSameVoiceChannel(message: Message): boolean {
        const userChannel = message.member?.voice.channel;
        if (!userChannel) return false;

        const connection = getVoiceConnection(message.guild!.id);
        if (!connection) return true;   // Ideally we want to make a connection if none exists

        return connection.joinConfig.channelId === userChannel.id;
    }
    
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

    public stop(message: Message): void {
        const guildId = message.guild!.id;
        const queue = this.queues.get(guildId);
        if (!queue) return;

        queue.destroyQueue();
        this.queues.delete(guildId);

        console.log("Playback stopped and queue cleared.");
    }

    public skip(message: Message): void {
        const guildId = message.guild!.id;
        const queue = this.queues.get(guildId);
        if (!queue) return;

        queue.player?.stop();
    }

    public previous(message: Message): boolean {
        const guildId = message.guild!.id;
        const queue = this.queues.get(guildId);
        if (!queue) return false;

        const previousSong = queue.previousSong();
        if (!previousSong) return false;
        queue.player?.stop();
        return true;
    }

    public pause(message: Message): boolean {
        const guildId = message.guild!.id;
        const queue = this.queues.get(guildId);
        if (!queue) return false;

        if (queue.player?.state.status !== AudioPlayerStatus.Playing) return false;
        queue.player?.pause();
        return true;
    }

    public resume(message: Message): boolean {
        const guildId = message.guild!.id;
        const queue = this.queues.get(guildId);
        if (!queue) return false;

        if (queue.player?.state.status !== AudioPlayerStatus.Paused) return false;
        queue.player?.unpause();
        return true;
    }

    public clear(message: Message): void {
        const guildId = message.guild!.id;
        const queue = this.queues.get(guildId);
        if (!queue) return;

        queue.clearQueue();
    }
}