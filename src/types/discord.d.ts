import 'discord.js';

declare module 'discord.js' {
    interface Client {
        commands: Collection<string, Command>;
        aliases: Collection<string, Command>;
        player: Player;

        __playerVoiceListenersAttached?: boolean;
    }
}    