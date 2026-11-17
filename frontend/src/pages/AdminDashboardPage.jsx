import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Inbox,
  ArrowRight,
  Check,
  X,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import {
  getDashboardSummary,
  getDashboardCharts,
  getDashboardStuck,
  getTickets,
  approveTicket,
  rejectTicket,
  getCategories,
  getTags
} from '../api';
import { StatusBadge, PriorityBadge, WaitingOnBadge, TagChip, AgeBadge } from '../components/Badges';
import { NoteModal } from '../components/NoteModal';
import { useToast } from '../context/ToastContext';

export function AdminDashboardPage() {
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [stuckTickets, setStuckTickets] = useState([]);
  const [awaitingTickets, setAwaitingTickets] = useState([]);
  const [stuckDays, setStuckDays] = useState(3);
  const [loading, setLoading] = useState(true);

  // Note modal state
  const [noteModal, setNoteModal] = useState({
    isOpen: false,
    ticketId: null,
    action: null, // 'approve' or 'reject'
    title: '',
  });

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [sum, chr, stk, awt] = await Promise.all([
        getDashboardSummary(stuckDays),
        getDashboardCharts(),
        getDashboardStuck(stuckDays),
        getTickets({ status: 'AWAITING_APPROVAL' }),
      ]);
      setSummary(sum);
      setCharts(chr);
      setStuckTickets(stk);
      setAwaitingTickets(awt);
    } catch (err) {
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [stuckDays]);

  const handleOpenApproveModal = (ticketId, ticketTitle) => {
    setNoteModal({
      isOpen: true,
      ticketId,
      action: 'approve',
      title: `Approve Request: ${ticketTitle}`,
    });
  };

  const handleOpenRejectModal = (ticketId, ticketTitle) => {
    setNoteModal({
      isOpen: true,
      ticketId,
      action: 'reject',
      title: `Reject Request: ${ticketTitle}`,
    });
  };

  const handleModalSubmit = async (note, fulfillDirectly = false) => {
    if (noteModal.action === 'approve') {
      await approveTicket(noteModal.ticketId, note, fulfillDirectly);
      toast.success(fulfillDirectly ? 'Request approved and marked fulfilled!' : 'Request approved and routed to Sub-Admin!');
    } else {
      await rejectTicket(noteModal.ticketId, note);
      toast.error('Request rejected');
    }
    loadDashboard();
  };

  const STATUS_COLORS = {
    OPEN: '#94a3b8',
    ASSIGNED: '#818cf8',
    IN_PROGRESS: '#3b82f6',
    NEEDS_INFO: '#f59e0b',
    AWAITING_APPROVAL: '#a855f7',
    APPROVED: '#10b981',
    REJECTED: '#f43f5e',
    FULFILLED: '#14b8a6',
    CLOSED: '#71717a',
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Professor Admin Command Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time health, approval bottlenecks, stuck requests, and resource workloads across all research areas.
          </p>
        </div>

        {/* Configurable Stuck Days Filter */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-xs">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-600">Stuck Threshold:</span>
          <select
            value={stuckDays}
            onChange={(e) => setStuckDays(parseInt(e.target.value, 10))}
            className="font-bold text-indigo-600 bg-transparent outline-none cursor-pointer"
          >
            <option value={1}>&gt; 1 Day</option>
            <option value={2}>&gt; 2 Days</option>
            <option value={3}>&gt; 3 Days (Standard)</option>
            <option value={5}>&gt; 5 Days</option>
            <option value={7}>&gt; 7 Days</option>
          </select>
        </div>
      </div>

      {/* 6 Key Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Open */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Open</span>
            <Inbox className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{summary?.open ?? '-'}</div>
          <div className="text-[11px] text-slate-400 mt-1">Awaiting dispatch</div>
        </div>

        {/* Awaiting Approval */}
        <div className={`p-4 rounded-2xl border shadow-xs transition ${
          summary?.awaiting_my_approval > 0
            ? 'bg-purple-50/70 border-purple-200 text-purple-900'
            : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Needs My Sign-Off</span>
            <ShieldAlert className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700">
            {summary?.awaiting_my_approval ?? '-'}
          </div>
          <div className="text-[11px] text-purple-600 font-medium mt-1">One-click approval below</div>
        </div>

        {/* Stuck */}
        <div className={`p-4 rounded-2xl border shadow-xs transition ${
          summary?.stuck > 0
            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
            : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Stuck ({stuckDays}d+)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{summary?.stuck ?? '-'}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">No activity &gt; {stuckDays} days</div>
        </div>

        {/* Overdue */}
        <div className={`p-4 rounded-2xl border shadow-xs transition ${
          summary?.overdue > 0
            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
            : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{summary?.overdue ?? '-'}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">Past target due date</div>
        </div>

        {/* Resolved This Week */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Resolved (7d)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {summary?.resolved_this_week ?? '-'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Fulfilled / Closed</div>
        </div>

        {/* Pending Onboarding */}
        <Link
          to="/onboarding"
          className={`p-4 rounded-2xl border shadow-xs transition group block ${
            summary?.pending_onboarding > 0
              ? 'bg-blue-50/70 border-blue-200 text-blue-900 hover:border-blue-300'
              : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Onboarding</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {summary?.pending_onboarding ?? '-'}
          </div>
          <div className="text-[11px] text-blue-600 font-medium mt-1 flex items-center justify-between">
            <span>Pending review</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition" />
          </div>
        </Link>
      </div>

      {/* Awaiting Professor Approval Section (One-click Approve/Reject) */}
      <div className="bg-white rounded-2xl border border-purple-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-purple-50/60 border-b border-purple-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-700" />
            <h2 className="text-base font-bold text-purple-950">
              Awaiting Professor Approval ({awaitingTickets.length})
            </h2>
          </div>
          <span className="text-xs text-purple-700 font-medium">One-click decision with required note</span>
        </div>

        {awaitingTickets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            🎉 Great job! No requests are currently waiting on your approval.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {awaitingTickets.map((t) => (
              <div
                key={t.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-400">#{t.id}</span>
                    <Link
                      to={`/tickets/${t.id}`}
                      className="font-bold text-slate-900 hover:text-indigo-600 transition text-sm"
                    >
                      {t.title}
                    </Link>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {t.category?.name}
                    </span>
                    <PriorityBadge priority={t.priority} />
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-1">{t.description}</p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span>Requester: <strong>{t.created_by_name}</strong></span>
                    {t.assignee && <span>Sub-Admin: <strong>{t.assignee.name}</strong></span>}
                    <AgeBadge days={t.age_days} />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenApproveModal(t.id, t.title)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleOpenRejectModal(t.id, t.title)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <Link
                    to={`/tickets/${t.id}`}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets by Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Tickets by Status
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.by_status || []} layout="vertical" margin={{ left: 30, right: 20 }}>
                <XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="status" type="category" stroke="#94a3b8" fontSize={10} width={90} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {(charts?.by_status || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tickets by Category */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Tickets by Category
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.by_category || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sub-Admin Workload */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Workload per Sub-Admin (Active Tickets)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts?.workload_per_sub_admin || []}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="assigned_count" name="Assigned" fill="#818cf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="in_progress_count" name="In Progress" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Tags */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Top Request Tags
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.by_tag || []} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="tag" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stuck Tickets List */}
      <div className="bg-white rounded-2xl border border-amber-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-700" />
            <h2 className="text-base font-bold text-amber-950">
              Stuck Tickets (No Update &gt; {stuckDays} Days)
            </h2>
          </div>
          <span className="text-xs text-amber-800 font-medium">
            {stuckTickets.length} bottleneck{stuckTickets.length === 1 ? '' : 's'} identified
          </span>
        </div>

        {stuckTickets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No stuck tickets found! All requests are moving actively.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Waiting On</th>
                  <th className="py-3 px-3">Assignee</th>
                  <th className="py-3 px-4 text-right">Days Inactive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stuckTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <Link to={`/tickets/${t.id}`} className="hover:text-indigo-600 transition">
                        <span className="font-mono text-slate-400 text-xs mr-1">#{t.id}</span>
                        {t.title}
                      </Link>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {t.category?.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3.5 px-3">
                      <WaitingOnBadge waitingOn={t.waiting_on} status={t.status} />
                    </td>
                    <td className="py-3.5 px-3 text-xs">
                      {t.assignee?.name || <span className="italic text-slate-400">Unassigned</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {t.days_stuck} days stuck
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note modal */}
      <NoteModal
        isOpen={noteModal.isOpen}
        onClose={() => setNoteModal((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={handleModalSubmit}
        title={noteModal.title}
        actionLabel={noteModal.action === 'approve' ? 'Approve' : 'Reject'}
        actionVariant={noteModal.action === 'approve' ? 'success' : 'danger'}
        placeholder={`Enter note explaining this ${noteModal.action} decision...`}
        showCheckbox={noteModal.action === 'approve'}
        checkboxLabel="Mark as completed / fulfilled directly (no sub-admin provisioning needed)"
      />
    </div>
  );
}
