import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function corsResponse(body: string | object | null, status = 200) {
  if (status === 204) {
    return new Response(null, { status, headers: corsHeaders });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return corsResponse({ error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to Edge Function secrets.' }, 500);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase environment variables missing');
      return corsResponse({ error: 'Server configuration error' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecret, {
      appInfo: { name: 'Strivus', version: '1.0.0' },
    });

    let body;
    try {
      const rawBody = await req.text();
      console.log('Raw request body:', rawBody);
      body = JSON.parse(rawBody);
      console.log('Parsed body:', body);
    } catch (e) {
      console.error('JSON parse error:', e);
      return corsResponse({ error: 'Invalid JSON body' }, 400);
    }

    const priceId = body.price_id || body.priceId;
    const successUrl = body.success_url || body.successUrl;
    const cancelUrl = body.cancel_url || body.cancelUrl;
    const mode = body.mode || 'subscription';
    console.log('Extracted params:', { priceId, successUrl, cancelUrl, mode });

    if (!priceId || typeof priceId !== 'string') {
      console.error('Invalid priceId:', priceId, 'Type:', typeof priceId);
      return corsResponse({ error: 'Missing or invalid price_id/priceId' }, 400);
    }
    if (!successUrl || typeof successUrl !== 'string') {
      return corsResponse({ error: 'Missing or invalid success_url/successUrl' }, 400);
    }
    if (!cancelUrl || typeof cancelUrl !== 'string') {
      return corsResponse({ error: 'Missing or invalid cancel_url/cancelUrl' }, 400);
    }
    if (!['payment', 'subscription'].includes(mode)) {
      return corsResponse({ error: 'mode must be payment or subscription' }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'Authorization header missing' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);

    if (getUserError) {
      console.error('Auth error:', getUserError);
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      return corsResponse({ error: 'User not found' }, 404);
    }

    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error('Failed to fetch customer:', getCustomerError);
      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    let customerId;

    if (!customer || !customer.customer_id) {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });

      console.log(`Created Stripe customer ${newCustomer.id} for user ${user.id}`);

      const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });

      if (createCustomerError) {
        console.error('Failed to save customer:', createCustomerError);
        try { await stripe.customers.del(newCustomer.id); } catch (e) {}
        return corsResponse({ error: 'Failed to create customer mapping' }, 500);
      }

      if (mode === 'subscription') {
        const { error: createSubError } = await supabase.from('stripe_subscriptions').insert({
          customer_id: newCustomer.id,
          status: 'not_started',
        });

        if (createSubError) {
          console.error('Failed to create subscription record:', createSubError);
          try { await stripe.customers.del(newCustomer.id); } catch (e) {}
          return corsResponse({ error: 'Failed to create subscription record' }, 500);
        }
      }

      customerId = newCustomer.id;
    } else {
      customerId = customer.customer_id;

      if (mode === 'subscription') {
        const { data: subscription } = await supabase
          .from('stripe_subscriptions')
          .select('status')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (!subscription) {
          await supabase.from('stripe_subscriptions').insert({
            customer_id: customerId,
            status: 'not_started',
          });
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log(`Created checkout session ${session.id}`);

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`Checkout error: ${error.message}`);
    return corsResponse({ error: error.message || 'An unexpected error occurred' }, 500);
  }
});