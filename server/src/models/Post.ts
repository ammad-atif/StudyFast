import mongoose, { Document, Schema } from "mongoose";

export interface IPost extends Document {
  title: string;
  description: string;
  subject: string;
  llmName: string;
  chatLink: string;
  tags: string[];
  createdBy: mongoose.Types.ObjectId;
  upvotesCount: number;
  downvotesCount: number;
  commentsCount: number;
}

const postSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    subject: {
      type: String,
      trim: true,
      default: "General",
      maxlength: [100, "Subject cannot exceed 100 characters"],
    },
    llmName: {
      type: String,
      required: [true, "LLM name is required"],
      enum: ["OpenAI", "Claude", "Gemini"],
    },
    chatLink: {
      type: String,
      trim: true,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    upvotesCount: {
      type: Number,
      default: 0,
    },
    downvotesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

postSchema.index({ title: "text", description: "text" });

export default mongoose.model<IPost>("Post", postSchema);
