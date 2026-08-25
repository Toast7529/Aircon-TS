import type { Client, GuildMember, TextChannel, VoiceBasedChannel } from "discord.js";
import type { VoiceConnection, AudioPlayer } from "@discordjs/voice";
import { Song } from "./Song.js";


/**
 * Holds all per-guild playback state.
 *
 * Related type: {@link Song}
 */
export class Queue {
    // Core
    public upcoming: Song[] = [];
    public history: Song[] = [];
    public textChannel: TextChannel;
    public voiceChannel: VoiceBasedChannel;
    public client: Client;
    public preventAdvance: boolean = false;
    public loopMode: "none" | "single" | "all" = "none";

    // Audio and Voice runtime handlers:
    public connection?: VoiceConnection | null;
    public player?: AudioPlayer | null;

    // Metadata:
    public createdAt: number = Date.now();
    public requester?: GuildMember;

    /**
     * Creates a new queue for a guild.
     *
     * @param client - Discord client instance used by the queue.
     * @param textChannel - Channel used for playback messages.
     * @param voiceChannel - Voice channel connected to the queue.
     * @param requester - Optional member that created the queue.
     */
    constructor(client: Client, textChannel: TextChannel, voiceChannel: VoiceBasedChannel, requester?: GuildMember) {
        this.client = client;
        this.textChannel = textChannel;
        this.voiceChannel = voiceChannel;
        this.requester = requester;
    }

    /**
     * Adds a song to the upcoming list.
     *
     * @param song - Song to enqueue.
     */
    public addSong(song: Song): void {
        this.upcoming.push(song);
    }

    /**
     * Returns the current song.
     *
     * @returns The first song in the upcoming list, if any.
     */
    public getCurrentSong(): Song | undefined {
        return this.upcoming[0];
    }

    /**
     * Moves the current song into history unless loop mode changes the flow.
     */
    public moveToHistory(): void {
        if (this.loopMode === "single") return;     // Stay on the current song

        const finished = this.upcoming.shift();
        if (this.loopMode === "all" && finished) {
            this.upcoming.push(finished);
            return;
        }

        if (finished) this.history.push(finished);
    }

    /**
     * Advances to the next song if one exists.
     *
     * @returns True when the queue advanced to the next song.
     */
    public skipSong(): boolean {
        if (this.upcoming.length <= 1) return false;
        this.moveToHistory();
        this.preventAdvance = true;
        return true;
    }

    /**
     * Returns to the previously played song.
     *
     * @returns True when the previous song was restored.
     */
    public previousSong(): boolean {
        const last = this.history.pop();
        if (!last) return false;
        
        const current = this.upcoming.shift();
        if (current) this.upcoming.unshift(current);

        this.upcoming.unshift(last);
        this.preventAdvance = true;
        return true;
    }

    /**
     * Stops the player and clears all queue state.
     */
    public destroyQueue(): void {
        this.upcoming = [];
        this.history = [];
        this.player?.stop(true);
    }

    /**
     * Clears the queue while keeping the active song.
     */
    public clearQueue(): void {
        const current = this.getCurrentSong();
        this.upcoming = current ? [current] : [];
        this.history = [];
    }

    /**
     * Removes a song from the upcoming list by zero-based index.
     *
     * @param index - Zero-based index in the upcoming queue.
     * @returns The removed song, or undefined if the index is invalid.
     */
    public removeSong(index: number): Song | undefined {
        if (!Number.isInteger(index)) return undefined;
        if (index <= 0 || index >= this.upcoming.length) return undefined;
        return this.upcoming.splice(index, 1)[0];
    }

    /**
     * Shuffles the queue after the current song.
     */
    public shuffle(): void {
        if (this.upcoming.length <= 2) return;  // No need to shuffle

        const current = this.upcoming[0];
        const songsToShuffle = this.upcoming.slice(1);

        for (let i = songsToShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [songsToShuffle[i], songsToShuffle[j]] = [songsToShuffle[j], songsToShuffle[i]];
        }
        this.upcoming = [current, ...songsToShuffle];
    }

    /**
     * Sets the active loop mode.
     *
     * @param mode - Loop mode to apply.
     */
    public setLoopMode(mode: "none" | "single" | "all"): void {
        this.loopMode = mode;
    }
}