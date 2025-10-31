import React, { useMemo, useState } from 'react';
import { XMarkIcon, CalendarIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useOwnerApi } from '../../utils/ownerApi';
import type { ClosedPeriod } from '../../utils/ownerApi';

interface ClosedPeriodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: number; // kept prop name to avoid wide changes, but used as placeId
}

const ClosedPeriodsModal: React.FC<ClosedPeriodsModalProps> = ({ isOpen, onClose, businessId }) => {
  const { useClosedPeriods, useCreateClosedPeriod, useUpdateClosedPeriod, useDeleteClosedPeriod } = useOwnerApi();
  const { data: periods = [], isLoading } = useClosedPeriods(businessId);
  const createMutation = useCreateClosedPeriod();
  const updateMutation = useUpdateClosedPeriod();
  const deleteMutation = useDeleteClosedPeriod();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClosedPeriod | null>(null);
  const [form, setForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_full_day: true,
    half_day_period: 'AM' as 'AM' | 'PM',
    is_recurring: false,
    recurrence_pattern: undefined as any,
    status: 'active' as 'active' | 'inactive',
    notes: ''
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', start_date: '', end_date: '', is_full_day: true, half_day_period: 'AM', is_recurring: false, recurrence_pattern: undefined, status: 'active', notes: '' });
  };

  const openCreate = () => { resetForm(); setFormOpen(true); };
  const openEdit = (p: ClosedPeriod) => {
    setEditing(p);
    setForm({
      name: p.name,
      start_date: p.start_date,
      end_date: p.end_date,
      is_full_day: p.is_full_day,
      half_day_period: (p.half_day_period || 'AM') as 'AM' | 'PM',
      is_recurring: p.is_recurring,
      recurrence_pattern: p.recurrence_pattern,
      status: p.status,
      notes: p.notes || ''
    });
    setFormOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateMutation.mutateAsync({ placeId: businessId, id: editing.id, data: form });
      } else {
        await createMutation.mutateAsync({ placeId: businessId, data: form as any });
      }
      setFormOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save closed period:', err);
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm('Delete this closed period?')) return;
    try { await deleteMutation.mutateAsync({ placeId: businessId, id }); } catch (e) { console.error(e); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Business Closed Periods</h3>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-300 text-sm">Block bookings across all employees for public holidays or maintenance.</p>
            <button onClick={openCreate} className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Closed Period
            </button>
          </div>

          <div className="space-y-3">
            {periods.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div>
                  <div className="text-white font-medium">{p.name} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-600 text-gray-100">{p.status}</span></div>
                  <div className="text-gray-300 text-sm flex items-center mt-1">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{p.start_date} - {p.end_date}</span>
                    {!p.is_full_day && <span className="ml-2 text-xs">({p.half_day_period})</span>}
                    {p.is_recurring && <span className="ml-2 text-xs bg-blue-900/40 px-2 py-0.5 rounded">recurring</span>}
                  </div>
                  {p.notes && <div className="text-gray-400 text-sm mt-1">{p.notes}</div>}
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => openEdit(p)} className="p-1 text-gray-300 hover:text-white"><PencilIcon className="h-5 w-5" /></button>
                  <button onClick={() => onDelete(p.id)} className="p-1 text-red-400 hover:text-red-300"><TrashIcon className="h-5 w-5" /></button>
                </div>
              </div>
            ))}
            {periods.length === 0 && (
              <div className="p-6 text-center text-gray-400 bg-gray-700 rounded-lg">No closed periods yet.</div>
            )}
          </div>

          {formOpen && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Name</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">End Date</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Duration</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center text-white text-sm">
                      <input type="radio" checked={form.is_full_day} onChange={() => setForm({ ...form, is_full_day: true })} className="mr-2" /> Full Day
                    </label>
                    <label className="flex items-center text-white text-sm">
                      <input type="radio" checked={!form.is_full_day} onChange={() => setForm({ ...form, is_full_day: false })} className="mr-2" /> Half Day
                    </label>
                    {!form.is_full_day && (
                      <select value={form.half_day_period} onChange={e => setForm({ ...form, half_day_period: e.target.value as any })} className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                        <option value="AM">Morning (AM)</option>
                        <option value="PM">Afternoon (PM)</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Recurring</label>
                  <label className="flex items-center text-white text-sm">
                    <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked, recurrence_pattern: e.target.checked ? { frequency: 'yearly', month: new Date(form.start_date || Date.now()).getMonth() + 1, day: new Date(form.start_date || Date.now()).getDate() } : undefined })} className="mr-2" />
                    Repeat yearly on the same date
                  </label>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Notes (optional)</label>
                  <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                </div>

                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => { setFormOpen(false); resetForm(); }} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">{editing ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClosedPeriodsModal;


