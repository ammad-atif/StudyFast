import { Link, useLocation } from "react-router-dom";
import { GraduationCap, Share2, Menu, X, Code, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../store";
import { getAvatarUrl } from "../../utils/avatar";
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

export const Navbar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const avatarSrc = getAvatarUrl(user?.fullName || user?.email || "default");
  
  const isHomePage = location.pathname === "/";
  const { selectedSubject, selectedTags, setSelectedSubject, setSelectedTags } = useHomeFilter();
  
  const subjectsTagsQuery = useQuery<SubjectsTagsResponse, SubjectsTagsError>({
    queryKey: ["subjects-tags"],
    queryFn: async () => api.get("/posts/subjects-tags/all"),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: isHomePage,
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
  
  const onClose = () => {
    setIsOpen(false);
  };
  const onOpen = () => {
    setIsOpen(true);
  };

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navLinks = [
    { name: "Home", path: "/" },
    ...(isAuthenticated ? [{ name: "Library", path: "/library" }] : []),
  ];

  return (
    <>
      <nav className="w-full sticky top-0 z-50 border-b border-slate-200 bg-white/80">
        <div className="w-full max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 ">
            <div className="p-3 bg-primary rounded-lg flex items-center justify-center text-white">
              <GraduationCap size={20} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-primary">
              StudyFAST
            </h2>
          </div>

          {/* Navigation Links and Actions */}
          <div className="hidden lg:flex items-center gap-8">
            {/* Navigation Links */}
            <div className="flex items-center gap-8 text-sm font-medium">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`py-5 transition-all ${
                      isActive
                        ? "text-primary border-b-2 border-primary"
                        : "text-slate-500 hover:text-primary"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Actions */}

            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <Link to={"/create-post"}>
                  <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all active:scale-95 cursor-pointer">
                    <Share2 size={16} />
                    Share AI Chat
                  </button>
                </Link>
              )}

              {isAuthenticated ? (
                <Link
                  to="/profile"
                  className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-200 hover:ring-2 hover:ring-primary/10 transition-all"
                >
                  <img
                    alt="User Profile"
                    className="w-full h-full object-cover"
                    src={avatarSrc}
                  />
                </Link>
              ) : (
                <Link
                  to="/sign-in"
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-primary text-primary hover:bg-primary hover:text-white transition-all"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button className="lg:hidden" onClick={onOpen}>
            <Menu />
          </button>
        </div>
      </nav>

      {/* Drawer Panel for mobile*/}
      <aside
        className={`fixed inset-0 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 scroll-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-lg text-white">
              <GraduationCap size={18} />
            </div>
            <span className="text-lg font-bold text-primary">StudyFAST</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary transition-colors"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Nav Links */}
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={onClose}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Subjects Section - Only show on home page */}
          {isHomePage && (
            <>
              <div className="border-t pt-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                  Subjects
                </h3>
                <div className="space-y-1">
                  {subjectsTagsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader size={16} className="text-slate-400 animate-spin" />
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
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left text-sm ${
                          selectedSubject === subject
                            ? "bg-primary/10 text-primary font-bold"
                            : "text-slate-600 hover:bg-slate-100 font-medium"
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 ${
                            selectedSubject === subject
                              ? "text-primary"
                              : "text-slate-400"
                          }`}
                        >
                          <Code size={16} />
                        </span>
                        <span className="truncate">{subject}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Tags Section */}
              <div className="border-t pt-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                  Popular Tags
                </h3>
                {subjectsTagsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader size={16} className="text-slate-400 animate-spin" />
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
                  <div className="flex flex-wrap gap-2 px-3">
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
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t space-y-3 flex flex-col items-center">
          {isAuthenticated && (
            <Link to={"/create-post"}>
              <button className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all active:scale-95">
                <Share2 size={16} />
                Share AI Chat
              </button>
            </Link>
          )}

          {isAuthenticated ? (
            <Link
              to="/profile"
              onClick={onClose}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border border-slate-200">
                <img
                  alt="User Profile"
                  className="w-full h-full object-cover"
                  src={avatarSrc}
                />
              </div>
              <span className="text-sm font-medium text-slate-700">
                View profile
              </span>
            </Link>
          ) : (
            <Link
              to="/sign-in"
              onClick={onClose}
              className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold border border-primary text-primary hover:bg-primary hover:text-white transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </aside>
    </>
  );
};
