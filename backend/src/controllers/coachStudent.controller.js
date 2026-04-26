const CoachStudent = require('../models/CoachStudent');

const getStudents = async (req, res, next) => {
  try {
    const students = await CoachStudent.find({ userId: req.user.id }).sort({ name: 1 });
    res.json({ success: true, data: students });
  } catch (err) {
    next(err);
  }
};

// Batch upsert: accepts { names: ['Alice', 'Bob'] }
const upsertStudents = async (req, res, next) => {
  try {
    const { names } = req.body;
    if (!Array.isArray(names) || names.length === 0) {
      return res.json({ success: true, data: await CoachStudent.find({ userId: req.user.id }).sort({ name: 1 }) });
    }
    const ops = names
      .map((n) => String(n || '').trim())
      .filter(Boolean)
      .map((name) => ({
        updateOne: {
          filter: { userId: req.user.id, name },
          update: { $setOnInsert: { userId: req.user.id, name } },
          upsert: true,
        },
      }));
    if (ops.length) await CoachStudent.bulkWrite(ops);
    const students = await CoachStudent.find({ userId: req.user.id }).sort({ name: 1 });
    res.json({ success: true, data: students });
  } catch (err) {
    next(err);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const student = await CoachStudent.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStudents, upsertStudents, deleteStudent };
