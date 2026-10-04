import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_HOME } from '../../config/campus';

// Wrap a group of routes: <Route element={<ProtectedRoute roles={[...]} />}> ...children... </Route>
export function ProtectedRoute({ roles }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}

// Login/register screens: bounce signed-in users to their own dashboard.
export function PublicOnly() {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  return <Outlet />;
}

// "/" sends everyone to the dashboard for their role.
export function HomeRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || '/unauthorized'} replace />;
}
