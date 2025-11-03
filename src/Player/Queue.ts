import type { Client, GuildMember, TextChannel, VoiceChannel } from "discord.js";
import type { VoiceConnection, AudioPlayer } from "@discordjs/voice";
import { Song } from "../types/Song";


export class Queue {
    // Core
    public songs: Song[] = [];
    public textChannel: TextChannel;
    public voiceChannel: VoiceChannel 
    public client: Client;

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

    constructor(client: Client, textChannel: TextChannel, voiceChannel: VoiceChannel, requester?: GuildMember) {
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

    // Skip to the next song
    public skipSong(): Song | undefined {
        if (this.currentIndex + 1 < this.songs.length) {
            this.currentIndex++;
            return this.getCurrentSong();
        }
    }

    public clearQueue() {
        this.songs = [];                    // Might have to destroy songs to prevent memory leaks (length = 0??)
        this.currentIndex = 0;
    }

    public removeSong(index: number): Song | undefined {
        if (index >= 0 && index < this.songs.length) {
            return this.songs.splice(index, 1)[0];
        }
    }


}