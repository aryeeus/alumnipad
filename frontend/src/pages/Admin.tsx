import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Clock, Images, BookOpen, Calendar, Check, X, Plus,
  Trash2, Settings, BarChart3, ShoppingBag, Cake, Mail, Eye, EyeOff,
  Send, RefreshCw
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { type AlumniProfile, type AdminStats, type Activity, type Advertisement, type BirthdayAlumni } from '@/types';
import { getInitials, getPhotoUrl } from '@/lib/auth';
import { toast } from 'sonner';

type Tab = 'overview' | 'approvals' | 'activities' | 'ads' | 'settings';

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

function SettingsTab({ settings, onRefresh }: { settings: Record<string, unknown>; onRefresh: () => void }) {
  // ── Portal settings ──
  const [schoolName, setSchoolName] = useState((settings?.school_name as string) ?? '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savingPortal, setSavingPortal] = useState(false);

  // ── SMTP settings ──
  const { data: smtpData, isLoading: smtpLoading, refetch: refetchSmtp } = useQuery({
    queryKey: ['admin-smtp'],
    queryFn: adminApi.getSmtp,
  });
  const smtp = smtpData as Record<string, unknown> | undefined;
  const [smtpForm, setSmtpForm] = useState({ smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '', smtp_secure: false });
  const [showPass, setShowPass] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

  // Sync SMTP form when data loads
  useState(() => {
    if (smtp) setSmtpForm({
      smtp_host:   (smtp.smtp_host   as string) || '',
      smtp_port:   String(smtp.smtp_port || 587),
      smtp_user:   (smtp.smtp_user   as string) || '',
      smtp_pass:   (smtp.smtp_pass   as string) || '',
      smtp_from:   (smtp.smtp_from   as string) || '',
      smtp_secure: !!(smtp.smtp_secure),
    });
  });

  // ── Birthday template ──
  const { data: tplData, isLoading: tplLoading, refetch: refetchTpl } = useQuery({
    queryKey: ['admin-birthday-template'],
    queryFn: adminApi.getBirthdayTemplate,
  });
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [savingTpl, setSavingTpl] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useState(() => {
    if (tplData) {
      setTplSubject(tplData.subject || '');
      setTplBody(tplData.body || '');
    }
  });

  // Handlers
  const handlePortalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPortal(true);
    try {
      const fd = new FormData();
      fd.append('school_name', schoolName);
      if (logoFile) fd.append('logo', logoFile);
      await adminApi.updateSettings(fd);
      toast.success('Portal settings saved');
      onRefresh();
    } catch { toast.error('Failed to save portal settings'); }
    finally { setSavingPortal(false); }
  };

  const handleSmtpSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    try {
      await adminApi.updateSmtp({ ...smtpForm, smtp_port: parseInt(smtpForm.smtp_port) || 587 });
      toast.success('SMTP settings saved');
      refetchSmtp();
    } catch { toast.error('Failed to save SMTP settings'); }
    finally { setSavingSmtp(false); }
  };

  const handleSmtpTest = async () => {
    setTestingSmtp(true);
    try {
      const res = await adminApi.testSmtp();
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed — check your SMTP settings');
    } finally { setTestingSmtp(false); }
  };

  const handleTplSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTpl(true);
    try {
      await adminApi.updateBirthdayTemplate({ subject: tplSubject, body: tplBody });
      toast.success('Birthday template saved');
      refetchTpl();
    } catch { toast.error('Failed to save template'); }
    finally { setSavingTpl(false); }
  };

  const handleTplReset = () => {
    if (tplData) { setTplSubject(tplData.subject); setTplBody(tplData.body); }
  };

  // Merge loaded smtp into form (runs once when data arrives)
  if (smtp && !smtpForm.smtp_host && smtp.smtp_host) {
    setSmtpForm({
      smtp_host:   (smtp.smtp_host   as string) || '',
      smtp_port:   String(smtp.smtp_port || 587),
      smtp_user:   (smtp.smtp_user   as string) || '',
      smtp_pass:   (smtp.smtp_pass   as string) || '',
      smtp_from:   (smtp.smtp_from   as string) || '',
      smtp_secure: !!(smtp.smtp_secure),
    });
  }
  if (tplData && !tplSubject && tplData.subject) {
    setTplSubject(tplData.subject);
    setTplBody(tplData.body);
  }

  const SF = ({ label, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) => (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="input" {...props} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Portal Settings ── */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Settings className="h-4 w-4 text-blue-600" /> Portal Settings
        </h2>
        <p className="text-xs text-gray-400 mb-4">School name and branding shown across the portal.</p>
        <form onSubmit={handlePortalSave} className="space-y-4">
          <SF label="School Name" id="school_name" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
          <div>
            <label className="label">School Logo</label>
            {!!(settings?.logo_url) && (
              <img src={settings.logo_url as string} alt="Logo" className="h-16 mb-2 object-contain" />
            )}
            <input type="file" accept="image/*" className="input" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
          </div>
          <button type="submit" disabled={savingPortal} className="btn-primary">
            {savingPortal ? 'Saving...' : 'Save Portal Settings'}
          </button>
        </form>
      </div>

      {/* ── SMTP / Email Settings ── */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Mail className="h-4 w-4 text-blue-600" /> Email (SMTP) Settings
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          Configure the outgoing mail server for approval and birthday emails.
          These settings override anything set in the server's <code className="bg-gray-100 px-1 rounded">.env</code> file.
        </p>

        {/* Gmail App Password notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm">
          <p className="font-semibold text-amber-800 mb-1">📧 Using a Gmail account?</p>
          <p className="text-amber-700 leading-relaxed">
            Gmail requires an <strong>App Password</strong> — your regular password will not work.
            Go to <strong>Google Account → Security → 2-Step Verification → App Passwords</strong>,
            create a new app password for "Mail", and paste it in the Password field below.
          </p>
        </div>

        {smtpLoading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <form onSubmit={handleSmtpSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <SF label="SMTP Host" id="smtp_host" placeholder="smtp.gmail.com"
                  value={smtpForm.smtp_host} onChange={(e) => setSmtpForm((f) => ({ ...f, smtp_host: e.target.value }))} />
              <SF label="Port" id="smtp_port" type="number" placeholder="587"
                  value={smtpForm.smtp_port} onChange={(e) => setSmtpForm((f) => ({ ...f, smtp_port: e.target.value }))} />
            </div>
            <SF label="Username (your email)" id="smtp_user" type="email" placeholder="you@gmail.com"
                value={smtpForm.smtp_user} onChange={(e) => setSmtpForm((f) => ({ ...f, smtp_user: e.target.value }))} />
            <div>
              <label className="label" htmlFor="smtp_pass">
                Password / App Password
                {smtp?.smtp_pass === '••••••••' && <span className="ml-2 text-xs text-green-600 font-normal">✓ Configured — enter a new value to change</span>}
              </label>
              <div className="relative">
                <input id="smtp_pass" className="input pr-10"
                       type={showPass ? 'text' : 'password'}
                       placeholder={smtp?.smtp_pass === '••••••••' ? '••••••••' : 'Enter App Password'}
                       value={smtpForm.smtp_pass}
                       onChange={(e) => setSmtpForm((f) => ({ ...f, smtp_pass: e.target.value }))} />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <SF label="From Name / Email (optional)" id="smtp_from" placeholder='AlumniPad <you@gmail.com>'
                value={smtpForm.smtp_from} onChange={(e) => setSmtpForm((f) => ({ ...f, smtp_from: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600"
                     checked={smtpForm.smtp_secure}
                     onChange={(e) => setSmtpForm((f) => ({ ...f, smtp_secure: e.target.checked }))} />
              <span className="text-gray-700">Use SSL/TLS (enable for port 465)</span>
            </label>
            <div className="flex gap-3 flex-wrap">
              <button type="submit" disabled={savingSmtp} className="btn-primary">
                {savingSmtp ? 'Saving...' : 'Save SMTP Settings'}
              </button>
              <button type="button" onClick={handleSmtpTest} disabled={testingSmtp}
                      className="btn-secondary flex items-center gap-2">
                {testingSmtp ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {testingSmtp ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Birthday Email Template ── */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Cake className="h-4 w-4 text-pink-500" /> Birthday Email Template
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          Customise the email sent automatically to alumni on their birthday at 8:00 AM.
        </p>

        {/* Variable reference */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4 text-sm">
          <p className="font-semibold text-blue-800 mb-1.5">Available template variables</p>
          <div className="flex flex-wrap gap-2">
            {['{{first_name}}', '{{last_name}}', '{{school_name}}', '{{year}}', '{{app_url}}'].map((v) => (
              <code key={v} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono">{v}</code>
            ))}
          </div>
          <p className="text-blue-600 text-xs mt-2">These are replaced with real values when the email is sent.</p>
        </div>

        {tplLoading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <form onSubmit={handleTplSave} className="space-y-4">
            <div>
              <label className="label">Email Subject</label>
              <input className="input" value={tplSubject}
                     onChange={(e) => setTplSubject(e.target.value)} required
                     placeholder="Happy Birthday, {{first_name}}! 🎂" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Email Body (HTML)</label>
                <button type="button" onClick={() => setShowPreview((v) => !v)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
              <textarea
                className="input font-mono text-xs leading-relaxed"
                rows={14}
                value={tplBody}
                onChange={(e) => setTplBody(e.target.value)}
                required
                placeholder="<div>...</div>"
              />
              {showPreview && (
                <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 text-xs text-gray-500 font-medium">
                    Preview (variables shown as-is)
                  </div>
                  <div className="p-4 max-h-80 overflow-y-auto"
                       dangerouslySetInnerHTML={{ __html: tplBody }} />
                </div>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              <button type="submit" disabled={savingTpl} className="btn-primary">
                {savingTpl ? 'Saving...' : 'Save Template'}
              </button>
              <button type="button" onClick={handleTplReset} className="btn-secondary flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Reload Saved
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
