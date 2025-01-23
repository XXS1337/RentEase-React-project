// Function to check if the user's session has expired
export function checkSessionExpiry(navigate, setUser) {
  const loginTime = localStorage.getItem('loginTime'); // Retrieve the login timestamp from localStorage
  const currentTime = Date.now(); // Get the current timestamp

  const sessionDuration = 60 * 60 * 1000; // 60 minutes in milliseconds

  // If loginTime exists and the session duration has elapsed, log the user out
  if (loginTime && currentTime - loginTime > sessionDuration) {
    alert('Session expired. You will be logged out.');
    logoutUser(navigate, setUser); // Call the logout function
  }
}

// Function to log out the user
export function logoutUser(navigate, setUser) {
  // Remove user-related data from localStorage
  localStorage.removeItem('loggedInUser');
  localStorage.removeItem('loginTime');

  setUser(null); // Clear the user state in UserContext
  navigate('/login'); // Redirect the user to the login page

  // Reload the app to reset the NavBar state and show Login and Register links.
  // Fort the case when the user closes the browser and accesses the page after the 60 min session has expired
  // Else, the navbar will not be reloaded properly and will show the links as if the user is still logged in.
  window.location.reload();
}

// Function to set login details in localStorage
export function setLoginSession(userID) {
  const currentTime = Date.now(); // Store the current timestamp and user ID in localStorage
  localStorage.setItem('loggedInUser', userID);
  localStorage.setItem('loginTime', currentTime);
}
