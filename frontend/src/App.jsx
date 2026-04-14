import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import ScrollToTop from './components/ScrollToTop';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/Tournaments';
import Calendar from './pages/Calendar';
import Sessions from './pages/Sessions';
import Expenses from './pages/Expenses';
import Admin from './pages/Admin';
import Landing from './pages/Landing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import PlayerCardPage from './pages/PlayerCardPage';

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-card" element={<PlayerCardPage />} />
          <Route path="/admin" element={<Admin />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
