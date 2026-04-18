import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase, MapPin, Clock, DollarSign, Building2, Plus,
  ExternalLink, Mail, Trash2, ChevronRight, Search, Filter, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { jobsApi } from '@/lib/api';
import { getStoredUser, getPhotoUrl, getInitials } from '@/lib/auth';
import type { JobPosting } from '@/types';
import { cn } from '@/lib/utils';

const JOB_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Volunteer'];
const INDUSTRIES = [
  'Technology', 'Finance & Banking', 'Healthcare', 'Education', 'Engineering',
  'Legal', 'Marketing & Communications', 'Government & Public Sector',
  'Manufacturing', 'Energy & Mining', 'Agriculture', 'Consulting', 'Other',
];

const typeBadgeColor = (type: string) => {
  switch (type) {
    case 'Full-Time': return 'bg-blue-100 text-blue-700';
    case 'Part-Time': return 'bg-purple-100 text-purple-700';
    case 'Contract': return 'bg-orange-100 text-orange-700';
    case 'Internship': return 'bg-green-100 text-green-700';
    case 'Volunteer': return 'bg-pink-100 text-pink-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};

export default function Jobs() {
  const user = getStoredUser();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [page, setPage] = useState(1);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', search, filterType, filterIndustry, page],
    queryFn: () => jobsApi.list({
      search: search || undefined,
      type: filterType || undefined,
      industry: filterIndustry || undefined,
      page,
    }),
    staleTime: 60_000,
  });

  const { data: myJobs } = useQuery({
    queryKey: ['my-jobs'],
    queryFn: jobsApi.mine,
    staleTime: 60_000,
  });

  const jobs = data?.jobs ?? [];
  const totalPages = data?.pages ?? 1;
  const pendingOrRejected = (myJobs ?? []).filter((j) => j.status !== 'approved');

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this job posting?')) return;
    try {
      await jobsApi.delete(id);
      toast.success('Job removed');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="page-bg min-h-screen">
      {/* Header */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-yellow-400" />
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Job Board</h1>
              <p className="text-blue-200 text-sm">Opportunities posted by and for fellow alumni</p>
            </div>
          </div>
          {user && (
            <button onClick={() => setShowPostModal(true)} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
              <Plus className="h-4 w-4" /> Post a Job
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* My pending/rejected postings notice */}
        {pendingOrRejected.length > 0 && (
          <div className="mb-5 space-y-2">
            {pendingOrRejected.map((job) => (
              <div key={job.id} className={`flex items-start gap-3 p-4 rounded-xl border ${
                job.status === 'rejected'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <AlertCircle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${job.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    <strong>{job.title}</strong>
                    {' — '}
                    {job.status === 'pending'
                      ? 'Pending admin approval. It will appear on the board once approved.'
                      : 'Rejected by admin. You may delete this post and resubmit if needed.'}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(job.id)}
                  className="p-1 text-gray-400 hover:text-red-500 rounded flex-shrink-0"
                  title="Delete this posting"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search + Filters + Post button */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="input pl-9 w-full"
              placeholder="Search jobs, companies, keywords…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input sm:w-44"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          >
            <option value="">All Types</option>
            {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select
            className="input sm:w-52"
            value={filterIndustry}
            onChange={(e) => { setFilterIndustry(e.target.value); setPage(1); }}
          >
            <option value="">All Industries</option>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
          <button
            onClick={() => setShowPostModal(true)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> Post a Job
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Loading jobs…</div>
        ) : jobs.length === 0 ? (
          <div className="card p-12 text-center">
            <Briefcase className="h-12 w-12 text-blue-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No job postings found</p>
            <p className="text-gray-400 text-sm mt-1">Be the first to post an opportunity!</p>
            <button onClick={() => setShowPostModal(true)} className="btn-primary mt-4">Post a Job</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{data?.total} job{data?.total !== 1 ? 's' : ''} found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  currentUserId={user?.id}
                  isAdmin={user?.is_admin}
                  onClick={() => setSelectedJob(job)}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary text-sm">← Prev</button>
                <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary text-sm">Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Post Job Modal */}
      {showPostModal && (
        <PostJobModal
          onClose={() => setShowPostModal(false)}
          onSuccess={() => {
            setShowPostModal(false);
            queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
            toast.success('Job submitted! It will appear on the board once approved by an admin.');
          }}
        />
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}

// ─── Job Card ────────────────────────────────────────────────────────────────

function JobCard({ job, currentUserId, isAdmin, onClick, onDelete }: {
  job: JobPosting;
  currentUserId?: string;
  isAdmin?: boolean;
  onClick: () => void;
  onDelete: (id: string) => void;
}) {
  const canDelete = isAdmin || job.posted_by === currentUserId;
  const daysAgo = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 86400000);

  return (
    <div className="card card-hover p-5 cursor-pointer relative group" onClick={onClick}>
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Building2 className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{job.title}</h3>
          <p className="text-sm text-gray-600 truncate">{job.company || 'Company not specified'}</p>
        </div>
        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0', typeBadgeColor(job.type))}>
          {job.type}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
        {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
        {job.industry && <span className="flex items-center gap-1"><Filter className="h-3 w-3" />{job.industry}</span>}
        {job.salary_range && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{job.salary_range}</span>}
      </div>

      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{job.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {job.poster_photo ? (
            <img src={getPhotoUrl(job.poster_photo)} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-blue-700 flex items-center justify-center text-white text-[10px] font-bold">
              {getInitials(job.poster_first_name ?? '?', job.poster_last_name)}
            </div>
          )}
          <span className="text-xs text-gray-500">
            {[job.poster_first_name, job.poster_last_name].filter(Boolean).join(' ') || 'Alumni'}
            {' · '}
            {daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(job.id); }}
              className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronRight className="h-4 w-4 text-gray-300" />
        </div>
      </div>
    </div>
  );
}

// ─── Job Detail Modal ────────────────────────────────────────────────────────

function JobDetailModal({ job, onClose }: { job: JobPosting; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
              <p className="text-gray-600">{job.company || 'Company not specified'}</p>
            </div>
            <button onClick={onClose} className="btn-close text-2xl leading-none">&times;</button>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <span className={cn('px-3 py-1 rounded-full text-sm font-medium', typeBadgeColor(job.type))}>{job.type}</span>
            {job.location && <span className="flex items-center gap-1 text-sm text-gray-500"><MapPin className="h-4 w-4" />{job.location}</span>}
            {job.salary_range && <span className="flex items-center gap-1 text-sm text-gray-500"><DollarSign className="h-4 w-4" />{job.salary_range}</span>}
            {job.industry && <span className="flex items-center gap-1 text-sm text-gray-500"><Filter className="h-4 w-4" />{job.industry}</span>}
            {job.expires_at && <span className="flex items-center gap-1 text-sm text-gray-500"><Clock className="h-4 w-4" />Deadline: {new Date(job.expires_at).toLocaleDateString('en-GB')}</span>}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Job Description</h3>
            <p className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">{job.description}</p>
          </div>
          {job.requirements && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
              <p className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">{job.requirements}</p>
            </div>
          )}

          {/* Posted by */}
          <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
            {job.poster_photo ? (
              <img src={getPhotoUrl(job.poster_photo)} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold">
                {getInitials(job.poster_first_name ?? '?', job.poster_last_name)}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-800">
                Posted by {[job.poster_first_name, job.poster_last_name].filter(Boolean).join(' ') || 'Alumni'}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Apply buttons */}
          <div className="flex gap-3 flex-wrap">
            {job.application_url && (
              <a href={job.application_url} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> Apply Online
              </a>
            )}
            {job.application_email && (
              <a href={`mailto:${job.application_email}?subject=Application for ${encodeURIComponent(job.title)}`} className="btn-secondary flex items-center gap-2">
                <Mail className="h-4 w-4" /> Send Application Email
              </a>
            )}
            {!job.application_url && !job.application_email && (
              <p className="text-sm text-gray-500 italic">No application link provided. Contact the poster directly.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Post Job Modal ──────────────────────────────────────────────────────────

function PostJobModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: '', company: '', location: '', type: 'Full-Time', description: '',
    requirements: '', application_url: '', application_email: '',
    salary_range: '', industry: '', expires_at: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description) return;
    setSubmitting(true);
    try {
      await jobsApi.create({
        ...form,
        expires_at: form.expires_at || undefined,
        salary_range: form.salary_range || undefined,
        application_url: form.application_url || undefined,
        application_email: form.application_email || undefined,
        company: form.company || undefined,
        location: form.location || undefined,
        industry: form.industry || undefined,
      });
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post job');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" /> Post a Job
          </h2>
          <button onClick={onClose} className="btn-close text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Job Title *</label>
              <input className="input" required placeholder="e.g. Senior Software Engineer" value={form.title} onChange={F('title')} />
            </div>
            <div>
              <label className="label">Company / Organisation</label>
              <input className="input" placeholder="Company name" value={form.company} onChange={F('company')} />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="e.g. Accra, Ghana / Remote" value={form.location} onChange={F('location')} />
            </div>
            <div>
              <label className="label">Job Type</label>
              <select className="input" value={form.type} onChange={F('type')}>
                {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Industry</label>
              <select className="input" value={form.industry} onChange={F('industry')}>
                <option value="">Select industry…</option>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Salary Range (optional)</label>
              <input className="input" placeholder="e.g. ₵5,000 – ₵8,000 / month" value={form.salary_range} onChange={F('salary_range')} />
            </div>
            <div>
              <label className="label">Application Deadline (optional)</label>
              <input type="date" className="input" value={form.expires_at} onChange={F('expires_at')} />
            </div>
          </div>

          <div>
            <label className="label">Job Description *</label>
            <textarea className="input" rows={5} required placeholder="Describe the role, responsibilities, and what you're looking for…" value={form.description} onChange={F('description')} />
          </div>
          <div>
            <label className="label">Requirements (optional)</label>
            <textarea className="input" rows={3} placeholder="Qualifications, experience, skills required…" value={form.requirements} onChange={F('requirements')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <div>
              <label className="label">Application URL</label>
              <input type="url" className="input" placeholder="https://…" value={form.application_url} onChange={F('application_url')} />
            </div>
            <div>
              <label className="label">Application Email</label>
              <input type="email" className="input" placeholder="hr@company.com" value={form.application_email} onChange={F('application_email')} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Posting…' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
