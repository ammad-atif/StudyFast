import express from "express";
import {
  registerUser,
  loginUser,
  changeName,
  changePassword,
  verifyEmail,
  resendVerification,
} from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerification);
router.patch("/change-name", protect, changeName);
router.patch("/change-password", protect, changePassword);

export default router;
