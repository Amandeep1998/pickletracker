import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import PrivateRoute from './components/PrivateRoute';
import ScrollToTop from './components/ScrollToTop';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Admin from './pages/Admin';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import ResetPassword from './pages/ResetPassword';
import Companion from './pages/Companion';
import AchievementUnlockModal from './components/AchievementUnlockModal';
export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <ScrollToTop />
      <AchievementUnlockModal />
      <Routes>
        {/* Public routes — the chat companion is the app. */}
        <Route path="/" element={<Companion />} />
        <Route path="/companion" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/admin" element={<Admin />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}
