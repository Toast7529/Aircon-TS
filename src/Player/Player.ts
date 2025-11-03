import { Client, Collection } from 'discord.js';
import { Queue } from './Queue';

interface Song {
    url: string;
    title: string;
    duration: number;
}

export class Player {
    private queues: Collection<string, Queue>;
    private client: Client;

    constructor(client: Client) {
        this.queues = new Collection();
        this.client = client;
    }

}