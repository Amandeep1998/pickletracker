import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import * as api from '../services/api';
import LocationModal from '../components/LocationModal';
import PlayerProfileModal from '../components/PlayerProfileModal';
import EditCommunityPlayerCardModal from '../components/EditCommunityPlayerCardModal';
import PlayerProfileCardContent from '../components/PlayerProfileCardContent';
import PlayerProfileShareModal from '../components/PlayerProfileShareModal';
import PaddleLoader from '../components/PaddleLoader';
import HomeFeedVirtualList from '../components/HomeFeedVirtualList';

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/4" />
        </div>
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-6 w-28 bg-gray-100 rounded-full" />
        <div className="h-6 w-24 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

/** Log tournament CTA — fixed at top of Home */
function HomeLogTournamentBanner({ onLogTournament }) {
  return (
    <div
      className="rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity"
      style={{ background: 'linear-gradient(135deg, #2d7005 0%, #91BE4D 55%, #ec9937 100%)' }}
      onClick={onLogTournament}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onLogTournament();
      }}
    >
      <div>
        <p className="text-white font-semibold text-sm">Playing a tournament?</p>
        <p className="text-white/80 text-xs mt-0.5">
          Log it and let your community know
        </p>
      </div>
      <span className="flex-shrink-0 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/30 whitespace-nowrap pointer-events-none">
        Log Tournament →
      </span>
    </div>
  );
}

