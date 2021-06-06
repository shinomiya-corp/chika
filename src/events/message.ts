import { Message } from "discord.js";
import { PREFIX, PREFIX_RE } from "../constants";
import {
  badArgsEmbed,
  badCommandsEmbed,
  genericErrorEmbed,
} from "../shared/embeds";
import { Event } from "../types/event";
import { RedisPrefix } from "../types/redis";
import { isOnCooldown } from "../utils/validateCooldowns";

const message: Event = {
  name: "message",
  once: false,
  // eslint-disable-next-line no-shadow
  async listener(client, redis, message: Message) {
    if (!PREFIX_RE.test(message.content) || message.author.bot) return; // absolute guard conditions

    const args = message.content.split(/ +/);
    const sentCommand = args.shift()?.toLowerCase().replace(PREFIX, "");
    if (!sentCommand) return;
    const command = client.commands.find(
      (_command) =>
        _command.name === sentCommand ||
        !!_command.aliases?.includes(sentCommand)
    );
    if (!command) {
      message.channel.send(badCommandsEmbed(sentCommand));
      return;
    }

    if (command.argsCount >= 0 && args.length !== command.argsCount) {
      message.channel.send(badArgsEmbed(command, args.length));
      return;
    }
    if (command.argsCount === -2 && args.length === 0) {
      message.channel.send(badArgsEmbed(command, args.length));
      return;
    }

    if (await isOnCooldown(message, command)) return;

    try {
      switch (command.redis) {
        case RedisPrefix.default:
          command.execute(message, args, redis.defaultRedis);
          break;
        case RedisPrefix.games:
          command.execute(message, args, redis.gamesRedis);
          break;
        case RedisPrefix.tracks:
          command.execute(message, args, redis.tracksRedis);
          break;
        default:
          command.execute(message, args, redis.defaultRedis);
          break;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
      message.channel.send(genericErrorEmbed());
    }
  },
};

export default message;
