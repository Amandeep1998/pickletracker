const Session = require('../models/Session');

const getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 });
    res.status(200).json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
};

const createSession = async (req, res, next) => {
  try {
    const session = await Session.create({ ...req.body, userId: req.user.id });
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

const updateSession = async (req, res, next) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.status(200).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

const deleteSession = async (req, res, next) => {
  try {
    const session = await Session.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.status(200).json({ success: true, message: 'Session deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSessions, createSession, updateSession, deleteSession };
