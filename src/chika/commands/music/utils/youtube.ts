import type { Client, StreamDispatcher, VoiceConnection } from 'discord.js';
import ytdl from 'ytdl-core';
import ytpl from 'ytpl';
import ytsr, { Video } from 'ytsr';
import { GenericChannel } from '../../../types/command';
import { AudioUtils, QueueItem } from '../../../types/queue';
import { sendCannotPlay, sendNowPlaying } from './embeds';
import { secToString } from './helpers';
import type { createFinishListener } from './listener';
import { CriticalError } from '../../../shared/errors';

const YOUTUBE_URL_RE = /^(https?:\/\/)?((www\.)?youtube\.com|youtu\.?be)\/.+$/;

export const searchVideo = async (
  title: string,
  maxResults = 10,
): Promise<QueueItem[] | null> => {
  const vFilter = (await ytsr.getFilters(title)).get('Type')!.get('Video')!;
  const videos = (await ytsr(vFilter.url!, { limit: maxResults }))
    .items as Video[];
  if (videos.length === 0) return null;
  return videos.map(
    (video) =>
      ({
        title: video.title,
        duration: video.duration,
        thumbnailURL: video.bestThumbnail.url,
        url: video.url,
      } as QueueItem),
  );
};

export const playFromYt = async (
  connection: VoiceConnection,
  url: string,
): Promise<StreamDispatcher> => {
  try {
    const dispatcher = await ytdl.getInfo(url).then((info) =>
      connection.play(
        ytdl.downloadFromInfo(info, {
          filter: 'audioonly',
          quality: 'highestaudio',
          highWaterMark: 1 << 25,
        }),
      ),
    );
    return dispatcher;
  } catch (err) {
    console.error(err);
    if (err.statusCode === 429) {
      throw new CriticalError('YouTube has blocked us.');
    } else {
      throw err;
    }
  }
};

export const validateArgs = async (
  args: string[],
): Promise<QueueItem | null> => {
  if (YOUTUBE_URL_RE.test(args[0])) {
    const [url] = args;
    if (!ytdl.validateURL(url)) return null;
    let res: ytdl.videoInfo;
    try {
      res = await ytdl.getBasicInfo(url);
    } catch (err) {
      return null;
    }
    const { videoDetails } = res;
    if (!videoDetails) return null;
    return {
      title: videoDetails.title,
      duration: secToString(parseInt(videoDetails.lengthSeconds, 10)),
      url: videoDetails.video_url,
      thumbnailURL: videoDetails.thumbnails[0].url,
    };
  }

  const res = await searchVideo(args.join(' '), 1);
  if (!res) return null;
  return { ...res[0] };
};

interface PlaylistMetadata {
  title: string;
  thumbnailURL: string;
  url: string;
}

export const parsePlaylist = (
  res: ytpl.Result,
): [PlaylistMetadata, QueueItem[]] => {
  const metadata: PlaylistMetadata = {
    title: res.title,
    url: res.url,
    thumbnailURL: res.bestThumbnail.url!,
  };
  const items = res.items.map(
    (item): QueueItem => ({
      url: item.shortUrl,
      title: item.title,
      thumbnailURL: item.bestThumbnail.url!,
      duration: item.duration!,
    }),
  );
  return [metadata, items];
};

interface playThisParams {
  client: Client;
  channel: GenericChannel;
  guildId: string;
  onFinish: ReturnType<typeof createFinishListener>;
}

export const playThis = async (
  connection: VoiceConnection,
  videoData: QueueItem,
  { client, channel, guildId, onFinish }: playThisParams,
): Promise<void> => {
  try {
    const dispatcher = await playFromYt(connection, videoData.url);
    sendNowPlaying(channel, videoData);
    const newAudioUtils: AudioUtils = {
      connection,
      dispatcher,
      nowPlaying: videoData,
    };
    dispatcher.on('finish', onFinish);
    client.cache.audioUtils.set(guildId, newAudioUtils);
  } catch (err) {
    sendCannotPlay(channel, videoData.title, videoData.url);
    if (err instanceof CriticalError) throw err;
  }
};