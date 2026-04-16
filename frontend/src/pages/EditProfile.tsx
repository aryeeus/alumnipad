import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, User, Phone, Briefcase, BookOpen, Building2, Loader2
} from 'lucide-react';
import { alumniApi } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { type AlumniProfile } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const HOUSES   = ['Kwansah', 'Riis', 'Engmann', 'Golden Tulip', 'Novotel', 'Akro', 'Clerk'];
const PROGRAMS = ['General Science', 'Business', 'General Arts', 'Agriculture', 'Visual Arts'];
const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Education', 'Law', 'Engineering', 'Construction', 'Agriculture', 'Media', 'Government', 'Non-profit', 'Other'];

type Tab = 'personal' | 'contact' | 'professional' | 'school' | 'business';
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'personal',     label: 'Personal',     icon: User },
  { id: 'contact',      label: 'Contact',       icon: Phone },
  { id: 'professional', label: 'Professional',  icon: Briefcase },
  { id: 'school',       label: 'School',        icon: BookOpen },
  { id: 'business',     label: 'Business',      icon: Building2 },
];

function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div className={half ? '' : ''}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={cn(
      'flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors',
      checked ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-blue-200'
    )}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
             className="h-4 w-4 mt-0.5 rounded border-gray-300 text-blue-600 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-gray-800 leading-tight">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
    </label>
  );
}

