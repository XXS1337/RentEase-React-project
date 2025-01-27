import { NavigateFunction } from 'react-router-dom';

// Function to check if the user's session has expired
export function checkSessionExpiry(navigate: NavigateFunction, setUser: React.Dispatch<React.SetStateAction<any>>): void {
  const loginTime = localStorage.getItem('loginTime'); // Retrieve the login timestamp from localStorage
  const currentTime = Date.now(); // Get the current timestamp

  const sessionDuration = 60 * 60 * 1000; // 60 minutes in milliseconds

  // If loginTime exists and the session duration has elapsed, log the user out
  if (loginTime && currentTime - Number(loginTime) > sessionDuration) {
    alert('Session expired. You will be logged out.');
    logoutUser(navigate, setUser); // Call the logout function
  }
}

// Function to log out the user
export function logoutUser(navigate: NavigateFunction, setUser: React.Dispatch<React.SetStateAction<any>>): void {
  // Remove user-related data from localStorage
  localStorage.removeItem('loggedInUser');
  localStorage.removeItem('loginTime');

  setUser(null); // Clear the user state in UserContext
  navigate('/login'); // Redirect the user to the login page
}

// Function to set login details in localStorage
export function setLoginSession(userID: string): void {
  const currentTime = Date.now(); // Store the current timestamp and user ID in localStorage
  localStorage.setItem('loggedInUser', userID);
  localStorage.setItem('loginTime', currentTime.toString());
}
