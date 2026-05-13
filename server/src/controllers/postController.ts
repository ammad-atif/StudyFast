import { Request, Response } from "express";
import { z } from "zod";
import mongoose, { SortOrder } from "mongoose";
import Post from "../models/Post";
import PostComment from "../models/PostComment";
import PostVote, { VoteType } from "../models/PostVote";
import User from "../models/User";
import embeddingQueue from "../queue/embeddingQueue";
import {
  createPostRequestSchema,
  postIdParamsSchema,
  createCommentRequestSchema,
  listPostsQueryRequestSchema,
  listCommentsQueryRequestSchema,
  updatePostRequestSchema,
} from "../validations/postValidation";

// Sends a standardized API error payload.
// Example: sendError(res, 404, "Post not found", "POST_NOT_FOUND")
const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  error?: z.ZodError,
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    details: error ? z.flattenError(error).fieldErrors : {},
  });
};

// Sends a standardized API success payload.
// Example: sendSuccess(res, 200, "Posts fetched successfully", { items: [] })
const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

// Normalizes query param values from Express.
// Example:
// - "newest" -> "newest"
// - ["a", "b"] -> "a,b"
// - undefined -> undefined
const normalizeQueryString = (value?: any): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(",");
  return undefined;
};

// Ensures request has authenticated user attached by middleware.
// Example: if token is missing/invalid, returns 401 and null.
const ensureAuthUser = (req: Request, res: Response) => {
  if (!req.user) {
    sendError(res, 401, "Not authorized", "NOT_AUTHORIZED");
    return null;
  }
  return req.user;
};

// @desc    Get home feed / search / filter posts
// @route   GET /posts
// @access  Public (enriched with viewer flags when authenticated)
// Example request:
// GET /posts?q=react&sortBy=most-upvoted&page=1
export const getPosts = async (req: Request, res: Response) => {
  try {
    const limit = 20;
    const parsed = listPostsQueryRequestSchema.safeParse({
      q: normalizeQueryString(req.query.q),
      sortBy: normalizeQueryString(req.query.sortBy),
      page: normalizeQueryString(req.query.page) ?? 1,
      subject: normalizeQueryString(req.query.subject),
      tags: normalizeQueryString(req.query.tags),
    });

    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid query parameters",
        "INVALID_QUERY",
        parsed.error,
      );
    }

    const { q, sortBy, page, subject, tags } = parsed.data;

    // Build Mongo query object dynamically based on provided filters.
    const query: Record<string, any> = {};

    if (q) {
      // Search keyword against title and description.
      //i option makes it case-insensitive. For more advanced search, consider MongoDB Atlas Search or a dedicated search engine.
      // regex queries can be slow on large datasets without proper indexing, so for production consider text indexes or external search solutions.
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    if (subject) {
      query.subject = { $regex: subject, $options: "i" };
    }

    if (tags) {
      query.tags = { $in: tags.split(",").map((tag) => tag.trim()) };
    }

    const sortCriteria: Record<string, SortOrder> =
      sortBy === "most-upvoted"
        ? { upvotesCount: -1, createdAt: -1 }
        : { createdAt: -1 };

    // Pagination math: page=1,limit=10 -> skip=0; page=2 -> skip=10
    const skip = (page - 1) * 20;

    const [items, totalItems] = await Promise.all([
      Post.find(query)
        .populate("createdBy", "fullName email")
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(query),
    ]);

    let enrichedItems = items.map((post) => ({
      ...post,
      viewer: {
        isSaved: false,
        userVote: null as VoteType | null,
        isCreatedByViewer: false,
      },
    }));

    if (req.user && items.length > 0) {
      const postIds = items.map((item) => item._id);

      const userVotes = await PostVote.find({
        user: req.user._id,
        post: { $in: postIds },
      })
        .select("post voteType")
        .lean();

      const voteByPostId = new Map<string, VoteType>();
      userVotes.forEach((vote) => {
        voteByPostId.set(vote.post.toString(), vote.voteType);
      });

      const savedPostIds = new Set(
        (req.user.savedPosts || []).map((id) => id.toString()),
      );

      enrichedItems = items.map((post) => {
        const postId = post._id.toString();
        return {
          ...post,
          viewer: {
            isSaved: savedPostIds.has(postId),
            userVote: voteByPostId.get(postId) ?? null,
            isCreatedByViewer:
              post.createdBy._id.toString() === req.user!._id.toString(),
          },
        };
      });
    }

    // Example response data shape:
    // { items: [...], pagination: { page: 1, limit: 10, totalItems: 42, totalPages: 5 } }
    return sendSuccess(res, 200, "Posts fetched successfully", {
      items: enrichedItems,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch posts", "SERVER_ERROR");
  }
};

// @desc    Get all distinct subjects and tags
// @route   GET /posts/subjects-tags/all
// @access  Public
export const getSubjectsAndTags = async (_req: Request, res: Response) => {
  try {
    const [subjects, tags] = await Promise.all([
      Post.distinct("subject"),
      Post.distinct("tags"),
    ]);

    return sendSuccess(res, 200, "Subjects and tags fetched successfully", {
      subjects: subjects.filter(Boolean).sort(),
      tags: Array.from(new Set(tags.flat().filter(Boolean))).sort(),
    });
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to fetch subjects and tags",
      "SERVER_ERROR",
    );
  }
};

