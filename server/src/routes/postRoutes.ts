import express from "express";
import {
  addComment,
  createPost,
  deletePost,
  downvotePost,
  getComments,
  getLibraryPosts,
  getPostById,
  getPosts,
  getSubjectsAndTags,
  removeVote,
  savePost,
  unsavePost,
  updatePost,
  upvotePost,
} from "../controllers/postController";
import {
  optionalProtect,
  protect,
  requireVerified,
} from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", optionalProtect, getPosts);
router.get("/subjects-tags/all", getSubjectsAndTags);
router.get("/library", protect, getLibraryPosts);
router.get("/:postId", optionalProtect, getPostById);
router.get("/:postId/comments", getComments);

// Add verified requirement to all post modification routes

router.post("/", protect, createPost);
router.delete("/:postId", protect, deletePost);
router.patch("/:postId", protect, updatePost);

router.post("/:postId/upvote", protect, upvotePost);
router.post("/:postId/downvote", protect, downvotePost);
router.delete("/:postId/vote", protect, removeVote);

router.post("/:postId/save", protect, savePost);
router.delete("/:postId/save", protect, unsavePost);

router.post("/:postId/comments", protect, addComment);

export default router;
