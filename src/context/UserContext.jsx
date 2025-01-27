import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

// Create a context for managing user data
const UserContext = createContext();

// Provider component to wrap the application and manage user state
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null); // State to store the current user data
  const [loading, setLoading] = useState(true); // State to track loading status
  const [loggedInUserId, setLoggedInUserId] = useState(localStorage.getItem('loggedInUser')); // State to store the logged-in user's ID fetched from localStorage

  // Sync localStorage changes (cross-tab and same-tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const currentUserId = localStorage.getItem('loggedInUser'); // Get the current user ID from localStorage and update the state
      setLoggedInUserId(currentUserId);
    };

    // Listen for cross-tab changes to localStorage
    window.addEventListener('storage', handleStorageChange);

    // Manually check for same-tab changes periodically (every 1 second)
    const interval = setInterval(handleStorageChange, 1000);

    // Clean up event listeners and interval when component unmounts
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Firestore listener to fetch user data whenever loggedInUserId changes
  useEffect(() => {
    if (!loggedInUserId) {
      // No user ID, set user to null and stop loading
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true); // Start loading while fetching user data

    const userDocRef = doc(db, 'users', loggedInUserId); // Firestore reference to user document

    // Set up a real-time listener for the user's document
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (!doc.exists()) {
        // If the document does not exist, clear the session (invalid session)
        localStorage.removeItem('loggedInUser'); // Remove user ID from localStorage
        setLoggedInUserId(null); // Reset logged-in user ID
        setUser(null); // Reset user data
      } else {
        setUser({ id: doc.id, ...doc.data() }); // If document exists, update the user state with data from Firestore
      }
      setLoading(false); // Finished loading
    });

    // Cleanup Firestore listener when the component unmounts or when user ID changes
    return () => {
      unsubscribe();
      setLoading(false);
    };
  }, [loggedInUserId]); // Re-run this effect when loggedInUserId changes

  // Method to clear user data
  const clearUser = () => {
    localStorage.removeItem('loggedInUser'); // Remove logged-in user from localStorage
    localStorage.removeItem('loginTime'); // Optionally clear login time if you use it
    setLoggedInUserId(null); // Reset the logged-in user ID state
    setUser(null); // Reset user data state
  };

  // Provide the user data and the setUser function to child components
  return <UserContext.Provider value={{ user, setUser, loading, clearUser }}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    // Ensure that useUser is used within the UserProvider
    throw new Error('useUser must be used within a UserProvider');
  }
  return context; // Return the user context (user data, setUser, loading, clearUser)
};
