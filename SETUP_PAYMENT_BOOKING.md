# Payment & Booking Setup Guide

This guide walks you through configuring Stripe and Cal.com for the payment-gated booking flow.

## Prerequisites

- A [Stripe account](https://stripe.com)
- A [Cal.com account](https://cal.com) (Free plan works; Pro helps with API features)
- Admin access to both dashboards

---

## Part 1: Stripe Configuration

### 1.1 Get Your API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys** (left sidebar)
3. Make sure you're in **Test Mode** (toggle visible in the top-right)
4. Copy:
   - **Secret key** → `STRIPE_SECRET_KEY` in `.env`
   - **Publishable key** → `STRIPE_PUBLISHABLE_KEY` in `.env`

### 1.2 Create Products & Prices

For each service in `src/config/services.ts`, create a product in Stripe and note the **Price ID**.

**Steps:**

1. Go to **Products** in the Stripe Dashboard
2. Click **+ Add product**
3. Fill in:
   - **Name:** e.g., "Initial Consultation"
   - **Description:** e.g., "90-min comprehensive lactation assessment"
   - **Pricing:** 
     - Select **Standard pricing**
     - Currency: USD
     - Unit price: e.g., `175.00` for $175
   - **Billing period:** One-time
4. Click **Save product**
5. On the product page, find the **Pricing** section and copy the **Price ID** (looks like `price_1ABC123XYZ...`)
6. Update `src/config/services.ts` with this Price ID

**Example:**
```
Initial Consultation: price_1TLq...ABC
Follow-Up Consultation: price_1TLq...DEF
Prenatal Class: price_1TLq...GHI
Back-to-Work Class: price_1TLq...JKL
```

### 1.3 Set Up Webhook for Payment Confirmation

The webhook listens for successful payments and creates the Cal.com booking automatically.

**Steps:**

1. In Stripe Dashboard, go to **Developers** → **Webhooks** (left sidebar)
2. Click **Add an endpoint**
3. Enter your endpoint URL:
   - **Production:** `https://yourdomain.com/api/webhooks/stripe`
   - **Local testing:** You'll use `stripe listen` CLI (see Part 3.2)
4. Under "Select events to send," search for and select:
   - ✅ `checkout.session.completed`
5. Click **Add endpoint**
6. On the endpoint page, scroll to **Signing secret** and copy it
7. Set as `STRIPE_WEBHOOK_SECRET` in `.env`

---

## Part 2: Cal.com Configuration

### 2.1 Create Event Types

Event types in Cal.com correspond to your services. You need one per service.

**Steps:**

1. Go to [Cal.com](https://app.cal.com)
2. In the left sidebar, find **Event Types**
3. Click **+ New event type**
4. Configure:
   - **Title:** e.g., "Initial Consultation"
   - **Duration:** e.g., 90 minutes
   - **Availability:** Set your working hours
   - **Slug:** e.g., `initial-consultation` (auto-filled, keep it simple)
   - **Description:** Copy from `services.ts` if desired
5. Click **Save**
6. The event type ID appears in the URL or settings. Copy it.
7. Update `src/config/services.ts` with this ID in `calEventTypeId`

**Finding the Event Type ID:**

- Go to the event type's settings page
- Look at the URL: `https://app.cal.com/[username]/[event-slug]`
- Or in the API, it's the numeric ID shown in integrations

**Example:**
```
Initial Consultation: 123456
Follow-Up Consultation: 123457
Prenatal Class: 123458
Back-to-Work Class: 123459
```

### 2.2 Generate an API Token

The API token lets your backend create bookings after payment.

**Steps:**

1. Go to Cal.com **Settings** (gear icon, bottom-left)
2. Navigate to **Security** or **API**
3. Under **API Tokens**, click **+ Create new token**
4. Name it: e.g., "Stripe Webhook - Mary Breastfeeding"
5. Copy the token (you'll only see it once!)
6. Set as `CALCOM_API_KEY` in `.env`

---

## Part 3: Local Testing

### 3.1 Start the Dev Server

```bash
npm run dev
```

The site runs at `http://localhost:4321`

### 3.2 Test Webhooks Locally

Use Stripe CLI to forward webhooks to your local machine:

**Install Stripe CLI** (if not already):
```bash
brew install stripe/stripe-cli/stripe  # macOS
# or visit https://stripe.com/docs/stripe-cli
```

**Login and listen:**
```bash
stripe login
stripe listen --forward-to localhost:4321/api/webhooks/stripe
```

This outputs a signing secret — update `STRIPE_WEBHOOK_SECRET` in `.env` with this value for local testing.

### 3.3 Test the Full Flow

1. Go to `http://localhost:4321/book`
2. Select a service
3. Pick a date/time (slots from Cal.com)
4. Enter your name & email
5. Click "Continue to Payment"
6. Use the test card: **`4242 4242 4242 4242`**
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
7. Click **Pay**
8. Should redirect to `/booking/success`
9. Check Cal.com to see if the booking appeared (may take 1-2 seconds)

### 3.4 Check Logs

**Terminal 1 (Dev Server):**
```bash
npm run dev
# Watch for errors in API routes and React components
```

**Terminal 2 (Stripe CLI):**
```bash
stripe listen --forward-to localhost:4321/api/webhooks/stripe
# Watch for webhook attempts and responses
```

**Browser Console:**
```javascript
// Open DevTools (F12)
// Check Console tab for React/Astro errors
```

---

## Part 4: Update Services Config

Once you have all your Stripe Price IDs and Cal.com Event Type IDs, update `src/config/services.ts`:

```typescript
export const services: Service[] = [
  {
    slug: 'initial-consultation',
    name: 'Initial Consultation',
    description: '...',
    duration: 90,
    price: 17500,           // cents: $175.00
    priceDisplay: '$175',
    stripePriceId: 'price_1TLq...ABC',        // ← From Stripe
    calEventTypeId: 123456,                   // ← From Cal.com
    category: 'consultation',
  },
  // ... repeat for each service
];
```

---

## Part 5: Deploy to Production

### 5.1 Set Environment Variables

In your Cloudflare Pages project settings (or hosting provider):

```
STRIPE_SECRET_KEY=sk_live_...              # Production Stripe key
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...            # From Stripe webhook setup (production)
CALCOM_API_KEY=cal_...                      # Cal.com API token
```

### 5.2 Configure Stripe Webhook for Production

In your Stripe Dashboard:

1. Add a **new endpoint** (in addition to your local one)
2. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
3. Select `checkout.session.completed`
4. Copy the signing secret → `STRIPE_WEBHOOK_SECRET` (production env var)

### 5.3 Switch Stripe to Live Mode

1. In Stripe Dashboard, toggle **Test mode** → **Off** (top-right)
2. You'll now see live API keys — use these in production env vars
3. All test transactions will stop working (use `4242...` card only in test mode)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Checkouts redirect to blank page | Check browser console for errors; verify `stripePriceId` exists in Stripe |
| Webhook not firing | Ensure `STRIPE_WEBHOOK_SECRET` matches; run `stripe listen` locally |
| No Cal.com booking created | Check webhook logs in Stripe Dashboard; verify `CALCOM_API_KEY` is valid |
| Slots not loading | Verify `calEventTypeId` is correct; check network tab for API errors |
| "Invalid price ID" error | Double-check Price ID format (`price_xxx...`); ensure it's in test mode if testing |

---

## Security Reminders

✅ **Do:**
- Keep `STRIPE_SECRET_KEY` and `CALCOM_API_KEY` in `.env` (never commit!)
- Use `STRIPE_WEBHOOK_SECRET` to verify webhook signatures (we do this automatically)
- Regenerate tokens/keys if compromised

❌ **Don't:**
- Expose secret keys in frontend code
- Commit `.env` to version control
- Share webhook signing secrets

---

## Next Steps

1. ✅ Complete this entire guide
2. ✅ Update `src/config/services.ts` with real IDs
3. ✅ Test locally with Stripe CLI
4. ✅ Deploy to production (Cloudflare Pages, Vercel, etc.)
5. ✅ Test production flow with a real test card
6. ✅ When ready, switch Stripe to Live mode and use production keys

Questions? Check the [Stripe API docs](https://stripe.com/docs) and [Cal.com API docs](https://cal.com/docs).
