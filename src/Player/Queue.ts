import type { Client, GuildMember, TextChannel, VoiceBasedChannel } from "discord.js";
import type { VoiceConnection, AudioPlayer } from "@discordjs/voice";
import { Song } from "./Song";


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

    constructor(client: Client, textChannel: TextChannel, voiceChannel: VoiceBasedChannel, requester?: GuildMember) {
        this.client = client;
        this.textChannel = textChannel;
        this.voiceChannel = voiceChannel;
        this.requester = requester;
    }

    // Mutators:
    // Add a song to the queue
    public addSong(song: Song): void {
        this.upcoming.push(song);
    }

    // Get the current song
    public getCurrentSong(): Song | undefined {
        return this.upcoming[0];
    }

    public moveToHistory(): void {
        if (this.loopMode === "single") return;     // Stay on the current song

        const finished = this.upcoming.shift();
        if (this.loopMode === "all" && finished) {
            this.upcoming.push(finished);
            return;
        }

        if (finished) this.history.push(finished);
    }

    // Skip to the next song
    public skipSong(): boolean {
        if (this.upcoming.length <= 1) return false;
        this.moveToHistory();
        this.preventAdvance = true;
        return true;
    }

    public previousSong(): boolean {
        const last = this.history.pop();
        if (!last) return false;
        
        const current = this.upcoming.shift();
        if (current) this.upcoming.unshift(current);

        this.upcoming.unshift(last);
        this.preventAdvance = true;
        return true;
    }

    // Clear and destroy the queue
    public destroyQueue(): void {
        this.upcoming = [];
        this.history = [];
        this.player?.stop(true);
    }

    // Clear all songs except the current one
    public clearQueue(): void {
        const current = this.getCurrentSong();
        this.upcoming = current ? [current] : [];
        this.history = [];
    }

    // Remove a song at a specific index
    public removeSong(index: number): Song | undefined {
        if (!Number.isInteger(index)) return undefined;
        if (index <= 0 || index >= this.upcoming.length) return undefined;
        return this.upcoming.splice(index, 1)[0];
    }

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

    public setLoopMode(mode: "none" | "single" | "all"): void {
        this.loopMode = mode;
    }
}