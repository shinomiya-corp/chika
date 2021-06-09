import Discord from "discord.js";
import type { Ok } from "ioredis";
import { Command } from "./command";
import { Game } from "./game";
import { AudioUtils } from "./queue";
import { RedisManager } from "./redis";

interface CooldownManager {
  setCooldown: (
    id: string,
    command: string,
    time: number // in ms
  ) => Promise<Ok | null>;
  getCooldown: (id: string, command: string) => Promise<number>; // returns cooldown time, or 0
}

interface inGameState {
  isBlocked?: boolean;
  games?: string[];
}

interface DiscordClientCache {
  audioUtils: Discord.Collection<string, AudioUtils>;
  inGameStates: Discord.Collection<string, string>; // map ID to game title
}

declare module "discord.js" {
  export interface Client {
    commands: Discord.Collection<string, Command>;
    commandsHelp: Discord.MessageEmbed;

    games: Discord.Collection<string, Game>;
    gamesList: string[];

    cooldownManager: CooldownManager;
    redisManager: RedisManager;

    cache: DiscordClientCache;
  }
}
