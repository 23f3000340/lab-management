import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';

import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { TicketsPage } from './pages/TicketsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { SubAdminQueuePage } from './pages/SubAdminQueuePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminOnboardingPage } from './pages/AdminOnboardingPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminCategoriesPage } from './pages/AdminCategoriesPage';
import { AdminTagsPage } from './pages/AdminTagsPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If not allowed, redirect to their home
    if (user.role === 'ADMIN') return <Navigate to="/dashboard" replace />;
    if (user.role === 'SUB_ADMIN') return <Navigate to="/queue" replace />;
    return <Navigate to="/tickets" replace />;
  }

  return <Layout>{children}</Layout>;
}

function RoleHomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'ADMIN') return <Navigate to="/dashboard" replace />;
  if (user.role === 'SUB_ADMIN') return <Navigate to="/queue" replace />;
  return <Navigate to="/tickets" replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Role Home Redirect */}
            <Route path="/" element={<RoleHomeRedirect />} />

            {/* Tickets (all roles) */}
            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <TicketsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/tickets/:id"
              element={
                <ProtectedRoute>
                  <TicketDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Sub-Admin Queue */}
            <Route
              path="/queue"
              element={
                <ProtectedRoute allowedRoles={['SUB_ADMIN', 'ADMIN']}>
                  <SubAdminQueuePage />
                </ProtectedRoute>
              }
            />

            {/* Admin Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SUB_ADMIN']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Management Pages */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminOnboardingPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/categories"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminCategoriesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/tags"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminTagsPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
