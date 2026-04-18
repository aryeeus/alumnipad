import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Clock, Images, BookOpen, Calendar, Check, X, Plus,
  Trash2, Settings, BarChart3, ShoppingBag, Cake, Mail, Eye, EyeOff,
  Send, RefreshCw, Heart, Banknote, Briefcase, Award, TrendingUp,
  CheckCircle2, AlertCircle, FileText, Download, MapPin, Building2,
  Shield, UserX, UserCheck, ChevronRight
} from 'lucide-react';
import { adminApi, paymentsApi, campaignsApi, jobsApi } from '@/lib/api';
import {
  type AlumniProfile, type AdminStats, type Activity, type Advertisement,
  type BirthdayAlumni, type DuesConfig, type Payment, type DonationCampaign,
  type NonFinancialContribution, type FinanceSummary, type JobPosting,
} from '@/types';
import { getInitials, getPhotoUrl } from '@/lib/auth';
import { toast } from 'sonner';

type Tab = 'overview' | 'approvals' | 'activities' | 'ads' | 'finance' | 'jobs' | 'settings';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.stats });
  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin-pending'],
    queryFn: adminApi.pending,
    enabled: activeTab === 'approvals' || activeTab === 'overview',
  });
  const { data: activities } = useQuery({
    queryKey: ['admin-activities'],
    queryFn: adminApi.getActivities,
    enabled: activeTab === 'activities',
  });

  const { data: allAds } = useQuery({
    queryKey: ['admin-ads'],
    queryFn: adminApi.getAds,
    enabled: activeTab === 'ads',
  });

  const { data: birthdaysData } = useQuery({
    queryKey: ['admin-birthdays'],
    queryFn: adminApi.getBirthdays,
    enabled: activeTab === 'overview',
    staleTime: 60 * 60 * 1000,
  });
  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminApi.getSettings,
    enabled: activeTab === 'settings',
  });

  const s = stats as AdminStats | undefined;
  const pendingList = (pending ?? []) as AlumniProfile[];
  const activitiesList = (activities ?? []) as Activity[];
  const adsList = (allAds ?? []) as Advertisement[];
  const birthdays = (birthdaysData ?? []) as BirthdayAlumni[];

  const approve = async (userId: string) => {
    try {
      await adminApi.approve(userId);
      toast.success('Alumni approved');
      queryClient.invalidateQueries({ queryKey: ['admin-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch { toast.error('Failed to approve'); }
  };

  const reject = async (userId: string) => {
    if (!confirm('Reject and delete this registration?')) return;
    try {
      await adminApi.reject(userId);
      toast.success('Registration rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch { toast.error('Failed to reject'); }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'approvals', label: `Approvals ${s?.pending_approvals ? `(${s.pending_approvals})` : ''}`, icon: Clock },
    { id: 'activities', label: 'Activities', icon: Calendar },
    { id: 'ads', label: 'Advertisements', icon: ShoppingBag },
    { id: 'finance', label: 'Finance', icon: Banknote },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage the AlumniPad portal</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Alumni', value: s?.total_alumni ?? '—', icon: Users, color: 'text-blue-600 bg-blue-50' },
              { label: 'Pending Approvals', value: s?.pending_approvals ?? '—', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
              { label: 'Photos', value: s?.total_photos ?? '—', icon: Images, color: 'text-green-600 bg-green-50' },
              { label: 'Memories', value: s?.total_memories ?? '—', icon: BookOpen, color: 'text-purple-600 bg-purple-50' },
            ].map((stat) => (
              <div key={stat.label} className="card p-5">
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {pendingList.length > 0 && (
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 mb-4">Pending Approvals ({pendingList.length})</h2>
              <div className="space-y-3">
                {pendingList.slice(0, 5).map((a) => (
                  <PendingRow key={a.user_id || a.id} alumni={a} onApprove={() => approve(a.user_id || a.id)} onReject={() => reject(a.user_id || a.id)} />
                ))}
                {pendingList.length > 5 && (
                  <button onClick={() => setActiveTab('approvals')} className="text-blue-600 text-sm hover:underline">
                    View all {pendingList.length} pending →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Birthdays */}
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Cake className="h-5 w-5 text-pink-500" />
              Upcoming Birthdays
              <span className="ml-auto text-xs text-gray-400 font-normal">Next 30 days</span>
            </h2>
            {birthdays.length === 0 ? (
              <div className="text-center py-8">
                <Cake className="h-10 w-10 text-pink-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No birthdays in the next 30 days</p>
              </div>
            ) : (
              <div className="space-y-3">
                {birthdays.map((b) => {
                  const isToday = b.days_until === 0;
                  const name = `${b.first_name} ${b.last_name ?? ''}`.trim();
                  const bday = new Date(b.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
                  return (
                    <div key={b.user_id}
                         className={`flex items-center gap-3 p-3 rounded-xl ${isToday ? 'bg-pink-50 border border-pink-200' : 'bg-gray-50'}`}>
                      {b.profile_photo_url ? (
                        <img src={getPhotoUrl(b.profile_photo_url)} className="h-10 w-10 rounded-full object-cover flex-shrink-0" alt={name} />
                      ) : (
                        <div className="h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                             style={{ background: 'linear-gradient(135deg,#1a2744,#1e40af)' }}>
                          {getInitials(b.first_name, b.last_name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{name}</p>
                        <p className="text-xs text-gray-500">{bday}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {isToday ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500 text-white text-xs font-bold">
                            🎂 Today!
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">in {b.days_until} day{b.days_until !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {birthdays.some((b) => b.days_until === 0) && (
              <p className="text-xs text-pink-600 mt-3 bg-pink-50 rounded-lg px-3 py-2">
                🎉 Birthday emails are sent automatically at 8:00 AM on each alumnus's birthday.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Approvals */}
      {activeTab === 'approvals' && (
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Pending Registrations</h2>
          {pendingLoading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : pendingList.length === 0 ? (
            <div className="text-center py-12">
              <Check className="h-10 w-10 text-green-400 mx-auto mb-2" />
              <p className="text-gray-500">All caught up — no pending approvals.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingList.map((a) => (
                <PendingRow key={a.user_id || a.id} alumni={a} onApprove={() => approve(a.user_id || a.id)} onReject={() => reject(a.user_id || a.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activities */}
      {activeTab === 'activities' && (
        <ActivitiesTab activities={activitiesList} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['admin-activities'] })} />
      )}

      {/* Ads */}
      {activeTab === 'ads' && (
        <AdsTab ads={adsList} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['admin-ads'] })} />
      )}

      {/* Finance */}
      {activeTab === 'finance' && (
        <FinanceTab />
      )}

      {/* Jobs */}
      {activeTab === 'jobs' && (
        <JobsAdminTab />
      )}

      {/* Settings */}
      {activeTab === 'settings' && (
        <SettingsTab settings={settings as Record<string, unknown>} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['admin-settings'] })} />
      )}
    </div>
  );
}

function PendingRow({ alumni, onApprove, onReject }: { alumni: AlumniProfile; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      {alumni.profile_photo_url ? (
        <img src={getPhotoUrl(alumni.profile_photo_url)} className="h-10 w-10 rounded-full object-cover" alt="" />
      ) : (
        <div className="h-10 w-10 rounded-full bg-blue-700 flex items-center justify-center text-white text-sm font-bold">
          {getInitials(alumni.first_name, alumni.last_name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">{alumni.first_name} {alumni.last_name}</p>
        <p className="text-xs text-gray-500 truncate">
          {[alumni.email, alumni.graduation_year && `Class of ${alumni.graduation_year}`, alumni.house].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={onApprove} className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors" title="Approve">
          <Check className="h-4 w-4" />
        </button>
        <button onClick={onReject} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Reject">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ActivitiesTab({ activities, onRefresh }: { activities: Activity[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', event_date: '', event_time: '', location: '', event_type: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminApi.createActivity(form);
      toast.success('Activity created');
      setShowForm(false);
      setForm({ title: '', description: '', event_date: '', event_time: '', location: '', event_type: '' });
      onRefresh();
    } catch { toast.error('Failed to create activity'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this activity?')) return;
    try {
      await adminApi.deleteActivity(id);
      toast.success('Activity deleted');
      onRefresh();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-900">Manage Activities</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Add Activity
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-2 border-blue-200">
          <h3 className="font-semibold mb-4">New Activity</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">Title *</label>
              <input className="input" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Time</label>
                <input className="input" placeholder="e.g. 2:00 PM" value={form.event_time} onChange={(e) => setForm((f) => ({ ...f, event_time: e.target.value }))} />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
              <div>
                <label className="label">Event Type</label>
                <select className="input" value={form.event_type} onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}>
                  <option value="">Select...</option>
                  {['Reunion', 'Mentorship', 'Sports', 'Fundraising', 'Workshop', 'Social'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Save Activity'}</button>
            </div>
          </form>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="card p-8 text-center"><p className="text-gray-500">No activities yet.</p></div>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <div key={a.id} className="card p-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{a.title}</p>
                <p className="text-sm text-gray-500">{[a.event_date, a.event_time, a.location, a.event_type].filter(Boolean).join(' · ')}</p>
                {a.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.description}</p>}
              </div>
              <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdsTab({ ads, onRefresh }: { ads: Advertisement[]; onRefresh: () => void }) {
  const pending = ads.filter((a) => a.status === 'pending');
  const rest = ads.filter((a) => a.status !== 'pending');

  const handleApprove = async (id: string) => {
    try {
      await adminApi.approveAd(id);
      toast.success('Ad approved and now live');
      onRefresh();
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection (optional):') ?? '';
    try {
      await adminApi.rejectAd(id, reason || undefined);
      toast.success('Ad rejected');
      onRefresh();
    } catch { toast.error('Failed to reject'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this ad?')) return;
    try {
      await adminApi.deleteAd(id);
      toast.success('Ad deleted');
      onRefresh();
    } catch { toast.error('Failed to delete'); }
  };

  const AdRow = ({ ad }: { ad: Advertisement }) => (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
      {ad.image_url ? (
        <img src={getPhotoUrl(ad.image_url)} className="h-14 w-14 rounded-lg object-cover flex-shrink-0" alt="" />
      ) : (
        <div className="h-14 w-14 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="h-6 w-6 text-blue-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">{ad.title}</p>
        <p className="text-xs text-gray-500 truncate">
          {[ad.business_name, ad.category, `by ${ad.first_name} ${ad.last_name ?? ''}`].filter(Boolean).join(' · ')}
        </p>
        {ad.status === 'rejected' && ad.reject_reason && (
          <p className="text-xs text-red-500 mt-0.5">Reason: {ad.reject_reason}</p>
        )}
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        {ad.status === 'pending' && (
          <>
            <button onClick={() => handleApprove(ad.id)} className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors" title="Approve">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => handleReject(ad.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Reject">
              <X className="h-4 w-4" />
            </button>
          </>
        )}
        <button onClick={() => handleDelete(ad.id)} className="p-2 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" /> Pending Review ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((ad) => <AdRow key={ad.id} ad={ad} />)}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-blue-600" /> All Advertisements ({ads.length})
        </h2>
        {ads.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No ads submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {rest.map((ad) => <AdRow key={ad.id} ad={ad} />)}
            {pending.length > 0 && rest.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No reviewed ads yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const GHS = (n: number | string) =>
  `₵${parseFloat(String(n || 0)).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function exportCSV(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const escape = (v: string | number | boolean | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function FinanceTab() {
  const queryClient = useQueryClient();
  type FinSubTab = 'overview' | 'dues' | 'campaigns' | 'payments' | 'contributions';
  const [sub, setSub] = useState<FinSubTab>('overview');

  // Queries — each gated to its section so they only fire when needed
  const { data: summary } = useQuery({ queryKey: ['finance-summary'], queryFn: paymentsApi.getFinanceSummary });
  const { data: duesConfig } = useQuery({ queryKey: ['dues-config'], queryFn: paymentsApi.getDuesConfig, enabled: sub === 'dues' });
  const { data: duesReport, isLoading: duesReportLoading } = useQuery({
    queryKey: ['dues-report', new Date().getFullYear()],
    queryFn: () => paymentsApi.getDuesReport(new Date().getFullYear()),
    enabled: sub === 'dues',
  });
  const { data: allCampaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['admin-campaigns'], queryFn: campaignsApi.listAll, enabled: sub === 'campaigns',
  });
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['admin-payments'], queryFn: () => paymentsApi.adminAll(), enabled: sub === 'payments',
  });
  const { data: contributions, isLoading: contribLoading } = useQuery({
    queryKey: ['admin-contributions'], queryFn: () => paymentsApi.getAdminContributions(), enabled: sub === 'contributions',
  });

  const fs = summary as FinanceSummary | undefined;
  const configs      = (duesConfig ?? []) as DuesConfig[];
  const campaigns    = (allCampaigns ?? []) as DonationCampaign[];
  const payments     = ((paymentsData as { payments?: Payment[] })?.payments ?? []) as Payment[];
  const contribs     = (contributions ?? []) as NonFinancialContribution[];

  const navItems: { id: FinSubTab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'overview',       label: 'Overview',       icon: TrendingUp,   desc: 'Summary & totals'       },
    { id: 'dues',           label: 'Annual Dues',     icon: CheckCircle2, desc: 'Config & report'        },
    { id: 'campaigns',      label: 'Campaigns',       icon: Heart,        desc: 'Donation campaigns'     },
    { id: 'payments',       label: 'Payments',        icon: Banknote,     desc: 'Transaction records'    },
    { id: 'contributions',  label: 'Contributions',   icon: Award,        desc: 'Non-financial'          },
  ];

  return (
    <div className="flex gap-6 items-start">
      {/* Sidebar */}
      <nav className="w-52 flex-shrink-0 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSub(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors group ${
              sub === item.id ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <item.icon className={`h-4 w-4 flex-shrink-0 ${sub === item.id ? 'text-blue-200' : 'text-gray-400 group-hover:text-blue-600'}`} />
            <div className="min-w-0">
              <div className={`text-sm font-medium truncate ${sub === item.id ? 'text-white' : 'text-gray-800'}`}>{item.label}</div>
              <div className={`text-xs truncate ${sub === item.id ? 'text-blue-200' : 'text-gray-400'}`}>{item.desc}</div>
            </div>
            {sub !== item.id && <ChevronRight className="h-3.5 w-3.5 ml-auto text-gray-300 group-hover:text-blue-400 flex-shrink-0" />}
          </button>
        ))}
      </nav>

      {/* Content panel */}
      <div className="flex-1 min-w-0">
        {/* ── Overview ── */}
        {sub === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Collected',              value: GHS(fs?.total_collected ?? 0),  icon: TrendingUp,   color: 'text-green-600 bg-green-50'  },
                { label: `Dues Paid (${new Date().getFullYear()})`, value: fs?.dues_paid_this_year ?? '—', icon: CheckCircle2, color: 'text-blue-600 bg-blue-50'   },
                { label: 'Total Donations',              value: GHS(fs?.total_donations ?? 0),  icon: Heart,        color: 'text-red-600 bg-red-50'      },
                { label: 'Pending Contributions',        value: fs?.pending_contributions ?? '—', icon: Award,      color: 'text-yellow-600 bg-yellow-50' },
              ].map((stat) => (
                <div key={stat.label} className="card p-5">
                  <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="card p-5">
              <p className="text-gray-500 text-sm mb-3">
                Select a section from the sidebar to manage dues configuration, donation campaigns, payment records, or non-financial contributions.
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Download className="h-3 w-3" /> Export CSV is available in Annual Dues, Payments, and Contributions.
              </p>
            </div>
          </div>
        )}

        {/* ── Dues ── */}
        {sub === 'dues' && (
          <DuesSubTab
            configs={configs}
            duesReport={duesReport as Record<string, unknown>[]}
            duesReportLoading={duesReportLoading}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ['dues-config'] });
              queryClient.invalidateQueries({ queryKey: ['dues-report'] });
              queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
            }}
          />
        )}

        {/* ── Campaigns ── */}
        {sub === 'campaigns' && (
          <CampaignsSubTab
            campaigns={campaigns}
            loading={campaignsLoading}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })}
          />
        )}

        {/* ── Payments ── */}
        {sub === 'payments' && (
          <PaymentsSubTab
            payments={payments}
            loading={paymentsLoading}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['admin-payments'] })}
          />
        )}

        {/* ── Contributions ── */}
        {sub === 'contributions' && (
          <ContribSubTab
            contribs={contribs}
            loading={contribLoading}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-contributions'] });
              queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Dues sub-tab ────────────────────────────────────────────────────────────

function DuesSubTab({ configs, duesReport, duesReportLoading, onRefresh }: {
  configs: DuesConfig[];
  duesReport: Record<string, unknown>[];
  duesReportLoading: boolean;
  onRefresh: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const currentConfig = configs.find((c) => c.year === currentYear);
  const [form, setForm] = useState({ year: String(currentYear), amount: String(currentConfig?.amount ?? ''), currency: 'GHS', description: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentConfig) setForm((f) => ({ ...f, amount: String(currentConfig.amount), description: currentConfig.description ?? '', due_date: currentConfig.due_date ?? '' }));
  }, [currentConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await paymentsApi.setDuesConfig({ ...form, year: parseInt(form.year), amount: parseFloat(form.amount) });
      toast.success('Dues configuration saved');
      onRefresh();
    } catch { toast.error('Failed to save dues config'); }
    finally { setSaving(false); }
  };

  const paid = duesReport?.filter((r) => r.has_paid) ?? [];
  const unpaid = duesReport?.filter((r) => !r.has_paid) ?? [];

  return (
    <div className="space-y-5">
      {/* Config form */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-4">Annual Dues Configuration</h3>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label">Year</label>
              <input className="input" type="number" required value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
            </div>
            <div>
              <label className="label">Amount (₵)</label>
              <input className="input" type="number" min="0" step="0.01" required placeholder="100.00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <input className="input" placeholder="e.g. Annual levy covering event costs and alumni fund" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </form>
      </div>

      {/* Dues Report */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold text-gray-900">{currentYear} Dues Report</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-green-600 font-medium">{paid.length} paid</span>
            <span className="text-sm text-red-500 font-medium">{unpaid.length} unpaid</span>
            {duesReport?.length > 0 && (
              <button
                onClick={() => exportCSV(
                  `dues-report-${currentYear}.csv`,
                  ['Name', 'Email', 'Class Year', 'Status', 'Amount', 'Method', 'Date'],
                  duesReport.map((r) => [
                    `${r.first_name} ${r.last_name}`,
                    r.email as string,
                    r.graduation_year as string ?? '',
                    r.has_paid ? 'Paid' : 'Unpaid',
                    r.has_paid ? r.amount as number : '',
                    r.payment_method ? (r.payment_method as string).replace('_', ' ') : '',
                    r.verified_at ? new Date(r.verified_at as string).toLocaleDateString('en-GB') : '',
                  ])
                )}
                className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            )}
          </div>
        </div>
        {duesReportLoading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : !duesReport?.length ? (
          <p className="text-gray-400 text-sm text-center py-8">No alumni found.</p>
        ) : (
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {duesReport.map((r) => (
              <div key={r.id as string} className="flex items-center gap-3 py-2.5">
                {r.profile_photo_url ? (
                  <img src={getPhotoUrl(r.profile_photo_url as string)} className="h-8 w-8 rounded-full object-cover flex-shrink-0" alt="" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {getInitials(r.first_name as string, r.last_name as string | undefined)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.first_name as string} {r.last_name as string}</p>
                  <p className="text-xs text-gray-400">{r.email as string}{r.graduation_year ? ` · Class of ${r.graduation_year}` : ''}</p>
                </div>
                {r.has_paid ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Paid {r.payment_method ? `(${(r.payment_method as string).replace('_', ' ')})` : ''}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                    <AlertCircle className="h-3 w-3" /> Unpaid
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Campaigns sub-tab ───────────────────────────────────────────────────────

function CampaignsSubTab({ campaigns, loading, onRefresh }: {
  campaigns: DonationCampaign[]; loading: boolean; onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', goal_amount: '', start_date: '', end_date: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      if (form.description) fd.append('description', form.description);
      if (form.goal_amount) fd.append('goal_amount', form.goal_amount);
      if (form.start_date) fd.append('start_date', form.start_date);
      if (form.end_date) fd.append('end_date', form.end_date);
      if (imageFile) fd.append('image', imageFile);
      await campaignsApi.create(fd);
      toast.success('Campaign created');
      setShowForm(false);
      setForm({ title: '', description: '', goal_amount: '', start_date: '', end_date: '' });
      setImageFile(null);
      onRefresh();
    } catch { toast.error('Failed to create campaign'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (campaign: DonationCampaign) => {
    try {
      const fd = new FormData();
      fd.append('is_active', String(!campaign.is_active));
      await campaignsApi.update(campaign.id, fd);
      toast.success(campaign.is_active ? 'Campaign deactivated' : 'Campaign activated');
      onRefresh();
    } catch { toast.error('Failed to update campaign'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign? All donation records will be kept.')) return;
    try {
      await campaignsApi.delete(id);
      toast.success('Campaign deleted');
      onRefresh();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Donation Campaigns</h3>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> New Campaign
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-2 border-blue-200">
          <h4 className="font-semibold mb-4">Create Campaign</h4>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="label">Title *</label>
              <input className="input" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Library Renovation Fund" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Goal (₵)</label>
                <input type="number" min="0" step="0.01" className="input" placeholder="10000.00" value={form.goal_amount} onChange={(e) => setForm((f) => ({ ...f, goal_amount: e.target.value }))} />
              </div>
              <div>
                <label className="label">Start Date</label>
                <input type="date" className="input" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">End Date</label>
                <input type="date" className="input" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Campaign Image</label>
              <input type="file" accept="image/*" className="input" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create Campaign'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : campaigns.length === 0 ? (
        <div className="card p-8 text-center"><p className="text-gray-400">No campaigns yet.</p></div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const progress = c.goal_amount ? Math.min((c.raised_amount / c.goal_amount) * 100, 100) : null;
            return (
              <div key={c.id} className="card p-4 flex items-center gap-4">
                {c.image_url ? (
                  <img src={getPhotoUrl(c.image_url)} className="h-14 w-14 rounded-lg object-cover flex-shrink-0" alt="" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0"><Heart className="h-6 w-6 text-red-400" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.title}</p>
                  <p className="text-xs text-gray-500">
                    Raised: <strong>{GHS(c.raised_amount)}</strong>
                    {c.goal_amount && ` / ${GHS(c.goal_amount)} goal`}
                    {' · '}{c.donor_count} donors
                  </p>
                  {progress !== null && (
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-48">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => handleToggle(c)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title={c.is_active ? 'Deactivate' : 'Activate'}>
                    {c.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Payments sub-tab ────────────────────────────────────────────────────────

function PaymentsSubTab({ payments, loading, onRefresh }: {
  payments: Payment[]; loading: boolean; onRefresh: () => void;
}) {
  const [showRecord, setShowRecord] = useState(false);
  const [recordForm, setRecordForm] = useState({ user_id: '', type: 'dues', amount: '', payment_method: 'cash', dues_year: String(new Date().getFullYear()), campaign_id: '', notes: '' });
  const [recording, setRecording] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<Record<string, unknown>[]>([]);
  const [selectedAlumni, setSelectedAlumni] = useState<Record<string, unknown> | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const handleLookup = async (q: string) => {
    setLookupQuery(q);
    if (q.length < 2) { setLookupResults([]); return; }
    setLookingUp(true);
    try {
      const results = await adminApi.alumniLookup(q);
      setLookupResults(results);
    } catch { setLookupResults([]); }
    finally { setLookingUp(false); }
  };

  const selectAlumni = (a: Record<string, unknown>) => {
    setSelectedAlumni(a);
    setRecordForm((f) => ({ ...f, user_id: a.id as string }));
    setLookupQuery(`${a.first_name} ${a.last_name} (${a.alumni_code || a.email})`);
    setLookupResults([]);
  };

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.user_id) return toast.error('Please search and select an alumni first');
    setRecording(true);
    try {
      await paymentsApi.adminRecord({
        user_id: recordForm.user_id,
        type: recordForm.type,
        amount: parseFloat(recordForm.amount),
        payment_method: recordForm.payment_method,
        dues_year: recordForm.type === 'dues' ? parseInt(recordForm.dues_year) : undefined,
        campaign_id: recordForm.type === 'donation' && recordForm.campaign_id ? recordForm.campaign_id : undefined,
        notes: recordForm.notes || undefined,
      });
      toast.success('Payment recorded');
      setShowRecord(false);
      setSelectedAlumni(null);
      setLookupQuery('');
      setRecordForm({ user_id: '', type: 'dues', amount: '', payment_method: 'cash', dues_year: String(new Date().getFullYear()), campaign_id: '', notes: '' });
      onRefresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to record'); }
    finally { setRecording(false); }
  };

  const [showAll, setShowAll] = useState(false);

  const statusColor = (s: string) =>
    s === 'success' ? 'bg-green-100 text-green-700' : s === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';

  const visiblePayments = showAll ? payments : payments.filter((p) => p.status === 'success');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-gray-900">Payments</h3>
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded border-gray-300 text-blue-600"
            />
            Show pending &amp; failed
          </label>
        </div>
        <div className="flex gap-2">
          {visiblePayments.length > 0 && (
            <button
              onClick={() => exportCSV(
                `payments-${new Date().toISOString().slice(0,10)}.csv`,
                ['Date', 'Name', 'Email', 'Type', 'Amount (₵)', 'Method', 'Status', 'Reference'],
                visiblePayments.map((p) => [
                  new Date(p.created_at).toLocaleDateString('en-GB'),
                  p.first_name ? `${p.first_name} ${p.last_name ?? ''}`.trim() : '',
                  p.email ?? '',
                  p.type === 'dues' ? `Dues ${p.dues_year ?? ''}` : (p.campaign_title || 'Donation'),
                  p.amount,
                  p.payment_method?.replace('_', ' ') ?? '',
                  p.status,
                  p.reference ?? '',
                ])
              )}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )}
          <button onClick={() => setShowRecord(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" /> Record Offline Payment
          </button>
        </div>
      </div>

      {showRecord && (
        <div className="card p-5 border-2 border-blue-200">
          <h4 className="font-semibold mb-4">Record Offline / Cash Payment</h4>
          <form onSubmit={handleRecord} className="space-y-3">
            {/* Alumni search by code or name */}
            <div className="relative">
              <label className="label">Search Alumni (by code AP-00001, name, or email) *</label>
              <input
                className="input"
                placeholder="Type alumni code, name, or email…"
                value={lookupQuery}
                onChange={(e) => handleLookup(e.target.value)}
                autoComplete="off"
              />
              {lookingUp && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
              {lookupResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {lookupResults.map((a) => (
                    <button key={a.id as string} type="button"
                      onClick={() => selectAlumni(a)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition-colors">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.first_name as string} {a.last_name as string}</p>
                        <p className="text-xs text-gray-500">{a.alumni_code as string} · {a.email as string}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedAlumni && (
                <div className="mt-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-800">
                    <strong>{selectedAlumni.first_name as string} {selectedAlumni.last_name as string}</strong>
                    {selectedAlumni.alumni_code ? <> · <code className="bg-green-100 px-1 rounded">{selectedAlumni.alumni_code as string}</code></> : null}
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select className="input" value={recordForm.type} onChange={(e) => setRecordForm((f) => ({ ...f, type: e.target.value }))}>
                  <option value="dues">Dues</option>
                  <option value="donation">Donation</option>
                </select>
              </div>
              <div>
                <label className="label">Amount (₵)</label>
                <input type="number" min="0" step="0.01" className="input" required placeholder="100.00" value={recordForm.amount} onChange={(e) => setRecordForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select className="input" value={recordForm.payment_method} onChange={(e) => setRecordForm((f) => ({ ...f, payment_method: e.target.value }))}>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              {recordForm.type === 'dues' && (
                <div>
                  <label className="label">Dues Year</label>
                  <input type="number" className="input" value={recordForm.dues_year} onChange={(e) => setRecordForm((f) => ({ ...f, dues_year: e.target.value }))} />
                </div>
              )}
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input" placeholder="e.g. Paid at AGM, cheque #1234" value={recordForm.notes} onChange={(e) => setRecordForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowRecord(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={recording} className="btn-primary">{recording ? 'Recording…' : 'Record Payment'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : visiblePayments.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-400">{showAll ? 'No payments recorded yet.' : 'No successful payments yet.'}</p>
          {!showAll && payments.length > 0 && (
            <button onClick={() => setShowAll(true)} className="mt-2 text-sm text-blue-600 underline">
              Show all ({payments.length} total including pending)
            </button>
          )}
        </div>
      ) : (
        <div className="card p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Date', 'Alumni', 'Type', 'Amount', 'Method', 'Status', 'Ref'].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-500 font-medium pb-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visiblePayments.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="py-2 pr-3 text-gray-800 text-xs">{p.first_name ? `${p.first_name} ${p.last_name ?? ''}`.trim() : (p.email ?? '—')}</td>
                  <td className="py-2 pr-3 text-gray-700 text-xs capitalize">
                    {p.type === 'dues' ? `Dues ${p.dues_year ?? ''}` : p.campaign_title || 'Donation'}
                  </td>
                  <td className="py-2 pr-3 font-semibold text-gray-900 text-xs whitespace-nowrap">{GHS(p.amount)}</td>
                  <td className="py-2 pr-3 text-gray-600 text-xs capitalize">{p.payment_method?.replace('_', ' ') || '—'}</td>
                  <td className="py-2 pr-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="py-2 text-gray-400 text-xs font-mono truncate max-w-[100px]" title={p.reference}>{p.reference?.slice(-8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Contributions sub-tab ───────────────────────────────────────────────────

function ContribSubTab({ contribs, loading, onRefresh }: {
  contribs: NonFinancialContribution[]; loading: boolean; onRefresh: () => void;
}) {
  const handleUpdate = async (id: string, status: 'verified' | 'rejected') => {
    const notes = status === 'rejected' ? (prompt('Reason for rejection (optional):') ?? '') : '';
    try {
      await paymentsApi.updateContribution(id, { status, notes: notes || undefined });
      toast.success(`Contribution ${status}`);
      onRefresh();
    } catch { toast.error('Failed to update'); }
  };

  const statusColor = (s: string) =>
    s === 'verified' ? 'bg-green-100 text-green-700' : s === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';

  const pending = contribs.filter((c) => c.status === 'pending');
  const rest = contribs.filter((c) => c.status !== 'pending');

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" /> Pending Review ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((c) => (
              <div key={c.id} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                <Award className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm text-gray-800">{c.first_name} {c.last_name}</span>
                    <span className="text-xs text-gray-500">· {c.email}</span>
                  </div>
                  <p className="text-sm text-gray-700"><strong>{c.type}:</strong> {c.description}</p>
                  {c.estimated_value && <p className="text-xs text-gray-500 mt-0.5">Est. value: ₵{c.estimated_value}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(c.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => handleUpdate(c.id, 'verified')} className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg" title="Verify">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleUpdate(c.id, 'rejected')} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg" title="Reject">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold text-gray-900">All Contributions ({contribs.length})</h3>
          {contribs.length > 0 && (
            <button
              onClick={() => exportCSV(
                `contributions-${new Date().toISOString().slice(0,10)}.csv`,
                ['Date', 'Name', 'Email', 'Type', 'Description', 'Est. Value (₵)', 'Status', 'Notes'],
                contribs.map((c) => [
                  new Date(c.created_at).toLocaleDateString('en-GB'),
                  `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
                  c.email ?? '',
                  c.type,
                  c.description,
                  c.estimated_value ?? '',
                  c.status,
                  c.notes ?? '',
                ])
              )}
              className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          )}
        </div>
        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : contribs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No contributions submitted yet.</p>
        ) : (
          <div className="space-y-2">
            {rest.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">{c.first_name} {c.last_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(c.status)}`}>{c.status}</span>
                    <span className="text-xs text-gray-500">{c.type}</span>
                  </div>
                  <p className="text-xs text-gray-600 truncate mt-0.5">{c.description}</p>
                  {c.notes && <p className="text-xs text-gray-400 italic">Note: {c.notes}</p>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{new Date(c.created_at).toLocaleDateString('en-GB')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Jobs Admin Tab ───────────────────────────────────────────────────────────

function JobsAdminTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-jobs', statusFilter],
    queryFn: () => jobsApi.adminAll({ status: statusFilter || undefined }),
  });

  const jobs = (data?.jobs ?? []) as JobPosting[];

  const handleApprove = async (id: string) => {
    try {
      await jobsApi.approve(id);
      toast.success('Job approved and published');
      queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async (id: string) => {
    try {
      await jobsApi.reject(id);
      toast.success('Job rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
    } catch { toast.error('Failed to reject'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job posting permanently?')) return;
    try {
      await jobsApi.delete(id);
      toast.success('Job deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
    } catch { toast.error('Failed to delete'); }
  };

  const statusColor = (s: string) =>
    s === 'approved' ? 'bg-green-100 text-green-700'
    : s === 'rejected' ? 'bg-red-100 text-red-700'
    : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-gray-900">Job Postings</h3>
        <div className="flex gap-1">
          {(['pending', 'approved', 'rejected', ''] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                statusFilter === s ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : jobs.length === 0 ? (
        <div className="card p-8 text-center">
          <Briefcase className="h-10 w-10 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400">{statusFilter ? `No ${statusFilter} jobs.` : 'No job postings found.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-gray-900 text-sm">{job.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {job.company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{job.company}</span>}
                    {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                    <span>{job.type}</span>
                    {job.expires_at && <span>Deadline: {new Date(job.expires_at).toLocaleDateString('en-GB')}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Posted by {job.poster_first_name ? `${job.poster_first_name} ${job.poster_last_name ?? ''}` : (job as unknown as Record<string,string>).poster_email ?? 'alumni'}
                    {' · '}
                    {new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{job.description}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                  {job.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(job.id)} className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors" title="Approve">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleReject(job.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Reject">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {job.status === 'rejected' && (
                    <button onClick={() => handleApprove(job.id)} className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors" title="Approve anyway">
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  {job.status === 'approved' && (
                    <button onClick={() => handleReject(job.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Revoke approval">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(job.id)} className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Delete permanently">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type SettingSection = 'portal' | 'email' | 'birthday' | 'admins';

function SettingsTab({ settings, onRefresh }: { settings: Record<string, unknown>; onRefresh: () => void }) {
  const [section, setSection] = useState<SettingSection>('portal');

  const navItems: { id: SettingSection; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'portal',   label: 'Portal',        icon: Settings, desc: 'Name & logo' },
    { id: 'email',    label: 'Email (SMTP)',   icon: Mail,     desc: 'Mail server config' },
    { id: 'birthday', label: 'Birthday Email', icon: Cake,     desc: 'Template & schedule' },
    { id: 'admins',   label: 'Administrators', icon: Shield,   desc: 'Manage admin access' },
  ];

  return (
    <div className="flex gap-6 items-start">
      {/* Sidebar */}
      <nav className="w-52 flex-shrink-0 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors group ${
              section === item.id
                ? 'bg-blue-700 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <item.icon className={`h-4 w-4 flex-shrink-0 ${section === item.id ? 'text-blue-200' : 'text-gray-400 group-hover:text-blue-600'}`} />
            <div className="min-w-0">
              <div className={`text-sm font-medium truncate ${section === item.id ? 'text-white' : 'text-gray-800'}`}>{item.label}</div>
              <div className={`text-xs truncate ${section === item.id ? 'text-blue-200' : 'text-gray-400'}`}>{item.desc}</div>
            </div>
            {section !== item.id && <ChevronRight className="h-3.5 w-3.5 ml-auto text-gray-300 group-hover:text-blue-400 flex-shrink-0" />}
          </button>
        ))}
      </nav>

      {/* Content panel */}
      <div className="flex-1 min-w-0">
        {section === 'portal'   && <PortalSection   settings={settings} onRefresh={onRefresh} />}
        {section === 'email'    && <SmtpSection />}
        {section === 'birthday' && <BirthdaySection />}
        {section === 'admins'   && <AdminsSection />}
      </div>
    </div>
  );
}

// ── Portal section ──────────────────────────────────────────────────────────

function PortalSection({ settings, onRefresh }: { settings: Record<string, unknown>; onRefresh: () => void }) {
  const [schoolName, setSchoolName] = useState((settings?.school_name as string) ?? '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('school_name', schoolName);
      if (logoFile) fd.append('logo', logoFile);
      await adminApi.updateSettings(fd);
      toast.success('Portal settings saved');
      onRefresh();
    } catch { toast.error('Failed to save portal settings'); }
    finally { setSaving(false); }
  };

  return (
    <div className="card p-6">
      <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
        <Settings className="h-4 w-4 text-blue-600" /> Portal Settings
      </h2>
      <p className="text-xs text-gray-400 mb-5">School name and branding displayed across the portal.</p>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="label" htmlFor="school_name">School Name</label>
          <input id="school_name" className="input" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
        </div>
        <div>
          <label className="label">School Logo</label>
          {!!(settings?.logo_url) && (
            <img src={settings.logo_url as string} alt="Logo" className="h-16 mb-2 object-contain" />
          )}
          <input type="file" accept="image/*" className="input" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Portal Settings'}
        </button>
      </form>
    </div>
  );
}

// ── SMTP section ────────────────────────────────────────────────────────────

function SmtpSection() {
  const { data: smtpData, isLoading, refetch } = useQuery({ queryKey: ['admin-smtp'], queryFn: adminApi.getSmtp });
  const smtp = smtpData as Record<string, unknown> | undefined;
  const [form, setForm] = useState({ smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '', smtp_secure: false });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (smtp) setForm({
      smtp_host:   (smtp.smtp_host   as string) || '',
      smtp_port:   String(smtp.smtp_port || 587),
      smtp_user:   (smtp.smtp_user   as string) || '',
      smtp_pass:   (smtp.smtp_pass   as string) || '',
      smtp_from:   (smtp.smtp_from   as string) || '',
      smtp_secure: !!(smtp.smtp_secure),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smtpData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateSmtp({ ...form, smtp_port: parseInt(form.smtp_port) || 587 });
      toast.success('SMTP settings saved');
      refetch();
    } catch { toast.error('Failed to save SMTP settings'); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await adminApi.testSmtp();
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed — check your SMTP settings');
    } finally { setTesting(false); }
  };

  const SF = ({ label, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) => (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="input" {...props} />
    </div>
  );

  return (
    <div className="card p-6">
      <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
        <Mail className="h-4 w-4 text-blue-600" /> Email (SMTP) Settings
      </h2>
      <p className="text-xs text-gray-400 mb-3">
        Configure the outgoing mail server. Overrides the server's <code className="bg-gray-100 px-1 rounded">.env</code> file.
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm">
        <p className="font-semibold text-amber-800 mb-1">Using Gmail?</p>
        <p className="text-amber-700 text-xs leading-relaxed">
          Gmail requires an <strong>App Password</strong>. Go to <strong>Google Account → Security → 2-Step Verification → App Passwords</strong> and create one for "Mail".
        </p>
      </div>
      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <SF label="SMTP Host" id="smtp_host" placeholder="smtp.gmail.com"
                value={form.smtp_host} onChange={(e) => setForm((f) => ({ ...f, smtp_host: e.target.value }))} />
            <SF label="Port" id="smtp_port" type="number" placeholder="587"
                value={form.smtp_port} onChange={(e) => setForm((f) => ({ ...f, smtp_port: e.target.value }))} />
          </div>
          <SF label="Username (email)" id="smtp_user" type="email" placeholder="you@gmail.com"
              value={form.smtp_user} onChange={(e) => setForm((f) => ({ ...f, smtp_user: e.target.value }))} />
          <div>
            <label className="label" htmlFor="smtp_pass">
              Password / App Password
              {smtp?.smtp_pass === '••••••••' && <span className="ml-2 text-xs text-green-600 font-normal">✓ Configured</span>}
            </label>
            <div className="relative">
              <input id="smtp_pass" className="input pr-10"
                     type={showPass ? 'text' : 'password'}
                     placeholder={smtp?.smtp_pass === '••••••••' ? '••••••••' : 'Enter App Password'}
                     value={form.smtp_pass}
                     onChange={(e) => setForm((f) => ({ ...f, smtp_pass: e.target.value }))} />
              <button type="button" onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <SF label="From Name / Email (optional)" id="smtp_from" placeholder='AlumniPad <you@gmail.com>'
              value={form.smtp_from} onChange={(e) => setForm((f) => ({ ...f, smtp_from: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600"
                   checked={form.smtp_secure}
                   onChange={(e) => setForm((f) => ({ ...f, smtp_secure: e.target.checked }))} />
            <span className="text-gray-700">Use SSL/TLS (enable for port 465)</span>
          </label>
          <div className="flex gap-3 flex-wrap">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save SMTP Settings'}
            </button>
            <button type="button" onClick={handleTest} disabled={testing} className="btn-secondary flex items-center gap-2">
              {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {testing ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Birthday section ────────────────────────────────────────────────────────

function BirthdaySection() {
  const { data: tplData, isLoading, refetch } = useQuery({ queryKey: ['admin-birthday-template'], queryFn: adminApi.getBirthdayTemplate });
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (tplData) { setSubject(tplData.subject || ''); setBody(tplData.body || ''); }
  }, [tplData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateBirthdayTemplate({ subject, body });
      toast.success('Birthday template saved');
      refetch();
    } catch { toast.error('Failed to save template'); }
    finally { setSaving(false); }
  };

  return (
    <div className="card p-6">
      <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
        <Cake className="h-4 w-4 text-pink-500" /> Birthday Email Template
      </h2>
      <p className="text-xs text-gray-400 mb-3">
        Sent automatically to alumni on their birthday at 8:00 AM.
      </p>
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 text-sm">
        <p className="font-semibold text-blue-800 mb-1.5 text-xs">Available variables</p>
        <div className="flex flex-wrap gap-2">
          {['{{first_name}}', '{{last_name}}', '{{school_name}}', '{{year}}', '{{app_url}}'].map((v) => (
            <code key={v} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono">{v}</code>
          ))}
        </div>
      </div>
      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Email Subject</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} required
                   placeholder="Happy Birthday, {{first_name}}! 🎂" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Email Body (HTML)</label>
              <button type="button" onClick={() => setShowPreview((v) => !v)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Eye className="h-3 w-3" /> {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
            </div>
            <textarea className="input font-mono text-xs leading-relaxed" rows={14}
                      value={body} onChange={(e) => setBody(e.target.value)} required
                      placeholder="<div>...</div>" />
            {showPreview && (
              <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 text-xs text-gray-500 font-medium">
                  Preview (variables shown as-is)
                </div>
                <div className="p-4 max-h-80 overflow-y-auto" dangerouslySetInnerHTML={{ __html: body }} />
              </div>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Template'}
            </button>
            <button type="button" onClick={() => { if (tplData) { setSubject(tplData.subject); setBody(tplData.body); } }}
                    className="btn-secondary flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Reload Saved
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Admins section ──────────────────────────────────────────────────────────

function AdminsSection() {
  const queryClient = useQueryClient();
  const { data: adminsData, isLoading } = useQuery({ queryKey: ['admin-admins'], queryFn: adminApi.getAdmins });
  const admins = (adminsData ?? []) as Record<string, unknown>[];
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([]);
  const [searching, setSearching] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const handleSearch = async (q: string) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await adminApi.alumniLookup(q);
      // Exclude already-admin accounts
      const adminIds = new Set(admins.map((a) => a.id));
      setSearchResults(results.filter((r) => !adminIds.has(r.id)));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handlePromote = async (userId: string, name: string) => {
    if (!confirm(`Promote ${name} to administrator? They will have full admin access.`)) return;
    setActing(userId);
    try {
      await adminApi.promote(userId);
      toast.success(`${name} is now an administrator`);
      setSearchQ('');
      setSearchResults([]);
      queryClient.invalidateQueries({ queryKey: ['admin-admins'] });
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to promote'); }
    finally { setActing(null); }
  };

  const handleDemote = async (userId: string, name: string) => {
    if (!confirm(`Remove admin access for ${name}? They will revert to a regular alumni account.`)) return;
    setActing(userId);
    try {
      await adminApi.demote(userId);
      toast.success(`${name}'s admin access has been removed`);
      queryClient.invalidateQueries({ queryKey: ['admin-admins'] });
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to demote'); }
    finally { setActing(null); }
  };

  return (
    <div className="space-y-5">
      {/* Current admins */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-600" /> Administrators
        </h2>
        <p className="text-xs text-gray-400 mb-5">Alumni with admin access to this dashboard.</p>
        {isLoading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : admins.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No admins found.</p>
        ) : (
          <div className="space-y-2">
            {admins.map((a) => {
              const name = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || (a.email as string);
              const isProcessing = acting === (a.id as string);
              return (
                <div key={a.id as string} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  {a.profile_photo_url ? (
                    <img src={getPhotoUrl(a.profile_photo_url as string)} className="h-9 w-9 rounded-full object-cover flex-shrink-0" alt="" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {getInitials(a.first_name as string, a.last_name as string | undefined)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-500 truncate">{a.email as string}{a.graduation_year ? ` · Class of ${a.graduation_year}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Admin
                    </span>
                    {!(a.is_self as boolean) && (
                      <button
                        onClick={() => handleDemote(a.id as string, name)}
                        disabled={isProcessing}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove admin access"
                      >
                        {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                      </button>
                    )}
                    {(a.is_self as boolean) && (
                      <span className="text-xs text-gray-400 italic">You</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Promote alumni */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-green-600" /> Grant Admin Access
        </h2>
        <p className="text-xs text-gray-400 mb-4">Search for an approved alumni to promote to administrator.</p>
        <div className="relative">
          <input
            className="input"
            placeholder="Search by name, alumni code, or email…"
            value={searchQ}
            onChange={(e) => handleSearch(e.target.value)}
            autoComplete="off"
          />
          {searching && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
          {searchResults.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {searchResults.map((a) => {
                const name = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim();
                const isProcessing = acting === (a.id as string);
                return (
                  <div key={a.id as string} className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{name}</p>
                      <p className="text-xs text-gray-500">{a.alumni_code as string} · {a.email as string}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePromote(a.id as string, name)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white text-xs font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
                    >
                      {isProcessing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                      Make Admin
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {searchQ.length >= 2 && !searching && searchResults.length === 0 && (
            <p className="text-xs text-gray-400 mt-2">No non-admin alumni found for "{searchQ}".</p>
          )}
        </div>
      </div>
    </div>
  );
}
