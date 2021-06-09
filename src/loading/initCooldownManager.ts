import type { Client } from "discord.js";
import Redis from "ioredis";

export const initCooldownManager = (): Client["cooldownManager"] => {
  const cooldownRedis = new Redis(process.env.REDISCLOUD_URL, {
    keyPrefix: "cooldown:",
  });

  // eslint-disable-next-line no-param-reassign
  return {
    setCooldown(id, command, time) {
      return cooldownRedis.set(`${id}${command}`, command, "px", time);
    },
    async getCooldown(id, command) {
      const ttl = await cooldownRedis.ttl(`${id}${command}`);
      if (ttl <= 0) {
        return 0;
      }
      return ttl;
    },
  };
};
