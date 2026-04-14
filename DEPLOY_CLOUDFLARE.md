# Cloudflare Pages Deployment Guide

This guide covers deploying the Inspirit Lactation site to Cloudflare Pages.

---

## Prerequisites

- A [Cloudflare account](https://cloudflare.com) (free tier works)
- Your code pushed to a GitHub or GitLab repository
- Stripe and Cal.com configured (see `SETUP_PAYMENT_BOOKING.md`)

---

## Part 1: Connect Your Repository

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. In the left sidebar, click **Workers & Pages**
3. Click **Create application** → **Pages** → **Connect to Git**
4. Authorize Cloudflare to access your GitHub/GitLab account
5. Select your repository (`Mary-breastfeeding` or whatever you named it)
6. Click **Begin setup**

---

## Part 2: Build Configuration

On the "Set up builds and deployments" screen:

| Setting | Value |
|---------|-------|
| **Production branch** | `main` (or `master`) |
| **Framework preset** | `Astro` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | *(leave empty)* |
| **Node.js version** | `20` |

Click **Save and Deploy** to trigger your first build.

---

## Part 3: Set Environment Variables

Your first build will likely fail because env vars aren't set yet. Configure them before the next deploy.

1. In your Pages project, go to **Settings** → **Environment variables**
2. Click **Add variable** for each of the following:

### Production variables

| Variable | Value | Notes |
|----------|-------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | From Stripe Dashboard (Live mode) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | From Stripe Dashboard (Live mode) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From the Stripe webhook endpoint (step below) |
| `CALCOM_API_KEY` | `cal_...` | From Cal.com Settings → Security |

> **Tip:** For the initial test, you can use test keys (`sk_test_...`, `pk_test_...`) and switch to live keys when ready to accept real payments.

3. After adding all variables, click **Save**
4. Go to **Deployments** and click **Retry deployment** (or push a new commit) to trigger a rebuild with the new env vars

---

## Part 4: Configure Stripe Webhook for Production

Your local webhook (`stripe listen`) won't work in production. You need a webhook endpoint pointing to your live URL.

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set **Endpoint URL** to:
   ```
   https://<your-pages-subdomain>.pages.dev/api/webhooks/stripe
   ```
   Or your custom domain if you've set one up, e.g.:
   ```
   https://inspiritlactation.com/api/webhooks/stripe
   ```
4. Under **Select events**, search for and check:
   - ✅ `checkout.session.completed`
5. Click **Add endpoint**
6. On the webhook details page, click **Reveal** under **Signing secret**
7. Copy the `whsec_...` value
8. Go back to Cloudflare Pages → **Settings** → **Environment variables** and update `STRIPE_WEBHOOK_SECRET` with this value
9. Trigger a new deployment (push a commit or click **Retry deployment**)

---

## Part 5: Custom Domain (Optional)

To use your own domain (e.g. `inspiritlactation.com`):

1. In your Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain name
4. Cloudflare will ask you to add a DNS record — if your domain is already managed by Cloudflare, it does this automatically
5. If your domain is at another registrar (GoDaddy, Namecheap, etc.):
   - You can either transfer DNS management to Cloudflare, or
   - Add a `CNAME` record pointing to `<project>.pages.dev`
6. Wait for SSL to provision (usually a few minutes)
7. Update your Stripe webhook endpoint URL to use the custom domain (Step 4 above)

---

## Part 6: Verify the Deployment

Once deployed, run through the full flow:

1. Visit `https://<your-site>/book`
2. Select a service
3. Pick a date and time slot
4. Enter your name and email
5. Click **Continue to Payment**
6. Use a **Stripe test card**: `4242 4242 4242 4242` (any future expiry, any CVC)
7. Complete payment
8. Confirm `/booking/success` page loads
9. Check Cal.com — booking should appear within a few seconds

---

## Part 7: Switch to Live Payments

When you're ready to accept real money:

1. In [Stripe Dashboard](https://dashboard.stripe.com), **disable Test Mode** (toggle top-right)
2. Go to **API keys** and copy your **live** Secret key and Publishable key
3. Update Cloudflare env vars:
   - `STRIPE_SECRET_KEY` → `sk_live_...`
   - `STRIPE_PUBLISHABLE_KEY` → `pk_live_...`
4. Add a **new production webhook** in Stripe (in Live mode) pointing to your site URL
   - Copy the new `whsec_...` signing secret
   - Update `STRIPE_WEBHOOK_SECRET` in Cloudflare
5. Trigger a new deployment

---

## Troubleshooting

### Build fails with "Node version" error
Go to **Settings** → **Environment variables** → add `NODE_VERSION` = `20`

### Build fails with "Cannot find module" error
Check that all packages are in `dependencies` (not `devDependencies`) in `package.json`, or add a build preset in Cloudflare that runs `npm install` with `NODE_ENV=production`.

### 500 error on `/book` or API routes
- Check **Functions** logs in the Cloudflare Pages dashboard (**Deployments** → your deployment → **View details** → **Functions**)
- Verify all 4 env vars are set and have no extra spaces

### Stripe webhook returns 400
- Likely a `STRIPE_WEBHOOK_SECRET` mismatch — make sure you copied the signing secret from the correct webhook endpoint (Live vs. Test)

### Slots not loading on `/book`
- Check `CALCOM_API_KEY` is valid and not expired
- Open DevTools → Network tab → look at the `/api/slots` request for the error response

### Booking confirmed but Cal.com booking missing
- Check Stripe webhook logs (**Developers** → **Webhooks** → your endpoint → **Recent deliveries**)
- Click failed events to see the error response and retry them manually

---

## Continuous Deployment

Once set up, every push to your `main` branch will automatically:
1. Trigger a new Cloudflare Pages build
2. Run `npm run build`
3. Deploy to the same URL

No manual steps needed for future updates.
