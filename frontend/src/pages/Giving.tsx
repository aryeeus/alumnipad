import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Heart, CheckCircle2, AlertCircle, CreditCard, Smartphone,
  Clock, Plus, FileText, Award, TrendingUp, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentsApi, campaignsApi, publicApi } from '@/lib/api';
import { getStoredUser, getPhotoUrl } from '@/lib/auth';
import type { DonationCampaign, NonFinancialContribution } from '@/types';

declare global {
  interface Window {
    PaystackPop: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        channels?: string[];
        label?: string;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

async function loadPaystack(): Promise<void> {
  if (window.PaystackPop) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack script'));
    document.body.appendChild(script);
  });
}

const CONTRIBUTION_TYPES = [
  'Time / Volunteering',
  'Books & Educational Materials',
  'Equipment / Tools',
  'Food / Refreshments',
  'Sponsorship In-Kind',
  'Skills / Professional Services',
  'Other',
];

const GHS = (n: number | string) =>
  `₵${parseFloat(String(n)).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Tab = 'dues' | 'campaigns' | 'contributions';

export default function Giving() {
  const [activeTab, setActiveTab] = useState<Tab>('dues');
  const user = getStoredUser();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({ queryKey: ['public-settings'], queryFn: publicApi.settings, staleTime: 300_000 });
  const { data: duesStatus, isLoading: duesLoading } = useQuery({
    queryKey: ['dues-status'],
    queryFn: paymentsApi.duesStatus,
    enabled: activeTab === 'dues',
  });
  const { data: history } = useQuery({
    queryKey: ['payment-history'],
    queryFn: paymentsApi.history,
    enabled: activeTab === 'dues',
  });
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignsApi.list,
    enabled: activeTab === 'campaigns',
  });
  const { data: contributions, isLoading: contribLoading } = useQuery({
    queryKey: ['my-contributions'],
    queryFn: paymentsApi.myContributions,
    enabled: activeTab === 'contributions',
  });

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dues', label: 'Annual Dues', icon: CreditCard },
    { id: 'campaigns', label: 'Donation Campaigns', icon: Heart },
    { id: 'contributions', label: 'Non-Financial', icon: Award },
  ];

  return (
    <div className="page-bg min-h-screen">
      {/* Header */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-yellow-400" />
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Give Back</h1>
              <p className="text-blue-200 text-sm">
                Support the {settings?.school_name ?? 'alumni'} community through dues, donations, and contributions
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dues' && (
          <DuesTab
            duesStatus={duesStatus}
            history={history as unknown[]}
            loading={duesLoading}
            user={user}
            onPaymentSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['dues-status'] });
              queryClient.invalidateQueries({ queryKey: ['payment-history'] });
            }}
          />
        )}
        {activeTab === 'campaigns' && (
          <CampaignsTab campaigns={campaigns} loading={campaignsLoading} user={user}
            onDonateSuccess={() => queryClient.invalidateQueries({ queryKey: ['campaigns'] })} />
        )}
        {activeTab === 'contributions' && (
          <ContributionsTab contributions={contributions} loading={contribLoading}
            onSubmitSuccess={() => queryClient.invalidateQueries({ queryKey: ['my-contributions'] })} />
        )}
      </div>
    </div>
  );
}

// ─── Dues Tab ────────────────────────────────────────────────────────────────

function DuesTab({ duesStatus, history, loading, user, onPaymentSuccess }: {
  duesStatus: import('@/types').DuesStatus | undefined;
  history: unknown[];
  loading: boolean;
  user: { email: string } | null;
  onPaymentSuccess: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const currentYear = new Date().getFullYear();

  const handlePayDues = async () => {
    if (!duesStatus?.config) return toast.error('Dues not configured yet — contact the administrator.');
    if (!user) return toast.error('Please log in to pay dues.');

    setPaying(true);
    try {
      // 1. Backend creates Paystack transaction (validates secret key)
      const { reference } = await paymentsApi.initialize({
        type: 'dues',
        amount: duesStatus.config.amount,
        currency: duesStatus.config.currency || 'GHS',
        dues_year: currentYear,
      });

      // 2. Load Paystack popup script
      await loadPaystack();

      const pubKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!pubKey) {
        setPaying(false);
        return toast.error('VITE_PAYSTACK_PUBLIC_KEY is not set in frontend .env — restart the dev server after adding it.');
      }

      // 3. Open Paystack popup
      window.PaystackPop.setup({
        key: pubKey,
        email: user.email,
        amount: Math.round(duesStatus.config.amount * 100),
        currency: duesStatus.config.currency || 'GHS',
        ref: reference,
        channels: ['card', 'mobile_money'],
        label: `Annual Dues ${currentYear}`,
        onClose: () => {
          paymentsApi.cancelPayment(reference).catch(() => {});
          setPaying(false);
          toast.info('Payment cancelled.');
        },
        callback: (response: { reference: string }) => {
          paymentsApi.verify(response.reference)
            .then(() => { toast.success('Dues paid successfully! Thank you.'); onPaymentSuccess(); })
            .catch(() => { toast.error('Payment made but verification failed — contact admin with ref: ' + response.reference); })
            .finally(() => setPaying(false));
        },
      }).openIframe();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to initiate payment');
      setPaying(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Loading dues status…</div>;

  const paid = duesStatus?.paid;
  const config = duesStatus?.config;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {!config ? (
        <div className="card p-6 border-l-4 border-yellow-400">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Dues Not Configured</p>
              <p className="text-sm text-gray-500 mt-1">
                The administrator has not set up dues for {currentYear} yet. Check back later.
              </p>
            </div>
          </div>
        </div>
      ) : paid ? (
        <div className="card p-6 border-l-4 border-green-500" style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-green-800 text-lg">Dues Paid ✓</p>
                <p className="text-green-700 text-sm">
                  You have paid your {currentYear} dues of <strong>{GHS(config.amount)}</strong>. Thank you!
                </p>
              </div>
            </div>
            <span className="px-4 py-1.5 bg-green-500 text-white text-sm font-bold rounded-full">
              {currentYear} — Settled
            </span>
          </div>
        </div>
      ) : (
        <div className="card p-6 border-l-4 border-blue-500" style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-8 w-8 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-900 text-lg">Dues Unpaid</p>
                <p className="text-blue-700 text-sm">
                  Annual dues for {currentYear}: <strong>{GHS(config.amount)}</strong>
                  {config.due_date && ` — Due by ${new Date(config.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                </p>
                {config.description && <p className="text-blue-600 text-xs mt-1">{config.description}</p>}
              </div>
            </div>
            <button
              onClick={handlePayDues}
              disabled={paying}
              className="btn-primary flex items-center gap-2 min-w-[140px] justify-center"
            >
              {paying ? (
                <><Clock className="h-4 w-4 animate-spin" /> Processing…</>
              ) : (
                <><CreditCard className="h-4 w-4" /> Pay Now</>
              )}
            </button>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-blue-600">
            <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Visa / Mastercard</span>
            <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> MTN MoMo</span>
            <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> AirtelTigo</span>
            <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> Telecel Cash</span>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" /> Payment History
        </h2>
        {!history || history.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-500 font-medium pb-2">Date</th>
                  <th className="text-left text-xs text-gray-500 font-medium pb-2">Type</th>
                  <th className="text-left text-xs text-gray-500 font-medium pb-2">Amount</th>
                  <th className="text-left text-xs text-gray-500 font-medium pb-2">Method</th>
                  <th className="text-left text-xs text-gray-500 font-medium pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(history as import('@/types').Payment[]).map((p) => (
                  <tr key={p.id} className="py-2">
                    <td className="py-2 text-gray-600">{new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="py-2 text-gray-800 capitalize">
                      {p.type === 'dues' ? `Dues ${p.dues_year ?? ''}` : p.campaign_title || 'Donation'}
                    </td>
                    <td className="py-2 font-semibold text-gray-900">{GHS(p.amount)}</td>
                    <td className="py-2 text-gray-600 capitalize">{p.payment_method?.replace('_', ' ') || '—'}</td>
                    <td className="py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'success' ? 'bg-green-100 text-green-700'
                        : p.status === 'failed' ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Campaigns Tab ───────────────────────────────────────────────────────────

function CampaignsTab({ campaigns, loading, user, onDonateSuccess }: {
  campaigns: DonationCampaign[] | undefined;
  loading: boolean;
  user: { email: string } | null;
  onDonateSuccess: () => void;
}) {
  const [donatingId, setDonatingId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const inputRef = useRef<Record<string, HTMLInputElement | null>>({});

  const handleDonate = async (campaign: DonationCampaign) => {
    const amount = parseFloat(amounts[campaign.id] || '0');
    if (!amount || amount < 1) return toast.error('Enter an amount of at least ₵1.00');
    if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) return toast.error('Payment gateway not configured.');
    if (!user) return toast.error('Please log in to donate.');

    setDonatingId(campaign.id);
    try {
      const { reference } = await paymentsApi.initialize({ type: 'donation', amount, campaign_id: campaign.id });
      await loadPaystack();

      const pubKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!pubKey) {
        setDonatingId(null);
        return toast.error('VITE_PAYSTACK_PUBLIC_KEY missing in frontend .env — restart dev server after adding it.');
      }

      window.PaystackPop.setup({
        key: pubKey,
        email: user.email,
        amount: Math.round(amount * 100),
        currency: 'GHS',
        ref: reference,
        channels: ['card', 'mobile_money'],
        label: `Donation: ${campaign.title}`,
        onClose: () => {
          paymentsApi.cancelPayment(reference).catch(() => {});
          setDonatingId(null);
          toast.info('Donation cancelled.');
        },
        callback: (response: { reference: string }) => {
          paymentsApi.verify(response.reference)
            .then(() => { toast.success('Thank you for your donation!'); setAmounts((a) => ({ ...a, [campaign.id]: '' })); onDonateSuccess(); })
            .catch(() => { toast.error('Payment made but verification failed — contact admin with: ' + response.reference); })
            .finally(() => setDonatingId(null));
        },
      }).openIframe();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to initiate donation');
      setDonatingId(null);
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Loading campaigns…</div>;

  if (!campaigns?.length) {
    return (
      <div className="card p-12 text-center">
        <Heart className="h-12 w-12 text-red-200 mx-auto mb-3" />
        <p className="text-gray-500">No active campaigns at this time.</p>
        <p className="text-gray-400 text-sm mt-1">Check back later for fundraising campaigns from the association.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {campaigns.map((campaign) => {
        const progress = campaign.goal_amount
          ? Math.min((campaign.raised_amount / campaign.goal_amount) * 100, 100)
          : null;
        const isExpired = campaign.end_date && new Date(campaign.end_date) < new Date();

        return (
          <div key={campaign.id} className="card overflow-hidden flex flex-col">
            {campaign.image_url ? (
              <img src={getPhotoUrl(campaign.image_url)} alt={campaign.title} className="w-full h-48 object-cover" />
            ) : (
              <div className="w-full h-48 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1a2744,#1e40af)' }}>
                <Heart className="h-16 w-16 text-white/30" />
              </div>
            )}
            <div className="p-5 flex flex-col flex-1">
              <h3 className="font-bold text-gray-900 text-lg mb-1">{campaign.title}</h3>
              {campaign.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{campaign.description}</p>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  <strong className="text-gray-800">{GHS(campaign.raised_amount)}</strong> raised
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                  {campaign.donor_count} donor{campaign.donor_count !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Progress bar */}
              {progress !== null && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{Math.round(progress)}% of {GHS(campaign.goal_amount!)}</span>
                    <span>{GHS(Math.max(0, (campaign.goal_amount ?? 0) - campaign.raised_amount))} remaining</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#1e40af,#dc2626)' }}
                    />
                  </div>
                </div>
              )}

              {campaign.end_date && (
                <p className="text-xs text-gray-400 mb-3">
                  {isExpired ? '⏰ Campaign ended' : `⏰ Ends ${new Date(campaign.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                </p>
              )}

              {/* Donate input + button */}
              {!isExpired && (
                <div className="mt-auto flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">₵</span>
                    <input
                      ref={(el) => { inputRef.current[campaign.id] = el; }}
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="Amount"
                      className="input pl-12 w-full"
                      value={amounts[campaign.id] || ''}
                      onChange={(e) => setAmounts((a) => ({ ...a, [campaign.id]: e.target.value }))}
                    />
                  </div>
                  <button
                    onClick={() => handleDonate(campaign)}
                    disabled={donatingId === campaign.id}
                    className="btn-primary flex items-center gap-2 whitespace-nowrap"
                  >
                    {donatingId === campaign.id ? (
                      <Clock className="h-4 w-4 animate-spin" />
                    ) : (
                      <Heart className="h-4 w-4" />
                    )}
                    Donate
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Contributions Tab ───────────────────────────────────────────────────────

function ContributionsTab({ contributions, loading, onSubmitSuccess }: {
  contributions: NonFinancialContribution[] | undefined;
  loading: boolean;
  onSubmitSuccess: () => void;
}) {
  const [form, setForm] = useState({ type: '', description: '', estimated_value: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type || !form.description) return toast.error('Type and description required');
    setSubmitting(true);
    try {
      await paymentsApi.submitContribution({
        type: form.type,
        description: form.description,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : undefined,
      });
      toast.success('Contribution submitted for review! Thank you.');
      setForm({ type: '', description: '', estimated_value: '' });
      setShowForm(false);
      onSubmitSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s: string) =>
    s === 'verified' ? 'bg-green-100 text-green-700'
    : s === 'rejected' ? 'bg-red-100 text-red-700'
    : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="space-y-6">
      {/* Info card */}
      <div className="card p-5 border-l-4 border-blue-400" style={{ background: '#eff6ff' }}>
        <div className="flex items-start gap-3">
          <Award className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">Non-Financial Contributions</p>
            <p className="text-sm text-blue-700 mt-1">
              You can support the community beyond money — volunteer your time, donate books, equipment, food,
              or offer professional services. Submit your contribution below and it will be reviewed by the admin.
            </p>
          </div>
        </div>
      </div>

      {/* Submit form */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Submit a Contribution</h2>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="h-4 w-4" /> New Contribution
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t border-gray-100 pt-4">
            <div>
              <label className="label">Contribution Type *</label>
              <select
                className="input"
                required
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="">Select type…</option>
                {CONTRIBUTION_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Description *</label>
              <textarea
                className="input"
                rows={3}
                required
                placeholder="Describe what you are contributing…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Estimated Value (₵) — optional</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                placeholder="e.g. 500.00"
                value={form.estimated_value}
                onChange={(e) => setForm((f) => ({ ...f, estimated_value: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Submitting…' : 'Submit Contribution'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* My contributions list */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4">My Contributions</h2>
        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : !contributions?.length ? (
          <p className="text-gray-400 text-sm text-center py-8">No contributions submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {contributions.map((c) => (
              <div key={c.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <Award className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-800">{c.type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{c.description}</p>
                  {c.estimated_value && (
                    <p className="text-xs text-gray-500 mt-0.5">Est. value: {GHS(c.estimated_value)}</p>
                  )}
                  {c.notes && c.status !== 'pending' && (
                    <p className="text-xs text-gray-500 mt-0.5 italic">Note: {c.notes}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
