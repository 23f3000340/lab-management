import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';

export function NoteModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  actionLabel = 'Submit',
  actionVariant = 'primary', // primary, danger, success
  placeholder = 'Add a required note explaining this change (e.g. why the ticket is being updated, credentials sent, reason for approval/rejection)...',
  minChars = 5,
  showCheckbox = false,
  checkboxLabel = 'Mark as fulfilled/completed directly (no sub-admin provisioning needed)',
  defaultChecked = false,
}) {
  const [note, setNote] = useState('');
  const [isChecked, setIsChecked] = useState(defaultChecked);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (note.trim().length < minChars) {
      setError(`A note explaining this change is required (minimum ${minChars} characters).`);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(note.trim(), isChecked);
      setNote('');
      setIsChecked(defaultChecked);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to perform action');
    } finally {
      setSubmitting(false);
    }
  };

  const variantBtn = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  }[actionVariant] || 'bg-indigo-600 hover:bg-indigo-700 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden transition-all transform scale-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason / Status Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error && e.target.value.trim().length >= minChars) setError('');
              }}
              placeholder={placeholder}
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                error ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
              } transition outline-none resize-none`}
              autoFocus
            />
            <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
              <span>Required for audit trail & timeline.</span>
              <span className={note.trim().length < minChars ? 'text-amber-600 font-medium' : 'text-emerald-600'}>
                {note.trim().length} / {minChars} min chars
              </span>
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {showCheckbox && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 cursor-pointer hover:bg-purple-100/70 transition">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
              />
              <span className="font-semibold leading-relaxed">{checkboxLabel}</span>
            </label>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || note.trim().length < minChars}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed ${variantBtn}`}
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : actionLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
