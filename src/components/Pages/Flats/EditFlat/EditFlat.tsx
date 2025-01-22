import React, { useState, useEffect, ChangeEvent, FocusEvent } from 'react';
import { useActionData, Form, useNavigate, useLoaderData } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../../../firebase';
import { validateField } from '../../../../utils/validateField';
import { Flat, FieldErrors } from '../../../../types/Flat';
import styles from './EditFlat.module.css';

interface LoaderParams {
  params: {
    flatID: string;
  };
}

// Loader to fetch flat data for editing
export const editFlatLoader = async ({ params }: LoaderParams) => {
  const flatID = params.flatID; // Extract flat ID from route params

  try {
    const flatDoc = await getDoc(doc(db, 'flats', flatID)); // Fetch flat data from Firestore
    if (flatDoc.exists()) {
      return { ...flatDoc.data(), id: flatID }; // Return the flat data with its ID
    } else {
      throw new Error('Flat not found'); // Handle case where flat doesn't exist
    }
  } catch (error) {
    console.error('Error fetching flat data:', error); // Log error
    throw new Response('Failed to fetch flat data.', { status: 404 });
  }
};

// Action to handle flat data updates
export const editFlatAction = async ({ request, params }: { request: Request; params: { flatID: string } }) => {
  const formData = await request.formData(); // Parse form data
  const flatID = params.flatID; // Extract flat ID from route params

  const flatDoc = await getDoc(doc(db, 'flats', flatID)); // Fetch the current flat data
  if (!flatDoc.exists()) {
    throw new Error('Flat not found'); // Handle missing flat
  }
  const originalFlatData = flatDoc.data() as Flat; // Store original flat data for validation

  // Extract form data fields
  const adTitle = formData.get('adTitle') as string;
  const city = formData.get('city') as string;
  const streetName = formData.get('streetName') as string;
  const streetNumber = formData.get('streetNumber') as string;
  const areaSize = formData.get('areaSize') as string;
  const hasAC = formData.get('hasAC') === 'on'; // Convert checkbox value to boolean
  const yearBuilt = formData.get('yearBuilt') as string;
  const rentPrice = formData.get('rentPrice') as string;
  const dateAvailable = formData.get('dateAvailable') as string;
  const imageFile = formData.get('image') as File; // Handle optional image file upload

  const errors: FieldErrors = {}; // Object to hold validation errors

  // Validate fields using validateField
  errors.adTitle = await validateField('adTitle', adTitle);
  errors.city = await validateField('city', city);
  errors.streetName = await validateField('streetName', streetName);
  errors.streetNumber = await validateField('streetNumber', streetNumber);
  errors.areaSize = await validateField('areaSize', areaSize);
  errors.yearBuilt = await validateField('yearBuilt', yearBuilt);
  errors.rentPrice = await validateField('rentPrice', rentPrice);
  errors.dateAvailable = await validateField('updatedDateAvailable', dateAvailable, {
    originalDate: new Date(originalFlatData.dateAvailable),
  });
  errors.image = imageFile && imageFile.name ? await validateField('image', imageFile.name) : '';

  Object.keys(errors).forEach((key) => {
    if (!errors[key as keyof FieldErrors]) delete errors[key as keyof FieldErrors];
  });

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    // Create an object with the updated flat data to be saved in Firestore
    const updatedData: Partial<Flat> = {
      adTitle,
      city,
      streetName,
      streetNumber: Number(streetNumber),
      areaSize: Number(areaSize),
      hasAC,
      yearBuilt: Number(yearBuilt),
      rentPrice: Number(rentPrice),
      dateAvailable,
    };

    // Additional logic to handle the optional image upload
    if (imageFile && imageFile.name) {
      updatedData.image = imageFile.name; // Include new image file name if uploaded
    }

    await updateDoc(doc(db, 'flats', flatID), updatedData); // Update flat data in Firestore
    return { success: true }; // Indicate success
  } catch (error) {
    console.error('Error updating flat:', error); // Log error
    return { errors: { general: 'Failed to update flat. Please try again.' } }; // Return general error
  }
};

