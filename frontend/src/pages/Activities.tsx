import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Clock, Tag } from 'lucide-react';
import { activitiesApi } from '@/lib/api';
import { type Activity } from '@/types';

const EVENT_TYPE_COLORS: Record<string, { dot: string; badge: string }> = {
  Reunion:     { dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  Mentorship:  { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  Sports:      { dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700 border-green-200' },
  Fundraising: { dot: 'bg-yellow-500', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  Workshop:    { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  Social:      { dot: 'bg-pink-500',   badge: 'bg-pink-50 text-pink-700 border-pink-200' },
};

const FALLBACK_ACTIVITIES: Partial<Activity>[] = [
  { id: 'f1', title: 'Annual Alumni Reunion 2026', description: 'Join us for our grand annual alumni reunion — reconnect, celebrate, and build new memories with fellow graduates.', event_date: '2026-08-15', event_time: '10:00 AM', location: 'School Assembly Hall', event_type: 'Reunion' },
  { id: 'f2', title: 'Mentorship Programme Launch', description: 'Experienced alumni share career insights with current students and recent graduates through structured mentorship sessions.', event_date: '2026-05-20', event_time: '2:00 PM', location: 'Virtual (Zoom)', event_type: 'Mentorship' },
  { id: 'f3', title: 'Inter-Alumni Sports Day', description: 'A day of friendly sports competition between alumni cohorts — football, athletics, and more!', event_date: '2026-06-07', event_time: '8:00 AM', location: 'School Sports Complex', event_type: 'Sports' },
  { id: 'f4', title: 'Alumni Fundraising Gala', description: 'Help us raise funds to support the school infrastructure and scholarship programme for deserving students.', event_date: '2026-09-12', event_time: '7:00 PM', location: 'Labadi Beach Hotel, Accra', event_type: 'Fundraising' },
];

function formatEventDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Activities() {
  const { data, isLoading } = useQuery({ queryKey: ['activities'], queryFn: activitiesApi.list });
  const activities = ((data as Activity[]) ?? []).length > 0 ? (data as Activity[]) : (FALLBACK_ACTIVITIES as Activity[]);

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <Calendar className="h-6 w-6 text-yellow-400" />
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Events & Activities</h1>
          </div>
          <p className="text-blue-200 text-sm">Stay connected with upcoming alumni events</p>
        </div>
      </div>

      <div className="page-bg min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="flex gap-4">
                    <div className="h-20 w-20 bg-gray-200 rounded-2xl flex-shrink-0" />
                    <div className="flex-1 space-y-3 pt-1">
                      <div className="h-5 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {activities.map((activity) => {
                const colors = activity.event_type ? (EVENT_TYPE_COLORS[activity.event_type] ?? { dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 border-gray-200' }) : null;
                return (
                  <div key={activity.id} className="card card-hover overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      {/* Date block */}
                      {activity.event_date ? (
                        <div
                          className="flex-shrink-0 sm:w-24 flex sm:flex-col items-center justify-center p-4 gap-2 sm:gap-0 text-white"
                          style={{ background: 'linear-gradient(135deg, #1a2744, #1e3a8a)' }}
                        >
                          <span className="text-3xl font-extrabold leading-none">
                            {new Date(activity.event_date).getDate()}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-widest opacity-90 sm:mt-1">
                            {new Date(activity.event_date).toLocaleDateString('en-GB', { month: 'short' })}
                          </span>
                          <span className="text-xs opacity-70">
                            {new Date(activity.event_date).getFullYear()}
                          </span>
                        </div>
                      ) : (
                        <div className="flex-shrink-0 sm:w-24 flex items-center justify-center p-4 bg-gray-100">
                          <Calendar className="h-8 w-8 text-gray-400" />
                        </div>
                      )}

                      <div className="flex-1 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                            {activity.title}
                          </h2>
                          {activity.event_type && colors && (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                              {activity.event_type}
                            </span>
                          )}
                        </div>

                        {activity.description && (
                          <p className="text-sm text-gray-600 leading-relaxed mb-3">{activity.description}</p>
                        )}

                        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                          {activity.event_date && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Calendar className="h-3.5 w-3.5 text-blue-400" />
                              {formatEventDate(activity.event_date)}
                            </span>
                          )}
                          {activity.event_time && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Clock className="h-3.5 w-3.5 text-blue-400" />
                              {activity.event_time}
                            </span>
                          )}
                          {activity.location && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                              <MapPin className="h-3.5 w-3.5 text-blue-400" />
                              {activity.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
