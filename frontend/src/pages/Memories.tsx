import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { memoriesApi } from '@/lib/api';
import { type Memory } from '@/types';
import MemoryCard from '@/components/MemoryCard';
import { toast } from 'sonner';

export default function Memories() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', year_range: '', tags: '' });
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['memories', page],
    queryFn: () => memoriesApi.list(page),
  });

  const memories = (data?.memories ?? []) as Memory[];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tags = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
      await memoriesApi.create({ title: form.title, content: form.content, year_range: form.year_range || undefined, tags });
      toast.success('Memory shared!');
      setShowCreate(false);
      setForm({ title: '', content: '', year_range: '', tags: '' });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    } catch {
      toast.error('Failed to share memory');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="max-w-3xl mx-auto px-4 relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-yellow-400" />
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Memories</h1>
              <p className="text-blue-200 text-sm">Stories and moments from alumni</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Share
          </button>
        </div>
      </div>

      <div className="page-bg min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-8">

          {/* Create Memory Modal */}
          {showCreate && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="card w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Share a Memory</h2>
                  <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="label">Title *</label>
                    <input className="input" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Give your memory a title…" />
                  </div>
                  <div>
                    <label className="label">Your Memory *</label>
                    <textarea className="input" rows={5} required value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="Share your story…" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Year Range</label>
                      <input className="input" placeholder="e.g. 2003–2006" value={form.year_range} onChange={(e) => setForm((f) => ({ ...f, year_range: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Tags</label>
                      <input className="input" placeholder="house, sports, fun" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                    <button type="submit" disabled={submitting} className="btn-primary">
                      {submitting ? 'Sharing…' : 'Share Memory'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Feed */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="flex gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-200 rounded" />
                    <div className="h-3 bg-gray-200 rounded" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-sm border border-gray-100 mb-4">
                <BookOpen className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No memories shared yet.</p>
              <p className="text-gray-400 text-sm mt-1">Be the first to share a story!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {memories.map((m) => (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  onDelete={(id) => {
                    queryClient.setQueryData(['memories', page], (old: typeof data) =>
                      old ? { ...old, memories: old.memories.filter((mem: Memory) => mem.id !== id) } : old
                    );
                  }}
                />
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
    </div>
  );
}
