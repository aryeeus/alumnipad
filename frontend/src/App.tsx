import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUp } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { publicApi } from '@/lib/api';
import { getPhotoUrl } from '@/lib/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';

import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Directory from '@/pages/Directory';
import AlumniProfile from '@/pages/AlumniProfile';
import Gallery from '@/pages/Gallery';
import Memories from '@/pages/Memories';
import Activities from '@/pages/Activities';
import Admin from '@/pages/Admin';
import Marketplace from '@/pages/Marketplace';
import Giving from '@/pages/Giving';
import Jobs from '@/pages/Jobs';
import EditProfile from '@/pages/EditProfile';
import NotFound from '@/pages/NotFound';

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Show when the user has scrolled past the last visible area
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      setVisible(scrolled >= total - 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-11 w-11 rounded-full shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none"
      style={{ background: 'linear-gradient(135deg,#1e40af,#1a2744)', color: 'white' }}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  const phone = '+233256468586';
  const displayPhone = '+233 25 646 85 86';

  return (
    <footer className="bg-[#0d1b3e] border-t border-white/10 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Brand */}
          <div className="text-center sm:text-left">
            <p className="text-base font-bold tracking-wide text-white">
              Code<span className="text-blue-400">Shop</span>
            </p>
            <p className="text-xs text-blue-300 mt-0.5">Software Development &amp; Technology Solutions</p>
          </div>

          {/* Contact */}
          <div className="flex items-center gap-5 text-sm">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/${phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-200 hover:text-green-400 transition-colors"
              title="Chat on WhatsApp"
            >
              <svg className="h-4 w-4 fill-current flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="hidden sm:inline">{displayPhone}</span>
            </a>

            {/* Phone call */}
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-2 text-blue-200 hover:text-blue-400 transition-colors"
              title="Call us"
            >
              <svg className="h-4 w-4 fill-current flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              <span className="sm:inline">{displayPhone}</span>
            </a>
          </div>
        </div>

        {/* Divider + copyright */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-blue-400">
          &copy; {year} CodeShop. All rights reserved. &nbsp;·&nbsp; Built with AlumniPad
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: publicApi.settings,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (settings?.logo_url) {
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) link.href = getPhotoUrl(settings.logo_url);
    }
  }, [settings?.logo_url]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/activities" element={<Activities />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/directory" element={<Directory />} />
            <Route path="/alumni/:id" element={<AlumniProfile />} />
            <Route path="/alumni/:id/edit" element={<EditProfile />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/memories" element={<Memories />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/giving" element={<Giving />} />
            <Route path="/jobs" element={<Jobs />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Admin />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
