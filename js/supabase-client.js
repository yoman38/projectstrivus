import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

const supabaseUrl = window.SUPABASE_CONFIG?.url || '';
const supabaseAnonKey = window.SUPABASE_CONFIG?.anonKey || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase configuration is missing. Please configure SUPABASE_CONFIG in your HTML files.');
    console.error('Add this script before loading any modules: <script>window.SUPABASE_CONFIG = { url: "your-url", anonKey: "your-key" };</script>');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

export async function requireAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/auth.html';
        return null;
    }
    return session;
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/auth.html';
}
