import { X, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import { getAvatarUrl } from "../../utils/avatar";

type CommentDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onCommentCreated?: () => Promise<void> | void;
};

type ApiErrorShape = {
  message?: string;
};

type CommentItem = {
  _id: string;
  post: string;
  user: {
    _id: string;
    fullName: string;
    email?: string;
  };
  content: string;
  createdAt: string;
  updatedAt: string;
};

type CommentsResponse = {
  message?: string;
  data: {
    items: CommentItem[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  };
};

const getTimeLabel = (createdAt: string) => {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export const CommentDrawer = ({
  isOpen,
  onClose,
  postId,
  onCommentCreated,
}: CommentDrawerProps) => {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState<"oldest" | "newest">("newest");

  const commentsQuery = useQuery<CommentsResponse, ApiErrorShape>({
    queryKey: ["post-comments", postId, order, page],
    queryFn: async () =>
      api.get(`/posts/${postId}/comments`, {
        params: {
          order,
          page,
        },
      }),
    enabled: isOpen && Boolean(postId),
  });

  const createCommentMutation = useMutation<
    unknown,
    ApiErrorShape,
    { content: string }
  >({
    mutationFn: async (payload) => api.post(`/posts/${postId}/comments`, payload),
    onSuccess: async () => {
      setContent("");
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
      if (onCommentCreated) {
        await onCommentCreated();
      }
    },
    onError: (error) => {
      alert(error?.message || "Could not post comment.");
    },
  });

  const pagination = commentsQuery.data?.data.pagination;
  const items = useMemo(
    () => commentsQuery.data?.data.items || [],
    [commentsQuery.data?.data.items],
  );

  const hasPrevPage = Boolean(pagination && pagination.page > 1);
  const hasNextPage = Boolean(
    pagination && pagination.page < pagination.totalPages,
  );

  const onSubmitComment = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    await createCommentMutation.mutateAsync({ content: trimmedContent });
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full md:max-w-[40%] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-xl font-black text-primary">Peer Discussion</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-50"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Chat */}
        <div className="overflow-y-auto p-6 space-y-8">
          {/* Chat Input  */}
          <div className="space-y-3">
            <textarea
              className="w-full p-4 rounded-2xl border bg-slate-50 text-sm resize-none outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Add to the discussion..."
              rows={3}
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onSubmitComment}
                disabled={!content.trim() || createCommentMutation.isPending}
                className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createCommentMutation.isPending ? "Posting..." : "Post"}
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Sort and pagination controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setOrder("newest");
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  order === "newest"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Newest
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrder("oldest");
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  order === "oldest"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Oldest
              </button>
            </div>

            {pagination && (
              <span className="text-xs text-slate-500 font-semibold">
                {pagination.totalItems} comments
              </span>
            )}
          </div>

          {/* Chat Messages */}
          <div className="space-y-6">
            {commentsQuery.isLoading && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                Loading comments...
              </div>
            )}

            {commentsQuery.isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {commentsQuery.error?.message || "Failed to fetch comments."}
              </div>
            )}

            {!commentsQuery.isLoading &&
              !commentsQuery.isError &&
              items.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  No comments yet. Start the discussion.
                </div>
              )}

            {items.map((comment) => (
              <div key={comment._id} className="flex gap-4">
                <img
                  src={getAvatarUrl(comment.user.fullName || comment.user.email || "user")}
                  className="w-9 h-9 rounded-full"
                  alt={comment.user.fullName}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black text-primary">
                      {comment.user.fullName}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      {getTimeLabel(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap wrap-anywhere">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!hasPrevPage}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500 font-semibold">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!hasNextPage}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
