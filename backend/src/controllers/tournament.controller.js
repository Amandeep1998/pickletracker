const Tournament = require('../models/Tournament');
const Expense = require('../models/Expense');

const getTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: tournaments });
  } catch (err) {
    next(err);
  }
};

const createTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.create({ ...req.body, userId: req.user.id });
    res.status(201).json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
};

const updateTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    res.status(200).json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
};

const deleteTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    await Expense.deleteMany({ tournamentId: tournament._id });

    res.status(200).json({ success: true, message: 'Tournament deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTournaments, createTournament, updateTournament, deleteTournament };
