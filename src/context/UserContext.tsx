import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

// Define the type for user data
type User = {
  id: string;
  [key: string]: any; // To handle additional user fields dynamically
};

// Define the context type
type UserContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
};

// Create the UserContext
const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider component to wrap the application and manage user state
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null); // State to store the current user data
  const [loading, setLoading] = useState(true); // Add a loading state

  useEffect(() => {
    const loggedInUserId = localStorage.getItem('loggedInUser'); // Retrieve the logged-in user's ID from localStorage
    if (!loggedInUserId) {
      setLoading(false); // No user logged in, stop loading
      return;
    }

    const userDocRef = doc(db, 'users', loggedInUserId); // Reference the Firestore document for the logged-in user

    // Set up a real-time listener for the user's document
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUser({ id: doc.id, ...doc.data() }); // If the document exists, update the user state with the data
      } else {
        setUser(null); // If the document doesn't exist, clear the user state
      }
      setLoading(false); // Finished loading
    });

    return () => unsubscribe(); // Cleanup the listener when the component unmounts
  }, []); // Dependency array is empty to run this effect only on mount

  // Provide the user data and the setUser function to child components
  return <UserContext.Provider value={{ user, setUser, loading }}>{children}</UserContext.Provider>;
};

// Custom hook to use the UserContext
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
