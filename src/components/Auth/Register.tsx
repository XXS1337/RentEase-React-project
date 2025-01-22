import React, { useState, useEffect } from 'react';
import { Form, useActionData, useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { validateField } from '../../utils/validateField';
import User from '../../types/User';
import styles from './Auth.module.css';

// Define the structure for form data
type RegisterFormData = Omit<User, 'id' | 'createdAt' | 'isAdmin'> & {
  confirmPassword: string;
};

// Define the structure for field errors
type FieldErrors = Partial<Record<keyof RegisterFormData | 'general', string>>;

// Action to handle user registration
export const registerAction = async ({ request }: { request: Request }) => {
  const formData = await request.formData(); // Extract form data from the request
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const birthDate = formData.get('birthDate') as string;

  // Perform form fields validations and provide client-side validation and feedback
  const errors: FieldErrors = {}; // Object to store validation errors

  // Validate each field
  // Since validateField is asynchronous, you must await its result; otherwise, you get a Promise, which leads to the rendering error
  errors.firstName = await validateField('firstName', firstName);
  errors.lastName = await validateField('lastName', lastName);
  errors.email = await validateField('email', email, { checkEmail: true });
  errors.password = await validateField('password', password);
  errors.confirmPassword = await validateField('confirmPassword', confirmPassword, { password });
  errors.birthDate = await validateField('birthDate', birthDate);

  // Remove empty errors
  Object.keys(errors).forEach((key) => {
    if (!errors[key as keyof RegisterFormData]) delete errors[key as keyof RegisterFormData];
  });

  // Return errors if any validation fails
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    // Check if the email is already registered in Firestore
    const existingUsersQuery = query(collection(db, 'users'), where('email', '==', email));
    const existingUsersSnapshot = await getDocs(existingUsersQuery);

    if (!existingUsersSnapshot.empty) {
      return { errors: { email: 'This email is not available. Please try another or log in if you already have an account.' } };
    }

    // Add new user to Firestore
    await addDoc(collection(db, 'users'), {
      firstName,
      lastName,
      email,
      password,
      birthDate,
      favoriteFlats: [],
      isAdmin: false,
      createdAt: Date.now(),
    });

    return { success: true };
  } catch (error) {
    return { errors: { general: 'Registration failed. Please try again.' } };
  }
};

const Register: React.FC = () => {
  const actionData = useActionData<{ success?: boolean; errors?: FieldErrors }>();
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
  });
  const [generalError, setGeneralError] = useState<string | null>(null); // General error state
  const [isCheckingEmail, setIsCheckingEmail] = useState<boolean>(false); // Indicates if the email is being checked for uniqueness

  //Redirects to the login page upon successful registration.
  useEffect(() => {
    if (actionData?.success) {
      alert('Registration successful! Redirecting to login page.');
      navigate('/login');
    }

    if (actionData?.errors?.general) {
      setGeneralError(actionData.errors.general); // Set general error
    }
  }, [actionData, navigate]);

  // Validate individual fields on blur
  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'email') {
      setIsCheckingEmail(true); // Start checking email
      try {
        // Email format validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          setFieldErrors((prev) => ({ ...prev, email: 'Email must be in a valid format.' }));
          return;
        }

        // Query Firestore to check if the email already exists in the database
        const existingUsersQuery = query(collection(db, 'users'), where('email', '==', value));
        const existingUsersSnapshot = await getDocs(existingUsersQuery);

        if (!existingUsersSnapshot.empty) {
          // If the email exists in the database, set an error message
          setFieldErrors((prev) => ({
            ...prev,
            email: 'This email is not available. Please try another or log in if you already have an account.',
          }));
        } else {
          // If the email is available, clear any previous email-related errors
          setFieldErrors((prev) => ({ ...prev, email: undefined }));
        }
      } catch (error) {
        console.error('Error checking email availability:', error); // Log any errors that occur during the Firestore query
        setFieldErrors((prev) => ({
          ...prev,
          email: 'An unexpected error occurred while checking email availability.', // Set a generic error message in case of failure
        }));
      } finally {
        setIsCheckingEmail(false); // Mark the email checking process as complete
      }
    } else {
      // For all other fields, use the shared validateField function for validation
      const error = await validateField(name, value, { password: formData.password, checkEmail: name === 'email' });

      // Update the fieldErrors state with the validation result
      setFieldErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  // Update form data and clear errors on change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Update form data
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Dynamically clear the email error while typing
    if (name === 'email') {
      setFieldErrors((prev) => ({ ...prev, email: undefined })); // Clear email error
    } else {
      // Clear errors for other fields
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }

    // Clear general errors
    setGeneralError(null);
  };

  // Checks if the form is valid. Ensures all fields are valid and filled. Ensures no email validation is in progress.
  const isFormValid = () => {
    return Object.values(fieldErrors).every((error) => !error) && Object.values(formData).every((value) => value.trim() !== '') && !isCheckingEmail;
  };

  return (
    <div className={styles.auth}>
      <h2>Register</h2>

      <Form method="post" className={styles.form}>
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="firstName">First Name:</label>
            <input type="text" id="firstName" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.firstName && <p className={styles.error}>{fieldErrors.firstName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="lastName">Last Name:</label>
            <input type="text" id="lastName" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.lastName && <p className={styles.error}>{fieldErrors.lastName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="email">Email:</label>
            <input type="email" id="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {isCheckingEmail && <p className={styles.duplicateEmail}>Checking email availability...</p>}
          {(fieldErrors.email || actionData?.errors?.email) && <p className={styles.error}>{fieldErrors.email || actionData?.errors?.email}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="password">Password:</label>
            <input type="password" id="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.password && <p className={styles.error}>{fieldErrors.password}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="confirmPassword">Confirm Password:</label>
            <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.confirmPassword && <p className={styles.error}>{fieldErrors.confirmPassword}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="birthDate">Birth Date:</label>
            <input type="date" id="birthDate" name="birthDate" value={formData.birthDate} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.birthDate && <p className={styles.error}>{fieldErrors.birthDate}</p>}
        </div>

        {/*For General Errors */}
        {generalError && <p className={styles.error}>{generalError}</p>}

        <button type="submit" disabled={!isFormValid() || isCheckingEmail}>
          Register
        </button>
      </Form>
    </div>
  );
};

export default Register;
