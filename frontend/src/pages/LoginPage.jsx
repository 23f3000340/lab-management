import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FlaskConical, AlertCircle, Clock, ArrowRight, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';
import { login, getMe } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPendingApproval(false);
    setLoading(true);

    try {
      const data = await login(email, password);
      // Fetch full user profile
      localStorage.setItem('token', data.access_token);
      const user = await getMe();
      loginUser(data.access_token, user);
      toast.success(`Welcome back, ${user.name}!`);

      if (user.role === 'ADMIN') {
        navigate('/dashboard');
      } else if (user.role === 'SUB_ADMIN') {
        navigate('/queue');
      } else {
        navigate('/tickets');
      }
    } catch (err) {
      if (err.detail === 'pending_approval') {
        setPendingApproval(true);
      } else if (err.detail === 'account_inactive') {
        setError('Your account is currently inactive. Please contact the professor to reactivate.');
      } else {
        setError(err.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setPendingApproval(false);
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-100 mb-3">
          <FlaskConical className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Lab Request Tracker
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Central request portal for university research lab operations
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200">
          {pendingApproval ? (
            <div className="text-center py-4 space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Awaiting Admin Approval</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Your registration is pending review by the professor. You will be able to log in once your account role and categories are approved.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 text-left">
                <strong>Account:</strong> {email}
                <br />
                <strong>Status:</strong> <span className="text-amber-600 font-semibold">PENDING_APPROVAL</span>
              </div>
              <button
                type="button"
                onClick={() => setPendingApproval(false)}
                className="w-full py-2.5 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@lab.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="text-center pt-2 text-xs text-slate-500">
                Don't have an account?{' '}
                <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">
                  Request access / Sign up
                </Link>
              </div>
            </form>
          )}

          {/* Default Admin Quick Fill */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              Default Admin Account:
            </div>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@lab.local', 'admin123')}
              className="w-full p-2.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 font-medium text-left transition flex items-center justify-between"
            >
              <div>
                <div className="font-bold flex items-center gap-1 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-700" /> Professor Admin
                </div>
                <div className="text-[11px] text-purple-600">admin@lab.local</div>
              </div>
              <span className="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded font-mono font-bold">Auto-fill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
