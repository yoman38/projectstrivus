import { supabase, requireAuth, signOut } from './supabase-client.js';

let currentUser = null;

function clearUserLocalStorage() {
    localStorage.removeItem('strivusWorkouts');
    localStorage.removeItem('strivusPRs');
    localStorage.removeItem('strivusConditionData');
    localStorage.removeItem('strivusMuscleFatigueData');
}

export async function initAuth() {
    const session = await requireAuth();
    if (!session) return null;

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        console.error('Failed to get user:', error);
        await supabase.auth.signOut();
        window.location.href = '/auth.html';
        return null;
    }

    currentUser = user;
    setupAuthStateListener();

    const logoutBtns = document.querySelectorAll('[data-logout-btn]');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            clearUserLocalStorage();
            await signOut();
        });
    });

    const userNameElements = document.querySelectorAll('[data-user-name]');
    if (userNameElements.length > 0 && user?.email) {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('id', user.id)
            .maybeSingle();

        const displayName = profile?.display_name || user.email.split('@')[0];
        userNameElements.forEach(el => {
            el.textContent = displayName;
        });
    }

    return user;
}

function setupAuthStateListener() {
    supabase.auth.onAuthStateChange((event, session) => {
        (async () => {
            if (event === 'SIGNED_OUT') {
                currentUser = null;
                clearUserLocalStorage();
                window.location.href = '/auth.html';
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    currentUser = session.user;
                }
            }
        })();
    });
}

export function getUser() {
    return currentUser;
}
