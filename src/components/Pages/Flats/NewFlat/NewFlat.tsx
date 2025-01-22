import React, { useState, useEffect, ChangeEvent, FocusEvent } from 'react';
import { useActionData, Form, useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../../../firebase';
import { validateField } from '../../../../utils/validateField';
import { Flat, FieldErrors, FormData } from '../../../../types/Flat';
import styles from './NewFlat.module.css';

// Action to handle adding a new flat
export const newFlatAction = async ({ request }: { request: Request }) => {
  const formData = await request.formData(); // Parse form data from the request

  // Extract and process form fields
  const adTitle = formData.get('adTitle') as string;
  const city = formData.get('city') as string;
  const streetName = formData.get('streetName') as string;
  const streetNumber = formData.get('streetNumber') as string;
  const areaSize = formData.get('areaSize') as string;
  const hasAC = formData.get('hasAC') === 'on'; // Convert checkbox value to boolean
  const yearBuilt = formData.get('yearBuilt') as string;
  const rentPrice = formData.get('rentPrice') as string;
  const dateAvailable = formData.get('dateAvailable') as string;
  const imageFile = formData.get('image') as File; // Image file upload

  const errors: FieldErrors = {}; // Object to hold validation errors

  // Validate fields using validateField
  errors.adTitle = await validateField('adTitle', adTitle);
  errors.city = await validateField('city', city);
  errors.streetName = await validateField('streetName', streetName);
  errors.streetNumber = await validateField('streetNumber', streetNumber);
  errors.areaSize = await validateField('areaSize', areaSize);
  errors.yearBuilt = await validateField('yearBuilt', yearBuilt);
  errors.rentPrice = await validateField('rentPrice', rentPrice);
  errors.dateAvailable = await validateField('dateAvailable', dateAvailable);
  errors.image = await validateField('image', imageFile?.name);

  // Remove empty errors
  Object.keys(errors).forEach((key) => {
    if (!errors[key as keyof FieldErrors]) delete errors[key as keyof FieldErrors];
  });

  // Return errors if any validation fails
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    const userID = localStorage.getItem('loggedInUser'); // Get the logged-in user ID

    const imagePath = imageFile.name; // Store the image file name

    const flatData: Flat = {
      adTitle,
      city,
      streetName,
      streetNumber: Number(streetNumber),
      areaSize: Number(areaSize),
      hasAC,
      yearBuilt: Number(yearBuilt),
      rentPrice: Number(rentPrice),
      dateAvailable,
      image: imagePath, // Save the file name
      ownerID: userID || '',
      isFavorite: false, // Default value
      createdAt: Date.now(), // Current timestamp
    };

    // Save the flat data in Firestore
    await addDoc(collection(db, 'flats'), flatData);

    // Returning success to allow navigation in the component
    return { success: true };
  } catch (error) {
    console.error('Error adding flat:', error);
    return { errors: { general: 'Failed to add flat. Please try again.' } };
  }
};

// Component for adding a new flat
const NewFlat: React.FC = () => {
  const actionData = useActionData<{ success?: boolean; errors?: FieldErrors }>();
  const navigate = useNavigate();
  const [formSubmitted, setFormSubmitted] = useState(false); // State to prevent duplicate submissions
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({}); // State for field-specific errors
  const [formData, setFormData] = useState<FormData>({
    adTitle: '',
    city: '',
    streetName: '',
    streetNumber: '',
    areaSize: '',
    yearBuilt: '',
    rentPrice: '',
    dateAvailable: '',
    image: null,
    hasAC: false,
  }); // State for form data
  const [generalError, setGeneralError] = useState<string | null>(null); // General error state

  useEffect(() => {
    if (actionData?.success && !formSubmitted) {
      alert('Flat added successfully!'); // Notify user of success
      setFormSubmitted(true);
      navigate('/myFlats'); // Redirect to "My Flats" page
    }

    if (actionData?.errors?.general) {
      setGeneralError(actionData.errors.general); // Set general error
    }
  }, [actionData, formSubmitted, navigate]);

  // Validate fields on blur
  const handleBlur = async (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, files } = target;
    const fieldValue = name === 'image' ? files?.[0]?.name || '' : value; // Use file name for image validation
    const error = await validateField(name, fieldValue); // Validate using external function
    setFieldErrors((prev) => ({ ...prev, [name]: error })); // Update field errors state
  };

  // Handle input changes and clear field errors
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files?.[0] || null : value,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: null })); // Clear field-specific errors
    setGeneralError(null); // Clear the general error
  };

  // Check if the form is valid
  const isFormValid = () => {
    // Ensure no field errors and all fields are filled
    const isValid = Object.values(fieldErrors).every((error) => !error) && Object.values(formData).every((value) => value !== '' && value !== null);
    return isValid;
  };

  return (
    <div className={styles.newFlat}>
      <h2>Add New Flat</h2>

      <Form method="post" encType="multipart/form-data" className={styles.form}>
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="adTitle">Ad Title:</label>
            <input id="adTitle" name="adTitle" type="text" minLength={5} maxLength={60} value={formData.adTitle} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.adTitle && <p className={styles.error}>{fieldErrors.adTitle}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="city">City:</label>
            <input id="city" name="city" type="text" value={formData.city} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.city && <p className={styles.error}>{fieldErrors.city}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="streetName">Street Name:</label>
            <input id="streetName" name="streetName" type="text" value={formData.streetName} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.streetName && <p className={styles.error}>{fieldErrors.streetName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="streetNumber">Street Number:</label>
            <input id="streetNumber" name="streetNumber" type="number" value={formData.streetNumber} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.streetNumber && <p className={styles.error}>{fieldErrors.streetNumber}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="areaSize">Area Size (m²):</label>
            <input id="areaSize" name="areaSize" type="number" value={formData.areaSize} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.areaSize && <p className={styles.error}>{fieldErrors.areaSize}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="yearBuilt">Year Built:</label>
            <input id="yearBuilt" name="yearBuilt" type="number" value={formData.yearBuilt} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.yearBuilt && <p className={styles.error}>{fieldErrors.yearBuilt}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="rentPrice">Rent Price (€):</label>
            <input id="rentPrice" name="rentPrice" type="number" value={formData.rentPrice} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.rentPrice && <p className={styles.error}>{fieldErrors.rentPrice}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="dateAvailable">Date Available:</label>
            <input id="dateAvailable" name="dateAvailable" type="date" value={formData.dateAvailable} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.dateAvailable && <p className={styles.error}>{fieldErrors.dateAvailable}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={`${styles.inputContainer} ${styles.inputContainerCheckbox}`}>
            <label htmlFor="hasAC">Has AC:</label>
            <input type="checkbox" id="hasAC" name="hasAC" checked={formData.hasAC} onChange={handleChange} />
          </div>
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="image">Flat Image:</label>
            <input type="file" id="image" name="image" accept="image/*" onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.image && <p className={styles.error}>{fieldErrors.image}</p>}
        </div>

        {/*For General Errors */}
        {generalError && <p className={styles.error}>{generalError}</p>}

        <button type="submit" className={styles.saveButton} disabled={!isFormValid()}>
          Save
        </button>
      </Form>
    </div>
  );
};

export default NewFlat;
