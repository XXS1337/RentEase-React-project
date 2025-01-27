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
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // State to track admin status
  const location = useLocation();

  // Function to check user authentication and admin status
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
    return <ErrorPage />; // Show an error page if the route is admin-only and the user is not an admin
  }

  return <Outlet />; // Render child routes if user is authenticated and has required role
};

export default ProtectedRoute;
