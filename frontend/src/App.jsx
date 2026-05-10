import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import PrivateRoute from './components/PrivateRoute';
import ScrollToTop from './components/ScrollToTop';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/Tournaments';
import Calendar from './pages/Calendar';
import Sessions from './pages/Sessions';
import Expenses from './pages/Expenses';
import Travel from './pages/Travel';
import Admin from './pages/Admin';
import Landing from './pages/Landing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Players from './pages/Players';
import Coach from './pages/Coach';
import CoachHub from './pages/CoachHub';
import Home from './pages/Home';
import Support from './pages/Support';
import Welcome from './pages/Welcome';
import Achievements from './pages/Achievements';
import You from './pages/You';
import AchievementUnlockModal from './components/AchievementUnlockModal';
export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <ScrollToTop />
      <AchievementUnlockModal />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/travel" element={<Travel />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/players" element={<Players />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/coach-hub" element={<CoachHub />} />
          <Route path="/coaching-income" element={<Navigate to="/coach-hub" replace />} />
          <Route path="/support" element={<Support />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/you" element={<You />} />
          <Route path="/admin" element={<Admin />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}
