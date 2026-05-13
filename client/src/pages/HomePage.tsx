import { ContentToolbar } from "../components/home/ContentToolbar";
import { PostCard } from "../components/home/PostCard";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "../components/home/Sidebar";
import { useHomeFilter } from "../context/HomeFilterContext";
import { SemanticSearchModal } from "../components/home/SemanticSearchModal";
import { HelpCircle } from "lucide-react";

type ApiErrorShape = {
  message?: string;
};

type SortBy = "newest" | "most-upvoted";

type PostAuthor = {
  _id: string;
  fullName: string;
  email: string;
};

type PostItem = {
  _id: string;
  title: string;
  description: string;
  subject: string;
  llmName: string;
  createdBy: PostAuthor;
  upvotesCount: number;
  downvotesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
};

type PostsResponse = {
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
export const HomePage = () => {
  const postsContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [selectedSort, setSelectedSort] = useState<SortBy>("newest");
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [isSemanticSearchOpen, setIsSemanticSearchOpen] = useState(false);

  const { selectedSubject, selectedTags } = useHomeFilter();

  const handleSearchSubmit = () => {
    setSubmittedSearch(searchInput.trim());
  };

  const postsQuery = useInfiniteQuery<PostsResponse, ApiErrorShape>({
    queryKey: [
      "posts",
      "feed",
      selectedSort,
      submittedSearch,
      selectedSubject,
      selectedTags,
    ],
    queryFn: async ({ pageParam = 1 }) =>
      api.get("/posts", {
        params: {
          page: pageParam,
          sortBy: selectedSort,
          ...(submittedSearch ? { q: submittedSearch } : {}),
          ...(selectedSubject ? { subject: selectedSubject } : {}),
          ...(selectedTags.length > 0 ? { tags: selectedTags.join(",") } : {}),
        },
      }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const posts = useMemo(
    () => postsQuery.data?.pages.flatMap((page) => page.data.items) ?? [],
    [postsQuery.data?.pages],
  );

  useEffect(() => {
    const rootTarget = postsContainerRef.current;
    const observerTarget = loadMoreRef.current;
    if (!rootTarget || !observerTarget || !postsQuery.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !postsQuery.isFetchingNextPage) {
          postsQuery.fetchNextPage();
        }
      },
      {
        root: rootTarget,
        rootMargin: "200px",
        threshold: 0.1,
      },
    );

    observer.observe(observerTarget);

    return () => observer.disconnect();
  }, [postsQuery]);

  return (
    <div className="h-[calc(100vh-4rem)] bg-background-light dark:bg-background-dark relative">
      {/* Floating Semantic Search Button */}
      <button
        onClick={() => setIsSemanticSearchOpen(true)}
        className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:bg-slate-800 transition-colors flex items-center justify-center"
        title="Semantic Search"
      >
        <HelpCircle size={24} />
      </button>

      {/* Semantic Search Modal */}
      <SemanticSearchModal
        isOpen={isSemanticSearchOpen}
        onClose={() => setIsSemanticSearchOpen(false)}
      />

      <main className="w-full max-w-5xl h-full mx-auto flex gap-x-8 px-4 py-6">
        {/* Main Content Area with Sidebar */}

        {/* Sidebar */}
        <aside className="h-[calc(100vh-6rem)] w-1/3 hidden md:block sticky top-0 overflow-auto">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <section className="flex-1 min-h-0 flex flex-col gap-4">
          {/*Content Toolbar */}
          <div className="sticky top-0 z-10 bg-background-light">
            <ContentToolbar
              searchQuery={searchInput}
              onSearchQueryChange={setSearchInput}
              onSearchSubmit={handleSearchSubmit}
              selectedSort={selectedSort}
              onSelectedSortChange={setSelectedSort}
            />
          </div>

          {/* Posts Feed */}
          <div
            ref={postsContainerRef}
            className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1"
          >
            {postsQuery.isLoading && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
                Loading posts...
              </div>
            )}

            {postsQuery.isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
                {postsQuery.error?.message || "Failed to load posts."}
              </div>
            )}

            {posts.map((post) => (
              <PostCard
                key={post._id}
                postId={post._id}
                title={post.title}
                excerpt={post.description}
                subject={post.subject || "General"}
                time={getTimeLabel(post.createdAt)}
                votes={String(post.upvotesCount)}
                comments={post.commentsCount}
              />
            ))}

            {!postsQuery.isLoading &&
              posts.length === 0 &&
              !postsQuery.isError && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
                  No posts found.
                </div>
              )}

            <div ref={loadMoreRef} className="h-12" />

            {postsQuery.isFetchingNextPage && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm font-semibold text-slate-500">
                Loading more posts...
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
