import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, CheckCircle, Ban, Edit2, RefreshCw } from 'lucide-react';
import { getUsers, createUser, updateUser, getCategories } from '../api';
import { useToast } from '../context/ToastContext';

export function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create User modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('USER');
  const [newUserCategories, setNewUserCategories] = useState([]);

  // Edit User modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState('USER');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editCategories, setEditCategories] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, cList] = await Promise.all([
        getUsers(roleFilter, statusFilter),
        getCategories(),
      ]);
      setUsers(uList);
      setCategories(cList);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter, statusFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
        categories: newUserRole === 'SUB_ADMIN' ? newUserCategories : [],
      });
      toast.success('User created directly and active immediately');
      setCreateModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to create user');
    }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditCategories((u.categories || []).map((c) => c.id));
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUser(editingUser.id, {
        role: editRole,
        status: editStatus,
        category_ids: editRole === 'SUB_ADMIN' ? editCategories : [],
      });
      toast.success('User updated successfully');
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update user');
    }
  };

  const handleQuickToggleStatus = async (u) => {
    const nextStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateUser(u.id, { status: nextStatus });
      toast.success(`User set to ${nextStatus}`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const toggleCategory = (catId, isNew = false) => {
    if (isNew) {
      setNewUserCategories((prev) =>
        prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
      );
    } else {
      setEditCategories((prev) =>
        prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lab Users & Roles</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage lab member accounts, sub-admin domain leads, and system access status.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add User Directly</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs text-xs">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">ADMIN (Professor)</option>
          <option value="SUB_ADMIN">SUB_ADMIN (Category Lead)</option>
          <option value="USER">USER (Lab Member)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none"
        >
          <option value="">All Account Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING">PENDING</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>

        {(roleFilter || statusFilter) && (
          <button
            onClick={() => {
              setRoleFilter('');
              setStatusFilter('');
            }}
            className="text-rose-600 font-medium hover:underline ml-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Assigned Domain</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/80 transition">
                <td className="py-3.5 px-4 font-semibold text-slate-900">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-400 font-normal">{u.email}</div>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-3">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : u.role === 'SUB_ADMIN'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>

                <td className="py-3.5 px-3">
                  {u.categories && u.categories.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {u.categories.map((c) => (
                        <span
                          key={c.id}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">None</span>
                  )}
                </td>

                <td className="py-3.5 px-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${
                      u.status === 'ACTIVE'
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        : u.status === 'PENDING'
                        ? 'text-amber-700 bg-amber-50 border border-amber-200'
                        : 'text-slate-500 bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-500'
                          : u.status === 'PENDING'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    {u.status}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                      title="Edit User"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {u.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleQuickToggleStatus(u)}
                        className={`p-1.5 rounded-lg transition ${
                          u.status === 'ACTIVE'
                            ? 'text-rose-500 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      >
                        {u.status === 'ACTIVE' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Create New Lab User</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none bg-white"
                >
                  <option value="USER">USER (Lab Member)</option>
                  <option value="SUB_ADMIN">SUB_ADMIN (Category Lead)</option>
                  <option value="ADMIN">ADMIN (Professor)</option>
                </select>
              </div>

              {newUserRole === 'SUB_ADMIN' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Categories
                  </label>
                  <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto p-1">
                    {categories.map((c) => (
                      <label key={c.id} className="text-xs flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={newUserCategories.includes(c.id)}
                          onChange={() => toggleCategory(c.id, true)}
                        />
                        <span>{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Edit User: {editingUser?.name}
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none bg-white"
                >
                  <option value="USER">USER (Lab Member)</option>
                  <option value="SUB_ADMIN">SUB_ADMIN (Category Lead)</option>
                  <option value="ADMIN">ADMIN (Professor)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>

              {editRole === 'SUB_ADMIN' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Categories
                  </label>
                  <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto p-1">
                    {categories.map((c) => (
                      <label key={c.id} className="text-xs flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={editCategories.includes(c.id)}
                          onChange={() => toggleCategory(c.id, false)}
                        />
                        <span>{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
