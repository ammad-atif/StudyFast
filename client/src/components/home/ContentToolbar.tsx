import { Input } from "../global/Input";
type SortBy = "newest" | "most-upvoted";

type ContentToolbarProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  selectedSort: SortBy;
  onSelectedSortChange: (value: SortBy) => void;
};

export function ContentToolbar({
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  selectedSort,
  onSelectedSortChange,
}: ContentToolbarProps) {
  const filters: { name: string; value: SortBy }[] = [
    { name: "Popular", value: "most-upvoted" },
    { name: "Newest", value: "newest" },
  ];

  return (
    <>
      <div className="mb-6">
        <div className="relative w-full">
          <Input
            placeholder="Search your notes..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearchSubmit();
              }
            }}
          />
        </div>
      </div>

      {/* Relevance Filter */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6">
        {filters.map((filter) => (
          <button
            key={filter.name}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer ${selectedSort === filter.value ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}
            onClick={() => onSelectedSortChange(filter.value)}
          >
            {filter.name}
          </button>
        ))}
      </div>
    </>
  );
}
