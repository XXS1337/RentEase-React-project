import React, { useEffect } from 'react';
import styles from './Modal.module.css';

type ModalProps = {
  message: string;
  onYes: () => void;
  onNo: () => void;
};

// Modal component for confirmation dialogs
const Modal: React.FC<ModalProps> = ({ message, onYes, onNo }) => {
  // Function to handle "Escape" key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onNo(); // Trigger the "No" button's functionality
      }
    };

    // Add event listener for keydown events when the component mounts
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNo]); // Include onNo in the dependency array to ensure it's up-to-date

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <p>{message}</p>
        <div className={styles.modalButtons}>
          <button className={`${styles.modalButton} ${styles.modalButtonNo}`} onClick={onNo}>
            No
          </button>
          <button className={`${styles.modalButton} ${styles.modalButtonYes}`} onClick={onYes}>
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