// @desc    Get user's library posts
// @route   GET /posts/library
// @access  Authenticated
// Example request: GET /posts/library?filter=saved&page=1&sortBy=newest
export const getLibraryPosts = async (req: Request, res: Response) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const limit = 20;
    const libraryQuerySchema = z
      .object({
        q: z.string().trim().optional(),
        sortBy: z.enum(["newest", "most-upvoted"]).default("newest"),
        page: z.coerce.number().int().min(1).default(1),
        filter: z
          .enum(["all", "created", "liked", "commented", "saved"])
          .default("all"),
      })
      .strict();

    const parsed = libraryQuerySchema.safeParse({
      q: normalizeQueryString(req.query.q),
      sortBy: normalizeQueryString(req.query.sortBy),
      page: normalizeQueryString(req.query.page) ?? 1,
      filter: normalizeQueryString(req.query.filter),
    });

    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid query parameters",
        "INVALID_QUERY",
        parsed.error,
      );
    }

    const { q, sortBy, page, filter } = parsed.data;

    const [createdIdsRaw, likedIdsRaw, commentedIdsRaw] = await Promise.all([
      Post.find({ createdBy: user._id }).select("_id").lean(),
      PostVote.find({ user: user._id, voteType: "upvote" }).distinct("post"),
      PostComment.find({ user: user._id }).distinct("post"),
    ]);

    const createdIds = createdIdsRaw.map((item) => item._id.toString());
    const likedIds = likedIdsRaw.map((id) => id.toString());
    const commentedIds = commentedIdsRaw.map((id) => id.toString());
    const savedIds = (user.savedPosts || []).map((id) => id.toString());

    let filterIds: string[] = [];
    if (filter === "created") {
      filterIds = createdIds;
    } else if (filter === "liked") {
      filterIds = likedIds;
    } else if (filter === "commented") {
      filterIds = commentedIds;
    } else if (filter === "saved") {
      filterIds = savedIds;
    } else {
      filterIds = Array.from(
        new Set([...createdIds, ...likedIds, ...commentedIds, ...savedIds]),
      );
    }

    if (filterIds.length === 0) {
      return sendSuccess(res, 200, "Library posts fetched successfully", {
        items: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 1,
        },
      });
    }

    const query: Record<string, any> = {
      _id: { $in: filterIds.map((id) => new mongoose.Types.ObjectId(id)) },
    };

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const sortCriteria: Record<string, SortOrder> =
      sortBy === "most-upvoted"
        ? { upvotesCount: -1, createdAt: -1 }
        : { createdAt: -1 };

    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      Post.find(query)
        .populate("createdBy", "fullName email")
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(query),
    ]);

    const postIds = items.map((item) => item._id);
    const userVotes = await PostVote.find({
      user: user._id,
      post: { $in: postIds },
    })
      .select("post voteType")
      .lean();

    const voteByPostId = new Map<string, VoteType>();
    userVotes.forEach((vote) => {
      voteByPostId.set(vote.post.toString(), vote.voteType);
    });

    const savedPostIds = new Set(savedIds);

    const enrichedItems = items.map((post) => {
      const postId = post._id.toString();
      return {
        ...post,
        viewer: {
          isSaved: savedPostIds.has(postId),
          userVote: voteByPostId.get(postId) ?? null,
          isCreatedByViewer:
            post.createdBy._id.toString() === user._id.toString(),
        },
      };
    });

    return sendSuccess(res, 200, "Library posts fetched successfully", {
      items: enrichedItems,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch library posts", "SERVER_ERROR");
  }
};