// Component to handle the editing of a flat.
const EditFlat: React.FC = () => {
  const flatData = useLoaderData<Flat>();
  const actionData = useActionData<{ success?: boolean; errors?: FieldErrors }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Flat>(flatData); // State to store form data
  const [originalData, setOriginalData] = useState<Flat>(flatData); // State to store original flat data for comparison
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({}); // State to track field-level errors
  const [generalError, setGeneralError] = useState<string | null>(null); // General error state

  // Update form data when the loader data changes
  useEffect(() => {
    if (flatData) {
      setFormData(flatData);
      setOriginalData(flatData);
    }
  }, [flatData]);

  // Redirect to the user's flats page on successful update
  useEffect(() => {
    if (actionData?.success) {
      alert('Flat updated successfully!');
      navigate('/myFlats');
    }

    if (actionData?.errors?.general) {
      setGeneralError(actionData.errors.general); // Set general error
    }
  }, [actionData, navigate]);

  // Validate fields on blur
  const handleBlur = async (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, files } = target;
    const fieldValue = name === 'image' ? files?.[0]?.name || '' : value;
    const error = name === 'dateAvailable' ? await validateField('updatedDateAvailable', value, { originalDate: new Date(originalData.dateAvailable) }) : await validateField(name, fieldValue);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Handle input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files?.[0] || null : value,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: null })); // Clear error for the field
    setGeneralError(null); // Clear general error
  };

  // Check if the form is valid
  const isFormValid = () => {
    const hasErrors = Object.values(fieldErrors).some((error) => error); // Check for errors

    const hasChanges =
      originalData &&
      (formData.adTitle !== originalData.adTitle ||
        formData.city !== originalData.city ||
        formData.streetName !== originalData.streetName ||
        Number(formData.streetNumber) !== originalData.streetNumber ||
        Number(formData.areaSize) !== originalData.areaSize ||
        Number(formData.yearBuilt) !== originalData.yearBuilt ||
        Number(formData.rentPrice) !== originalData.rentPrice ||
        formData.dateAvailable !== originalData.dateAvailable ||
        formData.hasAC !== originalData.hasAC ||
        (formData.image && typeof formData.image === 'object')); // Check if a new image is selected

    return !hasErrors && hasChanges; // Form is valid if no errors and changes exist
  };

  return (
    <div className={styles.editFlat}>
      <h2>Edit Flat</h2>
      {/* Add encType in order to send new file name */}
      <Form method="post" className={styles.form} encType="multipart/form-data">
        {/* Ad Title */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="adTitle">Ad Title:</label>
            <input id="adTitle" name="adTitle" type="text" value={formData.adTitle || ''} minLength={5} maxLength={60} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.adTitle && <p className={styles.error}>{fieldErrors.adTitle}</p>}
        </div>

        {/* City */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="city">City:</label>
            <input id="city" name="city" type="text" value={formData.city || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.city && <p className={styles.error}>{fieldErrors.city}</p>}
        </div>

        {/* Street Name */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="streetName">Street Name:</label>
            <input id="streetName" name="streetName" type="text" value={formData.streetName || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.streetName && <p className={styles.error}>{fieldErrors.streetName}</p>}
        </div>

        {/* Street Number */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="streetNumber">Street Number:</label>
            <input id="streetNumber" name="streetNumber" type="number" value={formData.streetNumber || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.streetNumber && <p className={styles.error}>{fieldErrors.streetNumber}</p>}
        </div>

        {/* Area Size */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="areaSize">Area Size (m²):</label>
            <input id="areaSize" name="areaSize" type="number" value={formData.areaSize || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.areaSize && <p className={styles.error}>{fieldErrors.areaSize}</p>}
        </div>

        {/* Year Built */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="yearBuilt">Year Built:</label>
            <input id="yearBuilt" name="yearBuilt" type="number" value={formData.yearBuilt || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.yearBuilt && <p className={styles.error}>{fieldErrors.yearBuilt}</p>}
        </div>

        {/* Rent Price */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="rentPrice">Rent Price (€):</label>
            <input id="rentPrice" name="rentPrice" type="number" value={formData.rentPrice || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.rentPrice && <p className={styles.error}>{fieldErrors.rentPrice}</p>}
        </div>

        {/* Date Available */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="dateAvailable">Date Available:</label>
            <input id="dateAvailable" name="dateAvailable" type="date" value={formData.dateAvailable || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.dateAvailable && <p className={styles.error}>{fieldErrors.dateAvailable}</p>}
        </div>

        {/* Has AC */}
        <div className={styles.formGroup}>
          <div className={`${styles.inputContainer} ${styles.inputContainerCheckbox}`}>
            <label htmlFor="hasAC">Has AC:</label>
            <input id="hasAC" name="hasAC" type="checkbox" checked={formData.hasAC || false} onChange={handleChange} />
          </div>
        </div>

        {/* Flat Image */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="image">Flat Image:</label>
            <input id="image" name="image" type="file" accept="image/*" onChange={handleChange} />
          </div>
          {/* Preview New Image */}
          {formData.image && typeof formData.image === 'object' && (
            <div className={styles.newImagePreview}>
              <p>New Image Preview:</p>
              <img src={URL.createObjectURL(formData.image)} alt="New Flat" style={{ width: '200px' }} />
            </div>
          )}
          {fieldErrors.image && <p className={styles.error}>{fieldErrors.image}</p>}
        </div>

        {/*For General Errors */}
        {generalError && <p className={styles.error}>{generalError}</p>}

        {/* Submit and Back Buttons */}
        <button type="submit" className={styles.saveButton} disabled={!isFormValid()}>
          Save
        </button>

        <button type="button" className={styles.backButton} onClick={() => navigate('/myFlats')}>
          Back
        </button>
      </Form>
    </div>
  );
};

export default EditFlat;
