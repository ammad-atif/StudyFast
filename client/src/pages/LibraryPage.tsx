import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LibraryItem } from "../components/library/LibraryItem";
import { History, Heart, MessageSquare, Bookmark } from "lucide-react";
import { Card } from "../components/global/Card";
import { api } from "../api";

type LibraryFilter = "created" | "liked" | "commented" | "saved";

type ApiErrorShape = {
  message?: string;
};

type PostItem = {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
  viewer?: {
    isSaved: boolean;
    userVote: "upvote" | "downvote" | null;
    isCreatedByViewer: boolean;
  };
};

type LibraryResponse = {
  message?: string;
  data: {
    items: PostItem[];
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
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

export const LibraryPage = () => {
  const navigate = useNavigate();
  const postsContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [filter, setFilter] = useState<LibraryFilter>("created");

  const filters = [
    { name: "Created", value: "created", icon: <History size={14} /> },
    { name: "Liked", value: "liked", icon: <Heart size={14} /> },
    {
      name: "Commented",
      value: "commented",
      icon: <MessageSquare size={14} />,
    },
    { name: "Saved", value: "saved", icon: <Bookmark size={14} /> },
  ] as const;

  const libraryQuery = useInfiniteQuery<LibraryResponse, ApiErrorShape>({
    queryKey: ["posts", "library", filter],
    queryFn: async ({ pageParam = 1 }) =>
      api.get("/posts/library", {
        params: {
          filter,
          page: pageParam,
          sortBy: "newest",
        },
      }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const items = useMemo(
    () => libraryQuery.data?.pages.flatMap((page) => page.data.items) ?? [],
    [libraryQuery.data?.pages],
  );

  useEffect(() => {
    const rootTarget = postsContainerRef.current;
    const target = loadMoreRef.current;
    if (!rootTarget || !target || !libraryQuery.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !libraryQuery.isFetchingNextPage) {
          libraryQuery.fetchNextPage();
        }
      },
      {
        root: rootTarget,
        rootMargin: "200px",
        threshold: 0.1,
      },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [libraryQuery]);

  const getStatus = (
    post: PostItem,
  ): "Saved" | "Liked" | "Commented" | "Created" => {
    if (filter === "saved") return "Saved";
    if (filter === "liked") return "Liked";
    if (filter === "commented") return "Commented";
    if (filter === "created") return "Created";

    if (post.viewer?.isCreatedByViewer) return "Created";
    if (post.viewer?.isSaved) return "Saved";
    if (post.viewer?.userVote === "upvote") return "Liked";
    return "Commented";
  };

  return (
    <main className="w-full max-w-4xl h-[calc(100vh-4rem)] mx-auto px-2 md:px-10 py-6 flex flex-col min-h-0">
      <div className="mb-6 text-center shrink-0">
        {/* Header */}
        <Card
          title="Quick Overview Library"
          description="Your personalized collection of AI-generated content, organized and ready for review."
        />
        {/* {Filters} */}
        <div className="flex flex-wrap justify-center gap-3">
          {filters.map((f) => (
            <div
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-5 py-2 rounded-full text-xs font-black flex items-center gap-2 border transition-all ${
                filter === f.value
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/60"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:cursor-pointer"
              }`}
            >
              {f.icon} {f.name}
            </div>
          ))}
        </div>
      </div>

      {/* Library Content Card */}
      <div
        ref={postsContainerRef}
        className="flex-1 min-h-0 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-y-auto"
      >
        {libraryQuery.isLoading && (
          <div className="p-5 text-sm font-semibold text-slate-500">
            Loading library posts...
          </div>
        )}

        {libraryQuery.isError && (
          <div className="p-5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-2xl">
            {libraryQuery.error?.message || "Failed to load library posts."}
          </div>
        )}

        {!libraryQuery.isLoading &&
          !libraryQuery.isError &&
          items.length === 0 && (
            <div className="p-5 text-sm font-semibold text-slate-500">
              No posts found for this filter.
            </div>
          )}

        {items.map((post) => (
          <LibraryItem
            key={post._id}
            title={post.title}
            description={post.description}
            time={getTimeLabel(post.createdAt)}
            status={getStatus(post)}
            onClick={() => navigate(`/posts/${post._id}`)}
          />
        ))}
      </div>

      <div ref={loadMoreRef} className="h-12 shrink-0" />

      {libraryQuery.isFetchingNextPage && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-center text-sm font-semibold text-slate-500">
          Loading more posts...
        </div>
      )}
    </main>
  );
};
