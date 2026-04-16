import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-3">Invalid or missing reset token.</p>
          <Link to="/forgot-password" className="text-blue-600 hover:underline text-sm">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h2>
          <p className="text-gray-500 text-sm">Your password has been updated. Redirecting to login...</p>
          <Link to="/login" className="btn-primary inline-block mt-4 px-6 py-2">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-green-500'];

  return (
    <div
      className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4"
      style={{ backgroundImage: 'url(/hero-bg.svg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#0f1e3d' }}
    >
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-3">
            <GraduationCap className="h-8 w-8 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>Set New Password</h1>
          <p className="text-blue-200 text-sm mt-1">Choose a strong password for your account.</p>
        </div>
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/60">

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength meter */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1.5">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`flex-1 rounded-full transition-colors ${
                          strength >= level ? strengthColor[strength] : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{strengthLabel[strength]}</p>
                </div>
              )}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                className={`input ${confirm && confirm !== password ? 'border-red-400 focus:ring-red-400' : ''}`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                required
              />
              {confirm && confirm !== password && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || password !== confirm || password.length < 6}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-semibold">
              Remembered it? Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
