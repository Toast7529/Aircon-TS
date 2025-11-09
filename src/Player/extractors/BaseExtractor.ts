import { Song } from "../Song";
import { Readable } from "stream";

export abstract class BaseExtractor {
    abstract readonly name: string;

    abstract validate(query: string): boolean;

    abstract extract(query: string): Promise<Song[]>;
};