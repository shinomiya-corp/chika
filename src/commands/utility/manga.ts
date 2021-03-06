import { CmdCategory } from '@prisma/client';
import type { TextChannel } from 'discord.js';
import { getSdk, MediaType } from '../../generated/anilist';
import { lightErrorEmbed } from '../../shared/embeds';
import { Command } from '../../types/command';
import { sendNotFoundError } from './embeds/errors';
import { mangaInfoEmbed } from './embeds/mangaInfoEmbed';
import { client } from './graphql/aniListClient';

const manga = new Command({
  name: 'manga',
  description: 'Look up info for a manga.',
  args: [{ name: 'title', multi: true }],
  category: CmdCategory.UTILITY,

  async execute(message, args) {
    const { channel } = message;
    const search = args.join(' ');

    const sdk = getSdk(client);
    sdk
      .searchManga({ search, type: MediaType.Manga })
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
                `This manga is marked as 18+! I can only show this in a NSFW channel.`,
              ),
            );
            return;
          }
        }

        const {
          averageScore,
          coverImage,
          description,
          genres,
          status,
          title,
          source,
          startDate,
          endDate,
          volumes,
          chapters,
        } = result.Media;
        channel.send(
          mangaInfoEmbed({
            coverImage: coverImage?.medium,
            title: title?.userPreferred,
            description: description!,
            status,
            genres,
            averageScore,
            startDate,
            endDate,
            source,
            volumes,
            chapters,
          }),
        );
      })
      .catch((err) => {
        console.error(err);
        sendNotFoundError(search, channel);
      });
  },
});

export default manga;
