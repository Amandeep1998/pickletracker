/**
 * Pickleball category taxonomy — single source of truth.
 *
 * CATEGORIES is the canonical enum used by the Joi validator (what's loggable)
 * and the LLM extraction prompt. The facet helpers below power the chat
 * companion's progressive category picker: a partial phrase ("doubles",
 * "men doubles", "50+") is mapped to facets, then to every matching canonical
 * category, and a hybrid step decides whether to drill down or list them flat.
 */

const CATEGORIES = [
  // Gender-neutral (open level) — anyone, any gender
  "Gender Neutral Singles", "Gender Neutral Doubles",
  // Open
  "Men's Singles Open", "Women's Singles", "Men's Doubles Open", "Women's Doubles", "Mixed Doubles",
  // Pro
  "Pro Men's Singles", "Pro Women's Singles", "Pro Men's Doubles", "Pro Women's Doubles", "Pro Mixed Doubles",
  // Beginner
  "Beginner Singles", "Beginner Men's Singles", "Beginner Women's Singles",
  "Beginner Doubles", "Beginner Men's Doubles", "Beginner Women's Doubles", "Beginner Mixed Doubles",
  // Intermediate
  "Intermediate Singles", "Intermediate Men's Singles", "Intermediate Women's Singles",
  "Intermediate Doubles", "Intermediate Men's Doubles", "Intermediate Women's Doubles", "Intermediate Mixed Doubles",
  // Advanced
  "Advanced Men's Singles", "Advanced Women's Singles", "Advanced Men's Doubles", "Advanced Women's Doubles", "Advanced Mixed Doubles",
  // 35+
  "35+ Men's Singles", "35+ Men's Doubles", "35+ Women's Singles", "35+ Women's Doubles", "35+ Mixed Doubles",
  // 40+
  "40+ Men's Singles", "40+ Men's Doubles", "40+ Women's Singles", "40+ Women's Doubles", "40+ Mixed Doubles",
  // 45+
  "45+ Men's Singles", "45+ Men's Doubles", "45+ Women's Singles", "45+ Women's Doubles", "45+ Mixed Doubles",
  // 50+
  "50+ Men's Singles", "50+ Men's Doubles", "50+ Women's Singles", "50+ Women's Doubles", "50+ Mixed Doubles",
  // 55+
  "55+ Men's Singles", "55+ Men's Doubles", "55+ Women's Singles", "55+ Women's Doubles", "55+ Mixed Doubles",
  // 60+
  "Men's Singles 60+", "Men's Doubles 60+", "Women's Singles 60+", "Women's Doubles 60+", "Mixed Doubles 60+",
  // 65+
  "Men's Singles 65+", "Men's Doubles 65+", "Women's Singles 65+", "Women's Doubles 65+", "Mixed Doubles 65+",
  // 70+
  "Men's Singles 70+", "Men's Doubles 70+", "Women's Singles 70+", "Women's Doubles 70+", "Mixed Doubles 70+",
  // Split Age
  "Split Age 35+", "Split Age 40+", "Split Age 50+",
  // Split Doubles (age-split partner doubles)
  "35+ Split Doubles", "40+ Split Doubles", "45+ Split Doubles", "50+ Split Doubles", "55+ Split Doubles",
  // Mystery / Combined-age doubles
  "Mystery Partner Doubles", "100+ Combined Age",
  // Team
  "Team Event",
];

const AGES = ['35+', '40+', '45+', '50+', '55+', '60+', '65+', '70+'];

/**
 * Break one canonical name into facets:
 *   type      'singles' | 'doubles' | 'special'
 *   division  'men' | 'women' | 'mixed' | 'neutral' | null
 *   qualifier 'open' | 'pro' | 'beginner' | 'intermediate' | 'advanced' | '<age>+' | null
 *   special   'split' | 'splitdoubles' | 'mystery' | 'combined' | 'team' | null
 * (Mixed is modelled as doubles with division 'mixed'. Plain women's/mixed
 *  names with no level/age word are treated as the 'open' qualifier.)
 */
