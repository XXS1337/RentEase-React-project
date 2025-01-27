import React, { useState, useEffect } from 'react';
import { Form, useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import handleRemoveUser from '../../../utils/handleRemoveUser';
import Modal from '../../Shared/Modal/Modal';
import { useUser } from '../../../context/UserContext';
import Spinner from '../../Shared/Spinner/Spinner';
import { validateField } from '../../../utils/validateField';
import User from '../../../types/User';
import styles from './MyProfile.module.css';

// State type for modal visibility and message
type ShowModalState = {
  isVisible: boolean;
  message: string;
};

// Form data type
type FormData = Omit<User, 'id' | 'createdAt' | 'isAdmin' | 'password'> & {
  password: string;
  confirmPassword: string;
};

// Field errors type
type FieldErrors = Partial<Record<keyof FormData, string>>;

// Action to handle updating the user's profile
export const myProfileAction = async ({ request }: { request: Request }) => {
  const formData = await request.formData(); // Parse form data from the request
  const editedUserId = formData.get('editedUserId') as string; // Extract the edited user's ID from the formData

  if (!editedUserId) {
    return { errors: { general: 'User not found.' } }; // Handle missing user ID
  }

  // Extract fields from the form
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const birthDate = formData.get('birthDate') as string; // Extract birthDate field

  // Perform form fields validations and provide client-side validation and feedback
  const errors: FieldErrors = {}; // Object to store validation errors

  errors.firstName = await validateField('firstName', firstName);
  errors.lastName = await validateField('lastName', lastName);
  errors.email = await validateField('email', email, {
    checkEmail: true,
    originalEmail: localStorage.getItem('loggedInUserEmail') || undefined,
  });
  errors.password = await validateField('password', password);
  errors.confirmPassword = await validateField('confirmPassword', confirmPassword, { password });
  errors.birthDate = await validateField('birthDate', birthDate);

  // Remove empty errors
  Object.keys(errors).forEach((key) => {
    if (!errors[key as keyof FormData]) delete errors[key as keyof FormData];
  });

  // Return errors if validation fails
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    const userDocRef = doc(db, 'users', editedUserId); // Reference to the edited user's Firestore document

    const updatedData: Partial<User> = { firstName, lastName, email };

    if (password) {
      updatedData.password = password; // Include password if it was updated
    }

    if (birthDate) {
      updatedData.birthDate = birthDate; // Include birthDate if it was updated
    }

    await updateDoc(userDocRef, updatedData); // Update user data in Firestore

    // Fetch updated user data
    const updatedUserDoc = await getDoc(userDocRef);
    const updatedUserData = { id: updatedUserDoc.id, ...updatedUserDoc.data() } as User;

    return { success: true, user: updatedUserData }; // Pass the updated user data back to the component
  } catch (error) {
    console.error('Error updating profile:', error);
    return { errors: { general: 'Failed to update profile. Please try again.' } };
  }
};

