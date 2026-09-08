import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function MainLayout({ user, onLogout }) {
  return (
    <>
      <Sidebar onLogout={onLogout} />
      <div className="ml-64 flex-1 flex flex-col min-w-0 min-h-screen">
        <Header user={user} />
        
        {/* Main Content Area */}
        <Outlet />

        {/* Footer */}
        <footer className="px-8 py-6 border-t border-slate-100 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto" data-purpose="dashboard-footer">
          <p>© 2025 BuddyJudge Inc. All rights reserved. Crafted for modern learners &amp; creators.</p>
          <div className="flex items-center gap-6">
            <a className="hover:text-slate-600 transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-slate-600 transition-colors" href="#">Terms of Service</a>
            <a className="hover:text-slate-600 transition-colors" href="#">System Status</a>
          </div>
        </footer>
      </div>
    </>
  );
}
