import mongoose, { Document, Schema } from "mongoose";

export interface IPostComment extends Document {
  post: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const postCommentSchema = new Schema<IPostComment>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
    },
  },
  {
    timestamps: true,
  },
);

postCommentSchema.index({ post: 1, createdAt: 1 });

export default mongoose.model<IPostComment>("PostComment", postCommentSchema);
