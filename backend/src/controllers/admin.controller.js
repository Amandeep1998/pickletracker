const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Expense = require('../models/Expense');
const WhatsAppSession = require('../models/WhatsAppSession');
const Session = require('../models/Session');
const Friendship = require('../models/Friendship');

const getUsers = async (req, res, next) => {
  try {
  const users = await User.find({}).lean().sort({ createdAt: -1 });

  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split('T')[0];

  const enriched = await Promise.all(
    users.map(async (user) => {
      const [tournaments, expenses, sessions] = await Promise.all([
        Tournament.find({ userId: user._id }).lean(),
        Expense.find({ userId: user._id }).lean(),
        Session.find({ userId: user._id }).lean(),
      ]);

      const allCats = tournaments.flatMap((t) => t.categories);

      // Last active = most recent tournament, expense, or session update
      const activityDates = [
        ...tournaments.map((t) => new Date(t.updatedAt)),
        ...expenses.map((e) => new Date(e.updatedAt)),
        ...sessions.map((s) => new Date(s.updatedAt)),
      ].sort((a, b) => b - a);
      const lastActive = activityDates[0] || new Date(user.createdAt);

      // Activity status
      let activityStatus = 'inactive';
      if (lastActive >= sevenDaysAgo) activityStatus = 'active';
      else if (lastActive >= thirtyDaysAgo) activityStatus = 'recent';

      // Financials
      const totalEarnings = allCats.reduce((s, c) => s + (c.prizeAmount || 0), 0);
      const totalExpenses = allCats.reduce((s, c) => s + (c.entryFee || 0), 0);

      // Medals
      const medals = {
        Gold: allCats.filter((c) => c.medal === 'Gold').length,
        Silver: allCats.filter((c) => c.medal === 'Silver').length,
        Bronze: allCats.filter((c) => c.medal === 'Bronze').length,
      };

      // Most played category
      const catCounts = {};
      for (const cat of allCats) {
        catCounts[cat.categoryName] = (catCounts[cat.categoryName] || 0) + 1;
      }
      const topCategory =
        Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Upcoming tournaments count
      const upcomingCount = tournaments.filter((t) =>
        t.categories.some((c) => c.date >= todayStr)
      ).length;

      // Recent tournaments (last 3 by created date)
      const recentTournaments = [...tournaments]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3)
        .map((t) => ({
          name: t.name,
          categoryCount: t.categories.length,
          createdAt: t.createdAt,
          profit: t.categories.reduce((s, c) => s + (c.prizeAmount - c.entryFee), 0),
        }));

      // Monthly activity (tournaments created per month, last 6 months)
      const monthlyActivity = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - (5 - i));
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const count = tournaments.filter((t) =>
          t.createdAt.toISOString().startsWith(ym)
        ).length;
        return {
          month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
          count,
        };
      });

      // Sessions
      const sessionCount = sessions.length;
      const sessionTypes = {
        tournament: sessions.filter((s) => s.type === 'tournament').length,
        casual: sessions.filter((s) => s.type === 'casual').length,
        practice: sessions.filter((s) => s.type === 'practice').length,
      };
      const totalCourtFees = sessions.reduce((s, sess) => s + (sess.courtFee || 0), 0);
      const avgSessionRating = sessionCount > 0
        ? Math.round((sessions.reduce((s, sess) => s + (sess.rating || 0), 0) / sessionCount) * 10) / 10
        : null;
      const skillCounts = {};
      for (const sess of sessions) {
        for (const tag of [...(sess.wentWell || []), ...(sess.drillFocus || [])]) {
          skillCounts[tag] = (skillCounts[tag] || 0) + 1;
        }
      }
      const topSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag);

      // Gear & travel expenses
      const gearExpenses = expenses.filter((e) => e.type === 'gear');
      const travelExpenses = expenses.filter((e) => e.type === 'travel');
      const gearExpenseCount = gearExpenses.length;
      const totalGearSpend = gearExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const travelExpenseCount = travelExpenses.length;
      const totalTravelSpend = travelExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const internationalTripCount = travelExpenses.filter((e) => e.isInternational).length;

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        isGoogleUser: user.isGoogleUser,
        whatsappEnabled: user.whatsappEnabled || false,
        createdAt: user.createdAt,
        lastActive,
        activityStatus,
        tournamentCount: tournaments.length,
        totalCategories: allCats.length,
        totalEarnings,
        totalExpenses,
        totalProfit: totalEarnings - totalExpenses,
        medals,
        topCategory,
        upcomingCount,
        expenseCount: expenses.length,
        recentTournaments,
        monthlyActivity,
        sessionCount,
        sessionTypes,
        totalCourtFees,
        avgSessionRating,
        topSkills,
        gearExpenseCount,
        totalGearSpend,
        travelExpenseCount,
        totalTravelSpend,
        internationalTripCount,
      };
    })
  );

  const stats = {
    totalUsers: users.length,
    activeThisWeek: enriched.filter((u) => u.activityStatus === 'active').length,
    activeThisMonth: enriched.filter(
      (u) => u.activityStatus === 'active' || u.activityStatus === 'recent'
    ).length,
    totalTournaments: enriched.reduce((s, u) => s + u.tournamentCount, 0),
    totalRevenueTracked: enriched.reduce((s, u) => s + u.totalEarnings, 0),
    googleUsers: users.filter((u) => u.isGoogleUser).length,
    totalSessions: enriched.reduce((s, u) => s + u.sessionCount, 0),
    totalGearSpend: enriched.reduce((s, u) => s + u.totalGearSpend, 0),
    totalTravelSpend: enriched.reduce((s, u) => s + u.totalTravelSpend, 0),
  };

    res.json({ success: true, data: { users: enriched, stats } });
  } catch (err) {
    next(err);
  }
};

const getUserTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: tournaments });
  } catch (err) {
    next(err);
  }
};

const toggleWhatsAppAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('whatsappEnabled');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.whatsappEnabled = !user.whatsappEnabled;
    await user.save();

    res.json({ success: true, whatsappEnabled: user.whatsappEnabled });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Cascade-delete everything belonging to this user
    await Promise.all([
      Tournament.deleteMany({ userId: id }),
      Session.deleteMany({ userId: id }),
      Expense.deleteMany({ userId: id }),
      WhatsAppSession.deleteMany({ userId: id }),
      // Remove friendships where the user is either side of the relationship
      Friendship.deleteMany({ $or: [{ requesterId: id }, { recipientId: id }] }),
    ]);

    await User.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUserTournaments, toggleWhatsAppAccess, deleteUser };