// @desc    Get post details
// @route   GET /posts/:postId
// @access  Public (enriched with viewer flags when authenticated)
// Example request: GET /posts/67f0f9d6764d3188ccf29123
export const getPostById = async (req: Request, res: Response) => {
  try {
    const parsed = postIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid post id",
        "INVALID_POST_ID",
        parsed.error,
      );
    }

    const post = await Post.findById(parsed.data.postId)
      .populate("createdBy", "fullName email")
      .lean();

    if (!post) {
      return sendError(res, 404, "Post not found", "POST_NOT_FOUND");
    }

    if (!req.user) {
      return sendSuccess(res, 200, "Post fetched successfully", {
        ...post,
        viewer: {
          isSaved: false,
          userVote: null as VoteType | null,
          isCreatedByViewer: false,
        },
      });
    }

    const [userVote] = await Promise.all([
      PostVote.findOne({ post: post._id, user: req.user._id })
        .select("voteType")
        .lean(),
    ]);

    const savedPostIds = new Set(
      (req.user.savedPosts || []).map((id) => id.toString()),
    );

    return sendSuccess(res, 200, "Post fetched successfully", {
      ...post,
      viewer: {
        isSaved: savedPostIds.has(post._id.toString()),
        userVote: userVote?.voteType ?? null,
        isCreatedByViewer:
          post.createdBy._id.toString() === req.user._id.toString(),
      },
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch post", "SERVER_ERROR");
  }
};

// @desc    Update own post
// @route   PATCH /posts/:postId
// @access  Verified
export const updatePost = async (req: Request, res: Response) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const paramsParsed = postIdParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return sendError(
        res,
        400,
        "Invalid post id",
        "INVALID_POST_ID",
        paramsParsed.error,
      );
    }

    const bodyParsed = updatePostRequestSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return sendError(
        res,
        400,
        "Invalid input data",
        "INVALID_INPUT",
        bodyParsed.error,
      );
    }

    const post = await Post.findById(paramsParsed.data.postId);
    if (!post) {
      return sendError(res, 404, "Post not found", "POST_NOT_FOUND");
    }

    if (post.createdBy.toString() !== user._id.toString()) {
      return sendError(
        res,
        403,
        "You can only edit your own posts",
        "FORBIDDEN",
      );
    }

    if (bodyParsed.data.title !== undefined) {
      post.title = bodyParsed.data.title;
    }
    if (bodyParsed.data.description !== undefined) {
      post.description = bodyParsed.data.description;
    }
    if (bodyParsed.data.subject !== undefined) {
      post.subject = bodyParsed.data.subject;
    }
    if (bodyParsed.data.tags !== undefined) {
      post.tags = bodyParsed.data.tags;
    }
    if (bodyParsed.data.llmName !== undefined) {
      post.llmName = bodyParsed.data.llmName;
    }
    if (bodyParsed.data.chatLink !== undefined) {
      post.chatLink = bodyParsed.data.chatLink;
    }

    await post.save();

    const updated = await Post.findById(post._id)
      .populate("createdBy", "fullName email")
      .lean();

    return sendSuccess(res, 200, "Post updated successfully", updated);
  } catch (error) {
    return sendError(res, 500, "Failed to update post", "SERVER_ERROR");
  }
};

// @desc    Create post
// @route   POST /posts
// @access  Verified
// Example body:
// { "title": "How to optimize prompts?", "description": "...", "llmName": "OpenAI" }
export const createPost = async (req: Request, res: Response) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const parsed = createPostRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid input data",
        "INVALID_INPUT",
        parsed.error,
      );
    }

    const post = await Post.create({
      title: parsed.data.title,
      description: parsed.data.description,
      subject: parsed.data.subject?.trim() || "General",
      tags: parsed.data.tags || [],
      llmName: parsed.data.llmName,
      chatLink: parsed.data.chatLink,
      createdBy: user._id,
    });

    // Enqueue embedding job asynchronously (non-blocking)
    if (parsed.data.chatLink) {
      const job = await embeddingQueue.add('create-embeddings', {
        postId: post._id.toString(),
        chatLink: parsed.data.chatLink,
        requestId: (req as any).requestId || 'unknown',
      });
      
      // Update post with job ID
      await Post.findByIdAndUpdate(post._id, {
        embeddingJobId: job.id,
        embeddingStatus: 'queued',
        embeddingUpdatedAt: new Date(),
      });
    }

    const populated = await Post.findById(post._id)
      .populate("createdBy", "fullName avatar")
      .lean();

    return sendSuccess(res, 201, "Post created successfully", populated);
  } catch (error) {
    return sendError(res, 500, "Failed to create post", "SERVER_ERROR");
  }
};