/** Public player card preview — inserted mid-feed after activity */
function HomeMidFeedPlayerCardPromo({
  cardLoading,
  publicCardPlayer,
  currentUserId,
  onEditPlayerCard,
  onSharePlayerCard,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 sm:px-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">Your public player card</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            Preview how you appear when someone opens your profile from the feed or Nearby. Email and phone are never shown here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {publicCardPlayer && (
            <button
              type="button"
              onClick={onSharePlayerCard}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-4 rounded-xl border-2 border-[#91BE4D]/50 text-[#4a6e10] bg-[#f4f8e8] hover:bg-[#eef6dc] transition-colors whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          )}
          <button
            type="button"
            onClick={onEditPlayerCard}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-4 rounded-xl text-white hover:opacity-95 transition-opacity shadow-sm whitespace-nowrap"
            style={{ background: 'linear-gradient(to right, #1e3a5f, #2563ab)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit player card
          </button>
          <NavLink
            to="/profile"
            className="text-xs font-semibold text-[#4a6e10] hover:text-[#2d7005] hover:underline underline-offset-2 py-2"
          >
            All profile settings →
          </NavLink>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-[#f1f5f9] flex flex-col max-h-[min(65vh,520px)] min-h-[200px]">
        {cardLoading ? (
          <div className="py-14 flex justify-center">
            <PaddleLoader label="Loading preview…" />
          </div>
        ) : publicCardPlayer ? (
          <div className="overflow-y-auto min-h-0 flex-1">
            <PlayerProfileCardContent
              player={publicCardPlayer}
              currentUserId={currentUserId}
              isOwnProfile
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-12 px-4">Could not load preview.</p>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'friends', label: 'Friends' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'played', label: 'Played' },
  { key: 'nearby', label: 'Nearby' },
];

export default function Home() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [locationOpen, setLocationOpen] = useState(false);
  const [profilePlayerId, setProfilePlayerId] = useState(null);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [friends, setFriends] = useState([]);
  const [pendingFriendIds, setPendingFriendIds] = useState(() => new Set());
  const [showEditPlayerCard, setShowEditPlayerCard] = useState(false);
  const [showSharePlayerCard, setShowSharePlayerCard] = useState(false);
  const [publicCardPlayer, setPublicCardPlayer] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [achievementFeed, setAchievementFeed] = useState([]);

  const loadPublicCardPreview = useCallback(async () => {
    if (!user?.id) return;
    setCardLoading(true);
    try {
      const res = await api.getPlayer(user.id);
      setPublicCardPlayer(res.data.data);
    } catch {
      setPublicCardPlayer(null);
    } finally {
      setCardLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPublicCardPreview();
  }, [loadPublicCardPreview]);

  useEffect(() => {
    api.getGamificationFeed()
      .then((res) => setAchievementFeed((res.data.items || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  const fetchFriendData = useCallback(async () => {
    try {
      const [reqRes, friendsRes] = await Promise.all([api.getFriendRequests(), api.getFriends()]);
      const data = reqRes.data.data || { incoming: [], outgoing: [] };
      const friendsList = friendsRes.data.data || [];
      setFriendRequests(data);
      setFriends(friendsList);
      const outgoingIds = new Set(data.outgoing.map((r) => String(r.user?.id)));
      const friendIds = new Set(friendsList.map((f) => String(f.id)));
      setPendingFriendIds((prev) => {
        const next = new Set([...prev].filter((id) => outgoingIds.has(id) || friendIds.has(id)));
        return next.size === prev.size ? prev : next;
      });
    } catch { /* feed stays usable */ }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetchFriendData();
  }, [user?.id, fetchFriendData]);

  useEffect(() => {
    if (!socket) return;
    socket.on('friend:refresh', fetchFriendData);
    socket.on('connect', fetchFriendData);
    return () => {
      socket.off('friend:refresh', fetchFriendData);
      socket.off('connect', fetchFriendData);
    };
  }, [socket, fetchFriendData]);

  const friendStatusByUserId = useMemo(() => {
    const map = {};
    friends.forEach((f) => {
      map[String(f.id)] = 'friend';
    });
    (friendRequests.incoming || []).forEach((r) => {
      map[String(r.user.id)] = 'incoming';
    });
    (friendRequests.outgoing || []).forEach((r) => {
      map[String(r.user.id)] = 'pending';
    });
    pendingFriendIds.forEach((id) => {
      if (!map[String(id)]) map[String(id)] = 'pending';
    });
    return map;
  }, [friendRequests, friends, pendingFriendIds]);

  const friendIdsSet = useMemo(
    () => new Set(friends.map((f) => String(f.id))),
    [friends]
  );

  const handleSendFriendRequest = async (playerId) => {
    setPendingFriendIds((prev) => new Set(prev).add(String(playerId)));
    try {
      await api.sendFriendRequest(playerId);
      await fetchFriendData();
    } catch {
      setPendingFriendIds((prev) => {
        const next = new Set(prev);
        next.delete(String(playerId));
        return next;
      });
    }
  };

  const handleRemoveFriend = async (friend) => {
    const ok =
      typeof window !== 'undefined'
        ? window.confirm(
            `Remove ${friend.name} from friends? You will no longer share schedule access.`,
          )
        : true;
    if (!ok) return;
    try {
      await api.removeFriend(friend.id);
      await fetchFriendData();
      setProfilePlayerId(null);
    } catch {
      /* optional: silent fail */
    }
  };

  useEffect(() => {
    let cancelled = false;
    const params = filter === 'nearby' ? { nearby: 1 } : {};

    const run = async () => {
      setError('');
      setLoading(true);
      try {
        const res = await api.getFeed(params);
        if (!cancelled) setFeed(res.data.data || []);
      } catch (err) {
        const code = err.response?.data?.code;
        if (err.response?.status === 400 && code === 'NEEDS_CITY') {
          if (!cancelled) {
            setLocationOpen(true);
            if (filter === 'nearby') setFilter('all');
            setFeed([]);
          }
        } else if (!cancelled) {
          setError('Could not load feed. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const firstName = (user?.name || '').split(' ')[0];
  const hasCity = Boolean(String(user?.city || '').trim());

  const selectFilter = (key) => {
    if (key === 'nearby' && !hasCity) {
      setLocationOpen(true);
      return;
    }
    setFilter(key);
  };

  const retryFetch = () => {
    const params = filter === 'nearby' ? { nearby: 1 } : {};
    setError('');
    setLoading(true);
    api
      .getFeed(params)
      .then((res) => setFeed(res.data.data || []))
      .catch(() => setError('Could not load feed. Please try again.'))
      .finally(() => setLoading(false));
  };

  const handleLocationSave = async (city) => {
    try {
      const res = await api.updateProfile({ city });
      refreshUser(res.data.data);
      setLocationOpen(false);
      setFilter('nearby');
      loadPublicCardPreview();
    } catch {
      setError('Could not save your city. Please try again.');
    }
  };

  const visibleFeed = useMemo(() => {
    return feed.filter((item) => {
      const posterId = item.user?.id != null ? String(item.user.id) : '';
      if (filter === 'friends') {
        return Boolean(posterId && friendIdsSet.has(posterId));
      }
      if (filter === 'nearby') return true;
      if (filter === 'upcoming') return item.type === 'upcoming';
      if (filter === 'played') return item.type === 'recent';
      return true;
    });
  }, [feed, filter, friendIdsSet]);

  const feedPromoSlot = useMemo(
    () => (
      <HomeMidFeedPlayerCardPromo
        cardLoading={cardLoading}
        publicCardPlayer={publicCardPlayer}
        currentUserId={user?.id}
        onEditPlayerCard={() => setShowEditPlayerCard(true)}
        onSharePlayerCard={() => setShowSharePlayerCard(true)}
      />
    ),
    [cardLoading, publicCardPlayer, user?.id]
  );

  return (
    <div className="min-h-screen bg-[#f8faf3]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">

        {/* Greeting */}
        <div>
          <h1 className="text-xl font-bold text-[#272702]">
            Hey {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filter === 'nearby' && user?.city
              ? `Full feed — activity from ${user.city} shown first`
              : filter === 'friends'
                ? 'Tournament activity from people you’re friends with'
              : 'See what your fellow picklers are up to'}
          </p>
        </div>

        <HomeLogTournamentBanner onLogTournament={() => navigate('/calendar')} />

        {/* Toggle */}
        <div className="flex flex-wrap bg-white rounded-xl border border-gray-100 shadow-sm p-1 gap-1">
          {FILTERS.map(({ key, label }) => (
            <button
              type="button"
              key={key}
              onClick={() => selectFilter(key)}
              className={`flex-1 min-w-[4.5rem] py-1.5 px-1 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                filter === key
                  ? 'text-white shadow-sm'
                  : 'text-gray-400 hover:text-[#272702]'
              }`}
              style={filter === key ? { background: 'linear-gradient(to right, #2d7005, #91BE4D)' } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Feed */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">{error}</p>
            <button
              type="button"
              onClick={retryFetch}
              className="mt-3 text-xs text-[#91BE4D] font-semibold hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && visibleFeed.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">
              {filter === 'nearby' ? '📍' : filter === 'friends' ? '👥' : '🎾'}
            </div>
            <p className="font-semibold text-[#272702]">
              {filter === 'upcoming'
                ? 'No upcoming tournaments'
                : filter === 'played'
                  ? 'No recent results'
                  : filter === 'nearby'
                    ? 'No activity yet'
                    : filter === 'friends'
                      ? friends.length === 0
                        ? 'No friends yet'
                        : 'No activity from friends'
                      : 'No activity yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === 'nearby'
                ? user?.city
                  ? 'Nothing in the feed right now. Log a tournament or check back soon.'
                  : 'Set your city to see activity near you.'
                : filter === 'friends'
                  ? friends.length === 0
                    ? 'Add friends from Nearby Players — then their tournaments appear here.'
                    : 'Nothing from friends in this feed window. Try All to see everyone, or check back after friends log events.'
                  : filter === 'all'
                    ? 'Be the first to log a tournament!'
                    : 'Try switching to a different filter'}
            </p>
            {filter === 'friends' && friends.length === 0 ? (
              <button
                type="button"
                onClick={() => navigate('/players')}
                className="mt-4 text-sm font-semibold text-white px-5 py-2 rounded-xl hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
              >
                Find players
              </button>
            ) : filter !== 'nearby' ? (
              <button
                type="button"
                onClick={() => navigate('/calendar')}
                className="mt-4 text-sm font-semibold text-white px-5 py-2 rounded-xl hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
              >
                Log Tournament
              </button>
            ) : null}
          </div>
        )}

        {/* Friends' Achievements */}
        {achievementFeed.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Friends' Achievements</p>
            <div className="space-y-2">
              {achievementFeed.map((item) => (
                <div key={item._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                    style={{
                      background: item.achievementTier === 'legendary' ? '#111'
                        : item.achievementTier === 'epic' ? '#7c3aed'
                        : item.achievementTier === 'rare' ? '#d97706'
                        : '#e5e7eb'
                    }}
                  >
                    {item.type === 'level_up' ? '⬆️' : (item.achievement?.icon || '🏆')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-900 truncate">{item.user?.name || 'Player'}</span>
                      <span className="text-xs text-gray-500">
                        {item.type === 'level_up' ? `reached Level ${item.newLevel}` : `unlocked ${item.achievement?.name || 'achievement'}`}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {item.achievementTier && (
                        <span className={`ml-2 font-bold uppercase ${
                          item.achievementTier === 'legendary' ? 'text-yellow-500'
                          : item.achievementTier === 'epic' ? 'text-purple-500'
                          : item.achievementTier === 'rare' ? 'text-yellow-600'
                          : 'text-gray-400'
                        }`}>{item.achievementTier}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && visibleFeed.length > 0 && (
          <HomeFeedVirtualList
            visibleFeed={visibleFeed}
            currentUserId={user?.id}
            onViewProfile={setProfilePlayerId}
            promoSlot={feedPromoSlot}
          />
        )}

        {profilePlayerId && (
          <PlayerProfileModal
            playerId={profilePlayerId}
            onClose={() => setProfilePlayerId(null)}
            friendState={friendStatusByUserId[String(profilePlayerId)] || 'none'}
            currentUserId={user?.id}
            onSendFriendRequest={handleSendFriendRequest}
            onRemoveFriend={handleRemoveFriend}
          />
        )}

        {showEditPlayerCard && (
          <EditCommunityPlayerCardModal
            onClose={() => setShowEditPlayerCard(false)}
            onSaved={async () => {
              try {
                const res = await api.getProfile();
                refreshUser(res.data.data);
              } catch {
                /* modal already saved */
              }
              await loadPublicCardPreview();
            }}
          />
        )}

        {showSharePlayerCard && publicCardPlayer && (
          <PlayerProfileShareModal
            player={publicCardPlayer}
            userId={user?.id}
            onClose={() => setShowSharePlayerCard(false)}
          />
        )}

        {locationOpen && (
          <LocationModal onSave={handleLocationSave} onSkip={() => setLocationOpen(false)} />
        )}
      </div>
    </div>
  );
}
