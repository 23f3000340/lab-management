import React, { useState, useEffect } from 'react';
import { Tags, Plus, Edit2, Trash2, Merge, RefreshCw } from 'lucide-react';
import { getTags, createTag, renameTag, deleteTag, mergeTags } from '../api';
import { TagChip } from '../components/Badges';
import { useToast } from '../context/ToastContext';

export function AdminTagsPage() {
  const toast = useToast();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Tag
  const [newTagName, setNewTagName] = useState('');

  // Rename Modal
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [tagToRename, setTagToRename] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Merge Modal
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [sourceTagId, setSourceTagId] = useState('');
  const [targetTagId, setTargetTagId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getTags();
      setTags(data);
    } catch (err) {
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      await createTag(newTagName.trim());
      toast.success('Tag created');
      setNewTagName('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to create tag');
    }
  };

  const openRename = (tag) => {
    setTagToRename(tag);
    setRenameValue(tag.name);
    setRenameModalOpen(true);
  };

  const handleRename = async (e) => {
    e.preventDefault();
    try {
      await renameTag(tagToRename.id, renameValue.trim());
      toast.success('Tag renamed');
      setRenameModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to rename tag');
    }
  };

  const handleDelete = async (tag) => {
    if (!window.confirm(`Are you sure you want to delete tag #${tag.name}? It will be removed from all associated tickets.`)) {
      return;
    }
    try {
      await deleteTag(tag.id);
      toast.success(`Tag #${tag.name} deleted`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete tag');
    }
  };

  const handleMerge = async (e) => {
    e.preventDefault();
    if (!sourceTagId || !targetTagId || sourceTagId === targetTagId) {
      toast.error('Please select two distinct tags to merge');
      return;
    }
    try {
      await mergeTags(parseInt(sourceTagId, 10), parseInt(targetTagId, 10));
      toast.success('Tags merged successfully');
      setMergeModalOpen(false);
      setSourceTagId('');
      setTargetTagId('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to merge tags');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lab Tags & Taxonomies</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize tickets with reusable colored tags. Admin can rename, prune, or merge duplicates.
          </p>
        </div>

        <button
          onClick={() => setMergeModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition"
        >
          <Merge className="w-4 h-4 text-slate-500" />
          <span>Merge Tags</span>
        </button>
      </div>

      {/* Quick Add Tag Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleCreate} className="flex items-center gap-3">
          <input
            type="text"
            required
            placeholder="Create a new tag (e.g. GPU, Reimbursement, Docker, Lab-Keys)..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Tag</span>
          </button>
        </form>
      </div>

      {/* Tags Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-slate-300 transition"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <div>
                <span className="font-bold text-sm text-slate-800">#{tag.name}</span>
                <span className="text-[11px] text-slate-400 block">
                  {tag.usage_count || 0} ticket{tag.usage_count === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => openRename(tag)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50"
                title="Rename tag"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(tag)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                title="Delete tag"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Rename Modal */}
      {renameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Rename Tag</h3>
            <form onSubmit={handleRename} className="space-y-4">
              <input
                type="text"
                required
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Save Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {mergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Merge Tags</h3>
            <p className="text-xs text-slate-500">
              Move all ticket associations from Source Tag into Target Tag, then remove the Source Tag.
            </p>

            <form onSubmit={handleMerge} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Source Tag (will be deleted)
                </label>
                <select
                  value={sourceTagId}
                  onChange={(e) => setSourceTagId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none bg-white"
                >
                  <option value="">-- Choose Source Tag --</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.name} ({t.usage_count || 0} tickets)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Tag (will receive all tickets)
                </label>
                <select
                  value={targetTagId}
                  onChange={(e) => setTargetTagId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none bg-white"
                >
                  <option value="">-- Choose Target Tag --</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMergeModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!sourceTagId || !targetTagId || sourceTagId === targetTagId}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  Confirm Merge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
