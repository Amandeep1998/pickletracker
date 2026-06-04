#!/usr/bin/env node
/**
 * Backfill the additive multi-sport stamp on legacy data:
 *   - Tournament.sport      → 'pickleball'  (where missing)
 *   - User.sports           → ['pickleball'] (where missing/empty)
 *
 * Idempotent: only touches docs that lack the field, so re-runs are no-ops.
 * DRY-RUN BY DEFAULT — prints counts and changes nothing. Pass --apply (or
 * --write) to actually persist.
 *
 *   node scripts/backfill-sport.js            # dry run, safe
 *   node scripts/backfill-sport.js --apply    # writes
 *
 * Requires MONGO_URI in env (same as the server).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Tournament = require('../src/models/Tournament');
const User = require('../src/models/User');
const { DEFAULT_SPORT } = require('../src/config/sports');

const APPLY = process.argv.includes('--apply') || process.argv.includes('--write');

const main = async () => {
  if (!process.env.MONGO_URI) {
    console.error('✗ MONGO_URI not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
  console.log(APPLY ? '\n⚠️  APPLY MODE — changes WILL be written.\n' : '\n🔍 DRY RUN — no changes will be written. Pass --apply to write.\n');

  // Tournaments missing a sport stamp.
  const tournamentFilter = { $or: [{ sport: { $exists: false } }, { sport: null }, { sport: '' }] };
  const tournamentsToFix = await Tournament.countDocuments(tournamentFilter);

  // Users missing / empty sports[].
  const userFilter = { $or: [{ sports: { $exists: false } }, { sports: { $size: 0 } }] };
  const usersToFix = await User.countDocuments(userFilter);

  const totalTournaments = await Tournament.estimatedDocumentCount();
  const totalUsers = await User.estimatedDocumentCount();

  console.log(`Tournaments: ${tournamentsToFix} / ${totalTournaments} need sport='${DEFAULT_SPORT}'`);
  console.log(`Users:       ${usersToFix} / ${totalUsers} need sports=['${DEFAULT_SPORT}']`);

  if (APPLY) {
    const tRes = await Tournament.updateMany(tournamentFilter, { $set: { sport: DEFAULT_SPORT } });
    const uRes = await User.updateMany(userFilter, { $set: { sports: [DEFAULT_SPORT] } });
    console.log(`\n✓ Tournaments updated: ${tRes.modifiedCount}`);
    console.log(`✓ Users updated:       ${uRes.modifiedCount}`);
  } else {
    console.log('\n(no writes — dry run)');
  }

  await mongoose.disconnect();
  console.log('\nDone.');
};

main().catch((err) => {
  console.error('✗ Backfill failed:', err);
  process.exit(1);
});
