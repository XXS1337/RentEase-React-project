import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from '../../../context/UserContext';
import ErrorPage from '../../ErrorPage/ErrorPage';
import Spinner from '../../Shared/Spinner/Spinner';

// Component to protect routes and optionally restrict access to admin-only
const ProtectedRoute = ({ adminOnly = false }) => {
  const { user, loading } = useUser(); // Access user state from context
  const [isAdmin, setIsAdmin] = useState(false); // State to track admin status
  const location = useLocation();

  // Function to check user authentication and admin status
  useEffect(() => {
    if (user) {
      setIsAdmin(user.isAdmin || false); // Check if user is an admin from context
    }
  }, [user]);

  if (loading) {
    return <Spinner />; // Show a spinner while loading user data
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />; // Redirect to login if the user is not authenticated
  }

  if (adminOnly && !isAdmin) {
    return <ErrorPage />; // Show an error page if the route is admin-only and the user is not an admin
  }

  // Render child routes if the user is authenticated and has required role
  return <Outlet />;
};

export default ProtectedRoute;
