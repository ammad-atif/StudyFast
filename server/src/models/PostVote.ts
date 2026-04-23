import mongoose, { Document, Schema } from "mongoose";

export type VoteType = "upvote" | "downvote";

export interface IPostVote extends Document {
  post: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  voteType: VoteType;
}

const postVoteSchema = new Schema<IPostVote>(
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
    voteType: {
      type: String,
      enum: ["upvote", "downvote"],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

postVoteSchema.index({ post: 1, user: 1 }, { unique: true });
postVoteSchema.index({ post: 1, voteType: 1 });

export default mongoose.model<IPostVote>("PostVote", postVoteSchema);
