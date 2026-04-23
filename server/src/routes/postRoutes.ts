import express from "express";
import {
  addComment,
  createPost,
  deletePost,
  downvotePost,
  getComments,
  getPostById,
  getPosts,
  removeVote,
  savePost,
  unsavePost,
  upvotePost,
} from "../controllers/postController";
import { protect, requireVerified } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", getPosts);
router.get("/:postId", getPostById);
router.get("/:postId/comments", getComments);

router.post("/", protect, requireVerified, createPost);
router.delete("/:postId", protect, requireVerified, deletePost);

router.post("/:postId/upvote", protect, requireVerified, upvotePost);
router.post("/:postId/downvote", protect, requireVerified, downvotePost);
router.delete("/:postId/vote", protect, requireVerified, removeVote);

router.post("/:postId/save", protect, requireVerified, savePost);
router.delete("/:postId/save", protect, requireVerified, unsavePost);

router.post("/:postId/comments", protect, requireVerified, addComment);

export default router;
