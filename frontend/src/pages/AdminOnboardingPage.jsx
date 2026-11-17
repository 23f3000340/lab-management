import React, { useState, useEffect } from 'react';
import { UserCheck, CheckCircle2, XCircle, Clock, Shield, AlertCircle, RefreshCw } from 'lucide-react';
import { getPendingUsers, approveUser, rejectUser, getCategories } from '../api';
import { useToast } from '../context/ToastContext';

export function AdminOnboardingPage() {
  const toast = useToast();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Approve modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignedRole, setAssignedRole] = useState('USER');
  const [assignedCategories, setAssignedCategories] = useState([]);
  const [approveModalOpen, setApproveModalOpen] = useState(false);

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [pending, cats] = await Promise.all([getPendingUsers(), getCategories()]);
      setPendingUsers(pending);
      setCategories(cats);
    } catch (err) {
      toast.error('Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openApprove = (u) => {
    setSelectedUser(u);
    setAssignedRole(u.requested_role || 'USER');
    // Pre-select requested categories
    let reqCats = [];
    try {
      if (typeof u.requested_categories === 'string') {
        reqCats = JSON.parse(u.requested_categories || '[]');
      } else if (Array.isArray(u.requested_categories)) {
        reqCats = u.requested_categories;
      }
    } catch (e) {}
    const matchedCategoryIds = categories
      .filter((c) => reqCats.includes(c.name))
      .map((c) => c.id);
    setAssignedCategories(matchedCategoryIds);
    setApproveModalOpen(true);
  };

  const openReject = (u) => {
    setSelectedUser(u);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    try {
      await approveUser(selectedUser.id, {
        role: assignedRole,
        category_ids: assignedRole === 'SUB_ADMIN' ? assignedCategories : [],
      });
      toast.success(`User ${selectedUser.name} approved successfully!`);
      setApproveModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Approval failed');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      await rejectUser(selectedUser.id, rejectReason.trim());
      toast.info(`Registration for ${selectedUser.name} rejected.`);
      setRejectModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Rejection failed');
    }
  };

  const toggleCategory = (catId) => {
    setAssignedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Onboarding Requests</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review, adjust roles, and approve new lab members and sub-admins before granting access.
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading pending requests...</div>
        ) : pendingUsers.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h3 className="text-base font-semibold text-slate-800">All caught up!</h3>
            <p className="text-xs text-slate-400 mt-1">There are no pending signup requests.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingUsers.map((u) => {
              let reqCategories = [];
              try {
                if (typeof u.requested_categories === 'string') {
                  reqCategories = JSON.parse(u.requested_categories || '[]');
                } else if (Array.isArray(u.requested_categories)) {
                  reqCategories = u.requested_categories;
                }
              } catch (e) {}

              return (
                <div
                  key={u.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{u.name}</span>
                      <span className="text-xs text-slate-400">&bull; {u.email}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        PENDING
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-1">
                      <span>
                        Requested Role:{' '}
                        <strong className="text-indigo-600">
                          {u.requested_role === 'SUB_ADMIN' ? 'Sub-Admin' : 'Lab Member'}
                        </strong>
                      </span>
                      {reqCategories.length > 0 && (
                        <span>
                          &bull; Requested Categories:{' '}
                          <strong>{reqCategories.join(', ')}</strong>
                        </span>
                      )}
                      <span className="text-slate-400">
                        &bull; Applied: {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openApprove(u)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => openReject(u)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {approveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Approve Onboarding: {selectedUser?.name}
            </h3>
            <p className="text-xs text-slate-500">
              Review and adjust their approved role and category responsibilities.
            </p>

            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Role
                </label>
                <select
                  value={assignedRole}
                  onChange={(e) => setAssignedRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none bg-white"
                >
                  <option value="USER">USER (Intern / Postdoc / Associate)</option>
                  <option value="SUB_ADMIN">SUB_ADMIN (Category Lead)</option>
                  <option value="ADMIN">ADMIN (Professor)</option>
                </select>
              </div>

              {assignedRole === 'SUB_ADMIN' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Assigned Categories
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-1">
                    {categories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={assignedCategories.includes(cat.id)}
                          onChange={() => toggleCategory(cat.id)}
                          className="rounded text-indigo-600"
                        />
                        <span>{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApproveModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  Confirm & Activate User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Reject Registration: {selectedUser?.name}
            </h3>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Unknown email domain, not affiliated with Cystar lab..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rejectReason.trim()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
