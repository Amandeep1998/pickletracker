import React, { useEffect, useState, useMemo } from 'react';
import * as api from '../services/api';
import Modal from '../components/Modal';
import ExpenseForm from '../components/ExpenseForm';
import { formatINR } from '../utils/format';

const TYPE_META = {
  court_booking: { label: 'Court Booking', icon: '🏟️', color: 'text-blue-700 bg-blue-50' },
  gear: { label: 'Gear', icon: '🎒', color: 'text-orange-700 bg-orange-50' },
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('add');
  const [selectedExpense, setSelectedExpense] = useState(null);

  const fetchExpenses = async () => {
    try {
      const res = await api.getExpenses();
      setExpenses(res.data.data);
    } catch {
      setApiError('Failed to load expenses');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const openAddModal = () => {
    setMode('add');
    setSelectedExpense(null);
    setApiError('');
    setModalOpen(true);
  };

  const openEditModal = (expense) => {
    setMode('edit');
    setSelectedExpense(expense);
    setApiError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedExpense(null);
    setApiError('');
  };

  const handleAdd = async (data) => {
    setFormLoading(true);
    setApiError('');
    try {
      await api.createExpense(data);
      closeModal();
      fetchExpenses();
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to add expense';
      setApiError(msg);
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
      const msg =
        err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to update expense';
      setApiError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteExpense(id);
      setDeleteId(null);
      fetchExpenses();
    } catch {
      setApiError('Failed to delete expense');
    }
  };

  const totals = useMemo(() => {
    return expenses.reduce(
      (acc, e) => {
        acc.total += e.amount;
        if (e.type === 'court_booking') acc.court_booking += e.amount;
        if (e.type === 'gear') acc.gear += e.amount;
        return acc;
      },
      { total: 0, court_booking: 0, gear: 0 }
    );
  }, [expenses]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Expenses</h1>
        <button
          onClick={openAddModal}
          className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 min-h-[40px] rounded-lg transition-colors"
        >
          + Add Expense
        </button>
      </div>

      {apiError && !modalOpen && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {apiError}
        </div>
      )}

      {/* Summary cards */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-red-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
            <p className="text-lg font-bold text-red-600">{formatINR(totals.total)}</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">🏟️ Court Booking</p>
            <p className="text-lg font-bold text-blue-700">{formatINR(totals.court_booking)}</p>
          </div>
          <div className="bg-orange-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">🎒 Gear</p>
            <p className="text-lg font-bold text-orange-700">{formatINR(totals.gear)}</p>
          </div>
        </div>
      )}

      {/* Expense list */}
      {loadingList ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 sm:py-16 text-gray-400">
          <p className="text-base sm:text-lg">No expenses yet.</p>
          <p className="text-xs sm:text-sm mt-1">Track court bookings and gear purchases.</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {expenses.map((e) => {
            const meta = TYPE_META[e.type];
            return (
              <div
                key={e._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3"
              >
                {/* Type badge */}
                <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${meta.color}`}>
                  {meta.icon} {meta.label}
                </span>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{e.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Amount */}
                <p className="text-sm sm:text-base font-bold text-red-500 flex-shrink-0">
                  -{formatINR(e.amount)}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEditModal(e)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium min-h-[36px] px-2 rounded hover:bg-blue-50 transition"
                  >
                    Edit
                  </button>
                  {deleteId === e._id ? (
                    <>
                      <button
                        onClick={() => handleDelete(e._id)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium min-h-[36px] px-2 rounded hover:bg-red-50 transition"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 min-h-[36px] px-2 rounded transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteId(e._id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium min-h-[36px] px-2 rounded hover:bg-red-50 transition"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={mode === 'add' ? 'New Expense' : 'Edit Expense'}
      >
        {apiError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {apiError}
          </div>
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
