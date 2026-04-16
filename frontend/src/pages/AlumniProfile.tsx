import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Briefcase, Phone, Mail, Linkedin, Facebook, Instagram,
  GraduationCap, Building2, Star, Award, ArrowLeft, Globe,
  Camera, Loader2, Edit2, Calendar, Users, BookOpen, Shield, Home
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
  const canEdit = !!(currentUser && id && (currentUser.id === id || currentUser.is_admin));

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const formData = new FormData();
    formData.append('photo', file);
    setUploading(true);
    try {
      const result = await alumniApi.uploadPhoto(id, formData);
      queryClient.setQueryData(['alumni', id], (old: Record<string, unknown> | undefined) =>
        old ? { ...old, profile_photo_url: result.profile_photo_url } : old
      );
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="page-bg min-h-screen">
        <div className="max-w-4xl mx-auto py-8 px-4 animate-pulse space-y-5">
          <div className="h-48 rounded-3xl bg-gray-200" />
          <div className="card p-6 flex gap-6">
            <div className="h-28 w-28 rounded-full bg-gray-200 -mt-16 flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-6 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !p) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-3">Alumni profile not found.</p>
          <Link to="/directory" className="btn-primary text-sm">Back to Directory</Link>
        </div>
      </div>
    );
  }

  const displayName = `${p.first_name} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name}`.trim();
  const avatarUrl = p.profile_photo_url ? getPhotoUrl(p.profile_photo_url) : null;

  return (
    <div className="page-bg min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Back link */}
        <Link to="/directory" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Directory
        </Link>

        {/* ── Cover + Avatar ── */}
        <div className="relative mb-16">
          {/* Cover banner */}
          <div className="h-44 rounded-3xl overflow-hidden relative"
               style={{ background: 'linear-gradient(135deg, #0d1b3e 0%, #1a2744 40%, #1e3a8a 70%, #1e40af 100%)' }}>
            {/* Decorative dots overlay */}
            <div className="absolute inset-0 opacity-20"
                 style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
            {/* Accent stripe */}
            <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #facc15, #f59e0b, #dc2626, #1e40af)' }} />
            {/* Edit profile button */}
            {canEdit && (
              <Link to={`/alumni/${id}/edit`}
                className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium rounded-lg backdrop-blur-sm transition-colors border border-white/20">
                <Edit2 className="h-3.5 w-3.5" /> Edit Profile
              </Link>
            )}
          </div>

          {/* Avatar — overlaps cover + card */}
          <div className="absolute -bottom-12 left-6 sm:left-8">
            <div className="relative group">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName}
                  className="h-28 w-28 sm:h-32 sm:w-32 rounded-full object-cover border-4 border-white shadow-xl" />
              ) : (
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-3xl font-bold text-white"
                     style={{ background: 'linear-gradient(135deg, #1a2744, #1e40af)' }}>
                  {getInitials(p.first_name, p.last_name)}
                </div>
              )}
              {canEdit && (
                <>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Change photo">
                    {uploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
                    {!uploading && <span className="text-white text-xs mt-1 font-medium">Change</span>}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Name + headline card ── */}
        <div className="card p-6 mb-5">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
              {displayName}
            </h1>
            {currentUser?.is_admin && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 font-medium border border-blue-100">
                <Shield className="h-3 w-3" /> Verified
              </span>
            )}
          </div>
          {p.preferred_name && (
            <p className="text-sm text-gray-400 mb-2">Known as <span className="font-medium text-gray-600">"{p.preferred_name}"</span></p>
          )}

          {/* Occupation + employer */}
          {p.occupation && (
            <p className="flex items-center gap-2 text-gray-700 font-medium mt-2">
              <Briefcase className="h-4 w-4 text-blue-500 flex-shrink-0" />
              {p.occupation}
              {p.employer && <span className="text-gray-400 font-normal">at <span className="text-gray-600">{p.employer}</span></span>}
            </p>
          )}
          {p.city && (
            <p className="flex items-center gap-2 text-gray-500 text-sm mt-1.5">
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              {[p.city, p.region, p.country].filter(Boolean).join(', ')}
            </p>
          )}

          {/* Social links */}
          {(p.linkedin_url || p.facebook_url || p.instagram_url) && (
            <div className="flex gap-2 mt-3">
              {p.linkedin_url && (
                <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer"
                   className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors" title="LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {p.facebook_url && (
                <a href={p.facebook_url} target="_blank" rel="noopener noreferrer"
                   className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors" title="Facebook">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {p.instagram_url && (
                <a href={`https://instagram.com/${p.instagram_url.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                   className="h-8 w-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 text-white hover:opacity-90 transition-opacity" title="Instagram">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
            </div>
          )}

          {/* Bio */}
          {p.bio && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed italic">"{p.bio}"</p>
            </div>
          )}

          {/* ── Horizontal badge strip ── */}
          {(p.graduation_year || p.house || p.program || p.is_mentor_available || p.is_speaker_available) && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 justify-center">
              {p.graduation_year && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-blue-700 text-white shadow-sm">
                  <GraduationCap className="h-4 w-4" /> Class of '{String(p.graduation_year).slice(-2)}
                </span>
              )}
              {p.house && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-amber-500 text-white shadow-sm">
                  <Home className="h-4 w-4" /> {p.house} House
                </span>
              )}
              {p.program && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white shadow-sm">
                  <BookOpen className="h-4 w-4" /> {p.program}
                </span>
              )}
              {p.is_mentor_available && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-purple-600 text-white shadow-sm">
                  <Star className="h-3.5 w-3.5" /> Mentor
                </span>
              )}
              {p.is_speaker_available && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white shadow-sm">
                  <Award className="h-3.5 w-3.5" /> Speaker
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Info grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Professional */}
          {(p.occupation || p.employer || p.industry || p.years_of_experience || p.certifications || p.expertise || p.job_title) && (
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Briefcase className="h-3.5 w-3.5 text-blue-700" />
                </div>
                Professional
              </h2>
              <dl className="space-y-3 text-sm">
                {p.job_title && <InfoRow label="Job Title" value={p.job_title} />}
                {p.employer && <InfoRow label="Employer" value={p.employer} />}
                {p.industry && <InfoRow label="Industry" value={p.industry} />}
                {p.professional_field && <InfoRow label="Field" value={p.professional_field} />}
                {p.years_of_experience && <InfoRow label="Experience" value={`${p.years_of_experience} years`} />}
                {p.certifications && <InfoRow label="Certifications" value={p.certifications} />}
                {p.expertise && <InfoRow label="Expertise" value={p.expertise} />}
                {p.mentorship_areas && <InfoRow label="Mentorship" value={p.mentorship_areas} />}
              </dl>
            </div>
          )}

          {/* School */}
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <GraduationCap className="h-3.5 w-3.5 text-emerald-700" />
              </div>
              School
            </h2>
            <dl className="space-y-3 text-sm">
              {p.graduation_year && <InfoRow label="Class" value={String(p.graduation_year)} />}
              {p.house && <InfoRow label="House" value={`${p.house} House`} />}
              {p.program && <InfoRow label="Programme" value={p.program} />}
              {p.boarding_type && <InfoRow label="Type" value={p.boarding_type} />}
              {p.final_year_class && <InfoRow label="Final Class" value={p.final_year_class} />}
              {p.leadership_roles && <InfoRow label="Leadership" value={p.leadership_roles} />}
              {p.clubs && <InfoRow label="Clubs" value={p.clubs} />}
              {p.sports && <InfoRow label="Sports" value={p.sports} />}
            </dl>
          </div>

          {/* Business */}
          {p.has_business && p.business_name && (
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5 text-amber-700" />
                </div>
                Business
              </h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-400 text-xs uppercase tracking-wide">Business</dt>
                  <dd className="font-bold text-gray-900 text-base mt-0.5">{p.business_name}</dd>
                </div>
                {p.business_category && <InfoRow label="Category" value={p.business_category} />}
                {p.business_industry && <InfoRow label="Industry" value={p.business_industry} />}
                {p.business_location && <InfoRow label="Location" value={p.business_location} />}
                {p.business_description && <InfoRow label="About" value={p.business_description} />}
                {p.business_services && <InfoRow label="Services" value={p.business_services} />}
                {p.business_website && (
                  <div>
                    <dt className="text-gray-400 text-xs uppercase tracking-wide">Website</dt>
                    <dd className="mt-0.5">
                      <a href={p.business_website} target="_blank" rel="noopener noreferrer"
                         className="text-blue-600 hover:underline flex items-center gap-1 font-medium text-sm">
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
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <div className="h-7 w-7 rounded-lg bg-rose-100 flex items-center justify-center">
                <Mail className="h-3.5 w-3.5 text-rose-700" />
              </div>
              Contact
            </h2>
            <dl className="space-y-3 text-sm">
              {p.email && (
                <div>
                  <dt className="text-gray-400 text-xs uppercase tracking-wide">Email</dt>
                  <dd className="mt-0.5">
                    <a href={`mailto:${p.email}`} className="text-blue-600 hover:underline font-medium">{p.email}</a>
                  </dd>
                </div>
              )}
              {p.phone && (
                <div>
                  <dt className="text-gray-400 text-xs uppercase tracking-wide">Phone</dt>
                  <dd className="font-medium text-gray-800 flex items-center gap-1 mt-0.5">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />{p.phone}
                  </dd>
                </div>
              )}
              {p.date_of_birth && (
                <div>
                  <dt className="text-gray-400 text-xs uppercase tracking-wide">Birthday</dt>
                  <dd className="font-medium text-gray-800 flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {new Date(p.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wide">Member since</dt>
                <dd className="font-medium text-gray-800 flex items-center gap-1 mt-0.5">
                  <Users className="h-3.5 w-3.5 text-gray-400" />{formatDate(p.created_at)}
                </dd>
              </div>
              {p.mentorship_areas && (
                <div>
                  <dt className="text-gray-400 text-xs uppercase tracking-wide">Mentorship Areas</dt>
                  <dd className="font-medium text-gray-800 mt-0.5">{p.mentorship_areas}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Edit CTA at bottom for own profile */}
        {canEdit && (
          <div className="mt-6 flex justify-center">
            <Link to={`/alumni/${id}/edit`}
              className="btn-primary flex items-center gap-2 text-sm">
              <Edit2 className="h-4 w-4" /> Edit My Profile
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-400 text-xs uppercase tracking-wide">{label}</dt>
      <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
    </div>
  );
}
