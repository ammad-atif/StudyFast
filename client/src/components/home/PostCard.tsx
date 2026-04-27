import {
  AArrowUp,
  AArrowDown,
  // Share,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PostCardProps {
  postId: string;
  title: string;
  excerpt: string;
  subject: string;
  time: string;
  votes: string;
  comments: number;
}

export const PostCard = ({
  postId,
  title,
  excerpt,
  subject,
  time,
  votes,
  comments,
}: PostCardProps) => {
  const navigate = useNavigate();

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors flex">
      {/* Voting Sidebar */}
      <div className="w-12 bg-slate-50 flex flex-col items-center py-4 gap-2">
        <button className="text-slate-400 ">
          <AArrowUp size={20} strokeWidth={3} />
        </button>
        <span className="text-sm font-bold text-slate-700">{votes}</span>
        <button className="text-slate-400   ">
          <AArrowDown size={20} strokeWidth={3} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {/* Post Header (Subject, time and bookmark) */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-primary">{subject}</span>
            <span>•</span>
            <span>{time}</span>
          </div>
        </div>

        {/*Title and Excerpt */}
        <div className="break-all">
          <h3
            onClick={() => navigate(`/posts/${postId}`)}
            className="text-xl font-bold mb-2 leading-tight hover:text-slate-700 transition-colors cursor-pointer line-clamp-2"
          >
            {title}
          </h3>
          <p className="text-slate-600 text-sm mb-4 line-clamp-3 ">{excerpt}</p>
        </div>

        {/* Footer Actions (comment and share) */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-6">
          <button className="flex items-center gap-1 text-slate-400 text-xs ">
            <MessageSquare size={14} />
            <span>{comments} comments</span>
          </button>
          {/* <button className="flex items-center gap-1 text-slate-400 text-xs hover:text-primary transition-colors ">
            <Share size={14} />
            <span>Share</span>
          </button> */}
        </div>
      </div>
    </article>
  );
};
