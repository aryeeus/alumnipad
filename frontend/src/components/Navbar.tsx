import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu, X, GraduationCap, LogOut, Shield, Home, Users, Images,
  BookOpen, ShoppingBag, Calendar, Briefcase, Heart, ChevronDown
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { clearAuth, getStoredUser, getPhotoUrl, getInitials } from "@/lib/auth";
import { publicApi, alumniApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/",           label: "Home",       icon: Home,      auth: false },
  { to: "/directory",  label: "Directory",  icon: Users,     auth: true },
  { to: "/gallery",    label: "Gallery",    icon: Images,    auth: true },
  { to: "/memories",   label: "Memories",   icon: BookOpen,  auth: true },
  { to: "/marketplace",label: "Market",     icon: ShoppingBag,auth: true },
  { to: "/jobs",       label: "Jobs",       icon: Briefcase, auth: true },
  { to: "/giving",     label: "Give Back",  icon: Heart,     auth: true },
  { to: "/activities", label: "Events",     icon: Calendar,  auth: false },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Scroll shadow trigger
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: publicApi.settings,
    staleTime: 300_000,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["alumni", user?.id],
    queryFn: () => alumniApi.get(user!.id),
    enabled: !!user,
    staleTime: 300_000,
  });

  const profile = myProfile as Record<string, unknown> | undefined;
  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
    : (user?.email?.split("@")[0] ?? "");
  const initials = profile?.first_name
    ? getInitials(profile.first_name as string, profile.last_name as string | undefined)
    : (user?.email?.[0] ?? "?").toUpperCase();
  const avatarUrl = profile?.profile_photo_url
    ? getPhotoUrl(profile.profile_photo_url as string)
    : null;
  const logoUrl = settings?.logo_url ? getPhotoUrl(settings.logo_url) : null;
  const alumniCode = profile?.alumni_code as string | undefined;

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const visibleLinks = NAV_LINKS.filter((l) => !l.auth || !!user);

  return (
    <>
      <nav
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrolled
            ? "shadow-[0_1px_20px_rgba(0,0,0,0.10)]"
            : "shadow-[0_1px_0_rgba(0,0,0,0.05)]"
        )}
        style={{
          background: "rgba(242,242,247,0.82)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 gap-2">

            {/* ── Logo ── */}
            <Link
              to="/"
              className="flex items-center gap-2.5 mr-4 flex-shrink-0 group"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={settings?.school_name ?? "Logo"}
                  className="h-8 w-8 rounded-lg object-contain ring-1 ring-black/5"
                />
              ) : (
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(145deg,#1e40af,#1a2744)" }}
                >
                  <GraduationCap className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
                </div>
              )}
              <span
                className="font-bold text-[#1d1d1f] tracking-tight hidden sm:block"
                style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", letterSpacing: "-0.03em" }}
              >
                Ɔdadeɛ <span style={{ color: "#1e40af" }}>'99</span>
              </span>
            </Link>

            {/* ── Desktop Nav Links ── */}
            <div className="hidden lg:flex items-center gap-0.5 flex-1">
              {visibleLinks.map((link) => {
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                      active
                        ? "text-[#1e40af]"
                        : "text-[#3a3a3c] hover:text-[#1d1d1f] hover:bg-black/[0.05]"
                    )}
                    style={{ fontFamily: "var(--font-body)", letterSpacing: "-0.01em" }}
                  >
                    <link.icon className="h-3.5 w-3.5 opacity-70" />
                    {link.label}
                    {active && (
                      <span
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ background: "#1e40af" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* ── Right section ── */}
            <div className="hidden lg:flex items-center gap-1.5 ml-auto">
              {user ? (
                <>
                  {user.is_admin && (
                    <Link
                      to="/admin"
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150",
                        isActive("/admin")
                          ? "bg-[#1e40af] text-white"
                          : "text-[#1e40af] hover:bg-[#1e40af]/10"
                      )}
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Admin
                    </Link>
                  )}

                  {/* User chip */}
                  <Link
                    to={`/alumni/${user.id}`}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-black/[0.06] transition-all duration-150 group"
                    title="My Profile"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-7 w-7 rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ring-2 ring-white shadow-sm"
                        style={{ background: "linear-gradient(145deg,#1e40af,#1a2744)" }}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="flex flex-col leading-none">
                      <span
                        className="text-[12px] font-semibold text-[#1d1d1f] max-w-[100px] truncate"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        {displayName.split(' ')[0]}
                      </span>
                      {alumniCode && (
                        <span className="text-[10px] text-[#6e6e73] font-mono">{alumniCode}</span>
                      )}
                    </div>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#dc2626] hover:text-[#1e40af] hover:bg-blue-50 transition-all duration-150 text-[13px] font-medium"
                    title="Sign out"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="px-3.5 py-1.5 rounded-lg text-[13px] font-semibold text-[#3a3a3c] hover:bg-black/[0.05] transition-all"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Register
                  </Link>
                  <Link
                    to="/login"
                    className="btn-primary text-[13px] py-1.5 px-4"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* ── Mobile menu button ── */}
            <div className="lg:hidden flex items-center gap-2 ml-auto">
              {user && (
                <Link to={`/alumni/${user.id}`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-white shadow-sm" />
                  ) : (
                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white shadow-sm"
                      style={{ background: "linear-gradient(145deg,#1e40af,#1a2744)" }}>
                      {initials}
                    </div>
                  )}
                </Link>
              )}
              <button
                onClick={() => setOpen(!open)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#3a3a3c] hover:bg-black/[0.07] transition-all"
              >
                {open ? <X className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                       : <Menu className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile Menu ── */}
        <div
          className={cn(
            "lg:hidden overflow-hidden transition-all duration-300 ease-in-out",
            open ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          )}
          style={{
            background: "rgba(242,242,247,0.97)",
            backdropFilter: "blur(24px)",
            borderTop: open ? "1px solid rgba(0,0,0,0.06)" : "none",
          }}
        >
          <div className="px-4 py-4 space-y-1">
            {/* User info row */}
            {user && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2"
                style={{ background: "rgba(30,64,175,0.06)" }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: "linear-gradient(145deg,#1e40af,#1a2744)" }}>
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-[#1d1d1f]">{displayName}</p>
                  {alumniCode && <p className="text-xs text-[#1e40af] font-mono font-semibold">{alumniCode}</p>}
                </div>
              </div>
            )}

            {visibleLinks.map((link) => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    active
                      ? "bg-[#1e40af] text-white"
                      : "text-[#3a3a3c] hover:bg-black/[0.05]"
                  )}
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

            <div className="border-t border-black/[0.06] pt-2 mt-2 space-y-1">
              {user ? (
                <>
                  {user.is_admin && (
                    <Link to="/admin"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#1e40af] hover:bg-[#1e40af]/10 transition-all">
                      <Shield className="h-4 w-4" /> Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#dc2626] hover:text-[#1e40af] hover:bg-blue-50 transition-all"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/register" className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#3a3a3c] hover:bg-black/[0.05] transition-all">Register</Link>
                  <Link to="/login" className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-[#1e40af] hover:bg-[#1e40af]/10 transition-all">Sign In</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
