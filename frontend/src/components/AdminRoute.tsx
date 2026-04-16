import { Navigate, Outlet } from 'react-router-dom';
import { getToken, getStoredUser } from '@/lib/auth';

export default function AdminRoute() {
  const token = getToken();
  const user = getStoredUser();
  if (!token) return <Navigate to="/login" replace />;
  if (!user?.is_admin) return <Navigate to="/" replace />;
  return <Outlet />;
}
