import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Images, BookOpen, Calendar, Star, ArrowRight, GraduationCap, Network } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { publicApi, alumniApi } from '@/lib/api';
import { getToken, getPhotoUrl, getStoredUser } from '@/lib/auth';

const SCHOOL_HOUSES = 7;
const SCHOOL_PROGRAMS = 5;

function StatsBar({ totalAlumni, cities, mentors }: { totalAlumni: number; cities: number; mentors: number }) {
  const items = [
    { value: totalAlumni, suffix: '+', label: 'Alumni Members' },
    { value: SCHOOL_HOUSES, suffix: '',  label: 'School Houses' },
    { value: SCHOOL_PROGRAMS, suffix: '', label: 'Programs' },
    { value: cities || 1, suffix: '+', label: 'Countries Represented' },
    ...(mentors > 0 ? [{ value: mentors, suffix: '+', label: 'Available Mentors' }] : []),
  ];

  return (
    <div className="w-full bg-[#0d1b3e] border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-wrap divide-x divide-white/10">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex-1 min-w-[120px] py-6 px-6 text-center"
            >
              <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {item.value.toLocaleString()}{item.suffix}
              </div>
              <div className="text-sm text-blue-200 mt-1 font-medium">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const token = getToken();
  const currentUser = getStoredUser();

  const { data: stats } = useQuery({
    queryKey: ['public-stats'],
    queryFn: publicApi.stats,
    staleTime: 60_000,
  });

  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: publicApi.settings,
    staleTime: 300_000,
  });

  const { data: myProfile } = useQuery({
    queryKey: ['alumni', currentUser?.id],
    queryFn: () => alumniApi.get(currentUser!.id),
    enabled: !!currentUser,
    staleTime: 300_000,
  });

  const profile = myProfile as Record<string, unknown> | undefined;
  const graduationYear = profile?.graduation_year as number | undefined;

  const registerUrl = `${window.location.origin}/register`;
  const logoUrl = settings?.logo_url ? getPhotoUrl(settings.logo_url) : null;

  const features = [
    { icon: Users,    title: 'Alumni Directory',     desc: 'Search and connect with verified graduates filtered by house, year, and profession.' },
    { icon: Images,   title: 'Photo Gallery',        desc: 'Relive school memories through a curated gallery of photos from across the years.' },
    { icon: BookOpen, title: 'Memories',             desc: 'Share stories and experiences from your school days with the community.' },
    { icon: Calendar, title: 'Events & Activities',  desc: 'Stay updated on reunions, mentorship programmes, and alumni gatherings.' },
    { icon: Network,  title: 'Mentorship Network',   desc: 'Connect with experienced alumni for career guidance and professional growth.' },
    { icon: Star,     title: 'Business Marketplace', desc: 'Discover and support businesses owned by fellow alumni.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section
        className="relative text-white py-20 px-4"
        style={{
          backgroundImage: 'url(/hero-bg.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#0f1e3d',
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center mb-5">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={settings?.school_name ?? 'School logo'}
                className="h-24 w-24 object-contain drop-shadow-lg"
              />
            ) : (
              <GraduationCap className="h-16 w-16 text-yellow-400" />
            )}
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
            Welcome to <span className="text-yellow-400">AlumniPad</span>
          </h1>
          {graduationYear ? (
            <p className="text-lg font-semibold text-yellow-300 mb-3 tracking-wide">
              Class of {graduationYear} — Welcome back!
            </p>
          ) : (
            <p className="text-base text-blue-300 mb-3 tracking-widest uppercase font-medium">
              Connecting Every Class of Alumni
            </p>
          )}
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Your single source of truth for connecting with fellow alumni. Rediscover old friends, build new networks, and stay connected with your school community.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary px-8 py-3 text-base">
              Join the Network
            </Link>
            <Link to={token ? '/directory' : '/login'} className="btn-secondary px-8 py-3 text-base">
              Browse Directory
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      {stats && (
        <StatsBar
          totalAlumni={stats.total_alumni}
          cities={stats.unique_cities}
          mentors={stats.total_mentors}
        />
      )}

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">Everything you need to stay connected</h2>
          <p className="text-center text-gray-500 mb-10">A complete platform built for the alumni community</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-blue-700" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QR Code section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Share the Registration Link</h2>
          <p className="text-gray-600 mb-8">Scan this QR code or share the link to invite fellow alumni to join.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
              <QRCodeSVG value={registerUrl} size={160} />
              <p className="text-xs text-gray-400 mt-2">Scan to register</p>
            </div>
            <div className="text-left max-w-xs">
              <p className="text-sm text-gray-600 mb-3">
                Registration is free. Your profile will be verified by the school administration before you can access the full directory.
              </p>
              <Link to="/register" className="inline-flex items-center gap-2 btn-primary">
                Register Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#1a2744] text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to reconnect?</h2>
        <p className="text-gray-300 mb-8 max-w-xl mx-auto">
          Join thousands of alumni who are already connected, mentoring, and growing together.
        </p>
        <Link to="/register" className="btn-primary px-10 py-3 text-base">
          Get Started Today
        </Link>
      </section>
    </div>
  );
}