const deriveFacets = (name) => {
  if (/^split age/i.test(name)) {
    return { type: 'special', division: null, qualifier: name.replace(/split age\s*/i, '').trim(), special: 'split' };
  }
  if (/split doubles/i.test(name)) {
    const m = name.match(/\b(35|40|45|50|55|60|65|70)\+/);
    return { type: 'special', division: null, qualifier: m ? `${m[1]}+` : null, special: 'splitdoubles' };
  }
  if (/mystery/i.test(name)) {
    return { type: 'special', division: null, qualifier: null, special: 'mystery' };
  }
  if (/combined age/i.test(name)) {
    return { type: 'special', division: null, qualifier: null, special: 'combined' };
  }
  if (/^team/i.test(name)) {
    return { type: 'special', division: null, qualifier: null, special: 'team' };
  }

  const type = /singles/i.test(name) ? 'singles' : 'doubles';

  let division;
  if (/mixed/i.test(name)) division = 'mixed';
  else if (/women'?s/i.test(name)) division = 'women';
  else if (/men'?s/i.test(name)) division = 'men';
  else division = 'neutral';

  let qualifier;
  const age = name.match(/\b(35|40|45|50|55|60|65|70)\+/);
  if (/\bpro\b/i.test(name)) qualifier = 'pro';
  else if (/beginner/i.test(name)) qualifier = 'beginner';
  else if (/intermediate/i.test(name)) qualifier = 'intermediate';
  else if (/advanced/i.test(name)) qualifier = 'advanced';
  else if (age) qualifier = `${age[1]}+`;
  else qualifier = 'open';

  return { type, division, qualifier, special: null };
};

const FACETS = Object.fromEntries(CATEGORIES.map((name) => [name, deriveFacets(name)]));

/**
 * Loosely parse a user's free-text category phrase into the same facets.
 * Handles abbreviations (md/wd/ms/ws/mxd) and common spellings.
 */
const parsePhraseToFacets = (text) => {
  const t = ` ${String(text || '').toLowerCase()} `;
  const f = { type: null, division: null, qualifier: null, special: null };

  if (/\bsplit\b/.test(t)) {
    // "split doubles" = age-split partner doubles (its own family); a bare
    // "split" / "split age" = the Split Age special. Keep the two from mixing.
    f.special = /\bdoubles?\b|\bdubs?\b/.test(t) ? 'splitdoubles' : 'split';
    f.type = null;
  }
  if (/\bteam\b/.test(t)) f.special = 'team';
  if (/\bmystery\b/.test(t)) { f.special = 'mystery'; f.type = null; }
  if (/\bcombined\b/.test(t)) { f.special = 'combined'; f.type = null; }

  if (/\bmixed?\b|\bmix\b|\bmxd\b/.test(t)) { f.type = 'doubles'; f.division = 'mixed'; }
  if (/\bsingles?\b|\bms\b|\bws\b/.test(t)) f.type = 'singles';
  if (/\bdoubles?\b|\bdubs?\b|\bmd\b|\bwd\b/.test(t)) f.type = 'doubles';

  const neutral = /\bgender[\s-]?neutral\b|\bneutral\b|\bany gender\b|\bopen gender\b/.test(t);
  if (neutral) f.division = 'neutral';

  if (!f.division) {
    if (/\bwomen'?s?\b|\bwomens\b|\bladies\b|\bfemale\b|\bwd\b|\bws\b/.test(t)) f.division = 'women';
    else if (/\bmen'?s?\b|\bmens\b|\bmale\b|\bmd\b|\bms\b/.test(t)) f.division = 'men';
  }

  if (/\bpro\b/.test(t)) f.qualifier = 'pro';
  else if (/\bbeginner\b|\bbegin\b|\bnovice\b/.test(t)) f.qualifier = 'beginner';
  else if (/\bintermediate\b|\binter\b/.test(t)) f.qualifier = 'intermediate';
  else if (/\badvanced\b|\badvance\b|\badv\b/.test(t)) f.qualifier = 'advanced';
  else if (/\bopen\b/.test(t)) f.qualifier = 'open';
  else {
    const age = t.match(/\b(35|40|45|50|55|60|65|70)\s*\+?\b/);
    if (age) f.qualifier = `${age[1]}+`;
    else if (neutral) f.qualifier = 'open'; // "gender neutral" = open level, not beginner/intermediate
  }
  return f;
};

/** Every canonical name consistent with the set facets (unset facets = wildcard). */
const matchCategories = (facets = {}) =>
  CATEGORIES.filter((name) => {
    const cf = FACETS[name];
    if (facets.special) {
      if (cf.special !== facets.special) return false;
      // Within a special family (e.g. split doubles) an explicit age still narrows.
      if (facets.qualifier && cf.qualifier !== facets.qualifier) return false;
      return true;
    }
    if (cf.special) return false; // hide split/team unless explicitly asked
    if (facets.type && cf.type !== facets.type) return false;
    if (facets.division && cf.division !== facets.division) return false;
    if (facets.qualifier && cf.qualifier !== facets.qualifier) return false;
    return true;
  });

const THRESHOLD = 8; // hybrid cutoff: list flat at/below, drill down above

const TYPE_LABEL = { singles: 'Singles', doubles: 'Doubles' };
const DIVISION_LABEL = { men: "Men's", women: "Women's", mixed: 'Mixed', neutral: 'Any gender' };
const QUALIFIER_LABEL = { open: 'Open', pro: 'Pro', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const QUALIFIER_ORDER = ['open', 'pro', 'beginner', 'intermediate', 'advanced', ...AGES];

const finalChip = (name) => ({ label: name, value: name, kind: 'final' });

const facetChip = (facet, facetValue, label) => ({
  label,
  value: label,
  kind: 'facet',
  facet,
  facetValue,
});

const distinct = (matches, key) => [...new Set(matches.map((n) => FACETS[n][key]))];

/**
 * Hybrid step for the chat picker. Given the facets gathered so far, return
 * either the final category chips (when the match set is small enough) or the
 * next narrowing question. Narrows type → division → qualifier in that order.
 *
 * @returns { done, question, options: [{label,value,kind,facet?,facetValue?}] }
 */
const nextNarrowing = (facets = {}) => {
  const matches = matchCategories(facets);

  if (matches.length === 0) {
    // Nothing matched (e.g. contradictory facets) — restart from the top.
    return nextNarrowing({});
  }
  if (matches.length <= THRESHOLD) {
    return { done: true, question: 'Which exact category?', options: matches.map(finalChip) };
  }

  if (!facets.type) {
    const vals = distinct(matches, 'type');
    if (vals.length > 1) {
      return {
        done: false,
        question: 'Singles or doubles?',
        options: vals.map((v) => facetChip('type', v, TYPE_LABEL[v] || v)),
      };
    }
  }
  if (!facets.division) {
    const vals = distinct(matches, 'division');
    if (vals.length > 1) {
      return {
        done: false,
        question: 'Which division?',
        options: vals.map((v) => facetChip('division', v, DIVISION_LABEL[v] || v)),
      };
    }
  }
  if (!facets.qualifier) {
    const vals = distinct(matches, 'qualifier').sort(
      (a, b) => QUALIFIER_ORDER.indexOf(a) - QUALIFIER_ORDER.indexOf(b)
    );
    if (vals.length > 1) {
      return {
        done: false,
        question: 'Which level or age group?',
        options: vals.map((v) => facetChip('qualifier', v, QUALIFIER_LABEL[v] || v)),
      };
    }
  }

  // No further facet discriminates — list whatever remains.
  return { done: true, question: 'Which exact category?', options: matches.map(finalChip) };
};

module.exports = {
  CATEGORIES,
  parsePhraseToFacets,
  matchCategories,
  nextNarrowing,
};
