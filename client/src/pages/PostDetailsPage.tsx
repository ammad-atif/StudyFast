import { useMemo, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  // MessageSquare,
  // Share2,
  Bookmark,
  Verified,
  ChevronRight,
  EllipsisVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { CommentDrawer } from "../components/post-details/CommentDrawer";
import { api } from "../api";
import { getAvatarUrl } from "../utils/avatar";

type ViewerRelation = {
  isSaved: boolean;
  userVote: "upvote" | "downvote" | null;
  isCreatedByViewer: boolean;
};

type PostDetails = {
  _id: string;
  title: string;
  description: string;
  subject: string;
  llmName: string;
  chatLink: string;
  createdBy: {
    _id: string;
    fullName: string;
    email: string;
  };
  upvotesCount: number;
  downvotesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  viewer?: ViewerRelation;
};

type PostDetailsResponse = {
  message?: string;
  data: PostDetails;
};

type ApiErrorShape = {
  message?: string;
};

const getTimeLabel = (createdAt: string) => {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

export const PostDetailsPage = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const postQuery = useQuery<PostDetailsResponse, ApiErrorShape>({
    queryKey: ["post", id],
    queryFn: async () => api.get(`/posts/${id}`),
    enabled: Boolean(id),
  });

  const post = postQuery.data?.data;

  const netVotes = useMemo(() => {
    if (!post) return 0;
    return post.upvotesCount - post.downvotesCount;
  }, [post]);

  const refetchPostViews = async () => {
    await queryClient.invalidateQueries({ queryKey: ["post", id] });
    await queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
  };

  const voteMutation = useMutation<unknown, ApiErrorShape, "upvote" | "downvote">({
    mutationFn: async (voteType) => {
      if (!id) return;
      const currentVote = post?.viewer?.userVote ?? null;

      if (currentVote === voteType) {
        return api.delete(`/posts/${id}/vote`);
      }

      return api.post(`/posts/${id}/${voteType}`);
    },
    onSuccess: refetchPostViews,
    onError: (error) => {
      alert(error?.message || "Could not update vote.");
    },
  });

  const saveMutation = useMutation<unknown, ApiErrorShape, boolean>({
    mutationFn: async (isSaved) => {
      if (!id) return;
      if (isSaved) {
        return api.delete(`/posts/${id}/save`);
      }
      return api.post(`/posts/${id}/save`);
    },
    onSuccess: refetchPostViews,
    onError: (error) => {
      alert(error?.message || "Could not update saved state.");
    },
  });

  const deleteMutation = useMutation<unknown, ApiErrorShape>({
    mutationFn: async () => {
      if (!id) return;
      return api.delete(`/posts/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
      navigate("/");
    },
    onError: (error) => {
      alert(error?.message || "Could not delete post.");
    },
  });

  const onEditPost = async () => {
    if (!id) return;
    setIsOwnerMenuOpen(false);
    navigate(`/posts/${id}/edit`);
  };

  const onDeletePost = async () => {
    const confirmed = window.confirm("Delete this post permanently?");
    if (!confirmed) return;

    await deleteMutation.mutateAsync();
  };

  if (postQuery.isLoading) {
    return (
      <main className="w-full max-w-5xl mx-auto px-6 py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
          Loading post details...
        </div>
      </main>
    );
  }

  if (postQuery.isError || !post) {
    return (
      <main className="w-full max-w-5xl mx-auto px-6 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          {postQuery.error?.message || "Could not load post details."}
        </div>
      </main>
    );
  }

  const userVote = post.viewer?.userVote ?? null;
  const isSaved = post.viewer?.isSaved ?? false;
  const isCreatedByViewer = post.viewer?.isCreatedByViewer ?? false;

  return (
    <main className="w-full max-w-5xl mx-auto px-6 py-12">
      {/* POST META */}
      <div className="space-y-3 mb-8">
        {/* Subject */}
        <div className="flex items-center gap-1">
          <span className="text-slate-600 text-sm">Subject:</span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-primary font-bold">{post.subject || "General"}</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-slate-600 text-sm">LLM:</span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-primary font-bold">{post.llmName}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
            AI Discussion
          </span>
        </div>
      </div>

      {/* POST CONTENT */}
      <article>
        {/* Article Heading */}
        <h1 className="text-3xl md:text-5xl font-black text-primary mb-8 tracking-tight leading-tight text-justify hyphens-auto wrap-anywhere">
          {post.title}
        </h1>

        {/* Interaction Bar */}
        <div className="flex flex-col gap-y-7 md:flex-row md:items-center md:justify-between py-5 border-b-2 border-slate-200 mb-12  ">
          {/* Voting, Comment, Share and Bookmark Button */}
          <div className="flex justify-between items-center gap-6 self-stretch">
            {/* Voting Button */}
            <div className="flex items-center bg-slate-50 rounded-full p-1 border border-slate-100">
              <button
                onClick={() => voteMutation.mutate("upvote")}
                className={`p-1.5 hover:bg-white rounded-full transition-all cursor-pointer ${
                  userVote === "upvote"
                    ? "text-blue-500 bg-white"
                    : "text-slate-400 hover:text-blue-500"
                }`}
              >
                <ArrowUp size={20} />
              </button>
              <span className="font-black text-sm px-3 text-primary">{netVotes}</span>
              <button
                onClick={() => voteMutation.mutate("downvote")}
                className={`p-1.5 hover:bg-white rounded-full transition-all active:scale-90 cursor-pointer ${
                  userVote === "downvote"
                    ? "text-orange-500 bg-white"
                    : "text-slate-400 hover:text-orange-500"
                }`}
              >
                <ArrowDown size={20} />
              </button>
            </div>

            {/* Bookmark Button */}
            <button
              onClick={() => saveMutation.mutate(isSaved)}
              className={`p-2 transition-colors cursor-pointer ${
                isSaved ? "text-primary" : "text-slate-400 hover:text-primary"
              }`}
            >
              <Bookmark size={20} className={isSaved ? "fill-current" : ""} />
            </button>

            {isCreatedByViewer && (
              <div className="relative">
                <button
                  onClick={() => setIsOwnerMenuOpen((prev) => !prev)}
                  className="p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <EllipsisVertical size={20} />
                </button>

                {isOwnerMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-40 rounded-xl border border-slate-200 bg-white shadow-lg z-20 overflow-hidden">
                    <button
                      onClick={onEditPost}
                      className="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Pencil size={15} />
                      Edit post
                    </button>
                    <button
                      onClick={onDeletePost}
                      className="w-full px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={15} />
                      Delete post
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 text-sm font-black text-slate-500 hover:text-primary transition-colors "
            >
              <MessageSquare size={18} />
              24 Comments
            </button> */}

            {/* <button className="p-2 text-slate-400 hover:text-primary transition-colors">
              <Share2 size={20} />
            </button> */}
          </div>

          {/* AI chat button */}
          <div className="flex items-center gap-2 self-center">
            <button
              onClick={() => {
                if (!post.chatLink) return;
                window.open(post.chatLink, "_blank", "noopener,noreferrer");
              }}
              disabled={!post.chatLink}
              className="py-2 px-4 bg-primary text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              View AI Chat
            </button>
          </div>
        </div>

        {/* Article Description */}
        <p className="text-slate-700 leading-relaxed text-xl font-medium text-justify hyphens-auto wrap-anywhere whitespace-pre-wrap">
          {post.description}
        </p>
      </article>

      {/* Post Creator Footer */}
      <footer className="pt-12 border-t-2 border-slate-200 flex flex-wrap items-center md:justify-between justify-center  gap-6 mt-12">
        <div className="flex items-center gap-4">
          <img
            src={getAvatarUrl(post.createdBy.fullName || post.createdBy.email)}
            className="w-14 h-14 rounded-full border-4 border-white shadow-lg"
            alt="Author"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black text-primary">{post.createdBy.fullName}</span>
              <Verified size={18} className="text-blue-500 fill-blue-500/10" />
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
              {post.createdBy.email} • {getTimeLabel(post.createdAt)}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsDrawerOpen(true);
          }}
          className="px-7 py-4 bg-primary text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-primary/20 cursor-pointer"
        >
          Join Post Discussion
        </button>
      </footer>

      {/* Comment Drawer */}
      <CommentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        postId={post._id}
        onCommentCreated={refetchPostViews}
      />
    </main>
  );
};
