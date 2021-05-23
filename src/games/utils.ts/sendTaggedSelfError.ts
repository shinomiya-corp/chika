import { DMChannel, MessageEmbed, NewsChannel, TextChannel } from "discord.js";
import { chika_peeking_png, chika_pink } from "../../constants";

export const sendTaggedSelfError = async (
  channel: TextChannel | DMChannel | NewsChannel
) => {
  channel.send(
    new MessageEmbed()
      .setColor(chika_pink)
      .setThumbnail(chika_peeking_png)
      .setTitle("...")
      .setDescription(`Do you have no friends.`)
  );
};
