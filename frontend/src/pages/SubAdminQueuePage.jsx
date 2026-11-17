import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox,
  Filter,
  ArrowUpDown,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  FolderTree
} from 'lucide-react';
import { getTickets, getTags } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, WaitingOnBadge, TagChip, AgeBadge } from '../components/Badges';

export function SubAdminQueuePage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'list'

  const userCategoryNames = (user?.categories || []).map((c) => c.name).join(', ') || 'Assigned Categories';

  const loadQueue = async () => {
    setLoading(true);
    try {
      const [tagsList, ticketsList] = await Promise.all([
        getTags(),
        getTickets({
          priority: priorityFilter || undefined,
          tag_id: tagFilter || undefined,
          sort_by: 'created_at',
          sort_dir: 'asc', // oldest first as required!
        }),
      ]);
      setTags(tagsList);
      setTickets(ticketsList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [priorityFilter, tagFilter]);

  // Group tickets by status
  const statusesOrder = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'AWAITING_APPROVAL', 'APPROVED', 'FULFILLED', 'CLOSED'];

  const groupedTickets = statusesOrder.reduce((acc, status) => {
    acc[status] = tickets.filter((t) => t.status === status);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Category Queue</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              {userCategoryNames}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Prioritized incoming requests in your domain. Oldest and urgent tickets highlighted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === 'grouped' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grouped
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Queue List
            </button>
          </div>

          <button
            type="button"
            onClick={loadQueue}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs text-xs">
        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </span>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none"
        >
          <option value="">All Priorities</option>
          <option value="Urgent">Urgent only</option>
          <option value="High">High & Urgent</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none"
        >
          <option value="">All Tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.name}
            </option>
          ))}
        </select>

        {(priorityFilter || tagFilter) && (
          <button
            type="button"
            onClick={() => {
              setPriorityFilter('');
              setTagFilter('');
            }}
            className="text-rose-600 font-medium hover:underline ml-2"
          >
            Reset
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
          <p className="text-sm">Loading queue...</p>
        </div>
      ) : viewMode === 'grouped' ? (
        /* Status Grouped Columns / Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statusesOrder
            .filter((status) => (groupedTickets[status] || []).length > 0)
            .map((status) => (
              <div
                key={status}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-xs font-bold text-slate-500">
                      ({groupedTickets[status].length})
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {groupedTickets[status].map((t) => (
                    <Link
                      key={t.id}
                      to={`/tickets/${t.id}`}
                      className="block p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-indigo-200 hover:shadow-xs transition group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-xs text-slate-900 group-hover:text-indigo-600 transition line-clamp-1">
                          #{t.id} {t.title}
                        </span>
                        <PriorityBadge priority={t.priority} />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                        <span>by {t.created_by_name}</span>
                        <AgeBadge days={t.age_days} />
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-1 text-[11px]">
                        <WaitingOnBadge waitingOn={t.waiting_on} status={t.status} />
                        {t.assignee && (
                          <span className="text-slate-500 font-medium">
                            &rarr; {t.assignee.name.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        /* Flat Queue List Sorted Oldest & Urgent First */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Waiting On</th>
                <th className="py-3 px-3">Assignee</th>
                <th className="py-3 px-4 text-right">Age (Days Old)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4">
                    <Link
                      to={`/tickets/${t.id}`}
                      className="font-semibold text-slate-900 hover:text-indigo-600 transition block"
                    >
                      <span className="font-mono text-slate-400 text-xs mr-1.5">#{t.id}</span>
                      {t.title}
                    </Link>
                    <span className="text-[11px] text-slate-400">by {t.created_by_name} &bull; {t.category?.name}</span>
                  </td>
                  <td className="py-3.5 px-3">
                    <PriorityBadge priority={t.priority} />
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
                    <AgeBadge days={t.age_days} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