export default function EditProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = getStoredUser();
  const [tab, setTab] = useState<Tab>('personal');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<AlumniProfile>>({});

  const { data: profile, isLoading } = useQuery({
    queryKey: ['alumni', id],
    queryFn: () => alumniApi.get(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (profile) setForm(profile as unknown as AlumniProfile);
  }, [profile]);

  // Auth guard
  if (currentUser && id && currentUser.id !== id && !currentUser.is_admin) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-gray-500">You are not authorised to edit this profile.</p>
        <Link to={`/alumni/${id}`} className="text-blue-600 hover:underline mt-2 inline-block">Back to profile</Link>
      </div>
    );
  }

  const set = (field: keyof AlumniProfile, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await alumniApi.update(id, form as Record<string, unknown>);
      queryClient.invalidateQueries({ queryKey: ['alumni', id] });
      toast.success('Profile updated successfully');
      navigate(`/alumni/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="page-bg min-h-screen">
      {/* Header */}
      <div className="page-header py-6">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <Link to={`/alumni/${id}`} className="flex items-center gap-1 text-blue-200 hover:text-white text-sm transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to profile
            </Link>
          </div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Edit Profile</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 overflow-x-auto">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setTab(tid)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center',
                tab === tid
                  ? 'text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              )}
              style={tab === tid ? { background: 'linear-gradient(135deg, #1a2744, #1e40af)' } : {}}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="card p-6 space-y-5">

          {/* ── Personal ── */}
          {tab === 'personal' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="First Name">
                  <input className="input" value={form.first_name ?? ''} onChange={(e) => set('first_name', e.target.value)} />
                </Field>
                <Field label="Middle Name">
                  <input className="input" value={form.middle_name ?? ''} onChange={(e) => set('middle_name', e.target.value)} />
                </Field>
                <Field label="Last Name">
                  <input className="input" value={form.last_name ?? ''} onChange={(e) => set('last_name', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Preferred Name / Nickname">
                  <input className="input" value={form.preferred_name ?? ''} onChange={(e) => set('preferred_name', e.target.value)} />
                </Field>
                <Field label="Date of Birth">
                  <input type="date" className="input" value={form.date_of_birth?.split('T')[0] ?? ''} onChange={(e) => set('date_of_birth', e.target.value)} />
                </Field>
              </div>
              <Field label="Bio / About Me">
                <textarea className="input" rows={5} placeholder="Tell your fellow alumni about yourself…" value={form.bio ?? ''} onChange={(e) => set('bio', e.target.value)} />
              </Field>
            </>
          )}

          {/* ── Contact ── */}
          {tab === 'contact' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Mobile">
                  <input type="tel" className="input" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="+233…" />
                </Field>
                <Field label="WhatsApp">
                  <input type="tel" className="input" value={form.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+233…" />
                </Field>
                <Field label="Secondary Email">
                  <input type="email" className="input" value={form.secondary_email ?? ''} onChange={(e) => set('secondary_email', e.target.value)} />
                </Field>
                <Field label="City">
                  <input className="input" value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
                </Field>
                <Field label="Region / State">
                  <input className="input" value={form.region ?? ''} onChange={(e) => set('region', e.target.value)} />
                </Field>
                <Field label="Country">
                  <input className="input" value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} />
                </Field>
              </div>
              <Field label="Address">
                <textarea className="input" rows={2} value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
              </Field>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-1">Social Media</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="LinkedIn">
                  <input className="input" placeholder="linkedin.com/in/…" value={form.linkedin_url ?? ''} onChange={(e) => set('linkedin_url', e.target.value)} />
                </Field>
                <Field label="Facebook">
                  <input className="input" placeholder="facebook.com/…" value={form.facebook_url ?? ''} onChange={(e) => set('facebook_url', e.target.value)} />
                </Field>
                <Field label="Instagram">
                  <input className="input" placeholder="@handle" value={form.instagram_url ?? ''} onChange={(e) => set('instagram_url', e.target.value)} />
                </Field>
              </div>
            </>
          )}

          {/* ── Professional ── */}
          {tab === 'professional' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Occupation / Role">
                  <input className="input" value={form.occupation ?? ''} onChange={(e) => set('occupation', e.target.value)} placeholder="e.g. Software Engineer" />
                </Field>
                <Field label="Employer / Organisation">
                  <input className="input" value={form.employer ?? ''} onChange={(e) => set('employer', e.target.value)} />
                </Field>
                <Field label="Job Title">
                  <input className="input" value={form.job_title ?? ''} onChange={(e) => set('job_title', e.target.value)} />
                </Field>
                <Field label="Industry / Sector">
                  <select className="input" value={form.industry ?? ''} onChange={(e) => set('industry', e.target.value)}>
                    <option value="">Select…</option>
                    {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                  </select>
                </Field>
                <Field label="Professional Field">
                  <input className="input" value={form.professional_field ?? ''} onChange={(e) => set('professional_field', e.target.value)} />
                </Field>
                <Field label="Years of Experience">
                  <input type="number" min="0" max="60" className="input" value={form.years_of_experience ?? ''} onChange={(e) => set('years_of_experience', e.target.value)} />
                </Field>
              </div>
              <Field label="Certifications / Qualifications">
                <input className="input" placeholder="e.g. CPA, PMP, PhD" value={form.certifications ?? ''} onChange={(e) => set('certifications', e.target.value)} />
              </Field>
              <Field label="Areas of Expertise">
                <input className="input" placeholder="e.g. Project Management, Data Analysis" value={form.expertise ?? ''} onChange={(e) => set('expertise', e.target.value)} />
              </Field>
              <Field label="Mentorship Areas">
                <input className="input" placeholder="e.g. Career development, Entrepreneurship" value={form.mentorship_areas ?? ''} onChange={(e) => set('mentorship_areas', e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <Toggle label="Available for mentorship" desc="Guide junior alumni" checked={!!form.is_mentor_available} onChange={(v) => set('is_mentor_available', v)} />
                <Toggle label="Guest speaker" desc="Share expertise at events" checked={!!form.is_speaker_available} onChange={(v) => set('is_speaker_available', v)} />
                <Toggle label="Board service" desc="Serve on committees" checked={!!form.has_board_service} onChange={(v) => set('has_board_service', v)} />
              </div>
            </>
          )}

          {/* ── School ── */}
          {tab === 'school' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Year of Graduation">
                  <input type="number" className="input" min="1960" max="2030" value={form.graduation_year ?? ''} onChange={(e) => set('graduation_year', e.target.value)} />
                </Field>
                <Field label="Boarding / Day">
                  <select className="input" value={form.boarding_type ?? ''} onChange={(e) => set('boarding_type', e.target.value)}>
                    <option value="">Select…</option>
                    <option>Boarding</option>
                    <option>Day</option>
                  </select>
                </Field>
                <Field label="House">
                  <select className="input" value={form.house ?? ''} onChange={(e) => set('house', e.target.value)}>
                    <option value="">Select house…</option>
                    {HOUSES.map((h) => <option key={h}>{h}</option>)}
                  </select>
                </Field>
                <Field label="Programme">
                  <select className="input" value={form.program ?? ''} onChange={(e) => set('program', e.target.value)}>
                    <option value="">Select programme…</option>
                    {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Final Year Class">
                  <input className="input" placeholder="e.g. 3 Science 2" value={form.final_year_class ?? ''} onChange={(e) => set('final_year_class', e.target.value)} />
                </Field>
              </div>
              <Field label="Leadership Roles">
                <input className="input" placeholder="e.g. Prefect, House Captain" value={form.leadership_roles ?? ''} onChange={(e) => set('leadership_roles', e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Clubs / Societies">
                  <input className="input" placeholder="e.g. Debate Club, Drama" value={form.clubs ?? ''} onChange={(e) => set('clubs', e.target.value)} />
                </Field>
                <Field label="Sports">
                  <input className="input" placeholder="e.g. Football, Athletics" value={form.sports ?? ''} onChange={(e) => set('sports', e.target.value)} />
                </Field>
              </div>
            </>
          )}

          {/* ── Business ── */}
          {tab === 'business' && (
            <>
              <Toggle label="I own / run a business" desc="Enable to add your business details" checked={!!form.has_business} onChange={(v) => set('has_business', v)} />
              {form.has_business && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Business Name">
                      <input className="input" value={form.business_name ?? ''} onChange={(e) => set('business_name', e.target.value)} />
                    </Field>
                    <Field label="Category">
                      <input className="input" value={form.business_category ?? ''} onChange={(e) => set('business_category', e.target.value)} placeholder="e.g. Tech, Retail" />
                    </Field>
                    <Field label="Industry">
                      <input className="input" value={form.business_industry ?? ''} onChange={(e) => set('business_industry', e.target.value)} />
                    </Field>
                    <Field label="Location">
                      <input className="input" value={form.business_location ?? ''} onChange={(e) => set('business_location', e.target.value)} placeholder="City, Country" />
                    </Field>
                    <Field label="Website">
                      <input className="input" placeholder="https://…" value={form.business_website ?? ''} onChange={(e) => set('business_website', e.target.value)} />
                    </Field>
                    <Field label="Business Phone">
                      <input type="tel" className="input" value={form.business_phone ?? ''} onChange={(e) => set('business_phone', e.target.value)} />
                    </Field>
                    <Field label="Business Email">
                      <input type="email" className="input" value={form.business_email ?? ''} onChange={(e) => set('business_email', e.target.value)} />
                    </Field>
                    <Field label="Social Media">
                      <input className="input" value={form.business_social ?? ''} onChange={(e) => set('business_social', e.target.value)} placeholder="@handle or URL" />
                    </Field>
                  </div>
                  <Field label="Description">
                    <textarea className="input" rows={3} value={form.business_description ?? ''} onChange={(e) => set('business_description', e.target.value)} placeholder="What does your business do?" />
                  </Field>
                  <Field label="Services Offered">
                    <input className="input" value={form.business_services ?? ''} onChange={(e) => set('business_services', e.target.value)} />
                  </Field>
                </div>
              )}
            </>
          )}

        </div>

        {/* Bottom save bar */}
        <div className="flex items-center justify-between mt-6 px-1">
          <Link to={`/alumni/${id}`} className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Link>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
