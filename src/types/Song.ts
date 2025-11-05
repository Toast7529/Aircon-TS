import { GuildMember } from "discord.js";
import { Readable } from "stream";

export interface Song {
    id?: string;
    title: string;
    url: string;
    duration?: number; // seconds
    formattedDuration?: string;
    requestedBy?: GuildMember;
    source?: string;
    thumbnailUrl?: string;
    isLive?: boolean;
    uploader?: string;
    getStream?: () => Promise<Readable>;
}