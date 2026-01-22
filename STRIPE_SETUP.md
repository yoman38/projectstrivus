# Stripe Webhook Configuration Guide

## Overview

Your project has:
- **Webhook Handler**: Already deployed at `supabase/functions/stripe-webhook/`
- **Checkout Handler**: Already deployed at `supabase/functions/stripe-checkout/`
- **Database Schema**: Stripe tables with RLS policies set up

This guide shows how to complete the configuration and test without paying.

---

## Step 1: Configure Stripe Secret Key in Supabase

### Get Secret Key from Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Log in or create account
3. Toggle **View test data** (top right) to use test mode
4. Click **Developers** → **API Keys** in the left sidebar
5. Copy your **Secret Key** (starts with `sk_test_`)

### Add to Supabase Edge Functions

CRITICAL: Edge function secrets must be configured in Supabase, NOT your local `.env` file.

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Edge Functions** in the left sidebar
4. Click **Manage secrets** (or settings icon)
5. Add a new secret:
   - Name: `STRIPE_SECRET_KEY`
   - Value: Your Stripe secret key (e.g., `sk_test_...`)
6. Click **Add secret** or **Save**

You should see the secret listed without its value being visible.

---

## Step 2: Deploy the Webhook Edge Function

The webhook is ready to deploy. In your Supabase dashboard:

1. Go to **Edge Functions** → **stripe-webhook**
2. Click **Deploy** or let it auto-deploy
3. Copy the webhook function URL, it will be something like:
   ```
   https://your-project.supabase.co/functions/v1/stripe-webhook
   ```

---

## Step 3: Configure Webhook in Stripe Dashboard

### Create Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Paste your webhook URL:
   ```
   https://your-project.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Click **Add endpoint**
6. Click on the webhook to view details
7. Scroll down to find **Signing secret** (starts with `whsec_`)
8. Click **Reveal** and copy it

### Add Webhook Secret to Supabase

1. Copy the webhook signing secret from Stripe (starts with `whsec_`)
2. Go back to [Supabase Dashboard](https://supabase.com/dashboard)
3. Go to **Edge Functions** → **Manage secrets**
4. Add another secret:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: Your webhook signing secret (e.g., `whsec_...`)
5. Click **Add secret** or **Save**

---

## Step 4: Update Stripe Checkout Price

You need to create a Stripe Price for your subscription product.

### Create Product & Price

1. Go to **Products** → **Create product**
2. Name: `Pro Subscription`
3. Pricing:
   - Type: **Recurring**
   - Billing period: **Monthly**
   - Price: **$9.99**
4. Click **Save product**
5. Copy the **Price ID** (starts with `price_`)

### Update Price ID

Edit `index.html` around line 786:

```javascript
const stripePriceId = 'price_1234567890abcdef';
```

Replace `'price_1234567890abcdef'` with your actual Price ID from Stripe (e.g., `'price_1QAbCD...'`).

---

## Step 5: Test Without Paying (Test Mode)

### Enable Test Mode

1. In Stripe Dashboard, toggle **View test data** (top of page)
2. Ensure you're viewing **Test** keys, not Live
3. You'll see red "TEST MODE" warning

### Test Cards

Use these card numbers to simulate payments:

| Scenario | Card Number | Exp | CVC |
|----------|-------------|-----|-----|
| ✅ Success | `4242 4242 4242 4242` | Any future | Any |
| ❌ Decline | `4000 0000 0000 0002` | Any future | Any |
| ⚠️ 3D Secure | `4000 0025 0000 3155` | Any future | Any |

Everything else (email, name, etc.) can be anything.

### Test Flow

1. **Go to your app** → Click **Go Pro**
2. **Click Upgrade Now**
3. **Enter test card**: `4242 4242 4242 4242`
4. **Expiry**: Any future date (e.g., `12/26`)
5. **CVC**: Any 3 digits (e.g., `123`)
6. **Complete payment**
7. **Check Supabase** → `stripe_subscriptions` table
   - Should have new record with `status: 'active'`
8. **Refresh app** → Condition tab should now be unlocked

---

## Step 6: Local Testing with Stripe CLI

### Install Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux/Windows:** See [Stripe CLI docs](https://stripe.com/docs/stripe-cli)

### Login

```bash
stripe login
```

This opens a browser to connect your CLI to your Stripe account.

### Test Webhook Locally

```bash
stripe listen --forward-to localhost:3000/stripe-webhook
```

This:
- Shows your **Webhook Signing Secret** (save this!)
- Forwards Stripe test events to your local server
- Updates as you update your endpoint

### Trigger Test Events

In another terminal:

```bash
# Simulate successful payment
stripe trigger checkout.session.completed

# Simulate subscription update
stripe trigger customer.subscription.updated

# Simulate subscription cancellation
stripe trigger customer.subscription.deleted
```

### Monitor Webhook Activity

```bash
# View all webhook logs
stripe logs tail

# Resend a webhook (get event ID from logs)
stripe logs resend evt_1234567890...
```

---

## Step 7: Verify Everything Works

### Checklist

- [ ] STRIPE_SECRET_KEY added to Supabase Edge Functions secrets
- [ ] STRIPE_WEBHOOK_SECRET added to Supabase Edge Functions secrets
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Edge Functions deployed (stripe-checkout and stripe-webhook)
- [ ] Price ID updated in `index.html` (line 786)
- [ ] Test payment succeeds with `4242 4242 4242 4242`
- [ ] Subscription record appears in Supabase
- [ ] Condition tab unlocks after payment
- [ ] Pro badge/button hidden for paid users

### Debug Issues

**Webhook not firing:**
- Check webhook signing secret matches Stripe Dashboard
- Check Edge Function URL is exactly correct
- Go to Stripe Dashboard → Webhooks → View logs
- Look for error messages

**User not seeing Pro features after payment:**
- Check `stripe_subscriptions` table has record with `status: 'active'`
- Check `current_period_end` is in the future
- Refresh the browser
- Check browser console for errors

**Test card getting declined:**
- Ensure you're in **Test Mode** (not Live)
- Use the exact card number `4242 4242 4242 4242`
- Future expiry date required

---

## Production Setup

When ready for live payments:

1. Get **Live** API keys (not test keys) from Stripe Dashboard
2. Create **Live** Stripe Product & Price
3. Update Supabase Edge Function secrets with live keys:
   - Update `STRIPE_SECRET_KEY` with your live secret key (`sk_live_...`)
   - Update `STRIPE_WEBHOOK_SECRET` with live webhook signing secret
4. Update `index.html` with live Price ID
5. Configure live webhook endpoint in Stripe
6. Test end-to-end with real payment method (optional, use small amount)

**⚠️ Never commit secret keys to git or your local `.env` file!**

---

## Troubleshooting

### Common Errors

| Error | Solution |
|-------|----------|
| `Webhook signature verification failed` | Check STRIPE_WEBHOOK_SECRET is correct |
| `No customer found` | Ensure checkout completed successfully |
| `Subscription not syncing` | Check Stripe API quota, check logs |
| `Can't connect to webhook` | Check Edge Function is deployed, firewall isn't blocking |

### Check Logs

**Supabase Edge Function Logs:**
- Go to **Edge Functions** → **stripe-webhook** → **Logs**

**Stripe Logs:**
- Go to **Developers** → **Webhooks** → Click endpoint → **Events** tab

---

## Next Steps

1. Complete the setup checklist
2. Test with test card
3. Verify subscription works
4. Deploy to production when ready
