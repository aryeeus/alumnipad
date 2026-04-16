import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Plus, X, ChevronLeft, ChevronRight, Search, Clock } from 'lucide-react';
import { adsApi } from '@/lib/api';
import { type Advertisement } from '@/types';
import AdCard from '@/components/AdCard';
import { getStoredUser } from '@/lib/auth';
import { toast } from 'sonner';

const CATEGORIES = ['Technology', 'Food & Beverage', 'Fashion', 'Health', 'Real Estate', 'Education', 'Services', 'Other'];

export default function Marketplace() {
  const user = getStoredUser();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', price: '', category: '', contact_info: '', business_name: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ads', page, search, category],
    queryFn: () => adsApi.list({ page, search: search || undefined, category: category || undefined }),
  });

  const { data: myAds } = useQuery({
    queryKey: ['my-ads'],
    queryFn: adsApi.mine,
    enabled: showMine,
  });

  const ads = (data?.ads ?? []) as Advertisement[];
  const myAdsList = (myAds ?? []) as Advertisement[];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat === category ? '' : cat);
    setPage(1);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      if (imageFile) formData.append('image', imageFile);
      await adsApi.create(formData);
      toast.success('Ad submitted for review! It will appear once approved.');
      setShowCreate(false);
      setForm({ title: '', description: '', price: '', category: '', contact_info: '', business_name: '' });
      setImageFile(null);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ['my-ads'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit ad');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ad?')) return;
    try {
      await adsApi.delete(id);
      toast.success('Ad deleted');
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['my-ads'] });
    } catch {
      toast.error('Failed to delete ad');
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-yellow-400" />
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Marketplace</h1>
              <p className="text-blue-200 text-sm">Products & services from our alumni community</p>
            </div>
          </div>
          <div className="flex gap-2">
            {user && (
              <>
                <button
                  onClick={() => setShowMine(!showMine)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg font-medium transition-colors ${showMine ? 'bg-white/20 text-white' : 'bg-white/10 text-blue-100 hover:bg-white/20'}`}
                >
                  <Clock className="h-4 w-4" /> My Ads
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <Plus className="h-4 w-4" /> Post Ad
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="page-bg min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* My Ads panel */}
          {showMine && (
            <div className="mb-8 card p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" /> My Advertisements
              </h2>
              {myAdsList.length === 0 ? (
                <p className="text-gray-400 text-sm">You have not posted any ads yet.</p>
              ) : (
                <div className="space-y-3">
                  {myAdsList.map((ad) => (
                    <div key={ad.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{ad.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {ad.category && <span className="mr-2">{ad.category}</span>}
                          <span className={`font-medium ${ad.status === 'approved' ? 'text-green-600' : ad.status === 'rejected' ? 'text-red-500' : 'text-yellow-600'}`}>
                            {ad.status === 'approved' ? 'Live' : ad.status === 'rejected' ? `Rejected${ad.reject_reason ? `: ${ad.reject_reason}` : ''}` : 'Pending review'}
                          </span>
                        </p>
                      </div>
                      <button onClick={() => handleDelete(ad.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-1">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search + filters */}
          <div className="mb-6 space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="input pl-9"
                  placeholder="Search marketplace…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary text-sm px-4">Search</button>
              {search && (
                <button type="button" className="btn-secondary text-sm" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
                  Clear
                </button>
              )}
            </form>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${category === cat ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Ad grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-44 bg-gray-200 rounded-t-2xl" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : ads.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-sm border border-gray-100 mb-4">
                <ShoppingBag className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No ads found.</p>
              <p className="text-gray-400 text-sm mt-1">Be the first to post something!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {ads.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          )}

          {data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary p-2 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600 font-medium">Page {data.page} of {data.pages}</span>
              <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="btn-secondary p-2 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Ad Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Post an Advertisement</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mb-4">
              Your ad will be reviewed by an administrator before it goes live.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Title *</label>
                <input className="input" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="What are you selling?" />
              </div>
              <div>
                <label className="label">Description *</label>
                <textarea className="input" rows={4} required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe your product or service…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Price</label>
                  <input className="input" placeholder="e.g. GHS 500 or Free" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    <option value="">Select…</option>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Business Name</label>
                  <input className="input" placeholder="Your business name" value={form.business_name} onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Contact Info</label>
                  <input className="input" placeholder="Phone, email, or URL" value={form.contact_info} onChange={(e) => setForm((f) => ({ ...f, contact_info: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Product Image</label>
                {imagePreview && (
                  <div className="mb-2 relative w-full h-36 rounded-xl overflow-hidden bg-gray-100">
                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <input type="file" accept="image/*" className="input" onChange={handleImageChange} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Submitting…' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
