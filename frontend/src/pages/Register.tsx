import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, Check, User, BookOpen,
  Phone, Briefcase, Building2, Heart
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { type RegistrationFormData } from '@/types';
import { cn } from '@/lib/utils';
import SchoolLogo from '@/components/SchoolLogo';

const STEPS = [
  { label: 'Personal',      icon: User },
  { label: 'School',        icon: BookOpen },
  { label: 'Contact',       icon: Phone },
  { label: 'Professional',  icon: Briefcase },
  { label: 'Business',      icon: Building2 },
  { label: 'Emergency',     icon: Heart },
];

const HOUSES   = ['Kwansah', 'Riis', 'Engmann', 'Golden Tulip', 'Novotel', 'Akro', 'Clerk'];
const PROGRAMS = ['General Science', 'Business', 'General Arts', 'Agriculture', 'Visual Arts'];
const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Education', 'Law', 'Engineering', 'Construction', 'Agriculture', 'Media', 'Government', 'Non-profit', 'Other'];

const EMPTY_FORM: RegistrationFormData = {
  first_name: '', middle_name: '', last_name: '', preferred_name: '', date_of_birth: '',
  graduation_year: '', boarding_type: '', house: '', program: '', final_year_class: '', leadership_roles: '', clubs: '', sports: '',
  email: '', password: '', secondary_email: '', phone: '', whatsapp: '', address: '', city: '', region: '', country: 'Ghana', linkedin_url: '', facebook_url: '', instagram_url: '',
  employer: '', industry: '', job_title: '', professional_field: '', years_of_experience: '', certifications: '', expertise: '', is_mentor_available: false, is_speaker_available: false, has_board_service: false,
  has_business: false, business_name: '', business_industry: '', business_location: '', business_website: '', business_social: '', business_services: '', mentorship_areas: '', career_guidance_available: false,
  emergency_contact_name: '', emergency_contact_mobile: '', emergency_contact_relationship: '',
};

