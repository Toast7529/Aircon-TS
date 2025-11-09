import { BaseExtractor } from "./BaseExtractor";
import { Song } from "../Song";
import { Readable } from "stream";
import https from "https";

export class MP3Extractor extends BaseExtractor {
    readonly name = "MP3Extractor";

    validate(query: string): boolean {
        return /^https?:\/\/.*\.mp3(\?.*)?$/.test(query);
    }

    async extract(query: string): Promise<Song[]> {
        const song: Song = {
            title: query.split('/').pop() || "Unknown MP3",
            url: query,
            source: "mp3",
            isLive: false,
            getStream: async () => this.getStreamFromUrl(query),
        };
        return [song];
    }

    private async getStreamFromUrl(url: string): Promise<Readable> {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed to get MP3 stream, status code: ${response.statusCode}`));
                } else {
                    resolve(response);
                }
            }).on('error', reject);
        });
    }
}
