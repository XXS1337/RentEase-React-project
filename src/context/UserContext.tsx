import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

type User = {
  id: string;
  [key: string]: any;
};

type UserContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  clearUser: () => void; // New method to clear user data
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(localStorage.getItem('loggedInUser'));

  // Sync localStorage changes (cross-tab and same-tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const currentUserId = localStorage.getItem('loggedInUser');
      setLoggedInUserId(currentUserId);
    };

    // Listen for cross-tab changes
    window.addEventListener('storage', handleStorageChange);

    // Manually check for same-tab changes periodically
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Firestore listener for user data
  useEffect(() => {
    if (!loggedInUserId) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const userDocRef = doc(db, 'users', loggedInUserId);

    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (!doc.exists()) {
        // Auto-clear invalid sessions
        localStorage.removeItem('loggedInUser');
        setLoggedInUserId(null);
        setUser(null);
      } else {
        setUser({ id: doc.id, ...doc.data() });
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      setLoading(false);
    };
  }, [loggedInUserId]); // Re-run when user ID changes

  // Method to clear user data
  const clearUser = () => {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('loginTime');
    setLoggedInUserId(null);
    setUser(null);
  };

  return <UserContext.Provider value={{ user, setUser, loading, clearUser }}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
