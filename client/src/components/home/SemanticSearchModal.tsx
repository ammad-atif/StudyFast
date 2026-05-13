import { useState } from "react";
import { Search, X } from "lucide-react";
import { api } from "../../api";
import { useNavigate } from "react-router-dom";

type PostItem = {
  _id: string;
  title: string;
  description: string;
  subject: string;
  llmName: string;
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
};

type SearchResponse = {
  success: boolean;
  message: string;
  data: {
    posts: PostItem[];
  };
};

type SemanticSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
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

export const SemanticSearchModal = ({
  isOpen,
  onClose,
}: SemanticSearchModalProps) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PostItem[]>([]);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!query.trim()) {
      setError("Please enter a search query");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = (await api.post<SearchResponse>("/ai/semantic-search", {
        query: query.trim(),
      })) as unknown as SearchResponse;
      const posts = response.data?.posts || [];
      setResults(posts);
      setSearched(true);
    } catch (err: unknown) {
      const message =
        (err as { message: string })?.message || "Failed to search";
      setError(message);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuery("");
    setError(null);
    setResults([]);
    setSearched(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
        onClick={handleClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        className="relative z-51 w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.25)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-white px-6 py-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-primary/70">
              Semantic Search
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Find Posts by Meaning
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Search across all posts using natural language
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(80vh-100px)] overflow-y-auto px-6 py-6">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., 'How to implement machine learning models'"
                className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-primary px-6 py-3 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <Search size={18} />
              </button>
            </div>
          </form>

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-lg border border-slate-200 p-4 space-y-2"
                >
                  <div className="h-4 w-2/3 bg-slate-100 rounded" />
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-4/5 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Results */}
          {!loading && searched && results.length > 0 && (
            <div className="space-y-3">
              {results.map((post) => (
                <button
                  key={post._id}
                  onClick={() => {
                    navigate(`/posts/${post._id}`);
                    handleClose();
                  }}
                  className="w-full text-left rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">
                        {post.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                        {post.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-block rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          {post.subject}
                        </span>
                        <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {post.llmName}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs text-slate-500 whitespace-nowrap">
                      <span>👍 {post.upvotesCount}</span>
                      <span>💬 {post.commentsCount}</span>
                      <span>{getTimeLabel(post.createdAt)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && searched && results.length === 0 && !error && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No posts found matching your search. Try different keywords.
            </div>
          )}

          {/* Idle State */}
          {!searched && !loading && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Enter a query and search to find related posts across the platform
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
