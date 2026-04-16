import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, X, ChevronLeft, ChevronRight, Trash2, ImageIcon } from 'lucide-react';
import { photosApi } from '@/lib/api';
import { type Photo } from '@/types';
import { getPhotoUrl, getStoredUser } from '@/lib/auth';
import { toast } from 'sonner';

const CATEGORIES = ['Sports', 'Academics', 'Graduation', 'Culture', 'Campus Life', 'Events'];

export default function Gallery() {
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ caption: '', category: '', year: '' });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const user = getStoredUser();

  const { data, isLoading } = useQuery({
    queryKey: ['photos', category, page],
    queryFn: () => photosApi.list({ category: category || undefined, page }),
  });

  const photos = (data?.photos ?? []) as Photo[];

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('caption', uploadForm.caption);
    formData.append('category', uploadForm.category);
    formData.append('year', uploadForm.year);
    setUploading(true);
    try {
      await photosApi.upload(formData);
      toast.success('Photo uploaded!');
      setShowUpload(false);
      setFile(null);
      setUploadForm({ caption: '', category: '', year: '' });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this photo?')) return;
    try {
      await photosApi.delete(id);
      toast.success('Photo deleted');
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      if (lightbox?.id === id) setLightbox(null);
    } catch {
      toast.error('Failed to delete photo');
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-6 w-6 text-yellow-400" />
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Photo Gallery</h1>
              <p className="text-blue-200 text-sm">{data?.total ?? 0} photos from across the years</p>
            </div>
          </div>
          <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
            <Upload className="h-4 w-4" /> Upload Photo
          </button>
        </div>
      </div>

      <div className="page-bg min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['All', ...CATEGORIES].map((c) => {
              const active = c === 'All' ? !category : category === c;
              return (
                <button
                  key={c}
                  onClick={() => { setCategory(c === 'All' ? '' : c); setPage(1); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    active
                      ? 'text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-700'
                  }`}
                  style={active ? { background: 'linear-gradient(135deg, #1e40af, #1a2744)' } : {}}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-sm border border-gray-100 mb-4">
                <ImageIcon className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No photos yet.</p>
              <p className="text-gray-400 text-sm mt-1">Be the first to upload a memory!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => setLightbox(photo)}
                >
                  <img src={getPhotoUrl(photo.url)} alt={photo.caption || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-2xl" />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs line-clamp-2 font-medium">{photo.caption}</p>
                    </div>
                  )}
                  {(user?.id === photo.uploaded_by || user?.is_admin) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                  {photo.category && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 text-white text-xs font-semibold rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      {photo.category}
                    </span>
                  )}
                </div>
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

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <X className="h-8 w-8" />
          </button>
          <div className="max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={getPhotoUrl(lightbox.url)} alt={lightbox.caption || ''} className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            {(lightbox.caption || lightbox.year || lightbox.category) && (
              <div className="text-white text-center mt-4">
                {lightbox.caption && <p className="font-semibold">{lightbox.caption}</p>}
                <p className="text-gray-400 text-sm mt-1">
                  {[lightbox.category, lightbox.year].filter(Boolean).join(' · ')}
                  {lightbox.first_name && ` · ${lightbox.first_name} ${lightbox.last_name}`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Upload Photo</h2>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="label">Photo *</label>
                <input type="file" accept="image/*" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="input" />
              </div>
              <div>
                <label className="label">Caption</label>
                <input className="input" value={uploadForm.caption} onChange={(e) => setUploadForm((f) => ({ ...f, caption: e.target.value }))} placeholder="Describe this photo…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={uploadForm.category} onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value }))}>
                    <option value="">Select…</option>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Year</label>
                  <input className="input" placeholder="e.g. 2005" value={uploadForm.year} onChange={(e) => setUploadForm((f) => ({ ...f, year: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={uploading || !file} className="btn-primary">
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