// @desc    Delete own post
// @route   DELETE /posts/:postId
// @access  Verified
// Example request: DELETE /posts/67f0f9d6764d3188ccf29123
export const deletePost = async (req: Request, res: Response) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const parsed = postIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid post id",
        "INVALID_POST_ID",
        parsed.error,
      );
    }

    const post = await Post.findById(parsed.data.postId);
    if (!post) {
      return sendError(res, 404, "Post not found", "POST_NOT_FOUND");
    }

    if (post.createdBy.toString() !== user._id.toString()) {
      // Ownership check: only the creator can delete.
      return sendError(
        res,
        403,
        "You can only delete your own posts",
        "FORBIDDEN",
      );
    }

    await Promise.all([
      // Remove post and related records in parallel for better performance.
      Post.findByIdAndDelete(post._id),
      PostComment.deleteMany({ post: post._id }),
      PostVote.deleteMany({ post: post._id }),
      User.updateMany({}, { $pull: { savedPosts: post._id } }),
    ]);

    return sendSuccess(res, 200, "Post deleted successfully", null);
  } catch (error) {
    return sendError(res, 500, "Failed to delete post", "SERVER_ERROR");
  }
};

const voteOnPost = async (
  req: Request,
  res: Response,
  voteType: VoteType,
) => {
  // Example:
  // voteType="upvote" on /posts/:postId/upvote
  // voteType="downvote" on /posts/:postId/downvote
  const user = ensureAuthUser(req, res);
  if (!user) return;

  const parsed = postIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(
      res,
      400,
      "Invalid post id",
      "INVALID_POST_ID",
      parsed.error,
    );
  }

  const post = await Post.findById(parsed.data.postId);
  if (!post) {
    return sendError(res, 404, "Post not found", "POST_NOT_FOUND");
  }

  const existingVote = await PostVote.findOne({
    post: post._id,
    user: user._id,
  });

  if (existingVote) {
    // Switch existing vote type (e.g., downvote -> upvote).
    existingVote.voteType = voteType;
    await existingVote.save();
  } else {
    // Create first vote by this user on this post.
    await PostVote.create({
      post: post._id,
      user: user._id,
      voteType,
    });
  }

  const [upvotesCount, downvotesCount] = await Promise.all([
    PostVote.countDocuments({ post: post._id, voteType: "upvote" }),
    PostVote.countDocuments({ post: post._id, voteType: "downvote" }),
  ]);
  post.upvotesCount = upvotesCount;
  post.downvotesCount = downvotesCount;

  await post.save();

  return sendSuccess(res, 200, `Post ${voteType}d successfully`, null);
};

// @desc    Upvote post
// @route   POST /posts/:postId/upvote
// @access  Verified
// Example request: POST /posts/67f0f9d6764d3188ccf29123/upvote
export const upvotePost = async (req: Request, res: Response) => {
  try {
    return await voteOnPost(req, res, "upvote");
  } catch (error) {
    return sendError(res, 500, "Failed to upvote post", "SERVER_ERROR");
  }
};

// @desc    Downvote post
// @route   POST /posts/:postId/downvote
// @access  Verified
// Example request: POST /posts/67f0f9d6764d3188ccf29123/downvote
export const downvotePost = async (req: Request, res: Response) => {
  try {
    return await voteOnPost(req, res, "downvote");
  } catch (error) {
    return sendError(res, 500, "Failed to downvote post", "SERVER_ERROR");
  }
};

// @desc    Remove vote from post
// @route   DELETE /posts/:postId/vote
// @access  Verified
// Example request: DELETE /posts/67f0f9d6764d3188ccf29123/vote
export const removeVote = async (req: Request, res: Response) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const parsed = postIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid post id",
        "INVALID_POST_ID",
        parsed.error,
      );
    }

    const post = await Post.findById(parsed.data.postId);
    if (!post) {
      return sendError(res, 404, "Post not found", "POST_NOT_FOUND");
    }

    await PostVote.deleteOne({ post: post._id, user: user._id });

    const [upvotesCount, downvotesCount] = await Promise.all([
      PostVote.countDocuments({ post: post._id, voteType: "upvote" }),
      PostVote.countDocuments({ post: post._id, voteType: "downvote" }),
    ]);
    post.upvotesCount = upvotesCount;
    post.downvotesCount = downvotesCount;

    await post.save();

    return sendSuccess(res, 200, "Vote removed successfully", null);
  } catch (error) {
    return sendError(res, 500, "Failed to remove vote", "SERVER_ERROR");
  }
};

