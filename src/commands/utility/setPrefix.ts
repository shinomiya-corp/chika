import { prisma } from "../../data/prismaClient";
import { baseEmbed, sendNotInGuild } from "../../shared/embeds";
import { Command, CommandCategory } from "../../types/command";
import { isAdmin } from "../../utils/validateMessages";

const prefix = new Command({
  name: "set-prefix",
  args: [{ name: "new_prefix" }],
  category: CommandCategory.UTILITY,
  description: "Set a new prefix for Chika. You'll need to be an admin.",

  async execute(message, args) {
    const { channel, guild } = message;
    if (!guild) {
      sendNotInGuild(channel);
      return;
    }
    if (!isAdmin(message)) return;
    const [newPrefix] = args;
    prisma.setPrefix(guild.id, newPrefix);

    channel.send(
      baseEmbed().setDescription(`Chika's prefix is now **${newPrefix}**`)
    );
  },
});

export default prefix;
