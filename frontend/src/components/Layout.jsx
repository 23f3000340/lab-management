import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  LayoutDashboard,
  Ticket,
  Users,
  FolderTree,
  Tags,
  UserCheck,
  Plus,
  LogOut,
  ChevronDown,
  Layers,
  Inbox
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NewTicketModal } from './NewTicketModal';
import { getDashboardSummary } from '../api';

export function Layout({ children }) {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNewModal, setShowNewModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      getDashboardSummary()
        .then((data) => setPendingCount(data.pending_onboarding || 0))
        .catch(() => {});
    }
  }, [user, location.pathname]);

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const roleBadge = {
    ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    SUB_ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
    USER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  }[user?.role] || 'bg-slate-100 text-slate-800 border-slate-200';

  const roleLabel = {
    ADMIN: 'Professor (Admin)',
    SUB_ADMIN: 'Sub-Admin',
    USER: 'Lab Member',
  }[user?.role] || user?.role;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 tracking-tight text-base block leading-tight">
                    Lab Request Tracker
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest block">
                    Cystar Lab Operations
                  </span>
                </div>
              </Link>

              {/* Navigation Tabs based on Role */}
              <nav className="hidden md:flex items-center gap-1">
                {user?.role === 'ADMIN' && (
                  <>
                    <NavLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <NavLink to="/tickets" icon={Ticket} label="All Tickets" />
                    <NavLink
                      to="/onboarding"
                      icon={UserCheck}
                      label="Onboarding"
                      badge={pendingCount > 0 ? pendingCount : null}
                    />
                    <NavLink to="/users" icon={Users} label="Users" />
                    <NavLink to="/categories" icon={FolderTree} label="Categories" />
                    <NavLink to="/tags" icon={Tags} label="Tags" />
                  </>
                )}

                {user?.role === 'SUB_ADMIN' && (
                  <>
                    <NavLink to="/queue" icon={Inbox} label="Category Queue" />
                    <NavLink to="/tickets" icon={Ticket} label="My Tickets" />
                    <NavLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                  </>
                )}

                {user?.role === 'USER' && (
                  <>
                    <NavLink to="/tickets" icon={Ticket} label="My Tickets" />
                  </>
                )}
              </nav>
            </div>

            {/* Right Action buttons & User profile */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Request</span>
              </button>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              {/* User badge */}
              <div className="flex items-center gap-2 pl-1">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {user?.name}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                    <span className={`px-1.5 py-0.2 rounded-full border text-[10px] font-semibold ${roleBadge}`}>
                      {roleLabel}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition border border-transparent hover:border-rose-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile secondary navigation */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto bg-slate-50/50">
          {user?.role === 'ADMIN' && (
            <>
              <MobileNavLink to="/dashboard" label="Dashboard" />
              <MobileNavLink to="/tickets" label="Tickets" />
              <MobileNavLink to="/onboarding" label={`Onboarding ${pendingCount > 0 ? `(${pendingCount})` : ''}`} />
              <MobileNavLink to="/users" label="Users" />
              <MobileNavLink to="/categories" label="Categories" />
              <MobileNavLink to="/tags" label="Tags" />
            </>
          )}
          {user?.role === 'SUB_ADMIN' && (
            <>
              <MobileNavLink to="/queue" label="Queue" />
              <MobileNavLink to="/tickets" label="My Tickets" />
              <MobileNavLink to="/dashboard" label="Dashboard" />
            </>
          )}
          {user?.role === 'USER' && (
            <>
              <MobileNavLink to="/tickets" label="My Tickets" />
            </>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Lab Request Tracker &bull; University Research Operations &bull; Localhost instance
      </footer>

      {/* New Request Modal */}
      <NewTicketModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={(newTicket) => {
          navigate(`/tickets/${newTicket.id}`);
        }}
      />
    </div>
  );
}

function NavLink({ to, icon: Icon, label, badge }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link
      to={to}
      className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
        isActive
          ? 'bg-slate-100 text-slate-900 font-semibold'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
      <span>{label}</span>
      {badge && (
        <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
          {badge}
        </span>
      )}
    </Link>
  );
}

function MobileNavLink({ to, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 ${
        isActive ? 'bg-indigo-600 text-white font-semibold' : 'bg-white text-slate-600 border border-slate-200'
      }`}
    >
      {label}
    </Link>
  );
}
