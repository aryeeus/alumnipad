import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Briefcase, Phone, Mail, Linkedin, Facebook, Instagram,
  GraduationCap, Building2, Star, Award, ArrowLeft, Globe, Camera, Loader2
} from 'lucide-react';
import { alumniApi } from '@/lib/api';
import { type AlumniProfile as AlumniProfileType } from '@/types';
import { getInitials, getPhotoUrl, formatDate } from '@/lib/auth';
import { getStoredUser } from '@/lib/auth';
import { toast } from 'sonner';

export default function AlumniProfile() {
  const { id } = useParams<{ id: string }>();
  const currentUser = getStoredUser();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['alumni', id],
    queryFn: () => alumniApi.get(id!),
    enabled: !!id,
  });

  const p = profile as AlumniProfileType | undefined;

  const canEditPhoto = !!(currentUser && id && (currentUser.id === id || currentUser.is_admin));

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const formData = new FormData();
    formData.append('photo', file);

    setUploading(true);
    try {
      const result = await alumniApi.uploadPhoto(id, formData);
      // Patch the cached profile with the new photo URL
      queryClient.setQueryData(['alumni', id], (old: Record<string, unknown> | undefined) =>
        old ? { ...old, profile_photo_url: result.profile_photo_url } : old
      );
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 animate-pulse">
        <div className="card p-6">
          <div className="flex gap-6">
            <div className="h-32 w-32 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !p) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <p className="text-gray-500">Alumni profile not found.</p>
        <Link to="/directory" className="text-blue-600 hover:underline mt-2 inline-block">Back to Directory</Link>
      </div>
    );
  }

  return (
    <div className="page-bg min-h-screen">
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Link to="/directory" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to Directory
      </Link>

      {/* Header card */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Avatar with camera overlay */}
          <div className="relative flex-shrink-0 group">
            {p.profile_photo_url ? (
              <img
                src={getPhotoUrl(p.profile_photo_url)}
                alt={`${p.first_name} ${p.last_name}`}
                className="h-28 w-28 rounded-full object-cover border-4 border-blue-100"
              />
            ) : (
              <div className="h-28 w-28 rounded-full bg-blue-700 flex items-center justify-center text-white text-3xl font-bold">
                {getInitials(p.first_name, p.last_name)}
              </div>
            )}

            {/* Upload overlay — only for own profile / admin */}
            {canEditPhoto && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Change profile photo"
                >
                  {uploading
                    ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                    : <Camera className="h-6 w-6 text-white" />
                  }
                  {!uploading && <span className="text-white text-xs mt-1 font-medium">Change</span>}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {p.first_name} {p.middle_name ? `${p.middle_name} ` : ''}{p.last_name}
                </h1>
                {p.preferred_name && <p className="text-gray-500 text-sm">Known as: {p.preferred_name}</p>}
              </div>
              {(currentUser?.id === (p.user_id || id) || currentUser?.is_admin) && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Your Profile</span>
              )}
            </div>

            {p.occupation && (
              <p className="flex items-center gap-1.5 text-gray-700 mt-2">
                <Briefcase className="h-4 w-4 text-gray-400" />
                {p.occupation}
                {p.employer && <span className="text-gray-400">at {p.employer}</span>}
              </p>
            )}
            {p.city && (
              <p className="flex items-center gap-1.5 text-gray-500 mt-1 text-sm">
                <MapPin className="h-4 w-4" />
                {p.city}{p.region ? `, ${p.region}` : ''}{p.country ? `, ${p.country}` : ''}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {p.graduation_year && (
                <span className="badge bg-blue-50 text-blue-700">
                  <GraduationCap className="h-3 w-3 mr-1" />Class of {p.graduation_year}
                </span>
              )}
              {p.house && <span className="badge bg-yellow-50 text-yellow-700">{p.house} House</span>}
              {p.program && <span className="badge bg-green-50 text-green-700">{p.program}</span>}
              {p.is_mentor_available && <span className="badge bg-purple-50 text-purple-700"><Star className="h-3 w-3 mr-1" />Mentor</span>}
              {p.is_speaker_available && <span className="badge bg-indigo-50 text-indigo-700"><Award className="h-3 w-3 mr-1" />Speaker</span>}
            </div>

            <div className="flex gap-3 mt-3">
              {p.linkedin_url && (
                <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
              {p.facebook_url && (
                <a href={p.facebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {p.instagram_url && (
                <a href={`https://instagram.com/${p.instagram_url.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-800">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {p.bio && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed">{p.bio}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Professional */}
        {(p.employer || p.industry || p.years_of_experience || p.certifications || p.expertise) && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-600" /> Professional Details
            </h2>
            <dl className="space-y-2 text-sm">
              {p.employer && <div><dt className="text-gray-500">Employer</dt><dd className="font-medium">{p.employer}</dd></div>}
              {p.industry && <div><dt className="text-gray-500">Industry</dt><dd className="font-medium">{p.industry}</dd></div>}
              {p.years_of_experience && <div><dt className="text-gray-500">Experience</dt><dd className="font-medium">{p.years_of_experience} years</dd></div>}
              {p.certifications && <div><dt className="text-gray-500">Certifications</dt><dd className="font-medium">{p.certifications}</dd></div>}
              {p.expertise && <div><dt className="text-gray-500">Expertise</dt><dd className="font-medium">{p.expertise}</dd></div>}
            </dl>
          </div>
        )}

        {/* School */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-blue-600" /> School Information
          </h2>
          <dl className="space-y-2 text-sm">
            {p.graduation_year && <div><dt className="text-gray-500">Class</dt><dd className="font-medium">{p.graduation_year}</dd></div>}
            {p.house && <div><dt className="text-gray-500">House</dt><dd className="font-medium">{p.house}</dd></div>}
            {p.program && <div><dt className="text-gray-500">Programme</dt><dd className="font-medium">{p.program}</dd></div>}
            {p.boarding_type && <div><dt className="text-gray-500">Type</dt><dd className="font-medium">{p.boarding_type}</dd></div>}
            {p.final_year_class && <div><dt className="text-gray-500">Final Year Class</dt><dd className="font-medium">{p.final_year_class}</dd></div>}
            {p.leadership_roles && <div><dt className="text-gray-500">Leadership</dt><dd className="font-medium">{p.leadership_roles}</dd></div>}
            {p.clubs && <div><dt className="text-gray-500">Clubs</dt><dd className="font-medium">{p.clubs}</dd></div>}
            {p.sports && <div><dt className="text-gray-500">Sports</dt><dd className="font-medium">{p.sports}</dd></div>}
          </dl>
        </div>

        {/* Business */}
        {p.has_business && p.business_name && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" /> Business
            </h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-gray-500">Business Name</dt><dd className="font-bold text-gray-800">{p.business_name}</dd></div>
              {p.business_category && <div><dt className="text-gray-500">Category</dt><dd className="font-medium">{p.business_category}</dd></div>}
              {p.business_description && <div><dt className="text-gray-500">About</dt><dd className="font-medium">{p.business_description}</dd></div>}
              {p.business_website && (
                <div>
                  <dt className="text-gray-500">Website</dt>
                  <dd>
                    <a href={p.business_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {p.business_website}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Contact */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600" /> Contact
          </h2>
          <dl className="space-y-2 text-sm">
            {p.email && (
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd><a href={`mailto:${p.email}`} className="text-blue-600 hover:underline">{p.email}</a></dd>
              </div>
            )}
            {p.phone && (
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</dd>
              </div>
            )}
            {p.mentorship_areas && (
              <div>
                <dt className="text-gray-500">Mentorship Areas</dt>
                <dd className="font-medium">{p.mentorship_areas}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Member since</dt>
              <dd className="font-medium">{formatDate(p.created_at)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
    </div>
  );
}
