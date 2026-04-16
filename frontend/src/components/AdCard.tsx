import { Phone, Tag, Building2, Trash2 } from 'lucide-react';
import { type Advertisement } from '@/types';
import { getPhotoUrl, getInitials } from '@/lib/auth';

const CATEGORY_COLORS: Record<string, string> = {
  'Technology':   'bg-blue-50 text-blue-700',
  'Food & Beverage': 'bg-amber-50 text-amber-700',
  'Fashion':      'bg-pink-50 text-pink-700',
  'Health':       'bg-green-50 text-green-700',
  'Real Estate':  'bg-indigo-50 text-indigo-700',
  'Education':    'bg-purple-50 text-purple-700',
  'Services':     'bg-teal-50 text-teal-700',
  'Other':        'bg-gray-50 text-gray-600',
};

interface Props {
  ad: Advertisement;
  onDelete?: (id: string) => void;
  showOwner?: boolean;
}

export default function AdCard({ ad, onDelete, showOwner = true }: Props) {
  const categoryClass = ad.category ? (CATEGORY_COLORS[ad.category] ?? 'bg-gray-50 text-gray-600') : '';
  const posterName = ad.first_name ? `${ad.first_name} ${ad.last_name ?? ''}`.trim() : 'Alumni';
  const posterInitials = ad.first_name ? getInitials(ad.first_name, ad.last_name ?? '') : '?';

  return (
    <div className="card overflow-hidden flex flex-col group">
      {/* Image */}
      {ad.image_url ? (
        <div className="h-44 overflow-hidden flex-shrink-0 bg-gray-100">
          <img
            src={getPhotoUrl(ad.image_url)}
            alt={ad.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-44 flex-shrink-0 flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg, #f0f4ff, #e8f0fe)' }}>
          <Building2 className="h-12 w-12 text-blue-200" />
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        {/* Category + delete */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {ad.category && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${categoryClass}`}>
              <Tag className="h-3 w-3" />{ad.category}
            </span>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(ad.id)}
              className="ml-auto text-gray-300 hover:text-red-500 transition-colors"
              title="Delete ad"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <h3 className="font-bold text-gray-900 leading-snug mb-1 line-clamp-2" style={{ fontFamily: 'var(--font-display)' }}>
          {ad.title}
        </h3>

        {ad.business_name && (
          <p className="text-xs text-blue-700 font-medium mb-1 flex items-center gap-1">
            <Building2 className="h-3 w-3" />{ad.business_name}
          </p>
        )}

        <p className="text-sm text-gray-600 line-clamp-3 flex-1 mb-3">{ad.description}</p>

        <div className="mt-auto space-y-2">
          {ad.price && (
            <p className="text-lg font-extrabold text-blue-800">{ad.price}</p>
          )}

          {ad.contact_info && (
            <a
              href={ad.contact_info.startsWith('http') ? ad.contact_info : `tel:${ad.contact_info}`}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <Phone className="h-3.5 w-3.5" />{ad.contact_info}
            </a>
          )}
        </div>

        {showOwner && (
          <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-gray-100 bg-gray-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-2xl">
            {ad.profile_photo_url ? (
              <img src={getPhotoUrl(ad.profile_photo_url)} className="h-8 w-8 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" alt={posterName} />
            ) : (
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                   style={{ background: 'linear-gradient(135deg,#1a2744,#1e40af)' }}>
                {posterInitials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-gray-400 leading-none">Posted by</p>
              <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{posterName}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
