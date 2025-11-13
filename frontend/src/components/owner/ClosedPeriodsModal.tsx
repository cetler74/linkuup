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
    <div className="fixed inset-0 bg-charcoal bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-form w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-charcoal font-display">Business Closed Periods</h3>
            <button onClick={onClose} className="p-2 text-charcoal/60 hover:text-charcoal transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-charcoal/70 text-sm font-body">Block bookings across all employees for public holidays or maintenance.</p>
            <button onClick={openCreate} className="flex items-center px-3 py-2 bg-bright-blue text-white rounded-lg hover:bg-[#1877D2] transition-colors text-sm font-semibold font-body">
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Closed Period
            </button>
          </div>

          <div className="space-y-3">
            {periods.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-white border border-medium-gray rounded-lg shadow-sm">
                <div>
                  <div className="text-charcoal font-medium font-body">{p.name} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-light-gray text-charcoal border border-medium-gray">{p.status}</span></div>
                  <div className="text-charcoal/70 text-sm flex items-center mt-1 font-body">
                    <CalendarIcon className="h-4 w-4 mr-2 text-charcoal/60" />
                    <span>{p.start_date} - {p.end_date}</span>
                    {!p.is_full_day && <span className="ml-2 text-xs">({p.half_day_period})</span>}
                    {p.is_recurring && <span className="ml-2 text-xs bg-bright-blue/10 text-bright-blue px-2 py-0.5 rounded border border-bright-blue/20">recurring</span>}
                  </div>
                  {p.notes && <div className="text-charcoal/60 text-sm mt-1 font-body">{p.notes}</div>}
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => openEdit(p)} className="p-1 text-charcoal/60 hover:text-bright-blue transition-colors"><PencilIcon className="h-5 w-5" /></button>
                  <button onClick={() => onDelete(p.id)} className="p-1 text-coral-red hover:text-red-500 transition-colors"><TrashIcon className="h-5 w-5" /></button>
                </div>
              </div>
            ))}
            {periods.length === 0 && (
              <div className="p-6 text-center text-charcoal/60 bg-light-gray rounded-lg border border-medium-gray font-body">No closed periods yet.</div>
            )}
          </div>

          {formOpen && (
            <div className="mt-6 p-6 bg-white border border-medium-gray rounded-lg shadow-form">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-1 font-body">Name</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-1 font-body">Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className="input-field">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-1 font-body">Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-1 font-body">End Date</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="input-field" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-charcoal font-body">Duration</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center text-charcoal text-sm font-body">
                      <input type="radio" checked={form.is_full_day} onChange={() => setForm({ ...form, is_full_day: true })} className="mr-2 text-bright-blue focus:ring-bright-blue" /> Full Day
                    </label>
                    <label className="flex items-center text-charcoal text-sm font-body">
                      <input type="radio" checked={!form.is_full_day} onChange={() => setForm({ ...form, is_full_day: false })} className="mr-2 text-bright-blue focus:ring-bright-blue" /> Half Day
                    </label>
                    {!form.is_full_day && (
                      <select value={form.half_day_period} onChange={e => setForm({ ...form, half_day_period: e.target.value as any })} className="input-field text-sm">
                        <option value="AM">Morning (AM)</option>
                        <option value="PM">Afternoon (PM)</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-charcoal font-body">Recurring</label>
                  <label className="flex items-center text-charcoal text-sm font-body">
                    <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked, recurrence_pattern: e.target.checked ? { frequency: 'yearly', month: new Date(form.start_date || Date.now()).getMonth() + 1, day: new Date(form.start_date || Date.now()).getDate() } : undefined })} className="mr-2 text-bright-blue focus:ring-bright-blue rounded" />
                    Repeat yearly on the same date
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-1 font-body">Notes (optional)</label>
                  <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field" />
                </div>

                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => { setFormOpen(false); resetForm(); }} className="px-4 py-2 bg-light-gray text-charcoal rounded-lg hover:bg-medium-gray transition-colors font-semibold font-body">Cancel</button>
                  <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
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


