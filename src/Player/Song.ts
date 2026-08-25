import { GuildMember } from "discord.js";
import { Readable } from "stream";

/**
 * Describes a track that can be queued and played.
 *
 * Related types:
 * - {@link GuildMember}
 * - {@link Readable}
 */
export interface Song {
    /** Unique source identifier when available. */
    id?: string;
    /** Display title for the track. */
    title: string;
    /** Playback or source URL for the track. */
    url: string;
    /** Track duration in seconds, if known. */
    duration?: number;
    /** Preformatted duration string for embeds or messages. */
    formattedDuration?: string;
    /** Member that requested the track. */
    requestedBy?: GuildMember;
    /** Source label such as MP3. */
    source?: string;
    /** Thumbnail URL for embeds. */
    thumbnailUrl?: string;
    /** Whether the track is currently live. */
    isLive?: boolean;
    /** Uploader or author name. */
    uploader?: string;
    /**
     * Creates a readable stream for playback.
     *
     * @returns A promise that resolves to a readable audio stream.
     */
    getStream?: () => Promise<Readable>;
}