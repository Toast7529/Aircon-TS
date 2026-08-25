import { Song } from "../Song.js";

/**
 * Base contract for all source extractors.
 *
 * Related type: {@link Song}
 */
export abstract class BaseExtractor {
    abstract readonly name: string;

    /**
     * Returns true when the extractor can handle the query.
     *
     * @param query - User-supplied search text or source URL.
     * @returns True when this extractor can process the query.
     */
    abstract validate(query: string): boolean;

    /**
     * Extracts one or more playable songs from the query.
     *
     * @param query - User-supplied search text or source URL.
     * @returns A promise that resolves to one or more playable songs.
     */
    abstract extract(query: string): Promise<Song[]>;
};