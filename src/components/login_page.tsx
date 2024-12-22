"use client";

import React from 'react';
import axios from 'axios';

import styles from './styles/login_page.module.scss';

export default function LoginPage() {
    const authenticate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (document == null) {
            return;
        }

        const password = (document.querySelector('input[type="password"]') as HTMLInputElement).value;

        if (password === '') {
            return;
        }

        try {
            const response = await axios.post("api/auth", { password });
            if (response.status === 200) {
                window.location.reload();
            } else {
                alert("Mot de passe incorrect");
                (document.querySelector('input[type="password"]') as HTMLInputElement).value = '';
            } 
        } catch (error: any) {
            if (error.status === 401) {
                alert("Mot de passe incorrect");
                (document.querySelector('input[type="password"]') as HTMLInputElement).value = '';
                return;
            }
            console.error(error);
            alert("Erreur lors de la connexion");
            (document.querySelector('input[type="password"]') as HTMLInputElement).value = '';
        }
    }

    return (
        <div className={styles.page}>
            <form>
                <input type="password" placeholder="Mot de passe" />
                <button type="submit" onClick={authenticate}>Se connecter</button>
            </form>
        </div>
    )
}