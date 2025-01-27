import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from '../../../context/UserContext';
import ErrorPage from '../../ErrorPage/ErrorPage';
import Spinner from '../../Shared/Spinner/Spinner';

// Props type definition for ProtectedRoute
type ProtectedRouteProps = {
  adminOnly?: boolean;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ adminOnly = false }) => {
  const { user, loading } = useUser(); // Access user state from context
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    if (user) {
      setIsAdmin(user.isAdmin || false); // Check if user is an admin from context
    }
  }, [user]);

  if (loading) {
    return <Spinner />; // Show spinner while loading user data
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />; // Redirect to login if no user
  }

  if (adminOnly && !isAdmin) {
    return <ErrorPage />; // Show error page if not an admin
  }

  return <Outlet />; // Render child routes if user is authenticated and has required role
};

export default ProtectedRoute;