const MyProfile: React.FC = () => {
  const { userID } = useParams<{ userID: string }>(); // Retrieve the userID from the route parameters if editing another user's profile
  const navigate = useNavigate();
  const { setUser, clearUser } = useUser(); // Access the global user context to update the logged-in user's data globally
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null); // State for the logged-in user
  const [editedUserId, setEditedUserId] = useState<string | null>(null); // State for the user being edited

  // State variables to manage form data, validation errors, loading status, and modals
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
  });
  const [originalData, setOriginalData] = useState<User | null>(null); // Store the original data to track changes
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({}); // Store validation errors for specific fields
  const [isCheckingEmail, setIsCheckingEmail] = useState(false); // Manage email availability check state
  const [isLoading, setIsLoading] = useState(true); // Manage loading state while data is fetched
  const [showModal, setShowModal] = useState<ShowModalState>({ isVisible: false, message: '' }); // Manage modal visibility and content

  // Resolve logged-in user and edited user IDs
  useEffect(() => {
    const storedUserId = localStorage.getItem('loggedInUser'); // Resolve logged-in user and edited user IDs
    if (!storedUserId) {
      navigate('/login'); // Redirect to login if no logged-in user is found
      return;
    }
    setLoggedInUserId(storedUserId); // Set the logged-in user's ID in state

    // Determine the edited user:
    // - If `userID` is present (from route params), set it as the edited user (admin editing another user).
    // - Otherwise, default to the logged-in user (editing their own profile).
    if (userID) {
      setEditedUserId(userID);
    } else {
      setEditedUserId(storedUserId);
    }
  }, [userID, navigate]); // Dependencies: Re-run if `userID` or `navigate` changes

  // Fetch data for the edited user
  useEffect(() => {
    if (!editedUserId) return; // Wait until `editedUserId` is resolved

    const fetchUserData = async () => {
      try {
        // Fetch the edited user's data from Firestore
        const userDoc = await getDoc(doc(db, 'users', editedUserId));

        if (userDoc.exists()) {
          const data = userDoc.data() as User;

          // Store the original user data
          setOriginalData(data);

          // Populate the form fields with the fetched user data
          setFormData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            password: '', // Do not pre-fill password fields for security reasons
            confirmPassword: '',
            birthDate: data.birthDate ?? '',
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/'); // Redirect to a safe route if data is invalid
      } finally {
        setIsLoading(false); // Stop the loading spinner once data is fetched
      }
    };
    fetchUserData(); // Call the function to fetch user data
  }, [editedUserId]); // Dependencies: Re-run if `editedUserId` changes

  if (isLoading) {
    return <Spinner />; // Display a loading spinner while data is being fetched
  }

  // Function to validate individual form fields
  const validateFieldLocal = async (name: keyof FormData, value: string) => {
    let error = '';

    if (name === 'email') {
      setIsCheckingEmail(true); // Start checking email availability
      error = await validateField(name, value, {
        checkEmail: true,
        originalEmail: originalData?.email,
      });
      setIsCheckingEmail(false); // Stop checking email availability
    } else {
      error = await validateField(name, value, {
        password: formData.password,
        allowEmptyPassword: true, // Allow empty passwords
      });
    }

    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Handle field blur (losing focus) by validating the field
  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    await validateFieldLocal(name as keyof FormData, value);
  };

  // Handle changes in form fields and reset errors for that field
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value })); // Update form data
    setFieldErrors((prev) => ({ ...prev, [name]: undefined })); // Clear errors for the specific field
  };

  // Check if the form is valid and has changes to submit
  const isFormValid = () => {
    const hasErrors = Object.values(fieldErrors).some((error) => error); // Check for validation errors
    const hasChanges =
      originalData &&
      (formData.firstName !== originalData.firstName ||
        formData.lastName !== originalData.lastName ||
        formData.email !== originalData.email ||
        formData.birthDate !== originalData.birthDate ||
        formData.password !== '' ||
        formData.confirmPassword !== '');
    return !hasErrors && hasChanges && !isCheckingEmail; // Form is valid if there are no errors and changes exist
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) return; // Stop submission if the form is invalid

    try {
      const userDocRef = doc(db, 'users', editedUserId!); // Use editedUserId to target the correct user document
      const updatedData: Partial<User> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        birthDate: formData.birthDate,
      };

      if (formData.password) {
        updatedData.password = formData.password; // Include password if updated
      }

      await updateDoc(userDocRef, updatedData); // Update user data in Firestore

      // Fetch updated user data
      const updatedUserDoc = await getDoc(userDocRef);
      const updatedUserData = { id: updatedUserDoc.id, ...updatedUserDoc.data() } as User;

      // If the logged-in user is editing their own profile, update their context
      if (loggedInUserId === editedUserId) {
        setUser(updatedUserData);
      }

      // Check if the logged-in user is an admin
      const loggedInUserDoc = await getDoc(doc(db, 'users', localStorage.getItem('loggedInUser')!));
      const isAdmin = loggedInUserDoc.exists() && loggedInUserDoc.data()?.isAdmin === true;

      // Determine redirection logic
      if (isAdmin) {
        if (loggedInUserId === editedUserId) {
          // Admin updated their own profile
          alert('Profile updated successfully!');
          navigate('/');
        } else {
          // Admin updated someone else's profile
          alert('Profile updated successfully!');
          navigate('/admin/all-users');
        }
      } else {
        // Regular user updated their own profile
        alert('Profile updated successfully!');
        navigate('/');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      await handleRemoveUser(editedUserId!, () => {}); // Remove the edited user's account and associated data from Firestore

      if (editedUserId === loggedInUserId) {
        // If the logged-in user is deleting their own account
        clearUser(); // Use clearUser to clear session and context
        navigate('/login');
      } else {
        // If an admin is deleting another user's account
        setShowModal({ isVisible: false, message: '' });
        navigate('/admin/all-users');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user. Please try again later.');
    }
  };

  // Close the delete confirmation modal
  const handleCancelDelete = () => {
    setShowModal({ isVisible: false, message: '' });
  };

  return (
    <div className={styles.profile}>
      {/* Dynamically set the title based on whether the logged-in user is editing their own profile or other users profile */}
      <h2>{editedUserId === loggedInUserId ? 'My Profile' : `Editing Profile: ${originalData?.firstName} ${originalData?.lastName}`}</h2>

      {/* Display user details*/}
      {originalData && (
        <div className={styles.profileDetails}>
          <h3>User Details</h3>
          <p>
            <strong>First Name:</strong> {originalData.firstName}
          </p>
          <p>
            <strong>Last Name:</strong> {originalData.lastName}
          </p>
          <p>
            <strong>Email:</strong> {originalData.email}
          </p>
          <p>
            <strong>Date of Birth:</strong>
            {new Date(originalData?.birthDate || '').toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
            })}
          </p>
          <p>
            <strong>Registered at:</strong>
            {originalData?.createdAt ? new Date(originalData.createdAt).toLocaleString() : 'Not Available'}
          </p>
        </div>
      )}
      {/*Form for updating the profile */}
      <h3 className={styles.formTitle}>Update Profile</h3>
      <Form method="post" className={styles.form} onSubmit={handleSubmit}>
        <input type="hidden" name="editedUserId" value={editedUserId || ''} />
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="firstName">First Name:</label>
            <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.firstName && <p className={styles.error}>{fieldErrors.firstName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="lastName">Last Name:</label>
            <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.lastName && <p className={styles.error}>{fieldErrors.lastName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="email">Email:</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {isCheckingEmail && <p className={styles.duplicateEmail}>Checking email availability...</p>}
          {fieldErrors.email && <p className={styles.error}>{fieldErrors.email}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="birthDate">Date of Birth:</label>
            <input type="date" id="birthDate" name="birthDate" value={formData.birthDate} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.birthDate && <p className={styles.error}>{fieldErrors.birthDate}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="password">Password:</label>
            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.password && <p className={styles.error}>{fieldErrors.password}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="confirmPassword">Confirm Password:</label>
            <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.confirmPassword && <p className={styles.error}>{fieldErrors.confirmPassword}</p>}
        </div>

        {/* Submit Button */}
        <button type="submit" className={styles.updateButton} disabled={!isFormValid()}>
          Update
        </button>
      </Form>
      {/*Delete Account button - triggers the confirmation modal */}
      <button
        className={styles.deleteButton}
        onClick={() =>
          setShowModal({
            isVisible: true,
            message: editedUserId === loggedInUserId ? 'Are you sure you want to delete your account?' : 'Are you sure you want to delete this user?',
          })
        }
      >
        Delete Account
      </button>
      {/* Confirmation Modal */}
      {showModal.isVisible && <Modal message={showModal.message} onYes={handleDeleteAccount} onNo={handleCancelDelete} />}
    </div>
  );
};

export default MyProfile;
