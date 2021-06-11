import { prisma } from "../../data/prismaClient";
import { DEFAULT_PREFIX } from "../../shared/constants";
import { genericErrorEmbed } from "../../shared/embeds";
import { Command, CommandCategory } from "../../types/command";
import { sendTop } from "./utils/embeds";

const globalTop: Command = {
  name: "global-top",
  description: `Track down the top 1%.`,
  argsCount: 0,
  category: CommandCategory.currency,
  usage: `${DEFAULT_PREFIX}global-top`,
  aliases: ["gt"],
  async execute(message) {
    const { channel } = message;
    const top = await prisma.getGlobalTopRibbons();
    if (!top) {
      channel.send(genericErrorEmbed());
      return;
    }
    sendTop(channel, top);
  },
};

export default globalTop;