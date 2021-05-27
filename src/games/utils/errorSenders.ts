import {
  cryingEmbed,
  lightErrorEmbed,
  peekingEmbed,
} from "../../shared/embeds";
import { GenericChannel } from "../../types/command";

export const sendNoGameSelectedError = async (channel: GenericChannel) => {
  channel.send(lightErrorEmbed("Tell me which game you wanna play, yo."));
};

export const sendNoTagError = async (
  gameName: string,
  channel: GenericChannel,
  single: boolean
) => {
  channel.send(
    lightErrorEmbed(
      single
        ? `You must tag another user to play *${gameName}* with.`
        : `Tag some other users to play *${gameName}* with.`
    )
  );
};

export const sendTaggedSelfError = async (channel: GenericChannel) => {
  channel.send(
    peekingEmbed().setTitle("...").setDescription(`Do you have no friends.`)
  );
};

export const sendUnknownGameError = async (
  gameName: string,
  channel: GenericChannel
) => {
  channel.send(
    lightErrorEmbed(`Sorry...I don't know how to play **${gameName}**.`)
  );
  // TODO return a list of playable games
};

export const sendGameCrashedError = async (channel: GenericChannel) => {
  channel.send(
    cryingEmbed()
      .setTitle("what the heck")
      .setDescription("The game crashed for some reason.")
  );
};