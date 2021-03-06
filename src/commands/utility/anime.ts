import { CmdCategory } from '@prisma/client';
import { TextChannel } from 'discord.js';
import { getSdk, MediaType } from '../../generated/anilist';
import { lightErrorEmbed } from '../../shared/embeds';
import { Command } from '../../types/command';
import { animeInfoEmbed } from './embeds/animeInfoEmbed';
import { sendNotFoundError } from './embeds/errors';
import { client } from './graphql/aniListClient';

const anime = new Command({
  name: 'anime',
  description: 'Look up info for an anime.',
  args: [{ name: 'title', multi: true }],
  category: CmdCategory.UTILITY,

  async execute(message, args) {
    const { channel } = message;
    const search = args.join(' ');

    const sdk = getSdk(client);
    sdk
      .searchAnime({ search, type: MediaType.Anime })
      .then((result) => {
        if (!result.Media) {
          sendNotFoundError(search, channel);
          return;
        }

        if (channel.isText()) {
          const textChannel = channel as TextChannel;
          if (!textChannel.nsfw && result.Media.isAdult) {
            channel.send(
              lightErrorEmbed(
                `This anime is marked as 18+! I can only show this in a NSFW channel.`,
              ),
            );
            return;
          }
        }

        const {
          averageScore,
          coverImage,
          description,
          source,
          episodes,
          genres,
          status,
          season,
          seasonYear,
          title,
        } = result.Media;

        channel.send(
          animeInfoEmbed({
            coverImage: coverImage?.medium,
            title: title?.userPreferred,
            description: description!,
            episodes,
            status,
            genres,
            source,
            averageScore,
            season,
            seasonYear,
          }),
        );
      })
      .catch((err) => {
        console.error(err);
        sendNotFoundError(search, channel);
      });
  },
});

export default anime;
