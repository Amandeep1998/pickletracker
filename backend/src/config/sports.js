/**
 * sportConfig registry — single source of truth for supported sports.
 *
 * Multi-sport architecture from day one, but GTM is pickleball-first:
 * ONLY pickleball is active now. Adding a sport later = a config entry here,
 * NO database migration (Tournament/User schema is additive + sport-stamped).
 *
 * result.type ∈ medal | placement | time | score  — covers all sports.
 */

const SPORTS = {
  pickleball: {
    key: 'pickleball',
    label: 'Pickleball',
    icon: '🏓',
    active: true, // only active sport for now (Phase 0–6)
    categories: ['MS', 'WS', 'MD', 'WD', 'MXD'],
    rating: { key: 'dupr', label: 'DUPR' },
    resultType: 'medal',
  },

  // ---- DORMANT (activate in Phase 7; kept here as design intent only) ----
  // badminton:  { key:'badminton', label:'Badminton', icon:'🏸', active:false,
  //               categories:['MS','WS','MD','WD','XD'], rating:null, resultType:'medal' },
  // tennis:     { key:'tennis', label:'Tennis', icon:'🎾', active:false,
  //               categories:['Singles','Doubles','Mixed'], rating:{key:'ntrp',label:'NTRP'}, resultType:'medal' },
  // tabletennis:{ key:'tabletennis', label:'Table Tennis', icon:'🏓', active:false,
  //               categories:['Singles','Doubles'], rating:null, resultType:'medal' },
};

const DEFAULT_SPORT = 'pickleball';

const isValidSport = (sport) => Object.prototype.hasOwnProperty.call(SPORTS, sport);
const isActiveSport = (sport) => isValidSport(sport) && SPORTS[sport].active === true;
const getSport = (sport) => SPORTS[sport] || null;
const listActiveSports = () => Object.values(SPORTS).filter((s) => s.active);

module.exports = {
  SPORTS,
  DEFAULT_SPORT,
  isValidSport,
  isActiveSport,
  getSport,
  listActiveSports,
};
