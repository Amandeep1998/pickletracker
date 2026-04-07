import React, { useEffect, useState } from 'react';
import ReactCalendar from 'react-calendar';
import { useNavigate } from 'react-router-dom';
import 'react-calendar/dist/Calendar.css';
import * as api from '../services/api';
import TournamentForm from '../components/TournamentForm';
import { formatINR } from '../utils/format';

export default function Calendar() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await api.getTournaments();
      setTournaments(res.data.data);
    } catch {
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Convert Date object to YYYY-MM-DD string without timezone conversion
  const dateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Group tournaments by date using the date string directly (YYYY-MM-DD)
  const tournamentsByDate = {};
  tournaments.forEach((t) => {
    // t.date is already a string like "2024-06-15" from the API
    let dateStr = t.date;
    if (typeof t.date !== 'string') {
      dateStr = dateToString(new Date(t.date));
    } else {
      dateStr = t.date.split('T')[0]; // Remove time if present
    }
    if (!tournamentsByDate[dateStr]) {
      tournamentsByDate[dateStr] = [];
    }
    tournamentsByDate[dateStr].push(t);
  });

  // Custom tile content with tournament names (clickable)
  const tileContent = ({ date }) => {
    const dateStr = dateToString(date); // Use helper to avoid timezone issues
    const tournamentsOnDate = tournamentsByDate[dateStr];

    if (!tournamentsOnDate || tournamentsOnDate.length === 0) return null;

    return (
      <div className="w-full h-full flex flex-col justify-start pt-1 text-left">
        {tournamentsOnDate.slice(0, 1).map((t) => (
          <div
            key={t._id}
            className="text-xs font-medium text-gray-900 truncate px-1 hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTournament(t);
            }}
          >
            {t.name}
          </div>
        ))}
        {tournamentsOnDate.length > 1 && (
          <div
            className="text-xs text-gray-600 px-1 cursor-pointer hover:text-gray-900"
            onClick={(e) => {
              e.stopPropagation();
              // Show all tournaments for this date by setting first one
              // User can see there are more in the popup
              setSelectedTournament(tournamentsOnDate[0]);
            }}
          >
            +{tournamentsOnDate.length - 1} more
          </div>
        )}
      </div>
    );
  };

  // Custom tile styling for dates with tournaments
  const tileClassName = ({ date }) => {
    const dateStr = dateToString(date);
    return tournamentsByDate[dateStr] && tournamentsByDate[dateStr].length > 0 ? 'has-tournaments' : '';
  };

  // Get all tournaments on the same date as selectedTournament
  const getTournamentsOnSameDate = () => {
    if (!selectedTournament) return [];
    let selectedDateStr = selectedTournament.date;
    if (typeof selectedTournament.date !== 'string') {
      selectedDateStr = dateToString(new Date(selectedTournament.date));
    } else {
      selectedDateStr = selectedTournament.date.split('T')[0];
    }
    return tournamentsByDate[selectedDateStr] || [];
  };

  const handleEditTournament = async (data) => {
    setFormLoading(true);
    try {
      await api.updateTournament(selectedTournament._id, data);
      setIsEditing(false);
      setSelectedTournament(null);
      await fetchTournaments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update tournament');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-24 text-gray-400">Loading calendar...</div>;
  }

  if (error) {
    return <div className="text-center py-24 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6">Tournament Calendar</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <style>{`
          .react-calendar {
            width: 100%;
            border: none;
            font-family: inherit;
          }
          .react-calendar__navigation {
            margin-bottom: 1.5rem;
          }
          .react-calendar__navigation button {
            color: #374151;
            font-weight: 600;
            font-size: 0.875rem;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            border: 1px solid #e5e7eb;
            background-color: #f9fafb;
          }
          .react-calendar__navigation button:hover {
            background-color: #f3f4f6;
          }
          .react-calendar__month-view__weekdays {
            text-align: center;
            font-weight: 600;
            font-size: 0.75rem;
            color: #6b7280;
            padding: 0.5rem 0;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .react-calendar__month-view__days__day {
            padding: 0.5rem 0.25rem;
            font-size: 0.875rem;
            border-radius: 0.5rem;
            margin: 0.125rem;
            height: auto;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-start;
            background-color: #f9fafb;
            color: #374151;
            cursor: pointer;
            transition: all 0.2s;
            overflow: hidden;
          }
          @media (min-width: 768px) {
            .react-calendar__month-view__days__day {
              min-height: 100px;
              margin: 0.25rem;
            }
          }
          .react-calendar__month-view__days__day:hover {
            background-color: #f0fdf4;
            color: #16a34a;
          }
          .react-calendar__month-view__days__day.has-tournaments {
            background-color: #dcfce7;
            color: #166534;
            font-weight: 600;
            border: 2px solid #16a34a;
          }
          .react-calendar__month-view__days__day.has-tournaments:hover {
            background-color: #bbf7d0;
          }
          .react-calendar__tile--now {
            background-color: #e0f2fe !important;
          }
          .react-calendar__tile--active {
            background-color: #0ea5e9 !important;
            color: white !important;
          }
          .calendar-day-number {
            font-weight: 600;
            margin-bottom: 0.25rem;
            display: block;
          }
          .calendar-tournament-item {
            background-color: rgba(255, 255, 255, 0.7);
            border-left: 2px solid #16a34a;
            padding: 0.25rem 0.5rem;
            margin: 0.15rem 0;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.25rem;
          }
          @media (min-width: 768px) {
            .calendar-tournament-item {
              font-size: 0.875rem;
              margin: 0.25rem 0;
            }
          }
          .calendar-tournament-name {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .calendar-edit-btn {
            flex-shrink: 0;
            background-color: #3b82f6;
            color: white;
            border: none;
            border-radius: 0.25rem;
            padding: 0.125rem 0.375rem;
            cursor: pointer;
            font-size: 0.65rem;
            font-weight: 600;
            transition: all 0.2s;
          }
          .calendar-edit-btn:hover {
            background-color: #2563eb;
          }
        `}</style>

        <ReactCalendar
          onChange={() => {}}
          tileClassName={tileClassName}
          tileContent={tileContent}
        />

        <p className="text-sm text-gray-500 mt-4 text-center">
          Click on a tournament name to view details and edit
        </p>
      </div>

      {/* Tournament Details Modal */}
      {selectedTournament && !isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-lg max-w-full sm:max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4 gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{selectedTournament.name}</h2>
                {getTournamentsOnSameDate().length > 1 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {getTournamentsOnSameDate().findIndex(t => t._id === selectedTournament._id) + 1} of {getTournamentsOnSameDate().length}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedTournament(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Tournament Selector for Multiple on Same Date */}
            {getTournamentsOnSameDate().length > 1 && (
              <div className="mb-4 pb-4 border-b">
                <p className="text-xs font-medium text-gray-600 mb-2">Other tournaments on this date:</p>
                <div className="space-y-2">
                  {getTournamentsOnSameDate().map((t) => (
                    <button
                      key={t._id}
                      onClick={() => setSelectedTournament(t)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition min-h-[40px] flex items-center ${
                        t._id === selectedTournament._id
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date */}
            <p className="text-xs sm:text-sm text-gray-600 mb-6">
              {new Date(selectedTournament.date + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>

            {/* Categories */}
            <div className="space-y-3 mb-6">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Categories</h3>
              {selectedTournament.categories.map((cat, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="text-sm sm:text-base font-semibold text-gray-900">{cat.categoryName}</div>
                  <div className="text-xs sm:text-sm text-gray-600 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Medal</p>
                      <p className="font-medium">{cat.medal}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Entry Fees Paid</p>
                      <p className="font-medium">{formatINR(cat.entryFee)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Winning Prize</p>
                      <p className="font-medium">{formatINR(cat.prizeAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Profit</p>
                      <p className={`font-medium ${(cat.prizeAmount - cat.entryFee) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatINR(cat.prizeAmount - cat.entryFee)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-6">
              <div className="text-xs sm:text-sm text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span>Total Earnings:</span>
                  <span className="font-semibold text-gray-900">{formatINR(selectedTournament.totalEarnings || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Expenses:</span>
                  <span className="font-semibold text-gray-900">{formatINR(selectedTournament.totalExpenses || 0)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span>Total Profit:</span>
                  <span className={`text-base sm:text-lg font-bold ${(selectedTournament.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatINR(selectedTournament.totalProfit || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-semibold py-2 sm:py-2.5 min-h-[40px] rounded-lg transition"
              >
                Edit Tournament
              </button>
              <button
                onClick={() => setSelectedTournament(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 text-sm sm:text-base font-semibold py-2 sm:py-2.5 min-h-[40px] rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {selectedTournament && isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-lg max-w-full sm:max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Edit Tournament</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>
            <TournamentForm
              initial={selectedTournament}
              onSubmit={handleEditTournament}
              onCancel={() => setIsEditing(false)}
              loading={formLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
