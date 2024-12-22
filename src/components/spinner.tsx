import React from 'react';

import styles from './styles/spinner.module.scss';

export default function Spinner() {
    return (    
        <svg viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
            <circle className={styles.spin2} cx="400" cy="400" fill="none"
            r="200" strokeWidth="50" stroke="#999"
            strokeDasharray="700 1400"
            strokeLinecap="round" />
        </svg>
    )
}