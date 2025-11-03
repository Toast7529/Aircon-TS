import { GuildMember } from "discord.js";

export interface Song {
    id?: string;
    title: string;
    url: string;
    duration?: number; // seconds
    formattedDuration?: string;
    requestedBy?: GuildMember;
    source?: string;
    thumbnailUrl?: string;
}