/* ── small helpers ── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

export default function Register() {
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState<RegistrationFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (field: keyof RegistrationFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { email, password, ...profile } = form;
      const profileData = {
        ...profile,
        graduation_year:    profile.graduation_year    ? parseInt(profile.graduation_year)    : null,
        years_of_experience: profile.years_of_experience ? parseInt(profile.years_of_experience) : null,
      };
      await authApi.register(email, password, profileData);
      toast.success('Registration submitted! Awaiting admin approval.');
      navigate('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;
  const StepIcon = STEPS[step].icon;

  return (
    <div className="min-h-screen page-bg flex flex-col">
      {/* Top banner */}
      <div className="page-header py-8">
        <div className="max-w-2xl mx-auto px-4 text-center relative z-10">
          <div className="mb-3 flex justify-center">
            <SchoolLogo size={12} variant="dark" />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Alumni Registration</h1>
          <p className="text-blue-200 text-sm mt-1">Complete all sections to join the alumni network</p>
        </div>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6 select-none">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done    = i < step;
            const current = i === step;
            return (
              <div key={s.label} className="flex items-center flex-1">
                <button
                  onClick={() => done && setStep(i)}
                  className={cn(
                    'flex flex-col items-center gap-1 group',
                    done ? 'cursor-pointer' : 'cursor-default'
                  )}
                  title={s.label}
                >
                  <div className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 border-2',
                    done    ? 'bg-green-500 border-green-500 text-white shadow-md'
                            : current ? 'border-blue-700 bg-blue-700 text-white shadow-lg scale-110'
                            : 'border-gray-200 bg-white text-gray-400'
                  )}>
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={cn(
                    'text-xs font-medium hidden sm:block',
                    current ? 'text-blue-700' : done ? 'text-green-600' : 'text-gray-400'
                  )}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1 mb-5 sm:mb-4 rounded-full transition-colors duration-300"
                       style={{ background: i < step ? '#22c55e' : '#e5e7eb' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="card overflow-hidden">

          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #1e40af, #3b82f6)' }}
            />
          </div>

          {/* Step heading */}
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-50">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #1a2744, #1e40af)' }}>
              <StepIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                {STEPS[step].label}
              </h2>
              <p className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</p>
            </div>
          </div>

          <div className="p-6 space-y-4">

            {/* ── Step 1: Personal ── */}
            {step === 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="First Name" required>
                    <input className="input" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="e.g. Kwame" />
                  </Field>
                  <Field label="Middle Name">
                    <input className="input" value={form.middle_name} onChange={(e) => set('middle_name', e.target.value)} placeholder="Optional" />
                  </Field>
                  <Field label="Last Name" required>
                    <input className="input" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="e.g. Mensah" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Preferred Name / Nickname">
                    <input className="input" value={form.preferred_name} onChange={(e) => set('preferred_name', e.target.value)} placeholder="What you go by" />
                  </Field>
                  <Field label="Date of Birth">
                    <input type="date" className="input" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
                  </Field>
                </div>
              </>
            )}

            {/* ── Step 2: School ── */}
            {step === 1 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Year of Graduation" required>
                    <input type="number" className="input" placeholder="e.g. 2005" min="1960" max="2030"
                      value={form.graduation_year} onChange={(e) => set('graduation_year', e.target.value)} />
                  </Field>
                  <Field label="Boarding / Day">
                    <select className="input" value={form.boarding_type} onChange={(e) => set('boarding_type', e.target.value)}>
                      <option value="">Select…</option>
                      <option>Boarding</option>
                      <option>Day</option>
                    </select>
                  </Field>
                  <Field label="House">
                    <select className="input" value={form.house} onChange={(e) => set('house', e.target.value)}>
                      <option value="">Select house…</option>
                      {HOUSES.map((h) => <option key={h}>{h}</option>)}
                    </select>
                  </Field>
                  <Field label="Programme">
                    <select className="input" value={form.program} onChange={(e) => set('program', e.target.value)}>
                      <option value="">Select programme…</option>
                      {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Final Year Class">
                    <input className="input" placeholder="e.g. 3 Science 2" value={form.final_year_class} onChange={(e) => set('final_year_class', e.target.value)} />
                  </Field>
                </div>
                <SectionDivider title="Activities" />
                <Field label="Leadership Roles">
                  <input className="input" placeholder="e.g. Prefect, House Captain" value={form.leadership_roles} onChange={(e) => set('leadership_roles', e.target.value)} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Clubs / Societies">
                    <input className="input" placeholder="e.g. Debate Club, Drama" value={form.clubs} onChange={(e) => set('clubs', e.target.value)} />
                  </Field>
                  <Field label="Sports">
                    <input className="input" placeholder="e.g. Football, Athletics" value={form.sports} onChange={(e) => set('sports', e.target.value)} />
                  </Field>
                </div>
              </>
            )}

            {/* ── Step 3: Contact ── */}
            {step === 2 && (
              <>
                <SectionDivider title="Account credentials" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Email Address" required>
                    <input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" />
                  </Field>
                  <Field label="Password" required>
                    <input type="password" className="input" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min. 6 characters" minLength={6} />
                  </Field>
                </div>
                <SectionDivider title="Phone & address" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Mobile">
                    <input type="tel" className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+233 …" />
                  </Field>
                  <Field label="WhatsApp">
                    <input type="tel" className="input" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+233 …" />
                  </Field>
                  <Field label="City">
                    <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Accra" />
                  </Field>
                  <Field label="Region / State">
                    <input className="input" value={form.region} onChange={(e) => set('region', e.target.value)} placeholder="e.g. Greater Accra" />
                  </Field>
                  <Field label="Country">
                    <input className="input" value={form.country} onChange={(e) => set('country', e.target.value)} />
                  </Field>
                  <Field label="Secondary Email">
                    <input type="email" className="input" value={form.secondary_email} onChange={(e) => set('secondary_email', e.target.value)} placeholder="Optional" />
                  </Field>
                </div>
                <Field label="Postal / Home Address">
                  <textarea className="input" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Full address (optional)" />
                </Field>
                <SectionDivider title="Social media" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="LinkedIn">
                    <input className="input" placeholder="linkedin.com/in/…" value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} />
                  </Field>
                  <Field label="Facebook">
                    <input className="input" placeholder="facebook.com/…" value={form.facebook_url} onChange={(e) => set('facebook_url', e.target.value)} />
                  </Field>
                  <Field label="Instagram">
                    <input className="input" placeholder="@handle" value={form.instagram_url} onChange={(e) => set('instagram_url', e.target.value)} />
                  </Field>
                </div>
              </>
            )}

            {/* ── Step 4: Professional ── */}
            {step === 3 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Employer / Organisation">
                    <input className="input" value={form.employer} onChange={(e) => set('employer', e.target.value)} placeholder="Company or organisation name" />
                  </Field>
                  <Field label="Job Title">
                    <input className="input" value={form.job_title} onChange={(e) => set('job_title', e.target.value)} placeholder="e.g. Senior Engineer" />
                  </Field>
                  <Field label="Industry / Sector">
                    <select className="input" value={form.industry} onChange={(e) => set('industry', e.target.value)}>
                      <option value="">Select industry…</option>
                      {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                    </select>
                  </Field>
                  <Field label="Professional Field">
                    <input className="input" value={form.professional_field} onChange={(e) => set('professional_field', e.target.value)} placeholder="e.g. Software Development" />
                  </Field>
                  <Field label="Years of Experience">
                    <input type="number" min="0" max="60" className="input" value={form.years_of_experience} onChange={(e) => set('years_of_experience', e.target.value)} placeholder="0" />
                  </Field>
                </div>
                <Field label="Certifications / Qualifications">
                  <input className="input" placeholder="e.g. CPA, PMP, PhD" value={form.certifications} onChange={(e) => set('certifications', e.target.value)} />
                </Field>
                <Field label="Areas of Expertise">
                  <input className="input" placeholder="e.g. Project Management, Data Analysis" value={form.expertise} onChange={(e) => set('expertise', e.target.value)} />
                </Field>
                <SectionDivider title="Community involvement" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([
                    { field: 'is_mentor_available' as const,  label: 'Available for mentorship',  desc: 'Guide junior alumni' },
                    { field: 'is_speaker_available' as const,  label: 'Guest speaker',             desc: 'Share expertise at events' },
                    { field: 'has_board_service' as const,     label: 'Board service',             desc: 'Serve on committees' },
                  ] as const).map(({ field, label, desc }) => (
                    <label key={field}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors',
                        form[field] ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-blue-200'
                      )}>
                      <input
                        type="checkbox"
                        checked={form[field] as boolean}
                        onChange={(e) => set(field, e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-gray-300 text-blue-600 flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800 leading-tight">{label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 5: Business & Mentorship ── */}
            {step === 4 && (
              <>
                <label className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                  form.has_business ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-blue-200'
                )}>
                  <input
                    type="checkbox"
                    checked={form.has_business}
                    onChange={(e) => set('has_business', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">I own / run a business</p>
                    <p className="text-xs text-gray-500">Enable this to add your business details to your profile</p>
                  </div>
                </label>

                {form.has_business && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
                    <SectionDivider title="Business details" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Business Name">
                        <input className="input" value={form.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="Your business name" />
                      </Field>
                      <Field label="Industry">
                        <input className="input" value={form.business_industry} onChange={(e) => set('business_industry', e.target.value)} placeholder="e.g. Tech, Retail" />
                      </Field>
                      <Field label="Location">
                        <input className="input" value={form.business_location} onChange={(e) => set('business_location', e.target.value)} placeholder="City, Country" />
                      </Field>
                      <Field label="Website">
                        <input className="input" placeholder="https://…" value={form.business_website} onChange={(e) => set('business_website', e.target.value)} />
                      </Field>
                      <Field label="Social Media">
                        <input className="input" value={form.business_social} onChange={(e) => set('business_social', e.target.value)} placeholder="@handle or URL" />
                      </Field>
                      <Field label="Services Offered">
                        <input className="input" value={form.business_services} onChange={(e) => set('business_services', e.target.value)} placeholder="Brief description" />
                      </Field>
                    </div>
                  </div>
                )}

                <SectionDivider title="Mentorship" />
                <Field label="Mentorship Areas">
                  <input className="input" placeholder="e.g. Career development, Tech entrepreneurship" value={form.mentorship_areas} onChange={(e) => set('mentorship_areas', e.target.value)} />
                </Field>
                <label className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors',
                  form.career_guidance_available ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-blue-200'
                )}>
                  <input
                    type="checkbox"
                    checked={form.career_guidance_available}
                    onChange={(e) => set('career_guidance_available', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-gray-700">Available for career guidance</span>
                </label>
              </>
            )}

            {/* ── Step 6: Emergency ── */}
            {step === 5 && (
              <>
                <p className="text-sm text-gray-500 -mt-1 mb-2">
                  This information is kept private and only used in case of emergency.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Contact Name">
                    <input className="input" value={form.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} placeholder="Full name" />
                  </Field>
                  <Field label="Mobile Number">
                    <input type="tel" className="input" value={form.emergency_contact_mobile} onChange={(e) => set('emergency_contact_mobile', e.target.value)} placeholder="+233 …" />
                  </Field>
                  <Field label="Relationship">
                    <input className="input" placeholder="e.g. Spouse, Parent, Sibling" value={form.emergency_contact_relationship} onChange={(e) => set('emergency_contact_relationship', e.target.value)} />
                  </Field>
                </div>

                {/* Summary box */}
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mt-2">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Almost done!</p>
                      <p className="text-sm text-blue-700 mt-0.5">
                        Your registration will be reviewed by the school administration.
                        You will receive a confirmation once your account is approved.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>

          {/* Navigation footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50 bg-gray-50/50">
            <button
              onClick={prev}
              disabled={step === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>

            <span className="text-xs text-gray-400 font-medium">{step + 1} / {STEPS.length}</span>

            {step < STEPS.length - 1 ? (
              <button
                onClick={next}
                disabled={step === 0 && (!form.first_name || !form.last_name)}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !form.email || !form.password}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {loading
                  ? <><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting…</>
                  : <><Check className="h-4 w-4" /> Submit Registration</>
                }
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already registered?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
