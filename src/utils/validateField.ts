import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import calculateAge from './calculateAge';
import { normalizeDate, getOneYearFromToday } from './dateUtils';

// Context type for additional validation context
type ValidationContext = {
  checkEmail?: boolean;
  originalEmail?: string;
  allowEmptyPassword?: boolean;
  password?: string;
  originalDate?: Date;
};

// Function to handle validation for the form fields
export const validateField = async (name: string, value: string | number | Date | undefined, context: ValidationContext = {}): Promise<string> => {
  let error = '';

  switch (name) {
    case 'firstName':
      if (!value || (typeof value === 'string' && value.length < 2)) {
        error = 'First name must be at least 2 characters.';
      }
      break;
    case 'lastName':
      if (!value || (typeof value === 'string' && value.length < 2)) {
        error = 'Last name must be at least 2 characters.';
      }
      break;
    case 'email':
      if (!value || (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
        error = 'Email must be in a valid format.';
      } else if (context.checkEmail && value !== context.originalEmail) {
        try {
          const emailQuery = query(collection(db, 'users'), where('email', '==', value));
          const emailSnapshot = await getDocs(emailQuery);
          if (!emailSnapshot.empty) {
            error = 'This email is not available. Please try another or log in if you already have an account.';
          }
        } catch (err) {
          console.error('Error checking email availability:', err);
          error = 'Failed to check email availability. Please try again.';
        }
      }
      break;
    case 'password':
      if (!value && context.allowEmptyPassword) {
        error = '';
      } else if (!value || (typeof value === 'string' && value.length < 6)) {
        error = 'Password must be at least 6 characters long.';
      } else if (typeof value === 'string' && (!/[a-zA-Z]/.test(value) || !/\d/.test(value) || !/[^\w\s]/.test(value))) {
        error = 'Password must include letters, numbers, and a special character.';
      }
      break;
    case 'confirmPassword':
      if (value !== context.password) {
        error = 'Passwords do not match.';
      }
      break;
    case 'birthDate':
      if (!value || isNaN(new Date(value as Date).getTime())) {
        error = 'Birth date is required.';
      } else {
        const age = calculateAge(value as Date);
        if (age < 18 || age > 120) {
          error = 'Age must be between 18 and 120.';
        }
      }
      break;
    case 'adTitle':
      if (!value || (typeof value === 'string' && (value.length < 5 || value.length > 60))) {
        error = 'Ad title must be between 5 and 60 characters.';
      }
      break;
    case 'city':
      if (!value || (typeof value === 'string' && value.length < 2)) {
        error = 'City name must be at least 2 characters.';
      }
      break;
    case 'streetName':
      if (!value || (typeof value === 'string' && value.length < 2)) {
        error = 'Street name must be at least 2 characters.';
      }
      break;
    case 'streetNumber':
      if (!value || isNaN(Number(value)) || Number(value) <= 0) {
        error = 'Street number must be a valid positive number.';
      }
      break;
    case 'areaSize':
      if (!value || isNaN(Number(value)) || Number(value) <= 0) {
        error = 'Area size must be a valid positive number.';
      }
      break;
    case 'yearBuilt':
      const currentYear = new Date().getFullYear();
      if (!value || isNaN(Number(value)) || Number(value) < 1900 || Number(value) > currentYear) {
        error = 'Year built must be between 1900 and the current year.';
      }
      break;
    case 'rentPrice':
      if (!value || isNaN(Number(value)) || Number(value) <= 0) {
        error = 'Rent price must be greater than zero.';
      }
      break;
    case 'dateAvailable':
    case 'updatedDateAvailable': {
      if (!value) {
        error = 'Date available is required.';
      } else {
        const today = normalizeDate(new Date());
        const selectedDate = normalizeDate(value as Date);
        const originalDate = context.originalDate ? normalizeDate(context.originalDate) : today;
        const oneYearFromToday = getOneYearFromToday(today);

        const isOutOfRange =
          name === 'dateAvailable' ? selectedDate < today || selectedDate > oneYearFromToday : originalDate > today ? selectedDate < today || selectedDate > oneYearFromToday : selectedDate < originalDate || selectedDate > oneYearFromToday;

        if (isOutOfRange) {
          error = `Date available must be between ${originalDate > today ? 'today' : 'the original date'} (${(originalDate > today ? today : originalDate).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
          })}) and one year from today (${oneYearFromToday.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
          })}).`;
        }
      }
      break;
    }
    case 'image':
      if (!value) {
        error = 'Image file is required.';
      }
      break;
    case 'messageContent':
      if (!value || (typeof value === 'string' && !value.trim())) {
        error = 'Message content cannot be empty.';
      }
      break;
    default:
      break;
  }

  return error;
};
