import React from 'react';
import { Clock, AlertTriangle, ShieldCheck, UserCheck, HelpCircle, CheckCircle2 } from 'lucide-react';

export function StatusBadge({ status }) {
  const configs = {
    OPEN: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Open' },
    ASSIGNED: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'Assigned' },
    IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'In Progress' },
    NEEDS_INFO: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Needs Info' },
    AWAITING_APPROVAL: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Awaiting Approval' },
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Approved' },
    REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Rejected' },
    FULFILLED: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', label: 'Fulfilled' },
    CLOSED: { bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200', label: 'Closed' },
  };

  const config = configs[status] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: status };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const configs = {
    Low: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
    Medium: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500' },
    High: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    Urgent: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-600' },
  };

  const config = configs[priority] || configs.Medium;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {priority}
    </span>
  );
}

export function WaitingOnBadge({ waitingOn, status }) {
  if (status === 'CLOSED' || status === 'REJECTED') {
    return null;
  }

  if (status === 'FULFILLED') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200"
        title="Request fulfilled & ready for confirmation"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Fulfilled / Done</span>
      </span>
    );
  }

  if (status === 'APPROVED') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-purple-50 text-purple-800 border-purple-200"
        title="Approved by Professor - In queue for fulfillment"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
        <span>Approved &bull; Sub-Admin Provisioning</span>
      </span>
    );
  }

  if (!waitingOn) return null;

  const configs = {
    USER: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: HelpCircle,
      label: 'Waiting on Requester',
    },
    SUB_ADMIN: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      icon: UserCheck,
      label: 'Waiting on Sub-Admin',
    },
    ADMIN: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
      icon: ShieldCheck,
      label: 'Waiting on Professor',
    },
  };

  const config = configs[waitingOn] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: Clock,
    label: `Waiting on ${waitingOn}`,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
      title={config.label}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}

export function TagChip({ tag, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-white shadow-xs"
      style={{
        borderColor: tag.color ? `${tag.color}40` : '#cbd5e1',
        color: tag.color || '#334155',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: tag.color || '#64748b' }}
      />
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag.id);
          }}
          className="ml-0.5 hover:opacity-80 cursor-pointer"
        >
          &times;
        </button>
      )}
    </span>
  );
}

export function AgeBadge({ days, isOverdue = false }) {
  let text = 'Updated today';
  if (days === 1) text = '1d ago';
  else if (days > 1) text = `${days}d ago`;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isOverdue ? 'text-rose-600 font-semibold' : days >= 3 ? 'text-amber-600' : 'text-slate-500'
      }`}
    >
      <Clock className="w-3 h-3" />
      {text}
    </span>
  );
}
