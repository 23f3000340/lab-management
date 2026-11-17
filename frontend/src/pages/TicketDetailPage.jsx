import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  ShieldAlert,
  Send,
  MessageSquare,
  Tag as TagIcon,
  CheckCircle,
  XCircle,
  Play,
  HelpCircle,
  Check,
  RotateCcw,
  UserPlus,
  AlertTriangle,
  History,
  FileText
} from 'lucide-react';
import {
  getTicket,
  updateTicketStatus,
  assignTicket,
  updateTicketTags,
  addComment,
  requestApproval,
  approveTicket,
  rejectTicket,
  getTags,
  getUsers,
  createTag
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge, PriorityBadge, WaitingOnBadge, TagChip, AgeBadge } from '../components/Badges';
import { NoteModal } from '../components/NoteModal';

export function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState([]);
  const [subAdmins, setSubAdmins] = useState([]);

  // Comment input
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Modals state
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    description: '',
    actionLabel: '',
    actionVariant: 'primary',
    placeholder: '',
    handler: null,
  });

  // Reassign modal state
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [reassignNote, setReassignNote] = useState('');

  // Tag add state
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const loadTicket = async () => {
    try {
      const data = await getTicket(id);
      setTicket(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load ticket');
      navigate('/tickets');
    } finally {
      setLoading(false);
    }
  };

  const loadAuxiliaryData = async () => {
    try {
      const [tagsData, usersData] = await Promise.all([
        getTags(),
        user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN' ? getUsers('', 'ACTIVE') : Promise.resolve([]),
      ]);
      setAllTags(tagsData);
      setSubAdmins(usersData.filter((u) => u.role === 'SUB_ADMIN' || u.role === 'ADMIN'));
    } catch (err) {}
  };

  useEffect(() => {
    loadTicket();
    loadAuxiliaryData();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm">Loading ticket details...</p>
      </div>
    );
  }

  if (!ticket) return null;

  const isCreator = user?.id === ticket.created_by;
  const isAdmin = user?.role === 'ADMIN';
  const isSubAdmin = user?.role === 'SUB_ADMIN';
  const isAssignee = user?.id === ticket.assigned_to;

  // Open note modal helper
  const openActionModal = ({
    title,
    description,
    actionLabel,
    actionVariant,
    placeholder,
    handler,
    showCheckbox = false,
    checkboxLabel = '',
  }) => {
    setModalConfig({
      isOpen: true,
      title,
      description,
      actionLabel,
      actionVariant,
      placeholder,
      handler,
      showCheckbox,
      checkboxLabel,
    });
  };

  // Status transitions
  const handleStartProgress = () => {
    openActionModal({
      title: 'Move to In Progress',
      description: 'Start working on this lab request.',
      actionLabel: 'Start Progress',
      actionVariant: 'primary',
      placeholder: 'Describe your plan or initial actions (e.g. provisioning started on cluster 2)...',
      handler: async (note) => {
        await updateTicketStatus(ticket.id, 'IN_PROGRESS', note);
        toast.success('Ticket moved to IN_PROGRESS');
        loadTicket();
      },
    });
  };

  const handleRequestInfo = () => {
    openActionModal({
      title: 'Request Information from Requester',
      description: 'The ticket will wait on the requester until they respond.',
      actionLabel: 'Request Info',
      actionVariant: 'primary',
      placeholder: 'Specify what additional details, specs, or account details you need from requester...',
      handler: async (note) => {
        await updateTicketStatus(ticket.id, 'NEEDS_INFO', note);
        toast.success('Information requested from requester');
        loadTicket();
      },
    });
  };

  const handleProvideInfo = () => {
    openActionModal({
      title: 'Provide Information & Resume',
      description: 'Send clarification to the sub-admin to resume work.',
      actionLabel: 'Submit Info',
      actionVariant: 'primary',
      placeholder: 'Type the requested details (specs, links, clarifications)...',
      handler: async (note) => {
        await updateTicketStatus(ticket.id, 'IN_PROGRESS', note);
        toast.success('Information submitted. Ticket resumed.');
        loadTicket();
      },
    });
  };

  const handleRequestAdminApproval = () => {
    openActionModal({
      title: 'Request Professor Approval',
      description: 'Forward this request to the Professor for sign-off (e.g. expensive purchase or quota expansion).',
      actionLabel: 'Request Approval',
      actionVariant: 'primary',
      placeholder: 'Explain why the professor approval is needed and cost/resource impact...',
      handler: async (note) => {
        await requestApproval(ticket.id, note);
        toast.success('Approval requested from Professor Admin');
        loadTicket();
      },
    });
  };

  const handleAdminApprove = () => {
    openActionModal({
      title: 'Approve Request',
      description: 'Sign off on this request as Professor Admin.',
      actionLabel: 'Approve Request',
      actionVariant: 'success',
      placeholder: 'Add approval note or instructions...',
      showCheckbox: true,
      checkboxLabel: 'Mark as completed / fulfilled directly (no sub-admin provisioning needed)',
      handler: async (note, fulfillDirectly = false) => {
        await approveTicket(ticket.id, note, fulfillDirectly);
        toast.success(fulfillDirectly ? 'Request approved and marked fulfilled!' : 'Request approved by Professor');
        loadTicket();
      },
    });
  };

  const handleAdminReject = () => {
    openActionModal({
      title: 'Reject Request',
      description: 'Reject this request with a formal explanation.',
      actionLabel: 'Reject Request',
      actionVariant: 'danger',
      placeholder: 'Explain reason for rejection (e.g. budget unavailable, alternative resource available)...',
      handler: async (note) => {
        await rejectTicket(ticket.id, note);
        toast.error('Request rejected');
        loadTicket();
      },
    });
  };

  const handleFulfill = () => {
    openActionModal({
      title: 'Mark as Fulfilled',
      description: 'Notify the requester that the requested resource or task is ready.',
      actionLabel: 'Mark Fulfilled',
      actionVariant: 'success',
      placeholder: 'Add completion note (e.g. VM created at 10.0.4.12, credentials sent via DM)...',
      handler: async (note) => {
        await updateTicketStatus(ticket.id, 'FULFILLED', note);
        toast.success('Request marked as FULFILLED');
        loadTicket();
      },
    });
  };

  const handleConfirmAndClose = () => {
    openActionModal({
      title: 'Confirm & Close Ticket',
      description: 'Confirm that the requested resource works and close the ticket.',
      actionLabel: 'Close Ticket',
      actionVariant: 'primary',
      placeholder: 'Confirmation note (e.g. verified VM access, everything works great)...',
      handler: async (note) => {
        await updateTicketStatus(ticket.id, 'CLOSED', note);
        toast.success('Ticket confirmed and closed!');
        loadTicket();
      },
    });
  };

  const handleAdminForceClose = () => {
    openActionModal({
      title: 'Close Ticket (Admin Override)',
      description: 'Professor Admin closing this ticket directly.',
      actionLabel: 'Close Ticket',
      actionVariant: 'danger',
      placeholder: 'Provide reason for closing this ticket...',
      handler: async (note) => {
        await updateTicketStatus(ticket.id, 'CLOSED', note);
        toast.info('Ticket closed by Admin');
        loadTicket();
      },
    });
  };

  const handleAdminReopen = () => {
    openActionModal({
      title: 'Re-Open Ticket',
      description: 'Reopen this closed or rejected ticket.',
      actionLabel: 'Reopen Ticket',
      actionVariant: 'primary',
      placeholder: 'Reason for reopening this request...',
      handler: async (note) => {
        await updateTicketStatus(ticket.id, 'OPEN', note);
        toast.info('Ticket reopened');
        loadTicket();
      },
    });
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignee) {
      toast.error('Please select an assignee');
      return;
    }
    if (reassignNote.trim().length < 5) {
      toast.error('Note must be at least 5 characters');
      return;
    }

    try {
      await assignTicket(ticket.id, parseInt(selectedAssignee, 10), reassignNote.trim());
      toast.success('Ticket reassigned');
      setReassignModalOpen(false);
      setReassignNote('');
      loadTicket();
    } catch (err) {
      toast.error(err.message || 'Failed to reassign');
    }
  };

  // Tag management
  const handleRemoveTag = async (tagId) => {
    const updatedTagIds = (ticket.tags || []).filter((t) => t.id !== tagId).map((t) => t.id);
    try {
      await updateTicketTags(ticket.id, updatedTagIds);
      toast.success('Tag removed');
      loadTicket();
    } catch (err) {
      toast.error(err.message || 'Failed to update tags');
    }
  };

  const handleAddTag = async (tagId) => {
    const currentTagIds = (ticket.tags || []).map((t) => t.id);
    if (currentTagIds.includes(tagId)) return;
    try {
      await updateTicketTags(ticket.id, [...currentTagIds, tagId]);
      toast.success('Tag added');
      setShowTagDropdown(false);
      loadTicket();
    } catch (err) {
      toast.error(err.message || 'Failed to add tag');
    }
  };

  const handleCreateAndAddTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const created = await createTag(newTagName.trim());
      await handleAddTag(created.id);
      setNewTagName('');
    } catch (err) {
      toast.error(err.message || 'Failed to create tag');
    }
  };

  // Comment submit
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (commentText.trim().length < 5) {
      toast.error('Comment must be at least 5 characters long.');
      return;
    }
    setSubmittingComment(true);
    try {
      await addComment(ticket.id, commentText.trim());
      toast.success('Comment added');
      setCommentText('');
      loadTicket();
    } catch (err) {
      toast.error(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to tickets</span>
        </Link>

        {/* Role-Aware Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Creator actions */}
          {ticket.status === 'NEEDS_INFO' && (isCreator || isAdmin) && (
            <button
              onClick={handleProvideInfo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Provide Info</span>
            </button>
          )}

          {ticket.status === 'FULFILLED' && (isCreator || isAdmin) && (
            <button
              onClick={handleConfirmAndClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Confirm & Close</span>
            </button>
          )}

          {/* Sub-Admin / Admin operations */}
          {(isSubAdmin || isAdmin) && (
            <>
              {(ticket.status === 'OPEN' || ticket.status === 'ASSIGNED') && (
                <button
                  onClick={handleStartProgress}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Progress</span>
                </button>
              )}

              {ticket.status === 'IN_PROGRESS' && (
                <>
                  <button
                    onClick={handleRequestInfo}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Request Info</span>
                  </button>

                  <button
                    onClick={handleRequestAdminApproval}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Ask Approval</span>
                  </button>

                  <button
                    onClick={handleFulfill}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Fulfill</span>
                  </button>
                </>
              )}

              {ticket.status === 'APPROVED' && (
                <button
                  onClick={handleFulfill}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Fulfill (Approved)</span>
                </button>
              )}

              {/* Reassign button */}
              {ticket.status !== 'CLOSED' && ticket.status !== 'REJECTED' && (
                <button
                  onClick={() => {
                    setSelectedAssignee(ticket.assigned_to?.toString() || '');
                    setReassignModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Reassign</span>
                </button>
              )}
            </>
          )}

          {/* Admin Exclusive Approval Flow */}
          {isAdmin && ticket.status === 'AWAITING_APPROVAL' && (
            <>
              <button
                onClick={handleAdminApprove}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve Request</span>
              </button>
              <button
                onClick={handleAdminReject}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </>
          )}

          {/* Admin force close/reopen */}
          {isAdmin && ticket.status !== 'CLOSED' && ticket.status !== 'FULFILLED' && ticket.status !== 'AWAITING_APPROVAL' && (
            <button
              onClick={handleAdminForceClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition"
            >
              <span>Close Ticket</span>
            </button>
          )}

          {isAdmin && (ticket.status === 'CLOSED' || ticket.status === 'REJECTED') && (
            <button
              onClick={handleAdminReopen}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Ticket Card Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-mono font-bold text-slate-400">#{ticket.id}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
              {ticket.category?.name}
            </span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <WaitingOnBadge waitingOn={ticket.waiting_on} status={ticket.status} />
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-3">
            {ticket.due_date && (
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Due {ticket.due_date}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Updated {ticket.updated_at ? new Date(ticket.updated_at).toLocaleDateString() : 'recently'}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-snug">{ticket.title}</h1>
          <div className="mt-3 p-4 bg-slate-50/80 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {ticket.description}
          </div>
        </div>

        {/* Requester & Assignee Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm">
              {ticket.creator?.name ? ticket.creator.name.charAt(0) : 'U'}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Requested By
              </div>
              <div className="text-sm font-semibold text-slate-800">{ticket.creator?.name}</div>
              <div className="text-xs text-slate-500">{ticket.creator?.email}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm">
              {ticket.assignee ? ticket.assignee.name.charAt(0) : '?'}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Assigned Lead
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {ticket.assignee ? ticket.assignee.name : <span className="italic text-slate-400">Unassigned</span>}
              </div>
              <div className="text-xs text-slate-500">
                {ticket.assignee ? ticket.assignee.email : 'No handler assigned'}
              </div>
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <TagIcon className="w-3.5 h-3.5" /> Tags:
          </span>
          {ticket.tags && ticket.tags.length > 0 ? (
            ticket.tags.map((tag) => (
              <TagChip
                key={tag.id}
                tag={tag}
                onRemove={(isCreator || isSubAdmin || isAdmin) ? handleRemoveTag : null}
              />
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">No tags attached</span>
          )}

          {/* Add Tag Dropdown */}
          {(isCreator || isSubAdmin || isAdmin) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className="text-xs px-2 py-0.5 rounded-md border border-dashed border-slate-300 text-slate-500 hover:border-indigo-500 hover:text-indigo-600 transition"
              >
                + Add Tag
              </button>

              {showTagDropdown && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-20 animate-fade-in">
                  <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Select Tag:
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 p-1">
                    {allTags
                      .filter((t) => !(ticket.tags || []).some((tt) => tt.id === t.id))
                      .map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleAddTag(tag.id)}
                          className="w-full text-left px-2 py-1 rounded-md text-xs hover:bg-slate-50 flex items-center gap-2"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{tag.name}</span>
                        </button>
                      ))}
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="New tag..."
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="w-full px-2 py-1 text-xs border rounded-lg outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateAndAddTag}
                      disabled={!newTagName.trim()}
                      className="px-2 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Activity Log / Timeline Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Activity Timeline & Audit Trail</h2>
          </div>
          <span className="text-xs text-slate-400">Append-only audit log</span>
        </div>

        {/* Timeline List */}
        <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {ticket.activity_logs && ticket.activity_logs.length > 0 ? (
            ticket.activity_logs.map((log) => {
              const isStatusChange = log.action === 'status_changed';
              const isApproval = log.action === 'approved' || log.action === 'rejected';
              const isComment = log.action === 'commented';

              const roleBadgeColor = {
                ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
                SUB_ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
                USER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              }[log.actor_role] || 'bg-slate-100 text-slate-700 border-slate-200';

              const roleLabel = {
                ADMIN: 'Professor',
                SUB_ADMIN: 'Sub-Admin',
                USER: 'Requester',
              }[log.actor_role] || log.actor_role || 'Member';

              const actionLabels = {
                created: 'created request',
                status_changed: 'changed status',
                assigned: 'assigned lead',
                reassigned: 'reassigned lead',
                approval_requested: 'requested Professor approval',
                approved: 'approved request',
                rejected: 'rejected request',
                commented: 'commented',
                tag_added: 'added tag',
                tag_removed: 'removed tag',
              };

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline bullet dot */}
                  <div
                    className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                      isApproval
                        ? log.action === 'approved'
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                        : isStatusChange
                        ? 'bg-indigo-600'
                        : isComment
                        ? 'bg-sky-500'
                        : 'bg-slate-400'
                    }`}
                  />

                  <div className="bg-slate-50/70 hover:bg-slate-50 transition rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Actor Name & Avatar */}
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {(log.actor_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-xs text-slate-900">
                            {log.actor_name || 'Lab Member'}
                          </span>
                        </div>

                        {/* Actor Role Badge */}
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold border ${roleBadgeColor}`}>
                          {roleLabel}
                        </span>

                        <span className="text-xs text-slate-500 font-medium">
                          {actionLabels[log.action] || log.action.replace('_', ' ')}
                        </span>

                        {log.old_value && log.new_value && (
                          <span className="text-xs font-mono font-medium text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {log.old_value} &rarr; <strong>{log.new_value}</strong>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(log.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Note requirement display with clear quote indicator */}
                    {log.note && (
                      <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed shadow-xs">
                        <span className="font-semibold text-slate-500 mr-1.5">Note:</span>
                        {log.note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-400 italic">No activity recorded yet.</div>
          )}
        </div>

        {/* General Discussion / Comment Box */}
        <form onSubmit={handleAddComment} className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            Add General Comment or Follow-up Note:
          </div>
          <textarea
            rows={2}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Type a comment or discussion update (min 5 characters)..."
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Note will be permanently appended to the ticket timeline.
            </span>
            <button
              type="submit"
              disabled={submittingComment || commentText.trim().length < 5}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Note Modal for Actions */}
      <NoteModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={modalConfig.handler}
        title={modalConfig.title}
        description={modalConfig.description}
        actionLabel={modalConfig.actionLabel}
        actionVariant={modalConfig.actionVariant}
        placeholder={modalConfig.placeholder}
        showCheckbox={modalConfig.showCheckbox}
        checkboxLabel={modalConfig.checkboxLabel}
      />

      {/* Reassign Modal */}
      {reassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Reassign Request Lead</h3>
            <form onSubmit={handleReassignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Assignee
                </label>
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="">-- Choose Sub-Admin --</option>
                  {subAdmins.map((adm) => (
                    <option key={adm.id} value={adm.id}>
                      {adm.name} ({adm.role === 'ADMIN' ? 'Professor' : 'Sub-Admin'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reassignment Reason Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this request is being reassigned (min 5 characters)..."
                  value={reassignNote}
                  onChange={(e) => setReassignNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedAssignee || reassignNote.trim().length < 5}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50"
                >
                  Save Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
