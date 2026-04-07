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
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tournaments</h1>
        {!showAdd && !editingItem && (
          <button
            onClick={() => setShowAdd(true)}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">New Tournament</h2>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit Tournament</h2>
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
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No tournaments yet.</p>
          <p className="text-sm mt-1">Add your first tournament to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((t) => (
            <div
              key={t._id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(t.date).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total Profit</p>
                  <p
                    className={`text-lg font-bold ${t.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatINR(t.totalProfit)}
                  </p>
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                {t.categories.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                    <div className="flex-1">
                      <span className="font-medium text-gray-700">{cat.categoryName}</span>
                      <span
                        className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded ${MEDAL_COLORS[cat.medal]}`}
                      >
                        {cat.medal}
                      </span>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-xs text-gray-400">Entry Fees</p>
                        <p className="font-medium text-gray-700">{formatINR(cat.entryFee)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Winning Prize</p>
                        <p className="font-medium text-gray-700">{formatINR(cat.prizeAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Profit</p>
                        <p className={`font-semibold ${(cat.prizeAmount - cat.entryFee) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit
                </button>
                {deleteId === t._id ? (
                  <span className="flex gap-2 items-center text-sm">
                    <button
                      onClick={() => handleDelete(t._id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteId(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setDeleteId(t._id)}
                    className="text-sm text-red-500 hover:text-red-700 font-medium"
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
