import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useUser } from '../../../context/UserContext';
import Spinner from '../../Shared/Spinner/Spinner';

interface GuestRouteProps {
  redirectTo?: string;
}

const GuestRoute: React.FC<GuestRouteProps> = ({ redirectTo = '/' }) => {
  const { user, loading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate(redirectTo, { replace: true }); // Redirect if the user is logged in
    }
  }, [user, loading, navigate, redirectTo]);

  // Show spinner while loading
  if (loading) {
    return <Spinner />;
  }

  // Render child routes if the user is not logged in
  return !user ? <Outlet /> : null;
};

export default GuestRoute;
