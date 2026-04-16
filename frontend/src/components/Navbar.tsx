import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, GraduationCap, LogOut, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { clearAuth, getStoredUser, getPhotoUrl, getInitials } from '@/lib/auth';
import { publicApi, alumniApi } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: publicApi.settings,
    staleTime: 300_000,
  });

  const { data: myProfile } = useQuery({
    queryKey: ['alumni', user?.id],
    queryFn: () => alumniApi.get(user!.id),
    enabled: !!user,
    staleTime: 300_000,
  });

  const profile = myProfile as Record<string, any> | undefined;
  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ''}`.trim()
    : user?.email?.split('@')[0] ?? '';
  const initials = profile?.first_name
    ? getInitials(profile.first_name, profile.last_name)
    : (user?.email?.[0] ?? '?').toUpperCase();
  const avatarUrl = profile?.profile_photo_url ? getPhotoUrl(profile.profile_photo_url) : null;

  const logoUrl = settings?.logo_url ? getPhotoUrl(settings.logo_url) : null;

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
    setOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/directory', label: 'Directory', auth: true },
    { to: '/gallery', label: 'Gallery', auth: true },
    { to: '/memories', label: 'Memories', auth: true },
    { to: '/marketplace', label: 'Marketplace', auth: true },
    { to: '/activities', label: 'Activities' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/70" style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={settings?.school_name ?? 'School logo'}
                className="h-8 w-8 object-contain rounded"
              />
            ) : (
              <GraduationCap className="h-7 w-7 text-blue-700" />
            )}
            <span>
              Alumni<span className="text-blue-700">Pad</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.auth && !user) return null;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive(link.to)
                      ? 'bg-blue-700 text-white'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                {user.is_admin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1 px-3 py-2 text-sm rounded-md text-blue-700 hover:bg-blue-50 transition-colors font-medium"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                )}

                {/* User identity chip */}
                <Link
                  to={`/alumni/${user.id}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  title="View my profile"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-7 w-7 rounded-full object-cover border-2 border-blue-300"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-700 font-medium max-w-[120px] truncate leading-tight">
                      {displayName}
                    </span>
                    {profile?.graduation_year && (
                      <span className="text-xs text-blue-600 font-medium leading-tight">
                        Class of {profile.graduation_year}
                      </span>
                    )}
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className={cn(
                    'px-4 py-2 text-sm rounded-md font-medium transition-colors',
                    isActive('/register')
                      ? 'bg-blue-700 text-white'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                  )}
                >
                  Register
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-md bg-blue-700 hover:bg-blue-800 text-white font-medium transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Login
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 px-4 py-3 space-y-1" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)' }}>
          {navLinks.map((link) => {
            if (link.auth && !user) return null;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={cn(
                  'block px-3 py-2 rounded-md text-sm font-medium',
                  isActive(link.to) ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="border-t border-gray-100 pt-2 mt-2">
            {user ? (
              <>
                {/* Mobile identity row */}
                <div className="flex items-center gap-2 px-3 py-2">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover border-2 border-blue-300" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
                      {initials}
                    </div>
                  )}
                  <span className="text-sm text-gray-800 font-medium truncate">{displayName}</span>
                </div>
                {user.is_admin && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-blue-700 font-medium">
                    Admin Dashboard
                  </Link>
                )}
                <Link to={`/alumni/${user.id}`} onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-gray-600">
                  My Profile
                </Link>
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-sm text-red-500">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/register" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-gray-600">
                  Register
                </Link>
                <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-blue-700 font-medium">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
