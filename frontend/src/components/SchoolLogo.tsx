import { GraduationCap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/lib/api';
import { getPhotoUrl } from '@/lib/auth';

/**
 * Shows the school logo when one has been uploaded in Admin > Settings.
 * Falls back to GraduationCap icon.
 *
 * `size` controls the container dimensions (Tailwind h-/w- value, e.g. "12" = 3rem).
 * `variant` = "dark"  → for use on dark/hero backgrounds (white/10 container)
 *            = "light" → for use on light backgrounds (white container)
 */
export default function SchoolLogo({
  size = 16,
  variant = 'dark',
}: {
  size?: number;
  variant?: 'dark' | 'light';
}) {
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: publicApi.settings,
    staleTime: 300_000,
  });

  const logoUrl = settings?.logo_url ? getPhotoUrl(settings.logo_url) : null;

  const containerStyle: React.CSSProperties = {
    width: size * 4,
    height: size * 4,
  };

  const imgSize = size * 4 * 0.75;

  const containerClass =
    variant === 'dark'
      ? 'rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0'
      : 'rounded-2xl bg-white shadow-md border border-gray-100 flex items-center justify-center flex-shrink-0';

  const iconSize = size * 2;

  return (
    <div className={containerClass} style={containerStyle}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={settings?.school_name ?? 'School logo'}
          style={{ width: imgSize, height: imgSize, objectFit: 'contain' }}
        />
      ) : (
        <GraduationCap
          className={variant === 'dark' ? 'text-yellow-400' : 'text-blue-700'}
          style={{ width: iconSize, height: iconSize }}
        />
      )}
    </div>
  );
}
