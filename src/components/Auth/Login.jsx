import React, { useState, useEffect } from 'react';
import { Form, useActionData, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { setLoginSession } from '../../utils/sessionUtils';
import { useUser } from '../../context/UserContext';
import { validateField } from '../../utils/validateField';
import styles from './Auth.module.css';

// Action to handle login logic
export const loginAction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');

  const errors = {}; // Object to store validation errors

  // Validate fields using the centralized validateField function
  errors.email = await validateField('email', email);
  errors.password = await validateField('password', password);

  // Remove empty errors
  Object.keys(errors).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });

  // If validation errors exist, return them
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    // Query Firestore to find the user by email
    const userQuery = query(collection(db, 'users'), where('email', '==', email));
    const userSnapshot = await getDocs(userQuery);

    // If no user is found, return an error
    if (userSnapshot.empty) {
      return { errors: { general: 'Invalid credentials.' } };
    }

    const user = userSnapshot.docs[0].data(); // Get user data
    const userID = userSnapshot.docs[0].id; // Get the Firebase document ID (userID)

    // Check if the provided password matches the stored password
    if (user.password !== password) {
      return { errors: { general: 'Invalid credentials.' } };
    }

    // Return success response with the user ID
    return { success: true, userID };
  } catch (error) {
    console.error('Error logging in:', error);
    return { errors: { general: 'Login failed. Please try again later.' } };
  }
};

const Login = () => {
  const actionData = useActionData();
  const navigate = useNavigate();
  const { setUser } = useUser(); // Access setUser from UserContext
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [generalError, setGeneralError] = useState(null); // General error state

  // Effect to handle successful Login and set general error
  useEffect(() => {
    if (actionData?.success) {
      setLoginSession(actionData.userID); // Store user session in localStorage

      const fetchUser = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', actionData.userID)); // Fetch user data from Firestore
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() }; // Combine Firestore ID and data
            setUser(userData); // Update UserContext with fetched data
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      };

      fetchUser();
      alert('Login successful! Redirecting to home page.');
      navigate('/'); // Redirect to home page
    }

    if (actionData?.errors?.general) {
      setGeneralError(actionData.errors.general); // Set general error
    }
  }, [actionData, navigate, setUser]);

  // Handle input field validation on blur
  const handleBlur = async (e) => {
    const { name, value } = e.target;
    const error = await validateField(name, value); // Use external validation function
    setFieldErrors((prev) => ({ ...prev, [name]: error })); // Set field-level errors
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value })); // Update form data
    setFieldErrors((prev) => ({ ...prev, [name]: null })); // Clear field-level errors
    setGeneralError(null); // Clear the general error
  };

  return (
    <div className={styles.auth}>
      <h2>Login</h2>

      <Form method="post" className={styles.form}>
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="email">Email:</label>
            <input type="email" id="email" name="email" placeholder="Email" value={formData.email} onBlur={handleBlur} onChange={handleChange} required />
          </div>
          {(fieldErrors.email || actionData?.errors?.email) && <p className={styles.error}>{fieldErrors.email || actionData.errors.email}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="password">Password:</label>
            <input type="password" id="password" name="password" placeholder="Password" value={formData.password} onBlur={handleBlur} onChange={handleChange} required />
          </div>
          {(fieldErrors.password || actionData?.errors?.password) && <p className={styles.error}>{fieldErrors.password || actionData.errors.password}</p>}
        </div>

        {/*For General Errors */}
        {generalError && <p className={styles.error}>{generalError}</p>}

        <button type="submit">Login</button>
      </Form>
    </div>
  );
};

export default Login;
