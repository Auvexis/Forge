import { google } from "googleapis";
import type { PluginContext } from "../../../shared/models/plugin-types.ts";
import { Readable } from "stream";

/**
 * Creates a YouTube API client from the plugin context (injected by core)
 */
function getYoutubeClient(context: PluginContext) {
  if (!context.tokens?.access_token) {
    throw new Error("Plugin not authorized — missing access token");
  }

  const oauth2Client = new google.auth.OAuth2(
    context.credentials.client_id,
    context.credentials.client_secret,
  );

  oauth2Client.setCredentials({
    access_token: context.tokens.access_token,
    refresh_token: context.tokens.refresh_token,
  });

  return google.youtube({ version: "v3", auth: oauth2Client });
}

/** Full read — avoids Gaxios/resumable hangs with some upstream streams (e.g. multipart). */
async function readableToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

export function createGoogleYoutubeMethods() {
  return {
    // ──────────── Videos ────────────

    searchVideos: async (
      params: { query: string; maxResults?: number; pageToken?: string; order?: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const response = await yt.search.list({
          part: ["snippet"],
          q: params.query,
          maxResults: params.maxResults || 10,
          type: ["video"],
          order: params.order || "relevance",
          pageToken: params.pageToken,
        });

        return response.data.items?.map((item) => ({
          videoId: item.id?.videoId,
          title: item.snippet?.title,
          description: item.snippet?.description,
          channelId: item.snippet?.channelId,
          channelTitle: item.snippet?.channelTitle,
          publishedAt: item.snippet?.publishedAt,
          thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
        })) || [];
      } catch (error) {
        throw error;
      }
    },

    getVideoDetails: async (
      params: { videoId: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const response = await yt.videos.list({
          part: ["snippet", "contentDetails", "statistics"],
          id: [params.videoId],
        });

        const video = response.data.items?.[0];
        if (!video) throw new Error("Video not found");

        return {
          videoId: video.id,
          title: video.snippet?.title,
          description: video.snippet?.description,
          channelId: video.snippet?.channelId,
          channelTitle: video.snippet?.channelTitle,
          publishedAt: video.snippet?.publishedAt,
          thumbnailUrl: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.default?.url,
          duration: video.contentDetails?.duration,
          viewCount: video.statistics?.viewCount,
          likeCount: video.statistics?.likeCount,
          commentCount: video.statistics?.commentCount,
          tags: video.snippet?.tags,
        };
      } catch (error) {
        throw error;
      }
    },

    getTrendingVideos: async (
      params: { regionCode?: string; maxResults?: number; categoryId?: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const response = await yt.videos.list({
          part: ["snippet", "statistics"],
          chart: "mostPopular",
          regionCode: params.regionCode || "US",
          maxResults: params.maxResults || 10,
          videoCategoryId: params.categoryId,
        });

        return response.data.items?.map((video) => ({
          videoId: video.id,
          title: video.snippet?.title,
          description: video.snippet?.description,
          channelId: video.snippet?.channelId,
          channelTitle: video.snippet?.channelTitle,
          publishedAt: video.snippet?.publishedAt,
          thumbnailUrl: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.default?.url,
          viewCount: video.statistics?.viewCount,
          likeCount: video.statistics?.likeCount,
        }));
      } catch (error) {
        throw error;
      }
    },

    // ──────────── Channel ────────────

    getChannelDetails: async (
      params: { channelId: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const response = await yt.channels.list({
          part: ["snippet", "statistics", "contentDetails"],
          id: [params.channelId],
        });

        const channel = response.data.items?.[0];
        if (!channel) throw new Error("Channel not found");

        return {
          channelId: channel.id,
          title: channel.snippet?.title,
          description: channel.snippet?.description,
          customUrl: channel.snippet?.customUrl,
          publishedAt: channel.snippet?.publishedAt,
          thumbnailUrl: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url,
          subscriberCount: channel.statistics?.subscriberCount,
          videoCount: channel.statistics?.videoCount,
          viewCount: channel.statistics?.viewCount,
          uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads,
        };
      } catch (error) {
        throw error;
      }
    },

    getMyChannel: async (
      _params: Record<string, never>,
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const response = await yt.channels.list({
          part: ["snippet", "statistics", "contentDetails"],
          mine: true,
        });

        const channel = response.data.items?.[0];
        if (!channel) throw new Error("No channel found for authenticated user");

        return {
          channelId: channel.id,
          title: channel.snippet?.title,
          description: channel.snippet?.description,
          customUrl: channel.snippet?.customUrl,
          publishedAt: channel.snippet?.publishedAt,
          thumbnailUrl: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url,
          subscriberCount: channel.statistics?.subscriberCount,
          videoCount: channel.statistics?.videoCount,
          viewCount: channel.statistics?.viewCount,
          uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads,
        };
      } catch (error) {
        throw error;
      }
    },

    // ──────────── Comments ────────────

    listComments: async (
      params: { videoId: string; maxResults?: number; pageToken?: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const response = await yt.commentThreads.list({
          part: ["snippet", "replies"],
          videoId: params.videoId,
          maxResults: params.maxResults || 20,
          pageToken: params.pageToken,
          order: "relevance",
        });

        return response.data.items?.map((thread) => ({
          commentId: thread.id,
          authorName: thread.snippet?.topLevelComment?.snippet?.authorDisplayName,
          authorProfileUrl: thread.snippet?.topLevelComment?.snippet?.authorProfileImageUrl,
          text: thread.snippet?.topLevelComment?.snippet?.textDisplay,
          likeCount: thread.snippet?.topLevelComment?.snippet?.likeCount,
          publishedAt: thread.snippet?.topLevelComment?.snippet?.publishedAt,
          totalReplyCount: thread.snippet?.totalReplyCount,
          replies: thread.replies?.comments?.map((reply) => ({
            commentId: reply.id,
            authorName: reply.snippet?.authorDisplayName,
            text: reply.snippet?.textDisplay,
            likeCount: reply.snippet?.likeCount,
            publishedAt: reply.snippet?.publishedAt,
          })),
        })) || [];
      } catch (error) {
        throw error;
      }
    },

    createComment: async (
      params: { videoId: string; text: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const response = await yt.commentThreads.insert({
          part: ["snippet"],
          requestBody: {
            snippet: {
              videoId: params.videoId,
              topLevelComment: {
                snippet: {
                  textOriginal: params.text,
                },
              },
            },
          },
        });

        const comment = response.data.snippet?.topLevelComment;
        return {
          commentId: response.data.id,
          authorName: comment?.snippet?.authorDisplayName,
          text: comment?.snippet?.textDisplay,
          publishedAt: comment?.snippet?.publishedAt,
        };
      } catch (error) {
        throw error;
      }
    },

    replyToComment: async (
      params: { parentId: string; text: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const response = await yt.comments.insert({
          part: ["snippet"],
          requestBody: {
            snippet: {
              parentId: params.parentId,
              textOriginal: params.text,
            },
          },
        });

        return {
          commentId: response.data.id,
          authorName: response.data.snippet?.authorDisplayName,
          text: response.data.snippet?.textDisplay,
          publishedAt: response.data.snippet?.publishedAt,
        };
      } catch (error) {
        throw error;
      }
    },

    deleteComment: async (
      params: { commentId: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        await yt.comments.delete({ id: params.commentId });
        return { deleted: true, commentId: params.commentId };
      } catch (error) {
        throw error;
      }
    },

    // ──────────── Engagement ────────────

    likeVideo: async (
      params: { videoId: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        await yt.videos.rate({ id: params.videoId, rating: "like" });
        return { success: true, videoId: params.videoId, rating: "like" };
      } catch (error) {
        throw error;
      }
    },

    dislikeVideo: async (
      params: { videoId: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        await yt.videos.rate({ id: params.videoId, rating: "dislike" });
        return { success: true, videoId: params.videoId, rating: "dislike" };
      } catch (error) {
        throw error;
      }
    },

    removeLike: async (
      params: { videoId: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        await yt.videos.rate({ id: params.videoId, rating: "none" });
        return { success: true, videoId: params.videoId, rating: "none" };
      } catch (error) {
        throw error;
      }
    },

    // ──────────── Subscriptions ────────────

    subscribeToChannel: async (
      params: { channelId: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const response = await yt.subscriptions.insert({
          part: ["snippet"],
          requestBody: {
            snippet: {
              resourceId: {
                kind: "youtube#channel",
                channelId: params.channelId,
              },
            },
          },
        });

        return {
          subscriptionId: response.data.id,
          channelId: response.data.snippet?.resourceId?.channelId,
          channelTitle: response.data.snippet?.title,
          subscribedAt: response.data.snippet?.publishedAt,
        };
      } catch (error) {
        throw error;
      }
    },

    unsubscribeFromChannel: async (
      params: { subscriptionId: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        await yt.subscriptions.delete({ id: params.subscriptionId });
        return { deleted: true, subscriptionId: params.subscriptionId };
      } catch (error) {
        throw error;
      }
    },

    listSubscriptions: async (
      params: { maxResults?: number; pageToken?: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const response = await yt.subscriptions.list({
          part: ["snippet"],
          mine: true,
          maxResults: params.maxResults || 20,
          pageToken: params.pageToken,
          order: "alphabetical",
        });

        return response.data.items?.map((sub) => ({
          subscriptionId: sub.id,
          channelId: sub.snippet?.resourceId?.channelId,
          channelTitle: sub.snippet?.title,
          description: sub.snippet?.description,
          thumbnailUrl: sub.snippet?.thumbnails?.high?.url || sub.snippet?.thumbnails?.default?.url,
          subscribedAt: sub.snippet?.publishedAt,
        })) || [];
      } catch (error) {
        throw error;
      }
    },

    // ──────────── Upload / Manage ────────────

    uploadVideo: async (
      params: {
        title: string;
        description?: string;
        tags?: string;
        privacyStatus?: string;
        content: string | Buffer | Readable;
        mimeType?: string;
        categoryId?: string;
      },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        let stream: Readable;
        if (
          params.content &&
          typeof (params.content as any).pipe === "function" &&
          typeof (params.content as any).on === "function"
        ) {
          const raw = params.content as unknown as Readable;
          const buffered = await readableToBuffer(raw);
          stream = Readable.from(buffered);
        } else if (params.content instanceof Buffer) {
          stream = Readable.from(params.content);
        } else if (typeof params.content === "string") {
          const cleanBase64 = params.content.replace(/\s/g, "");
          const buffer = Buffer.from(cleanBase64, "base64");
          stream = Readable.from(buffer);
        } else {
          throw new Error("Invalid content type for upload");
        }


        const parsedTags = params.tags
          ? params.tags.split(",").map((t) => t.trim())
          : undefined;

        const response = await yt.videos.insert(
          {
            part: ["snippet", "status"],
            requestBody: {
              snippet: {
                title: params.title,
                description: params.description || "",
                tags: parsedTags,
                categoryId: params.categoryId || "22",
              },
              status: {
                privacyStatus: params.privacyStatus || "private",
              },
            },
            media: {
              mimeType: params.mimeType || "video/mp4",
              body: stream,
            },
          },
          {
            onUploadProgress: () => {},
          },
        );

        return {
          videoId: response.data.id,
          title: response.data.snippet?.title,
          description: response.data.snippet?.description,
          publishedAt: response.data.snippet?.publishedAt,
          privacyStatus: response.data.status?.privacyStatus,
          thumbnailUrl: response.data.snippet?.thumbnails?.default?.url,
        };
      } catch (error) {
        throw error;
      }
    },

    updateVideo: async (
      params: {
        videoId: string;
        title?: string;
        description?: string;
        tags?: string;
        privacyStatus?: string;
        categoryId?: string;
      },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        // Fetch current video details to merge with updates
        const current = await yt.videos.list({
          part: ["snippet", "status"],
          id: [params.videoId],
        });

        const video = current.data.items?.[0];
        if (!video) throw new Error("Video not found");

        const parsedTags = params.tags
          ? params.tags.split(",").map((t) => t.trim())
          : video.snippet?.tags;

        const response = await yt.videos.update({
          part: ["snippet", "status"],
          requestBody: {
            id: params.videoId,
            snippet: {
              title: params.title || video.snippet?.title || "",
              description: params.description ?? video.snippet?.description ?? "",
              tags: parsedTags,
              categoryId: params.categoryId || video.snippet?.categoryId || "22",
            },
            status: {
              privacyStatus: params.privacyStatus || video.status?.privacyStatus || "private",
            },
          },
        });

        return {
          videoId: response.data.id,
          title: response.data.snippet?.title,
          description: response.data.snippet?.description,
          privacyStatus: response.data.status?.privacyStatus,
          tags: response.data.snippet?.tags,
        };
      } catch (error) {
        throw error;
      }
    },

    deleteVideo: async (
      params: { videoId: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        await yt.videos.delete({ id: params.videoId });
        return { deleted: true, videoId: params.videoId };
      } catch (error) {
        throw error;
      }
    },

    // ──────────── Playlists ────────────

    createPlaylist: async (
      params: { title: string; description?: string; privacyStatus?: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const response = await yt.playlists.insert({
          part: ["snippet", "status"],
          requestBody: {
            snippet: {
              title: params.title,
              description: params.description || "",
            },
            status: {
              privacyStatus: params.privacyStatus || "private",
            },
          },
        });

        return {
          playlistId: response.data.id,
          title: response.data.snippet?.title,
          description: response.data.snippet?.description,
          privacyStatus: response.data.status?.privacyStatus,
          publishedAt: response.data.snippet?.publishedAt,
        };
      } catch (error) {
        throw error;
      }
    },

    deletePlaylist: async (
      params: { playlistId: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        await yt.playlists.delete({ id: params.playlistId });
        return { deleted: true, playlistId: params.playlistId };
      } catch (error) {
        throw error;
      }
    },

    listPlaylists: async (
      params: { channelId?: string; maxResults?: number; pageToken?: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const requestParams: any = {
          part: ["snippet", "contentDetails", "status"],
          maxResults: params.maxResults || 20,
          pageToken: params.pageToken,
        };

        if (params.channelId) {
          requestParams.channelId = params.channelId;
        } else {
          requestParams.mine = true;
        }

        const response = await yt.playlists.list(requestParams);

        return response.data.items?.map((pl) => ({
          playlistId: pl.id,
          title: pl.snippet?.title,
          description: pl.snippet?.description,
          channelId: pl.snippet?.channelId,
          channelTitle: pl.snippet?.channelTitle,
          publishedAt: pl.snippet?.publishedAt,
          thumbnailUrl: pl.snippet?.thumbnails?.high?.url || pl.snippet?.thumbnails?.default?.url,
          itemCount: pl.contentDetails?.itemCount,
          privacyStatus: pl.status?.privacyStatus,
        })) || [];
      } catch (error) {
        throw error;
      }
    },

    addVideoToPlaylist: async (
      params: { playlistId: string; videoId: string; position?: number },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const response = await yt.playlistItems.insert({
          part: ["snippet"],
          requestBody: {
            snippet: {
              playlistId: params.playlistId,
              resourceId: {
                kind: "youtube#video",
                videoId: params.videoId,
              },
              position: params.position,
            },
          },
        });

        return {
          playlistItemId: response.data.id,
          playlistId: response.data.snippet?.playlistId,
          videoId: response.data.snippet?.resourceId?.videoId,
          title: response.data.snippet?.title,
          position: response.data.snippet?.position,
        };
      } catch (error) {
        throw error;
      }
    },

    removeVideoFromPlaylist: async (
      params: { playlistItemId: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        await yt.playlistItems.delete({ id: params.playlistItemId });
        return { deleted: true, playlistItemId: params.playlistItemId };
      } catch (error) {
        throw error;
      }
    },

    // ──────────── Analytics ────────────

    getVideoStats: async (
      params: { videoId: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const response = await yt.videos.list({
          part: ["statistics", "snippet"],
          id: [params.videoId],
        });

        const video = response.data.items?.[0];
        if (!video) throw new Error("Video not found");

        return {
          videoId: video.id,
          title: video.snippet?.title,
          viewCount: video.statistics?.viewCount,
          likeCount: video.statistics?.likeCount,
          commentCount: video.statistics?.commentCount,
          favoriteCount: video.statistics?.favoriteCount,
        };
      } catch (error) {
        throw error;
      }
    },

    getChannelStats: async (
      params: { channelId?: string },
      context?: PluginContext,
    ) => {
      const yt = getYoutubeClient(context!);

      try {
        const requestParams: any = {
          part: ["statistics", "snippet"],
        };

        if (params.channelId) {
          requestParams.id = [params.channelId];
        } else {
          requestParams.mine = true;
        }

        const response = await yt.channels.list(requestParams);

        const channel = response.data.items?.[0];
        if (!channel) throw new Error("Channel not found");

        return {
          channelId: channel.id,
          title: channel.snippet?.title,
          subscriberCount: channel.statistics?.subscriberCount,
          videoCount: channel.statistics?.videoCount,
          viewCount: channel.statistics?.viewCount,
          hiddenSubscriberCount: channel.statistics?.hiddenSubscriberCount,
        };
      } catch (error) {
        throw error;
      }
    },
  };
}
