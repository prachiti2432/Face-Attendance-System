import { supabase } from '../../lib/supabaseClient.js';

// Role types
export const ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff',
    STUDENT: 'student'
};

/**
 * Get current user's role
 * @returns {Promise<string|null>}
 */
export async function getUserRole() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        // Get user role from user_metadata or profiles table
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        return profile?.role || session.user.user_metadata?.role || null;
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
}

/**
 * Check if user has required role
 * @param {string|string[]} requiredRoles 
 * @returns {Promise<boolean>}
 */
export async function hasRole(requiredRoles) {
    const userRole = await getUserRole();
    if (!userRole) return false;

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(userRole);
}

/**
 * Check auth status and optionally verify role
 * @param {string|string[]} requiredRoles - Optional role requirement
 */
export async function requireAuth(requiredRoles = null) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/index.html';
        return false;
    }

    if (requiredRoles) {
        const hasRequiredRole = await hasRole(requiredRoles);
        if (!hasRequiredRole) {
            alert('You do not have permission to access this page.');
            window.location.href = '/index.html';
            return false;
        }
    }

    return true;
}

/**
 * Check if user is admin
 */
export async function isAdmin() {
    return await hasRole(ROLES.ADMIN);
}

/**
 * Check if user is staff
 */
export async function isStaff() {
    return await hasRole([ROLES.ADMIN, ROLES.STAFF]);
}

/**
 * Check if user is student
 */
export async function isStudent() {
    return await hasRole(ROLES.STUDENT);
}

// --- Logout Logic ---
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        window.location.href = '/index.html';
    }
}

/**
 * Update user role (admin only)
 * @param {string} userId 
 * @param {string} role 
 */
export async function updateUserRole(userId, role) {
    if (!Object.values(ROLES).includes(role)) {
        throw new Error('Invalid role');
    }

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            role: role,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error updating user role:', error);
        throw error;
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
