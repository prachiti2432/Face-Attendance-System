import { supabase } from '../../lib/supabaseClient.js';

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

// --- Login Logic ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        // Disable button
        submitBtn.disabled = true;
        submitBtn.textContent = "Signing In...";
        errorMessage.classList.add('hidden');

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = "Sign In";
        } else {
            // Success
            window.location.href = '/register.html';
        }
    });
}

// --- Check Auth Status & Route Protection ---
export async function requireAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/login.html';
    }
}

// --- Logout Logic ---
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        window.location.href = '/login.html';
    }
}

// --- Navbar Update Logic (Run on every page import) ---
async function updateNavbar() {
    const { data: { session } } = await supabase.auth.getSession();
    const navContainer = document.querySelector('nav');

    // Find the desktop nav or mobile menu login buttons
    const loginBtns = document.querySelectorAll('a[href="register.html"], a[href="attendance.html"]'); // Broad selection

    // If logged in, maybe show "Logout" instead of "Login"?
    // For now, minimal intervention: just ensuring auth state is known.
}
