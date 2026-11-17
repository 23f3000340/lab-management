import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Ticket as TicketIcon,
  Calendar,
  User,
  Tag as TagIcon,
  RefreshCw,
  Clock
} from 'lucide-react';
import { getTickets, getCategories, getTags } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, WaitingOnBadge, TagChip, AgeBadge } from '../components/Badges';
import { NewTicketModal } from '../components/NewTicketModal';

export function TicketsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category_id') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '');
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag_id') || '');
  const [waitingOnFilter, setWaitingOnFilter] = useState(searchParams.get('waiting_on') || '');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, tagsList] = await Promise.all([getCategories(), getTags()]);
      setCategories(cats);
      setTags(tagsList);

      const params = {
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        category_id: categoryFilter || undefined,
        priority: priorityFilter || undefined,
        tag_id: tagFilter || undefined,
        waiting_on: waitingOnFilter || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      };

      const data = await getTickets(params);
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, categoryFilter, priorityFilter, tagFilter, waitingOnFilter, sortBy, sortDir]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setPriorityFilter('');
    setTagFilter('');
    setWaitingOnFilter('');
    setSortBy('updated_at');
    setSortDir('desc');
  };

  const hasActiveFilters =
    search || statusFilter || categoryFilter || priorityFilter || tagFilter || waitingOnFilter;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {user?.role === 'ADMIN' ? 'All Lab Requests' : user?.role === 'SUB_ADMIN' ? 'Tickets' : 'My Requests'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.role === 'ADMIN'
              ? 'Complete overview of all lab tickets across departments and teams.'
              : user?.role === 'SUB_ADMIN'
              ? 'Requests in your assigned domain and requests raised by you.'
              : 'Track the real-time status, assignee, and history of your lab requests.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Request</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, description, or requester..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
          </form>

          {/* Quick Filter Selects */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:border-indigo-500 outline-none text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="NEEDS_INFO">NEEDS_INFO</option>
              <option value="AWAITING_APPROVAL">AWAITING_APPROVAL</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="FULFILLED">FULFILLED</option>
              <option value="CLOSED">CLOSED</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:border-indigo-500 outline-none text-slate-700"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:border-indigo-500 outline-none text-slate-700"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>

            <select
              value={waitingOnFilter}
              onChange={(e) => setWaitingOnFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:border-indigo-500 outline-none text-slate-700"
            >
              <option value="">Waiting on Anyone</option>
              <option value="USER">Waiting on Requester</option>
              <option value="SUB_ADMIN">Waiting on Sub-Admin</option>
              <option value="ADMIN">Waiting on Professor</option>
            </select>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:border-indigo-500 outline-none text-slate-700"
            >
              <option value="">All Tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.name}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tickets List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="text-sm">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <TicketIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No requests found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your filters or search keywords.'
                : 'No requests have been submitted yet. Raise your first request in seconds!'}
            </p>
            {!hasActiveFilters && (
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>New Request</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Ticket</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3">Priority</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Waiting On</th>
                  <th className="py-3.5 px-3">Assignee</th>
                  <th className="py-3.5 px-3">Tags</th>
                  <th className="py-3.5 px-4 text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/80 transition group cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <Link to={`/tickets/${t.id}`} className="block group-hover:text-indigo-600 transition">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">#{t.id}</span>
                          <span className="font-semibold text-sm line-clamp-1">{t.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>by {t.created_by_name || 'Requester'}</span>
                          {t.due_date && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Calendar className="w-3 h-3" />
                              Due {t.due_date}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {t.category?.name || 'Category'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusBadge status={t.status} />
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <WaitingOnBadge waitingOn={t.waiting_on} status={t.status} />
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-slate-600">
                      {t.assignee ? (
                        <div className="flex items-center gap-1.5 font-medium">
                          <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-[10px]">
                            {t.assignee.name.charAt(0)}
                          </div>
                          <span>{t.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {t.tags && t.tags.length > 0 ? (
                          t.tags.slice(0, 3).map((tag) => <TagChip key={tag.id} tag={tag} />)
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                        {t.tags && t.tags.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            +{t.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <AgeBadge days={t.age_days} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewTicketModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={() => loadData()}
      />
    </div>
  );
}
