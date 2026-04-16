import { Link } from 'react-router-dom';
import { MapPin, Briefcase, GraduationCap, Star } from 'lucide-react';
import { type AlumniProfile } from '@/types';
import { getInitials, getPhotoUrl } from '@/lib/auth';

interface Props { alumni: AlumniProfile; }

export default function AlumniCard({ alumni }: Props) {
  return (
    <Link
      to={`/alumni/${alumni.user_id || alumni.id}`}
      className="card card-hover block overflow-hidden group"
    >
      {/* Top accent bar */}
      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #1a2744, #1e40af, #1a2744)' }} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          {alumni.profile_photo_url ? (
            <img
              src={getPhotoUrl(alumni.profile_photo_url)}
              alt={`${alumni.first_name} ${alumni.last_name}`}
              className="h-14 w-14 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-md"
            />
          ) : (
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md"
              style={{ background: 'linear-gradient(135deg, #1a2744, #1e40af)' }}
            >
              {getInitials(alumni.first_name, alumni.last_name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
              {alumni.first_name} {alumni.last_name}
              {alumni.preferred_name && (
                <span className="text-gray-400 font-normal text-xs ml-1">({alumni.preferred_name})</span>
              )}
            </h3>

            {alumni.occupation && (
              <p className="text-xs text-gray-600 flex items-center gap-1 truncate mt-0.5">
                <Briefcase className="h-3 w-3 text-blue-400 flex-shrink-0" />
                {alumni.occupation}
              </p>
            )}
            {alumni.city && (
              <p className="text-xs text-gray-400 flex items-center gap-1 truncate mt-0.5">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {alumni.city}{alumni.country ? `, ${alumni.country}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-50">
          {alumni.graduation_year && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
              <GraduationCap className="h-3 w-3" />{alumni.graduation_year}
            </span>
          )}
          {alumni.house && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
              {alumni.house}
            </span>
          )}
          {alumni.program && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              {alumni.program}
            </span>
          )}
          {alumni.is_mentor_available && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
              <Star className="h-3 w-3" />Mentor
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
