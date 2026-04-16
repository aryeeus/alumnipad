import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Mail, ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.forgotPassword(email) as { message: string; dev_reset_url?: string };
      setSubmitted(true);
      if (data.dev_reset_url) setDevUrl(data.dev_reset_url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!devUrl) return;
    await navigator.clipboard.writeText(devUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

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
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {submitted ? 'Check Your Email' : 'Forgot Password'}
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            {submitted ? 'A reset link has been sent.' : "Enter your email and we'll send a reset link."}
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/60">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    className="input pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-green-800 font-medium text-sm">
                  {devUrl
                    ? 'SMTP not active — use the dev link below.'
                    : `Reset link sent to ${email}. Check your inbox and spam folder.`}
                </p>
              </div>

              {devUrl && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">Dev Mode — Reset Link</p>
                  <p className="text-xs text-amber-700 break-all mb-3 font-mono bg-amber-100 p-2 rounded">{devUrl}</p>
                  <div className="flex gap-2">
                    <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-2 text-xs py-2 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg transition-colors font-semibold">
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <a href={devUrl} className="flex-1 flex items-center justify-center gap-2 text-xs py-2 btn-primary rounded-lg font-semibold">
                      <ExternalLink className="h-3 w-3" /> Open
                    </a>
                  </div>
                </div>
              )}

              <button onClick={() => { setSubmitted(false); setDevUrl(null); }} className="btn-secondary w-full text-sm">
                Try a different email
              </button>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-semibold">
              <ArrowLeft className="h-3 w-3" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