// @desc    Save post
// @route   POST /posts/:postId/save
// @access  Verified
// Example request: POST /posts/67f0f9d6764d3188ccf29123/save
export const savePost = async (req: Request, res: Response) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const parsed = postIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid post id",
        "INVALID_POST_ID",
        parsed.error,
      );
    }

    const postExists = await Post.exists({ _id: parsed.data.postId });
    if (!postExists) {
      return sendError(res, 404, "Post not found", "POST_NOT_FOUND");
    }

    const alreadySaved = (user.savedPosts || []).some(
      (id) => id.toString() === parsed.data.postId,
    );

    if (!alreadySaved) {
      // Push post ID into user's saved list only once.
      user.savedPosts = [
        ...(user.savedPosts || []),
        new mongoose.Types.ObjectId(parsed.data.postId),
      ];
      await user.save();
    }

    return sendSuccess(res, 200, "Post saved successfully", null);
  } catch (error) {
    return sendError(res, 500, "Failed to save post", "SERVER_ERROR");
  }
};

// @desc    Unsave post
// @route   DELETE /posts/:postId/save
// @access  Verified
// Example request: DELETE /posts/67f0f9d6764d3188ccf29123/save
export const unsavePost = async (req: Request, res: Response) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const parsed = postIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid post id",
        "INVALID_POST_ID",
        parsed.error,
      );
    }

    user.savedPosts = (user.savedPosts || []).filter(
      (id) => id.toString() !== parsed.data.postId,
    );
    await user.save();

    return sendSuccess(res, 200, "Post unsaved successfully", null);
  } catch (error) {
    return sendError(res, 500, "Failed to unsave post", "SERVER_ERROR");
  }
};

// @desc    Add comment to a post
// @route   POST /posts/:postId/comments
// @access  Verified
// Example body: { "content": "This explanation helped a lot." }
export const addComment = async (req: Request, res: Response) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const paramsParsed = postIdParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return sendError(
        res,
        400,
        "Invalid post id",
        "INVALID_POST_ID",
        paramsParsed.error,
      );
    }

    const bodyParsed = createCommentRequestSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return sendError(
        res,
        400,
        "Invalid input data",
        "INVALID_INPUT",
        bodyParsed.error,
      );
    }

    const post = await Post.findById(paramsParsed.data.postId);
    if (!post) {
      return sendError(res, 404, "Post not found", "POST_NOT_FOUND");
    }

    const created = await PostComment.create({
      post: post._id,
      user: user._id,
      content: bodyParsed.data.content,
    });

    // Keep denormalized counter updated for fast post list rendering.
    post.commentsCount += 1;
    await post.save();

    const comment = await PostComment.findById(created._id)
      .populate("user", "fullName avatar")
      .lean();

    return sendSuccess(res, 201, "Comment added successfully", comment);
  } catch (error) {
    return sendError(res, 500, "Failed to add comment", "SERVER_ERROR");
  }
};

// @desc    Get comments for post (chat-like timeline)
// @route   GET /posts/:postId/comments
// @access  Public
// Example request: GET /posts/:postId/comments?order=oldest&page=1&limit=20
export const getComments = async (req: Request, res: Response) => {
  try {
    const limit = 30;
    const paramsParsed = postIdParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return sendError(
        res,
        400,
        "Invalid post id",
        "INVALID_POST_ID",
        paramsParsed.error,
      );
    }

    const queryParsed = listCommentsQueryRequestSchema.safeParse({
      order: normalizeQueryString(req.query.order),
      page: normalizeQueryString(req.query.page) ?? 1,
    });

    if (!queryParsed.success) {
      return sendError(
        res,
        400,
        "Invalid query parameters",
        "INVALID_QUERY",
        queryParsed.error,
      );
    }

    const postExists = await Post.exists({ _id: paramsParsed.data.postId });
    if (!postExists) {
      return sendError(res, 404, "Post not found", "POST_NOT_FOUND");
    }

    const { page, order } = queryParsed.data;
    const skip = (page - 1) * limit;
    const sortOrder = order === "newest" ? -1 : 1;

    const [items, totalItems] = await Promise.all([
      PostComment.find({ post: paramsParsed.data.postId })
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName avatar")
        .lean(),
      PostComment.countDocuments({ post: paramsParsed.data.postId }),
    ]);

    return sendSuccess(res, 200, "Comments fetched successfully", {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch comments", "SERVER_ERROR");
  }
};
