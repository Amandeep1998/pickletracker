import React, { useEffect, useState, useMemo } from 'react';
import * as api from '../services/api';
import Modal from '../components/Modal';
import ExpenseForm from '../components/ExpenseForm';
import { formatINR } from '../utils/format';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('add');
  const [selectedExpense, setSelectedExpense] = useState(null);

  const fetchExpenses = async () => {
    try {
      const res = await api.getExpenses();
      // Only show gear items (filter out any legacy court_booking entries)
      setExpenses(res.data.data.filter((e) => e.type === 'gear'));
    } catch {
      setApiError('Failed to load gear expenses');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const openAdd = () => { setMode('add'); setSelectedExpense(null); setApiError(''); setModalOpen(true); };
  const openEdit = (e) => { setMode('edit'); setSelectedExpense(e); setApiError(''); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setSelectedExpense(null); setApiError(''); };

  const handleAdd = async (data) => {
    setFormLoading(true);
    setApiError('');
    try {
      await api.createExpense(data);
      closeModal();
      fetchExpenses();
    } catch (err) {
      setApiError(err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to add item');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (data) => {
    setFormLoading(true);
    setApiError('');
    try {
      await api.updateExpense(selectedExpense._id, data);
      closeModal();
      fetchExpenses();
    } catch (err) {
      setApiError(err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to update item');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await api.deleteExpense(id);
      setDeleteId(null);
      fetchExpenses();
    } catch {
      setApiError('Failed to delete item');
    } finally {
      setDeleteLoading(false);
    }
  };

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

      {/* Hero Banner */}
      <div
        className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6 mb-6 flex items-center justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 50%, #a86010 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #91BE4D 0%, transparent 60%)' }} />
        <div className="relative">
          <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-1">PickleTracker</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">Gear & Equipment</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Track your pickleball gear purchases</p>
        </div>
        <button
          onClick={openAdd}
          className="relative flex-shrink-0 hover:opacity-90 text-white font-bold px-4 py-2.5 rounded-xl text-sm tracking-wide transition-opacity shadow-lg"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
        >
          + Add Gear
        </button>
      </div>

      {apiError && !modalOpen && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{apiError}</div>
      )}

      {/* Total spend card */}
      {expenses.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎒</span>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total gear spend</p>
              <p className="text-xl font-black" style={{ background: 'linear-gradient(to right, #2d7005, #ec9937)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {formatINR(total)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400">{expenses.length} item{expenses.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Gear list */}
      {loadingList ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">🎒</div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">No gear tracked yet</h3>
          <p className="text-sm text-gray-400 max-w-xs mb-6">
            Log your paddle, shoes, balls, and accessories to see how much you're investing in your game.
          </p>
          <button
            onClick={openAdd}
            className="hover:opacity-90 text-white font-bold px-6 py-3 rounded-xl text-sm tracking-wide transition-opacity shadow-md"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          >
            Add your first item
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <div
              key={e._id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 border-l-4 border-l-[#ec9937]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{e.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <p className="text-sm font-bold text-orange-600 flex-shrink-0">{formatINR(e.amount)}</p>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(e)} className="text-xs text-blue-600 hover:text-blue-800 font-medium min-h-[36px] px-2 rounded hover:bg-blue-50 transition">Edit</button>
                {deleteId === e._id ? (
                  <>
                    <button onClick={() => handleDelete(e._id)} disabled={deleteLoading} className="text-xs text-red-600 hover:text-red-800 font-medium min-h-[36px] px-2 rounded hover:bg-red-50 transition disabled:opacity-60">
                      {deleteLoading ? 'Deleting…' : 'Confirm'}
                    </button>
                    <button onClick={() => setDeleteId(null)} className="text-xs text-gray-400 hover:text-gray-600 min-h-[36px] px-2 rounded transition">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setDeleteId(e._id)} className="text-xs text-red-500 hover:text-red-700 font-medium min-h-[36px] px-2 rounded hover:bg-red-50 transition">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={mode === 'add' ? 'Add Gear' : 'Edit Gear'}>
        {apiError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{apiError}</div>
        )}
        <ExpenseForm
          initial={mode === 'edit' ? selectedExpense : undefined}
          onSubmit={mode === 'add' ? handleAdd : handleEdit}
          onCancel={closeModal}
          loading={formLoading}
        />
      </Modal>
    </div>
  );
}
