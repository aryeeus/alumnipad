import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { type RegistrationFormData } from '@/types';
import { cn } from '@/lib/utils';

const STEPS = ['Personal', 'School', 'Contact', 'Professional', 'Business & Mentorship', 'Emergency'];

const HOUSES = ['Kwansah', 'Riis', 'Engmann', 'Golden Tulip', 'Novotel', 'Akro', 'Clerk'];
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

export default function Register() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegistrationFormData>(EMPTY_FORM);
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
        graduation_year: profile.graduation_year ? parseInt(profile.graduation_year) : null,
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

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Alumni Registration</h1>
        <p className="text-gray-500 text-sm mt-1">Complete all sections to register as an alumnus/alumna.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                i === step ? 'bg-blue-700 text-white' : i < step ? 'bg-green-500 text-white cursor-pointer' : 'bg-gray-200 text-gray-500'
              )}
            >
              {i < step ? <Check className="h-3 w-3 inline mr-0.5" /> : null}
              {label}
            </button>
            {i < STEPS.length - 1 && <div className="w-4 h-px bg-gray-300 mx-0.5" />}
          </div>
        ))}
      </div>

      <div className="card p-6">
        {/* Step 1 - Personal */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Personal Information <span className="text-sm font-normal text-gray-400">Step 1 of 6</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">First Name *</label>
                <input className="input" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
              </div>
              <div>
                <label className="label">Middle Name</label>
                <input className="input" value={form.middle_name} onChange={(e) => set('middle_name', e.target.value)} />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input className="input" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Preferred Name / Nickname</label>
                <input className="input" value={form.preferred_name} onChange={(e) => set('preferred_name', e.target.value)} />
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input type="date" className="input" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 - School */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">School Information <span className="text-sm font-normal text-gray-400">Step 2 of 6</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Year of Graduation *</label>
                <input type="number" className="input" placeholder="e.g. 2005" min="1960" max="2030"
                  value={form.graduation_year} onChange={(e) => set('graduation_year', e.target.value)} required />
              </div>
              <div>
                <label className="label">Boarding / Day</label>
                <select className="input" value={form.boarding_type} onChange={(e) => set('boarding_type', e.target.value)}>
                  <option value="">Select...</option>
                  <option>Boarding</option>
                  <option>Day</option>
                </select>
              </div>
              <div>
                <label className="label">House</label>
                <select className="input" value={form.house} onChange={(e) => set('house', e.target.value)}>
                  <option value="">Select house...</option>
                  {HOUSES.map((h) => <option key={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Programme</label>
                <select className="input" value={form.program} onChange={(e) => set('program', e.target.value)}>
                  <option value="">Select programme...</option>
                  {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Final Year Class</label>
                <input className="input" placeholder="e.g. 3 Science 2" value={form.final_year_class} onChange={(e) => set('final_year_class', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Leadership Roles</label>
              <input className="input" placeholder="e.g. Prefect, House Captain" value={form.leadership_roles} onChange={(e) => set('leadership_roles', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Clubs / Societies</label>
                <input className="input" placeholder="e.g. Debate Club, Drama" value={form.clubs} onChange={(e) => set('clubs', e.target.value)} />
              </div>
              <div>
                <label className="label">Sports</label>
                <input className="input" placeholder="e.g. Football, Athletics" value={form.sports} onChange={(e) => set('sports', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Contact */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Contact Details <span className="text-sm font-normal text-gray-400">Step 3 of 6</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Primary Email *</label>
                <input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} required />
              </div>
              <div>
                <label className="label">Password *</label>
                <input type="password" className="input" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} />
              </div>
              <div>
                <label className="label">Secondary Email</label>
                <input type="email" className="input" value={form.secondary_email} onChange={(e) => set('secondary_email', e.target.value)} />
              </div>
              <div>
                <label className="label">Mobile</label>
                <input type="tel" className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="label">WhatsApp</label>
                <input type="tel" className="input" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div>
                <label className="label">Region / State</label>
                <input className="input" value={form.region} onChange={(e) => set('region', e.target.value)} />
              </div>
              <div>
                <label className="label">Country</label>
                <input className="input" value={form.country} onChange={(e) => set('country', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Address</label>
              <textarea className="input" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">LinkedIn</label>
                <input className="input" placeholder="linkedin.com/in/..." value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} />
              </div>
              <div>
                <label className="label">Facebook</label>
                <input className="input" placeholder="facebook.com/..." value={form.facebook_url} onChange={(e) => set('facebook_url', e.target.value)} />
              </div>
              <div>
                <label className="label">Instagram</label>
                <input className="input" placeholder="@handle" value={form.instagram_url} onChange={(e) => set('instagram_url', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 4 - Professional */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Professional Information <span className="text-sm font-normal text-gray-400">Step 4 of 6</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Employer / Organisation</label>
                <input className="input" value={form.employer} onChange={(e) => set('employer', e.target.value)} />
              </div>
              <div>
                <label className="label">Job Title</label>
                <input className="input" value={form.job_title} onChange={(e) => set('job_title', e.target.value)} />
              </div>
              <div>
                <label className="label">Industry / Sector</label>
                <select className="input" value={form.industry} onChange={(e) => set('industry', e.target.value)}>
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Professional Field</label>
                <input className="input" value={form.professional_field} onChange={(e) => set('professional_field', e.target.value)} />
              </div>
              <div>
                <label className="label">Years of Experience</label>
                <input type="number" min="0" max="60" className="input" value={form.years_of_experience} onChange={(e) => set('years_of_experience', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Certifications / Qualifications</label>
              <input className="input" placeholder="e.g. CPA, PMP, PhD" value={form.certifications} onChange={(e) => set('certifications', e.target.value)} />
            </div>
            <div>
              <label className="label">Areas of Expertise</label>
              <input className="input" placeholder="e.g. Project Management, Data Analysis" value={form.expertise} onChange={(e) => set('expertise', e.target.value)} />
            </div>
            <div className="space-y-3 pt-2">
              {[
                { field: 'is_mentor_available' as const, label: 'Available for mentorship' },
                { field: 'is_speaker_available' as const, label: 'Available as guest speaker' },
                { field: 'has_board_service' as const, label: 'Available for board service' },
              ].map(({ field, label }) => (
                <label key={field} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[field] as boolean}
                    onChange={(e) => set(field, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 5 - Business & Mentorship */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Business & Mentorship <span className="text-sm font-normal text-gray-400">Step 5 of 6</span></h2>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                checked={form.has_business}
                onChange={(e) => set('has_business', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">I own a business</span>
            </label>
            {form.has_business && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-2 border-l-2 border-blue-200">
                <div>
                  <label className="label">Business Name</label>
                  <input className="input" value={form.business_name} onChange={(e) => set('business_name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Industry</label>
                  <input className="input" value={form.business_industry} onChange={(e) => set('business_industry', e.target.value)} />
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="input" value={form.business_location} onChange={(e) => set('business_location', e.target.value)} />
                </div>
                <div>
                  <label className="label">Website</label>
                  <input className="input" placeholder="https://..." value={form.business_website} onChange={(e) => set('business_website', e.target.value)} />
                </div>
                <div>
                  <label className="label">Social Media</label>
                  <input className="input" value={form.business_social} onChange={(e) => set('business_social', e.target.value)} />
                </div>
                <div>
                  <label className="label">Services Offered</label>
                  <input className="input" value={form.business_services} onChange={(e) => set('business_services', e.target.value)} />
                </div>
              </div>
            )}
            <div>
              <label className="label">Mentorship Areas</label>
              <input className="input" placeholder="e.g. Career development, Tech entrepreneurship" value={form.mentorship_areas} onChange={(e) => set('mentorship_areas', e.target.value)} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.career_guidance_available}
                onChange={(e) => set('career_guidance_available', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Available for career guidance</span>
            </label>
          </div>
        )}

        {/* Step 6 - Emergency */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Emergency Contact <span className="text-sm font-normal text-gray-400">Step 6 of 6</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Contact Name</label>
                <input className="input" value={form.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} />
              </div>
              <div>
                <label className="label">Mobile Number</label>
                <input type="tel" className="input" value={form.emergency_contact_mobile} onChange={(e) => set('emergency_contact_mobile', e.target.value)} />
              </div>
              <div>
                <label className="label">Relationship</label>
                <input className="input" placeholder="e.g. Spouse, Parent, Sibling" value={form.emergency_contact_relationship} onChange={(e) => set('emergency_contact_relationship', e.target.value)} />
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 mt-4">
              <strong>Almost done!</strong> After submitting, your registration will be reviewed by the school administration. You will be able to log in once approved.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
          <button onClick={prev} disabled={step === 0} className="btn-secondary flex items-center gap-2 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              disabled={step === 0 && (!form.first_name || !form.last_name)}
              className="btn-primary flex items-center gap-2"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || !form.email || !form.password} className="btn-primary flex items-center gap-2">
              {loading ? 'Submitting...' : 'Submit Registration'} <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-sm text-gray-500 mt-4">
        Already registered?{' '}
        <Link to="/login" className="text-blue-600 hover:underline">Sign in here</Link>
      </p>
    </div>
  );
}
