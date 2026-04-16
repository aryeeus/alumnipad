import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, X, Users } from 'lucide-react';
import { alumniApi } from '@/lib/api';
import { type AlumniProfile } from '@/types';
import AlumniCard from '@/components/AlumniCard';

const HOUSES = ['Kwansah', 'Riis', 'Engmann', 'Golden Tulip', 'Novotel', 'Akro', 'Clerk'];
const PROGRAMS = ['General Science', 'Business', 'General Arts', 'Agriculture', 'Visual Arts'];

export default function Directory() {
  const [search, setSearch] = useState('');
  const [house, setHouse] = useState('');
  const [year, setYear] = useState('');
  const [program, setProgram] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['alumni', search, house, year, program, page],
    queryFn: () => alumniApi.list({ search, house, year, program: program || undefined, page }),
  });

  const alumni = (data?.alumni ?? []) as AlumniProfile[];
  const hasFilters = search || house || year || program;

  const clearFilters = () => { setSearch(''); setHouse(''); setYear(''); setProgram(''); setPage(1); };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <Users className="h-6 w-6 text-yellow-400" />
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Alumni Directory</h1>
          </div>
          <p className="text-blue-200 text-sm">
            {data ? `${data.total} verified alumni` : 'Search and connect with fellow graduates'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="page-bg min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Search & Filters */}
          <div className="card p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="input pl-10"
                  placeholder="Search by name, profession, or city…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <select className="input sm:w-40" value={house} onChange={(e) => { setHouse(e.target.value); setPage(1); }}>
                <option value="">All Houses</option>
                {HOUSES.map((h) => <option key={h}>{h}</option>)}
              </select>
              <select className="input sm:w-44" value={program} onChange={(e) => { setProgram(e.target.value); setPage(1); }}>
                <option value="">All Programmes</option>
                {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
              </select>
              <input
                className="input sm:w-28"
                placeholder="Year"
                type="number"
                min="1960"
                max="2030"
                value={year}
                onChange={(e) => { setYear(e.target.value); setPage(1); }}
              />
              {hasFilters && (
                <button onClick={clearFilters} className="btn-secondary flex items-center gap-1.5 whitespace-nowrap">
                  <X className="h-4 w-4" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="h-14 w-14 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : alumni.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-sm border border-gray-100 mb-4">
                <Users className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No alumni found.</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {alumni.map((a) => <AlumniCard key={a.user_id || a.id} alumni={a} />)}
              </div>

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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
