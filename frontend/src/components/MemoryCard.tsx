import { useState } from 'react';
import { Heart, MessageCircle, Share2, Trash2, Calendar } from 'lucide-react';
import { type Memory } from '@/types';
import { getInitials, getPhotoUrl, formatDate } from '@/lib/auth';
import { getStoredUser } from '@/lib/auth';
import { memoriesApi } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  memory: Memory;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, data: Partial<Memory>) => void;
}

export default function MemoryCard({ memory, onDelete, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(memory.user_liked ?? false);
  const [likes, setLikes] = useState(memory.likes);
  const [likeLoading, setLikeLoading] = useState(false);
  const user = getStoredUser();

  const toggleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    const prevLiked = liked;
    const prevLikes = likes;
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
    try {
      const res = await memoriesApi.toggleLike(memory.id);
      setLiked(res.liked);
      setLikes(res.likes);
    } catch {
      setLiked(prevLiked);
      setLikes(prevLikes);
      toast.error('Failed to update like');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleShare = async () => {
    const text = `${memory.title} — AlumniPad`;
    if (navigator.share) {
      await navigator.share({ title: memory.title, text, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this memory?')) return;
    try {
      await memoriesApi.delete(memory.id);
      onDelete?.(memory.id);
      toast.success('Memory deleted');
    } catch (err) {
      toast.error('Failed to delete memory');
    }
  };

  const canDelete = user?.id === memory.author_id || user?.is_admin;
  const isLong = memory.content.length > 300;

  return (
    <div className="card p-5">
      {/* Author */}
      <div className="flex items-center gap-3 mb-3">
        {memory.author_photo ? (
          <img src={getPhotoUrl(memory.author_photo)} className="h-10 w-10 rounded-full object-cover border border-gray-200" alt="" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-blue-700 flex items-center justify-center text-white text-sm font-bold">
            {getInitials(memory.first_name, memory.last_name)}
          </div>
        )}
        <div>
          <p className="font-semibold text-sm text-gray-900">
            {memory.first_name} {memory.last_name}
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(memory.created_at)}
            {memory.year_range && ` · ${memory.year_range}`}
          </p>
        </div>
        {canDelete && (
          <button onClick={handleDelete} className="ml-auto text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <h3 className="font-bold text-gray-900 mb-2">{memory.title}</h3>
      <div className={cn('text-sm text-gray-700 leading-relaxed', !expanded && isLong && 'line-clamp-4')}>
        {memory.content}
      </div>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} className="text-blue-600 text-xs mt-1 hover:underline">
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Tags */}
      {memory.tags && memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {memory.tags.map((tag) => (
            <span key={tag} className="badge bg-blue-50 text-blue-600">#{tag}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={toggleLike}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-colors',
            liked ? 'text-red-500' : 'text-gray-500 hover:text-red-400'
          )}
        >
          <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
          {likes > 0 && <span>{likes}</span>}
        </button>
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-500 transition-colors">
          <MessageCircle className="h-4 w-4" />
          {(memory.comment_count ?? 0) > 0 && <span>{memory.comment_count}</span>}
        </button>
        <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-500 transition-colors">
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
