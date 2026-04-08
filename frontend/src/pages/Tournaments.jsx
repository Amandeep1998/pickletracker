import React, { useEffect, useState } from 'react';
import * as api from '../services/api';
import TournamentForm from '../components/TournamentForm';
import { formatINR, MEDAL_COLORS } from '../utils/format';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [apiError, setApiError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const fetchTournaments = async () => {
    try {
      const res = await api.getTournaments();
      setTournaments(res.data.data);
    } catch {
      setApiError('Failed to load tournaments');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleAdd = async (data) => {
    setFormLoading(true);
    setApiError('');
    try {
      await api.createTournament(data);
      setShowAdd(false);
      fetchTournaments();
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to add tournament';
      setApiError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (data) => {
    setFormLoading(true);
    setApiError('');
    try {
      await api.updateTournament(editingItem._id, data);
      setEditingItem(null);
      fetchTournaments();
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to update';
      setApiError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteTournament(id);
      setDeleteId(null);
      fetchTournaments();
    } catch {
      setApiError('Failed to delete tournament');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Tournaments</h1>
        {!showAdd && !editingItem && (
          <button
            onClick={() => setShowAdd(true)}
            className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 min-h-[40px] rounded-lg transition-colors"
          >
            + Add Tournament
          </button>
        )}
      </div>

      {apiError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {apiError}
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">New Tournament</h2>
          <TournamentForm
            onSubmit={handleAdd}
            onCancel={() => {
              setShowAdd(false);
              setApiError('');
            }}
            loading={formLoading}
          />
        </div>
      )}

      {/* Edit Form */}
      {editingItem && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Edit Tournament</h2>
          <TournamentForm
            initial={editingItem}
            onSubmit={handleEdit}
            onCancel={() => {
              setEditingItem(null);
              setApiError('');
            }}
            loading={formLoading}
          />
        </div>
      )}

      {/* List */}
      {loadingList ? (
        <div className="text-center py-12 sm:py-16 text-gray-400 text-sm sm:text-base">Loading...</div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-12 sm:py-16 text-gray-400">
          <p className="text-base sm:text-lg">No tournaments yet.</p>
          <p className="text-xs sm:text-sm mt-1">Add your first tournament to get started.</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {tournaments.map((t) => (
            <div
              key={t._id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total Profit</p>
                  <p
                    className={`text-base sm:text-lg font-bold ${t.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatINR(t.totalProfit)}
                  </p>
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                {t.categories.map((cat, idx) => (
                  <div key={idx} className="bg-gray-50 rounded px-3 py-2">
                    {/* Category Name, Date & Medal */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <span className="font-medium text-gray-700 text-sm">{cat.categoryName}</span>
                      <span className="text-xs text-gray-500">
                        {cat.date ? new Date(cat.date.split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN') : 'No date'}
                      </span>
                      <span
                        className={`w-fit text-xs font-medium px-1.5 py-0.5 rounded ${MEDAL_COLORS[cat.medal]}`}
                      >
                        {cat.medal}
                      </span>
                    </div>
                    {/* Values Grid - Stack on mobile, row on sm+ */}
                    <div className="grid grid-cols-3 sm:flex sm:gap-4 text-right sm:text-right gap-2">
                      <div>
                        <p className="text-xs text-gray-400">Entry Fees</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-700">{formatINR(cat.entryFee)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Winning Prize</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-700">{formatINR(cat.prizeAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Profit</p>
                        <p className={`text-xs sm:text-sm font-semibold ${(cat.prizeAmount - cat.entryFee) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatINR(cat.prizeAmount - cat.entryFee)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>


              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setEditingItem(t);
                    setShowAdd(false);
                    setApiError('');
                  }}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium min-h-[40px] px-2 sm:px-3 py-1 rounded hover:bg-blue-50 transition"
                >
                  Edit
                </button>
                {deleteId === t._id ? (
                  <span className="flex gap-2 items-center">
                    <button
                      onClick={() => handleDelete(t._id)}
                      className="text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium min-h-[40px] px-2 sm:px-3 py-1 rounded hover:bg-red-50 transition"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteId(null)}
                      className="text-xs sm:text-sm text-gray-400 hover:text-gray-600 min-h-[40px] px-2 sm:px-3 py-1 rounded transition"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setDeleteId(t._id)}
                    className="text-xs sm:text-sm text-red-500 hover:text-red-700 font-medium min-h-[40px] px-2 sm:px-3 py-1 rounded hover:bg-red-50 transition"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
