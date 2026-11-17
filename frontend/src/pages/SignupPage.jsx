import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FlaskConical, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { signup, getCategories } from '../api';
import { useToast } from '../context/ToastContext';

export function SignupPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState('USER');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories()
      .then((cats) => setAvailableCategories(cats))
      .catch(() => {});
  }, []);

  const handleToggleCategory = (catName) => {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (requestedRole === 'SUB_ADMIN' && selectedCategories.length === 0) {
      setError('Please select at least one category for your Sub-Admin request.');
      return;
    }

    setLoading(true);
    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        requested_role: requestedRole,
        requested_categories: requestedRole === 'SUB_ADMIN' ? selectedCategories : [],
      });
      setSuccess(true);
      toast.success('Registration submitted for review!');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-100 mb-3">
          <FlaskConical className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Request Lab Access
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Sign up to submit or manage requests. Admin approval required.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200">
          {success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Application Submitted</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Thank you! Your registration has been received and is waiting for Professor Admin approval. You will receive access once approved.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
              >
                Go to Sign In
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
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. maya@lab.local"
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
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Requested Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestedRole('USER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer text-center ${
                      requestedRole === 'USER'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Lab Member
                    <span className="block text-[10px] text-slate-400 mt-0.5">Intern / Postdoc</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestedRole('SUB_ADMIN')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer text-center ${
                      requestedRole === 'SUB_ADMIN'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Sub-Admin
                    <span className="block text-[10px] text-slate-400 mt-0.5">Category Lead</span>
                  </button>
                </div>
              </div>

              {requestedRole === 'SUB_ADMIN' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fade-in">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Select Your Responsible Categories <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {availableCategories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat.name)}
                          onChange={() => handleToggleCategory(cat.name)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Submitting Application...' : 'Submit Sign Up Request'}
              </button>

              <div className="text-center pt-2 text-xs text-slate-500">
                Already registered?{' '}
                <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
                  Sign in here
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
