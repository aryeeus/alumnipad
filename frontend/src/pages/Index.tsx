import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  Users,
  Images,
  BookOpen,
  Calendar,
  Star,
  ArrowRight,
  Network,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { publicApi, alumniApi } from "@/lib/api";
import { getToken, getStoredUser } from "@/lib/auth";
import SchoolLogo from "@/components/SchoolLogo";

function StatsBar({
  totalAlumni,
  totalCountries,
  totalCampaigns,
  totalAds,
  totalJobs,
}: {
  totalAlumni: number;
  totalCountries: number;
  totalCampaigns: number;
  totalAds: number;
  totalJobs: number;
}) {
  const items = [
    { value: totalAlumni,   label: "Active Alumni" },
    { value: totalCountries, label: "Countries Represented" },
    { value: totalCampaigns, label: "Live Campaigns" },
    { value: totalAds,      label: "Marketplace Adverts" },
    { value: totalJobs,     label: "Jobs Posted" },
  ];

  return (
    <div className="w-full bg-[#0d1b3e] border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-white/10">
          {items.map((item, i) => (
            <div
              key={item.label}
              className={`py-6 px-4 text-center ${i < items.length - 1 ? 'border-b sm:border-b-0 sm:border-r border-white/10' : ''}`}
            >
              <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {item.value.toLocaleString()}
                <span className="text-blue-400">+</span>
              </div>
              <div className="text-xs text-blue-200 mt-1 font-medium uppercase tracking-wide">
                {item.label}
              </div>
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
    queryKey: ["public-stats"],
    queryFn: publicApi.stats,
    staleTime: 60_000,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["alumni", currentUser?.id],
    queryFn: () => alumniApi.get(currentUser!.id),
    enabled: !!currentUser,
    staleTime: 300_000,
  });

  const profile = myProfile as Record<string, unknown> | undefined;
  const graduationYear = profile?.graduation_year as number | undefined;

  const registerUrl = `${window.location.origin}/register`;

  const features = [
    {
      icon: Users,
      title: "Alumni Directory",
      desc: "Search and connect with verified graduates filtered by house, year, and profession.",
    },
    {
      icon: Images,
      title: "Photo Gallery",
      desc: "Relive school memories through a curated gallery of photos from across the years.",
    },
    {
      icon: BookOpen,
      title: "Memories",
      desc: "Share stories and experiences from your school days with the community.",
    },
    {
      icon: Calendar,
      title: "Events & Activities",
      desc: "Stay updated on reunions, mentorship programmes, and alumni gatherings.",
    },
    {
      icon: Network,
      title: "Mentorship Network",
      desc: "Connect with experienced alumni for career guidance and professional growth.",
    },
    {
      icon: Star,
      title: "Business Marketplace",
      desc: "Discover and support businesses owned by fellow alumni.",
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section
        className="relative text-white py-20 px-4"
        style={{
          backgroundImage: "url(/hero-bg.svg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#0f1e3d",
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center mb-5">
            <SchoolLogo size={24} variant="dark" />
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
            Welcome to <span className="text-blue-400">Ɔdadeɛ ‘99 Hub</span>
          </h1>
          {graduationYear ? (
            <p className="text-lg font-semibold text-red-300 mb-3 tracking-wide">
              {/* Class of {graduationYear} — Welcome back! */}
            </p>
          ) : (
            <p className="text-base text-blue-300 mb-3 tracking-widest uppercase font-medium">
              {/* Connecting Every Class of Alumni */}
            </p>
          )}
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Your single source of truth for connecting with fellow alumni.
            Rediscover old friends, build new networks, and stay connected with
            your school year mates.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary px-8 py-3 text-base">
              Join the Network
            </Link>
            <Link
              to={token ? "/directory" : "/login"}
              className="btn-secondary px-8 py-3 text-base"
            >
              Browse Directory
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar — always visible, shows 0 while loading */}
      <StatsBar
        totalAlumni={stats?.total_alumni ?? 0}
        totalCountries={stats?.unique_countries ?? 0}
        totalCampaigns={stats?.total_campaigns ?? 0}
        totalAds={stats?.total_ads ?? 0}
        totalJobs={stats?.total_jobs ?? 0}
      />

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Everything you need to stay connected
          </h2>
          <p className="text-center text-gray-500 mb-10">
            A complete platform built for the alumni community
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="card p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-blue-700" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QR Code + CTA — merged */}
      <section className="py-16 px-4 bg-[#1a2744] text-white">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-12">

          {/* Left: CTA text */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-3xl font-bold mb-4">Ready to reconnect?</h2>
            <p className="text-gray-300 mb-6 max-w-md mx-auto lg:mx-0">
              Join fellow alumni who are already connected, mentoring, and
              growing together. Registration is free — your profile is verified
              by the school administration before you access the full directory.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to="/register" className="btn-primary px-8 py-3 text-base">
                Get Started Today <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={token ? "/directory" : "/login"}
                className="btn-secondary px-8 py-3 text-base"
              >
                Browse Directory
              </Link>
            </div>
          </div>

          {/* Right: QR code */}
          <div className="flex-shrink-0 text-center">
            <div className="bg-white p-4 rounded-2xl shadow-lg inline-block">
              <QRCodeSVG value={registerUrl} size={148} />
            </div>
            <p className="text-sm text-blue-300 mt-3 font-medium">Scan to register</p>
            <p className="text-xs text-blue-400 mt-1">Share with fellow alumni</p>
          </div>

        </div>
      </section>
    </div>
  );
}
