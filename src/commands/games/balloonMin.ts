import { CmdCategory } from '@prisma/client';
import { balloonProvider } from '../../data/providers/balloonProvider';
import {
  baseEmbed,
  lightErrorEmbed,
  sendNotInGuild,
} from '../../shared/embeds';
import { Command } from '../../types/command';

const balloonMin = new Command({
  name: 'balloon-min',
  aliases: ['bl-min'],
  category: CmdCategory.GAMES,
  description:
    "Check or set the lower bound for balloons' volumes in this server.",
  args: [{ name: 'new_min', optional: true }],

  async execute(message, args) {
    const { channel, guild } = message;
    if (!guild) {
      sendNotInGuild(channel);
      return;
    }
    const [_newMin] = args;
    if (!_newMin) {
      const currMin = await balloonProvider.getMin(guild.id);
      channel.send(
        baseEmbed().setDescription(`Current min volume: **${currMin}**`),
      );
      return;
    }
    const newMin = parseInt(_newMin, 10);
    if (Number.isNaN(newMin)) {
      channel.send(lightErrorEmbed(`Please give me a valid number!`));
      return;
    }
    const currMax = await balloonProvider.getMax(guild.id);
    if (newMin > currMax) {
      channel.send(
        lightErrorEmbed(
          `The current max is **${currMax}**.
          
          Please set a min below that, or raise the max.`,
        ),
      );
      return;
    }
    if (newMin <= 0) {
      channel.send(
        lightErrorEmbed('Volume is a *non-negative scalar*  ლ(´ڡ`ლ)'),
      );
      return;
    }
    await balloonProvider.setMin(newMin, guild.id);
    channel.send(
      baseEmbed().setDescription(
        `The minimum balloon volume has been set to **${newMin}**!
        This will apply on the next game.`,
      ),
    );
  },
});

export default balloonMin;
