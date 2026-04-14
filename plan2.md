## Plan: Stripe Checkout + Hosted Cal.com Booking Integration

**TL;DR:** Add a payment-gated booking flow to the Inspirit Lactation site. Users pick a service → select a time slot (from Cal.com API) → pay via Stripe Checkout → on successful payment, a Stripe webhook creates the Cal.com booking. Uses Astro hybrid mode on Cloudflare Pages with React islands for the interactive UI.

---

### Phase 1: Project Configuration (steps 1–3)

1. **Install dependencies** — `@astrojs/cloudflare`, `@astrojs/react`, `react`, `react-dom`, `stripe`, `@stripe/stripe-js`
2. **Configure Astro hybrid mode** — set `output: 'hybrid'` in `astro.config.mjs`, add `cloudflare()` adapter and `react()` integration. Static pages stay pre-rendered; only API routes + `/book` use SSR
3. **Update env vars** — add `CALCOM_API_KEY` (from Cal.com Settings > Security), `STRIPE_WEBHOOK_SECRET` (from Stripe Dashboard). Create `.env.example`

### Phase 2: API Routes (steps 4–6, *parallel with Phase 3*)

4. **`GET src/pages/api/slots.ts`** — Proxies `GET https://api.cal.com/v2/slots` with the API key hidden server-side. Accepts `eventTypeId`, `start`, `end`, `timeZone`
5. **`POST src/pages/api/create-checkout-session.ts`** — Creates a Stripe Checkout Session in `payment` mode. Stores Cal.com booking data (`eventTypeId`, `slot`, `name`, `email`, `timeZone`) in Stripe `metadata`. Returns the Checkout URL
6. **`POST src/pages/api/webhooks/stripe.ts`** — Verifies webhook signature, listens for `checkout.session.completed`, extracts metadata, calls `POST https://api.cal.com/v2/bookings` to create the confirmed booking

### Phase 3: React Booking Components (steps 7–10, *parallel with Phase 2*)

7. **`ServicePicker.tsx`** — Cards for each service (consultation types + classes) with name, duration, price. Driven by a config array containing Stripe Price IDs and Cal.com event type IDs
8. **`SlotPicker.tsx`** — Fetches available slots from `/api/slots`, renders a week-by-week calendar with selectable time buttons
9. **`BookingForm.tsx`** — Collects name + email, POSTs to `/api/create-checkout-session`, redirects to Stripe Checkout
10. **`BookingFlow.tsx`** — Orchestrates the 3-step flow with state management and step navigation

### Phase 4: New Pages (steps 11–14, *depends on Phases 2 & 3*)

11. **`src/pages/book.astro`** — Renders `<BookingFlow client:load />` React island
12. **`src/pages/classes.astro`** — Static class listings linking to `/book?service=<slug>`
13. **`src/pages/booking/success.astro`** — Confirmation page ("Booking Confirmed! Check your email")
14. **`src/pages/booking/cancel.astro`** — "Booking wasn't completed" with retry link

### Phase 5: Update Existing Pages (steps 15–18, *depends on Phase 4*)

15. **Update nav** in `src/layouts/Layout.astro` — add "Book Now" and "Classes" to `navItems`
16. **Update `src/pages/index.astro`** — Hero "Book Appointment" → `href="/book/"`, "Browse Classes" → `href="/classes/"`
17. **Update `src/pages/about.astro`** — "Book a Consultation" → `href="/book/"`
18. **Remove Cal.com embed script** from `src/layouts/Layout.astro` (lines ~143–157) — no longer needed

### Phase 6: Dashboard Setup (manual, *parallel with implementation*)

19. Create **Stripe Products & Prices** in Stripe Dashboard — one per service, note Price IDs
20. Generate **Cal.com API key** — note event type IDs for each service
21. Configure **Stripe webhook** endpoint pointing to `/api/webhooks/stripe` for `checkout.session.completed`

---

### Relevant Files

| File | Action |
|---|---|
| `astro.config.mjs` | Add hybrid mode, cloudflare adapter, react integration |
| `src/layouts/Layout.astro` | Update nav, remove Cal.com embed script |
| `src/pages/index.astro` | Update booking + classes links |
| `src/pages/about.astro` | Update booking link |
| `.env` / `.env.example` | Add `CALCOM_API_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `src/pages/api/slots.ts` | **New** — Cal.com slots proxy |
| `src/pages/api/create-checkout-session.ts` | **New** — Stripe session creator |
| `src/pages/api/webhooks/stripe.ts` | **New** — Stripe webhook handler → Cal.com booking |
| `src/components/ServicePicker.tsx` | **New** — Service selection cards |
| `src/components/SlotPicker.tsx` | **New** — Date/time slot picker |
| `src/components/BookingForm.tsx` | **New** — Customer info form |
| `src/components/BookingFlow.tsx` | **New** — Multi-step orchestrator |
| `src/pages/book.astro` | **New** — Booking page |
| `src/pages/classes.astro` | **New** — Classes listing |
| `src/pages/booking/success.astro` | **New** — Confirmation page |
| `src/pages/booking/cancel.astro` | **New** — Cancellation/retry page |

### Verification

1. `npm run dev` — static pages still render, booking flow loads
2. `stripe listen --forward-to localhost:4321/api/webhooks/stripe` — test webhooks locally
3. Full E2E: select service → pick slot → pay with test card `4242 4242 4242 4242` → verify booking appears in Cal.com
4. Verify cancel flow, slot unavailability after booking, and webhook signature rejection

### Key Decisions

- **Custom slot picker** instead of Cal.com embed — the embed creates bookings directly, conflicting with payment-first flow
- **Payment before booking** — Stripe webhook creates Cal.com booking only after payment succeeds
- **No slot reservation during payment** — solo practitioner with low volume makes race conditions unlikely; can add Cal.com's Reserve Slot API later if needed
- **Scope excluded:** insurance-covered bookings (via Lactation Network), free resources page, affiliate products page
