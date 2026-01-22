# Stripe Test Cards & Quick Test Flow

## Test Cards (Test Mode Only)

Use these card numbers to test different payment scenarios:

```
Success:     4242 4242 4242 4242  (Exp: any future)  (CVC: any)
Decline:     4000 0000 0000 0002  (Exp: any future)  (CVC: any)
3D Secure:   4000 0025 0000 3155  (Exp: any future)  (CVC: any)
Amex:        3782 822463 10005   (Exp: any future)  (CVC: any)
```

Everything else (name, email, zip) can be anything.

---

## Quick Test Flow

### Prerequisites
- [ ] STRIPE_SECRET_KEY set in `.env`
- [ ] STRIPE_WEBHOOK_SECRET set in `.env`
- [ ] STRIPE_PRICE_ID set in `index.html` (line 784)
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Edge Function deployed

### Test Steps

1. **Open your app** → `http://localhost:3000`
2. **Logged in?** → If not, go to Login page first
3. **Click "Go Pro"** button (yellow, top right)
4. **See upgrade modal** → "Upgrade Now" button
5. **Click "Upgrade Now"** → Redirected to Stripe Checkout
6. **Enter test card**:
   - Card: `4242 4242 4242 4242`
   - Exp: `12/26` (or any future date)
   - CVC: `123` (or any 3 digits)
   - Email: `test@example.com`
   - Name: `Test User`
7. **Click "Pay $9.99"**
8. **Should redirect** back to your app with `?checkout=success`
9. **Check Supabase**:
   - Go to Supabase Dashboard → Tables → `stripe_subscriptions`
   - Should see new row with `status: 'active'`
10. **Refresh page** → Pro features should now be unlocked
11. **Condition tab** → Should be clickable (no "PRO" badge)
12. **Go Pro button** → Should be hidden

---

## Debug Checklist

### Payment failed?
- [ ] Using test card `4242 4242 4242 4242`? (not `4000...` which declines)
- [ ] In Test Mode? (Stripe Dashboard has red "Test Mode" warning at top)
- [ ] Using test STRIPE_SECRET_KEY (starts with `sk_test_`)?
- [ ] STRIPE_PRICE_ID updated? (not placeholder `price_1234567890...`)
- [ ] Check Stripe logs: Dashboard → Events → Webhooks

### Subscription not syncing?
- [ ] Check Edge Function logs: Supabase → Edge Functions → stripe-webhook → Logs
- [ ] Check webhook signed correctly: Stripe → Webhooks → View logs
- [ ] Check Supabase Database: Any errors in stripe_subscriptions table?

### User not seeing Pro features after payment?
- [ ] Refresh browser
- [ ] Check browser console (F12) for errors
- [ ] Check `stripe_subscriptions` table has active subscription
- [ ] Check `current_period_end` is in the future (not past date)

---

## Common Issues

| Problem | Solution |
|---------|----------|
| Checkout page is blank | Check browser console, check Price ID is valid |
| Payment appears successful but no subscription | Check webhook endpoint is correct in Stripe Dashboard |
| User still sees "Go Pro" after payment | Refresh browser, cache invalidation may need a moment |
| Test card declined | Use `4242 4242 4242 4242` instead of other cards |
| "Webhook signature verification failed" | STRIPE_WEBHOOK_SECRET doesn't match Stripe Dashboard |

---

## Full Test Scenario

```
Scenario: Free user upgrades to Pro

1. Free user logs in
   ✓ Sees "Go Pro" button
   ✓ Sees "PRO" badge on Condition tab
   ✓ Clicking Condition tab shows upgrade modal

2. User clicks "Upgrade Now"
   ✓ Redirected to Stripe Checkout
   ✓ Checkout page loads

3. User enters test card 4242 4242 4242 4242
   ✓ Payment processing shows

4. Payment succeeds
   ✓ Redirected back to app with ?checkout=success
   ✓ Cache invalidated
   ✓ Subscription status re-checked

5. Webhook fires
   ✓ Stripe sends checkout.session.completed event
   ✓ Edge Function verifies signature
   ✓ Syncs subscription data to Supabase
   ✓ stripe_subscriptions table updated with status: 'active'

6. User refreshes page
   ✓ "Go Pro" button hidden
   ✓ "PRO" badge hidden
   ✓ Condition tab is clickable
   ✓ Can access all Pro features
```

---

## Stripe CLI Testing (Advanced)

If you want to test webhooks locally without actual Stripe checkout:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# Or see https://stripe.com/docs/stripe-cli for other OS

# Login
stripe login

# Listen for webhooks
stripe listen --forward-to localhost:3000/stripe-webhook

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated

# View all logs
stripe logs tail
```

This simulates Stripe events without needing a test payment.

---

## Important Notes

- **Test Mode Only**: These cards only work in Stripe Test Mode
- **No Real Charges**: Test payments will not charge any card
- **Webhook Verification**: Always verify the webhook signature (already done in code)
- **Rate Limits**: Stripe allows many test requests, so test freely
- **Production Keys**: Switch to Live mode and Live keys when ready for real users
