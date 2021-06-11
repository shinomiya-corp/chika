import { DEFAULT_PREFIX } from "../../shared/constants";
import { lightErrorEmbed, withAuthorEmbed } from "../../shared/embeds";
import { Command, CommandCategory } from "../../types/command";
import { sendMusicOnlyInGuild, trackLinkAndDuration } from "./utils/embeds";

const pause: Command = {
  name: "pause",
  aliases: ["stop"],
  description: "Pause the current playback.",
  argsCount: 0,
  usage: `${DEFAULT_PREFIX}pause`,
  category: CommandCategory.music,
  async execute(message) {
    const { client, channel, guild, author } = message;
    if (!guild) {
      sendMusicOnlyInGuild(channel);
      return;
    }

    const audioUtils = client.cache.audioUtils.get(guild.id);
    if (!audioUtils?.dispatcher) {
      channel.send(
        lightErrorEmbed("There isn't anything playing right now...")
      );
      return;
    }
    if (audioUtils.dispatcher.paused) {
      channel.send(lightErrorEmbed("Playback is already paused!"));
      return;
    }

    audioUtils.dispatcher.pause();
    const { title, url, duration } = audioUtils.nowPlaying!;
    channel.send(
      withAuthorEmbed(author)
        .setTitle(`:pause_button: Paused`)
        .setDescription(trackLinkAndDuration(title, url, duration))
    );
  },
};

export default pause;
