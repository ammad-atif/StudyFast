import { BookOpen, Bookmark, Heart, MessageCircle } from "lucide-react";

interface LibraryItemProps {
  title: string;
  description: string;
  status: "Saved" | "Liked" | "Commented" | "Created";
  time: string;
  onClick?: () => void;
}

export const LibraryItem = ({
  title,
  description,
  time,
  status,
  onClick,
}: LibraryItemProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case "Saved":
        return { icon: <Bookmark size={14} /> };
      case "Liked":
        return { icon: <Heart size={14} /> };
      case "Commented":
        return { icon: <MessageCircle size={14} /> };
      case "Created":
        return { icon: <BookOpen size={20} /> };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      onClick={onClick}
      className="flex items-center p-4 hover:bg-slate-50 transition-all gap-4 border-b border-slate-100 last:border-0 cursor-pointer group"
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-black text-primary truncate group-hover:text-blue-600 transition-colors mb-0.5">
          {title}
        </h3>
        <p className="text-slate-500 text-xs truncate font-medium">
          {description}
        </p>
      </div>

      {/* Time */}
      <span className="hidden lg:block text-[10px] text-slate-400 font-black uppercase">
        {time}
      </span>

      {/* Status Icon */}
      <div className="ml-2">{config.icon}</div>
    </div>
  );
};

{
  /* <button
  onClick={(e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  }}
  className="p-1 text-slate-400 hover:text-primary transition-colors outline-none"
>
  <BookOpen size={20} />
</button>;

{
  showMenu && (
    <div className="absolute right-0 top-full mt-2 w-24 bg-white border border-slate-100 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
      <button className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
        Edit
      </button>
      <button className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
        Delete
      </button>
    </div>
  );
} */
}

//  const [showMenu, setShowMenu] = useState(false);
