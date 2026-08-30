# Aircon

A Discord music bot with a queue engine and audio player written from scratch in TypeScript.

![Now Playing panel](docs/images/now-playing.png)

---

## About

Aircon began as a JavaScript bot; this is a complete TypeScript rewrite.

It uses a custom player built on `@discordjs/voice` that handles queues, loop modes, history, and
voice connections. Audio sources are provided by extractors implementing a shared interface, so
adding a new source just means writing a new extractor.

---

## Screenshots

| Queue | Loop controls |
|---|---|
| ![Queue](docs/images/queue.png) | ![Loop](docs/images/loop.png) |


---

## Features

- Full queue management — add, remove, clear, shuffle, skip, and step backwards through history
- Three loop modes: off, single song, whole queue
- Interactive button controls on the Now Playing and Loop panels (Discord Components V2)
- Paginated queue display
- Per-guild state, so the bot behaves independently in every server it joins
- Automatic cleanup — leaves and tears down the queue when the channel empties or playback finishes
- Pluggable audio sources via the extractor interface

---

## Commands

Default prefix is `!`, configurable in [`src/config.ts`](src/config.ts).

| Command | Alias | Description |
|---|---|---|
| `!play <url or query>` | `!p` | Add a track to the queue and start playing |
| `!nowplaying` | `!np` | Show the current track with progress bar and controls |
| `!queue` | `!q` | Paginated view of upcoming tracks |
| `!skip` | | Skip to the next track |
| `!previous` | | Go back to the previously played track |
| `!pause` | | Pause playback |
| `!resume` | | Resume playback |
| `!loop` | `!l` | Open the loop mode panel (queue / song / off) |
| `!shuffle` | | Shuffle everything after the current track |
| `!remove <n>` | `!rm` | Remove a track from the queue by position |
| `!clear` | | Clear the queue but keep the current track |
| `!stop` | | Stop playback and disconnect |
| `!ping` | `!pong` | Show API latency |

---

## Architecture

```
src/
├── index.ts              Client setup, command loader, event wiring
├── config.ts             Prefix, embed colour, icons
├── Player/
│   ├── Player.ts         Owns the queues, runs extractors, controls playback
│   ├── Queue.ts          Per-guild state: current track, upcoming, history, loop mode
│   ├── Song.ts           Track model with a stream generator
│   └── extractors/
│       ├── BaseExtractor.ts   Base class every source extends
│       └── MP3Extractor.ts    Direct MP3 URL support
├── commands/             One file per command, loaded dynamically at startup
└── utils/                Shared formatting helpers
```

`Player` extends `EventEmitter` and keeps a `Collection<guildId, Queue>`. It doesn't send anything
to Discord itself — it emits `playSong`, `addSong`, `finish`, `channelEmpty` and `error`, and
`index.ts` handles the replies.

`Queue` holds the state for one guild, so servers don't share anything and can play different
tracks at the same time.

Commands are just files in `src/commands/` — drop one in and it gets loaded on startup, no
registration needed.

### Writing an extractor

Every source extends `BaseExtractor`:

```ts
export abstract class BaseExtractor {
    abstract readonly name: string;
    abstract validate(query: string): boolean;
    abstract extract(query: string): Promise<Song[]>;
}
```

`Player` goes through its extractor list, takes the first one whose `validate()` returns true, and
plays the `Song` objects it gets back. To add a source, write the class and add it to the list in
`index.ts`.

```ts
client.player = new Player(client, {
    extractors: [
        new MP3Extractor(),
        // new YourExtractor(),
    ]
});
```
---

## Getting started

### Prerequisites

- **Node.js 18 or newer**
- **FFmpeg** available at runtime (`ffmpeg-static` is included, but a system install is more reliable)
- A Discord bot application with the **Message Content** intent enabled

### Setup

```bash
npm install
```

Copy the env template and add your bot token:

```bash
cp template.env .env
```

```env
TOKEN=your-bot-token-here
```

### Running

```bash
npm run dev     # watch mode, runs from source
npm run build   # compile to dist/
npm start       # run the compiled build
```

### Required intents

The bot needs `Guilds`, `GuildMessages`, `MessageContent`, and `GuildVoiceStates`. `MessageContent`
is privileged — enable it in the Discord Developer Portal under **Bot → Privileged Gateway
Intents**, or the bot will connect but never respond to commands.

---

## Built with

[discord.js v14](https://discord.js.org) · [@discordjs/voice](https://github.com/discordjs/voice) ·
TypeScript · ESM

---
