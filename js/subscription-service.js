import { supabase } from './supabase-client.js';
import { getUser } from './auth-guard.js';

let cachedSubscriptionStatus = null;
let lastCheckTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCurrentUserWithFallback() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) return user;
    } catch (err) {
        console.warn('Failed to fetch user from auth:', err.message);
    }
    return getUser();
}

export async function checkSubscriptionStatus() {
    const user = await getCurrentUserWithFallback();
    if (!user) return { isPro: false, status: null };

    const now = Date.now();
    if (cachedSubscriptionStatus && lastCheckTime && (now - lastCheckTime) < CACHE_DURATION) {
        return cachedSubscriptionStatus;
    }

    try {
        const { data, error } = await supabase
            .from('stripe_user_subscriptions')
            .select('subscription_status, current_period_end, cancel_at_period_end')
            .maybeSingle();

        if (error) {
            console.error('Error checking subscription:', error);
            return { isPro: false, status: null };
        }

        const isPro = data &&
                      data.subscription_status === 'active' &&
                      data.current_period_end &&
                      (data.current_period_end * 1000) > Date.now();

        const result = {
            isPro,
            status: data?.subscription_status || null,
            currentPeriodEnd: data?.current_period_end || null,
            cancelAtPeriodEnd: data?.cancel_at_period_end || false
        };

        cachedSubscriptionStatus = result;
        lastCheckTime = now;

        return result;
    } catch (err) {
        console.error('Subscription check failed:', err);
        return { isPro: false, status: null };
    }
}

export function invalidateSubscriptionCache() {
    cachedSubscriptionStatus = null;
    lastCheckTime = null;
}

export async function redirectToCheckout(priceId = null) {
    const user = await getCurrentUserWithFallback();
    if (!user) {
        throw new Error('User not authenticated');
    }

    if (!priceId || priceId === 'price_1234567890abcdef') {
        throw new Error('Please add your Stripe Price ID. See STRIPE_SETUP.md for instructions.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('No active session found');
    }

    const requestBody = {
        price_id: priceId,
        success_url: `${window.location.origin}/index.html?checkout=success`,
        cancel_url: `${window.location.origin}/index.html?checkout=cancel`,
        mode: 'subscription'
    };

    console.log('=== Checkout Request Details ===');
    console.log('Price ID:', priceId);
    console.log('Price ID type:', typeof priceId);
    console.log('Full request body:', JSON.stringify(requestBody, null, 2));
    console.log('Session exists:', !!session);
    console.log('Session token present:', !!session?.access_token);
    console.log('User email:', session?.user?.email);

    try {
        const response = await supabase.functions.invoke('stripe-checkout', {
            body: requestBody,
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });

        console.log('Full edge function response:', response);
        console.log('Response error:', response.error);
        console.log('Response data:', response.data);

        if (response.error) {
            console.error('Edge function error object:', JSON.stringify(response.error, null, 2));
            console.error('Response data object:', JSON.stringify(response.data, null, 2));

            // Extract detailed error message
            let errorMessage = 'Checkout failed';

            if (response.data?.error) {
                errorMessage = response.data.error;
            } else if (response.error.message) {
                errorMessage = response.error.message;
            } else if (typeof response.error === 'string') {
                errorMessage = response.error;
            }

            // Add helpful context for common errors
            if (errorMessage.includes('Stripe is not configured')) {
                errorMessage += '\n\nPlease configure STRIPE_SECRET_KEY in Supabase Edge Functions. See STRIPE_SETUP.md for instructions.';
            } else if (errorMessage.includes('authenticate')) {
                errorMessage += '\n\nAuthentication failed. Please try logging out and back in.';
            }

            console.error('Final error message:', errorMessage);
            throw new Error(errorMessage);
        }

        if (!response.data?.url) {
            console.error('No URL in response. Full data:', JSON.stringify(response.data, null, 2));
            throw new Error(response.data?.error || 'No checkout URL returned from Stripe');
        }

        console.log('Redirecting to Stripe checkout:', response.data.url);
        window.location.href = response.data.url;
    } catch (err) {
        console.error('Checkout redirect failed:', err);
        console.error('Error type:', err.constructor.name);
        console.error('Error details:', err);
        throw err;
    }
}

export async function cancelSubscription() {
    const user = await getCurrentUserWithFallback();
    if (!user) {
        throw new Error('User not authenticated');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('No active session found');
    }

    try {
        const response = await supabase.functions.invoke('stripe-cancel-subscription', {
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });

        if (response.error) {
            const errorMessage = response.data?.error || response.error.message || 'Failed to cancel subscription';
            throw new Error(errorMessage);
        }

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'Failed to cancel subscription');
        }

        invalidateSubscriptionCache();

        return {
            success: true,
            message: response.data.message,
            currentPeriodEnd: response.data.current_period_end
        };
    } catch (err) {
        console.error('Cancel subscription failed:', err);
        throw err;
    }
}
