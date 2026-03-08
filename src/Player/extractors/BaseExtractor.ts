import { Song } from "../Song.js";

export abstract class BaseExtractor {
    abstract readonly name: string;

    abstract validate(query: string): boolean;

    abstract extract(query: string): Promise<Song[]>;
};