import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import NotFound from '@/pages/NotFound';

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
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/memories" element={<Memories />} />
            <Route path="/marketplace" element={<Marketplace />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Admin />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
