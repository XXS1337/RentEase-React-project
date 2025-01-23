import React from 'react';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from 'react-icons/fa'; // React Icons
import styles from './Footer.module.css';

// Footer component for displaying social media links and site information
const Footer = () => {
  return (
    <div className={styles.footer}>
      <div className={styles.socialMedia}>
        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
          <FaFacebookF />
        </a>
        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
          <FaTwitter />
        </a>
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
          <FaInstagram />
        </a>
        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
          <FaLinkedinIn />
        </a>
      </div>

      {/* Footer Info */}
      <div className={styles.footerInfo}>
        <p>&copy; {new Date().getFullYear()} Rent Ease Inc. All rights reserved.</p>
        <p>
          Contact us: <a href="mailto:contact@rentease.com">contact@rentease.com</a>
        </p>
      </div>
    </div>
  );
};

export default Footer;
