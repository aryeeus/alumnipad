import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-black text-gray-200 mb-4">404</h1>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Page Not Found</h2>
      <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary flex items-center gap-2">
        <Home className="h-4 w-4" /> Back to Home
      </Link>
    </div>
  );
}
