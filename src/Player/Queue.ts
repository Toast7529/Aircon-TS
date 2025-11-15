import type { Client, GuildMember, TextChannel, VoiceBasedChannel } from "discord.js";
import type { VoiceConnection, AudioPlayer } from "@discordjs/voice";
import { Song } from "./Song";


export class Queue {
    // Core
    public songs: Song[] = [];
    public textChannel: TextChannel;
    public voiceChannel: VoiceBasedChannel;
    public client: Client;
    public preventAdvance: boolean = false;

    // Audio and Voice runtime handlers:
    public connection?: VoiceConnection;
    public player?: AudioPlayer;

    // Playback state:
    public currentIndex: number = 0;
    public isPlaying: boolean = false;
    public isPaused: boolean = false;

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
    public addSong(song: Song) {
        this.songs.push(song);
    }

    // Get the current song
    public getCurrentSong(): Song | undefined {
        return this.songs[this.currentIndex];
    }

    public advanceCurrentIndex() {
        if (this.currentIndex + 1 < this.songs.length) this.currentIndex++;
    }

    // Skip to the next song
    public skipSong(): boolean {
        if (this.currentIndex >= this.songs.length - 1) return false;
        this.currentIndex++;
        this.preventAdvance = true;
        return true;
    }

    public previousSong(): boolean {
        if (this.currentIndex == 0) return false;
        this.currentIndex--;
        this.preventAdvance = true;
        return true;
    }

    // Clear and destroy the queue
    public destroyQueue() {
        this.songs = [];
        this.currentIndex = 0;
        this.player?.stop(true);
    }

    // Clear all songs except the current one
    public clearQueue() {
        if (this.songs.length > 1) {
            this.songs = [ this.songs[this.currentIndex] ];
        }
        this.currentIndex = 0;
    }

    // Remove a song at a specific index
    public removeSong(index: number): Song | undefined {
        if (index >= 0 && index < this.songs.length) {
            return this.songs.splice(index, 1)[0];
        }
    }


}