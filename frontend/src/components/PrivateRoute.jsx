import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import PaddleLoader from './PaddleLoader';
import { InstallBanner } from './InstallAppButton';

export default function PrivateRoute() {
  const { user, authInitializing } = useAuth();

  if (authInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PaddleLoader label="Validating session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <InstallBanner />
      <Navbar />
      <main className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
      <MobileBottomNav />
    </div>
  );
}
