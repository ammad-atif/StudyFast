import { Code, ChevronDown, Loader } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";
import { useHomeFilter } from "../../context/HomeFilterContext";

type SubjectsTagsResponse = {
  message?: string;
  data: {
    subjects: string[];
    tags: string[];
  };
};

type SubjectsTagsError = {
  message?: string;
};

export const Sidebar = () => {
  const { selectedSubject, selectedTags, setSelectedSubject, setSelectedTags } =
    useHomeFilter();
  const subjectsTagsQuery = useQuery<SubjectsTagsResponse, SubjectsTagsError>({
    queryKey: ["subjects-tags"],
    queryFn: async () => api.get("/posts/subjects-tags/all"),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const subjects = subjectsTagsQuery.data?.data.subjects || [];
  const tags = subjectsTagsQuery.data?.data.tags || [];

  const handleSubjectClick = (subject: string) => {
    if (selectedSubject === subject) {
      setSelectedSubject(undefined);
    } else {
      setSelectedSubject(subject);
    }
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Subjects Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Subjects
          </h3>
          <ChevronDown size={14} className="text-slate-400" />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1 pr-2">
          {subjectsTagsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={18} className="text-slate-400 animate-spin" />
            </div>
          ) : subjectsTagsQuery.isError ? (
            <div className="text-slate-500 text-xs px-3 py-2">
              Failed to load subjects
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-slate-500 text-xs px-3 py-2">
              No subjects found
            </div>
          ) : (
            subjects.map((subject) => (
              <button
                key={subject}
                onClick={() => handleSubjectClick(subject)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${
                  selectedSubject === subject
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-slate-600 hover:bg-slate-100 font-medium"
                }`}
              >
                <span
                  className={`shrink-0 ${
                    selectedSubject === subject
                      ? "text-primary"
                      : "text-slate-400"
                  }`}
                >
                  <Code size={20} />
                </span>
                <span className="truncate">{subject}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Tags Section */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">
          Popular Tags
        </h3>

        <div className="max-h-64 overflow-y-auto pr-2">
          {subjectsTagsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={18} className="text-slate-400 animate-spin" />
            </div>
          ) : subjectsTagsQuery.isError ? (
            <div className="text-slate-500 text-xs px-3 py-2">
              Failed to load tags
            </div>
          ) : tags.length === 0 ? (
            <div className="text-slate-500 text-xs px-3 py-2">
              No tags found
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 px-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-primary hover:text-white"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
