Read [](file:///Users/os/projects/Mary-breastfeeding/src/pages/api/create-checkout-session.ts)

Read [](file:///Users/os/projects/Mary-breastfeeding/src/components/BookingForm.tsx)

Read [](file:///Users/os/projects/Mary-breastfeeding/src/components/BookingFlow.tsx#1-1), lines 1 to 150

Read memory [](file:///Users/os/Library/Application%20Support/Code/User/workspaceStorage/0badb51866ad46b4f72676d4d2cfb7fb/GitHub.copilot-chat/memory-tool/memories/NjM2YzJhNWItY2FjNC00NGU5LTg2NjItNDFkODc5MTFjYzhi/inspection_summary.md)

Read [](file:///Users/os/projects/Mary-breastfeeding/src/components/BookingFlow.tsx#140-140), lines 140 to 160

Read [](file:///Users/os/projects/Mary-breastfeeding/src/pages/api/webhooks/stripe.ts)

Read [](file:///Users/os/projects/Mary-breastfeeding/src/config/services.ts#1-1), lines 1 to 50

Now I have full context on the codebase. Here's the comprehensive assessment and development plan.

---

# HIPAA-Compliant Development Plan for Inspirit Lactation

## 1. HIPAA Compliance Assessment

### Technical Requirements for Handling PHI

| Requirement | Details |
|---|---|
| **Encryption in transit** | TLS 1.2+ on all connections carrying PHI (already met via Cloudflare HTTPS) |
| **Encryption at rest** | AES-256 for any stored PHI (database, backups, logs) |
| **Access controls** | Role-based access; minimum necessary principle; unique user IDs for anyone accessing PHI |
| **Audit logging** | Log every access, creation, modification, and deletion of PHI with timestamp, user, and action |
| **Automatic log-off** | Session timeouts on admin interfaces |
| **Integrity controls** | Mechanisms to ensure PHI is not improperly altered or destroyed |
| **Business Associate Agreements (BAAs)** | Signed BAA with every vendor/subprocessor that touches PHI |
| **Breach notification** | Process to notify HHS and affected individuals within 60 days of a breach |
| **Risk assessment** | Documented security risk analysis and management plan |
| **Disaster recovery** | Backup and restore procedures for PHI |

---

## 2. Stack Evaluation

### Astro (Front-End) — **Keep, with modifications**
Astro itself is just a build framework — it doesn't store or process PHI. The React components render forms client-side and submit to your API. This is fine as long as:
- PHI is transmitted over TLS (already the case with Cloudflare)
- PHI is never logged to the browser console or persisted in `localStorage`/`sessionStorage`
- The form submits PHI directly to a HIPAA-compliant backend, not through Stripe

**Verdict: Astro is viable.** No change needed.

### Cal.com — **Keep with caveats**
- Cal.com's **cloud-hosted** product does **not** sign BAAs on most plans. Their Enterprise self-hosted option may support it.
- However, in your architecture **Cal.com only receives**: attendee name, email, timezone, appointment time, and Stripe session ID. **None of this is PHI** — it's scheduling data.
- **As long as you never pass medical/health data to Cal.com**, no BAA is required with them.

**Verdict: Keep Cal.com as-is.** Do not send PHI to Cal.com.

### Stripe — **Keep, but stop passing PHI in metadata**
- Stripe is **PCI DSS compliant**, not HIPAA compliant. Stripe does **not** sign BAAs.
- Currently you pass `name`, `email`, `slot`, `serviceSlug` in `metadata` — this is fine (none of it is PHI).
- **Never put medical intake data in Stripe metadata.**

**Verdict: Keep Stripe. PHI must never touch Stripe.**

### Cloudflare Pages/Workers (Hosting) — **Replace for PHI storage**
- Cloudflare does **not** sign BAAs for Pages/Workers.
- Cloudflare is fine for serving the front-end and proxying non-PHI API calls.
- **PHI storage and processing must happen on a HIPAA-eligible service.**

**Verdict: Keep Cloudflare for front-end + non-PHI APIs. Add a separate HIPAA-compliant backend for PHI.**

---

## 3. Architecture Recommendations

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE PAGES                        │
│                  (No PHI touches this)                      │
│                                                             │
│  Static Pages    React Booking UI    Existing API Routes    │
│  /, /about,      BookingFlow.tsx     /api/slots             │
│  /classes         (4-step now)       /api/create-checkout   │
│                                      /api/webhooks/stripe   │
└────────────────────────┬────────────────────────────────────┘
                         │
              Step 3: POST intake form
              (PHI over TLS)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            HIPAA-COMPLIANT BACKEND (NEW)                    │
│         AWS (with BAA) or Aptible or Railway                │
│                                                             │
│  POST /api/intake                                           │
│    → Validates & encrypts PHI                               │
│    → Stores in encrypted DB (RDS/DynamoDB/Postgres)         │
│    → Returns intakeId token                                 │
│    → Writes audit log entry                                 │
│                                                             │
│  GET /api/intake/:id  (authenticated, Mary only)            │
│    → Returns PHI for review                                 │
│    → Writes audit log entry                                 │
│                                                             │
│  Encrypted Database (AES-256 at rest)                       │
│  Audit Log Table                                            │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**PHI stored separately from booking/payment data.** The HIPAA backend stores medical intake data and returns an `intakeId`. This ID is stored in Stripe metadata (not PHI) to link the booking to the intake record.

**PHI transmitted directly to HIPAA backend, bypasses Stripe entirely.** The new step 3 (intake form) submits directly to the HIPAA backend. Only after a successful intake submission does the user proceed to Stripe Checkout.

**Intake form is a new step in the existing flow (Step 3 of 4).** The flow becomes:

| Step | Component | Data |
|------|-----------|------|
| 1 | ServicePicker | Select service |
| 2 | SlotPicker | Select date/time |
| 3 | **IntakeForm (NEW)** | Name, email, medical history, medications, symptoms, concerns |
| 4 | Payment | Stripe Checkout (card only, email pre-filled) |

This keeps UX seamless — one extra step, but logically grouped before payment.

---

## 4. Development Plan

### Phase 1: HIPAA-Compliant Backend Setup

**Option A — AWS (most control, best for long-term)**
1. Sign AWS BAA (free, done in AWS Organizations console)
2. Provision:
   - **AWS RDS PostgreSQL** (encrypted at rest with KMS, encrypted in transit)
   - **AWS Lambda + API Gateway** or **ECS Fargate** for the intake API
   - **CloudWatch Logs** for audit trail (encrypted log group)
3. Estimated cost: ~$15-30/month for a small practice

**Option B — Aptible (managed HIPAA platform, easiest)**
1. Aptible provides HIPAA hosting out of the box with BAA
2. Deploy a small Node.js/Express or Hono API
3. Aptible manages encrypted Postgres, audit logging, access controls
4. Estimated cost: ~$185/month (their starter plan)

**Option C — Railway or Render with BAA (middle ground)**
1. Railway signs BAAs on their Pro plan (~$20/month)
2. Deploy a Hono or Express API with encrypted Postgres
3. You manage audit logging yourself

**Recommendation: Option A (AWS) or Option C (Railway)** for cost-effectiveness.

### Phase 2: Intake API Development

Create a minimal API service (Node.js + Hono or Express):

```
/api/intake
├── POST /intake          — Create intake record (PHI)
├── GET  /intake/:id      — Retrieve intake (authenticated)
├── GET  /intake/audit-log — View access log (admin only)
```

**Database schema:**

```sql
CREATE TABLE intake_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_email VARCHAR(255) NOT NULL,       -- links to Stripe/Cal
  full_name     VARCHAR(255) NOT NULL,
  -- PHI fields (encrypted at application level as extra protection)
  medical_data  JSONB NOT NULL,              -- encrypted JSON blob
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id   UUID REFERENCES intake_records(id),
  action      VARCHAR(50) NOT NULL,          -- 'created', 'viewed', 'updated', 'deleted'
  actor       VARCHAR(255) NOT NULL,         -- user/system identifier
  ip_address  VARCHAR(45),
  timestamp   TIMESTAMPTZ DEFAULT NOW(),
  details     TEXT
);
```

### Phase 3: Front-End Changes

#### 3a. New `IntakeForm.tsx` Component

Add a new form component collecting:
- Full name (already collected, carried forward)
- Email (already collected, carried forward)
- Date of birth (of baby)
- Reason for visit / primary concerns (textarea)
- Current medications (textarea)
- Relevant medical history (textarea)
- Insurance provider (optional text)
- Any additional fields Mary requires

#### 3b. Modify BookingFlow.tsx

Change the flow from 3 steps to 4 steps:

```
steps = ['Service', 'Date & Time', 'Health Info', 'Payment']
```

- Step 2 (Your Info) becomes the IntakeForm
- The IntakeForm submits PHI to the HIPAA backend, receives an `intakeId`
- The `intakeId` (not PHI) is passed to `/api/create-checkout-session` in metadata
- Stripe Checkout proceeds as before

#### 3c. Modify create-checkout-session.ts

Add `intakeId` to the metadata sent to Stripe (this is just a UUID, not PHI):

```typescript
metadata: {
  calEventTypeId: String(calEventTypeId),
  slot,
  name,
  email,
  timeZone,
  serviceSlug,
  intakeId,  // ← NEW: links to PHI record in HIPAA backend
},
```

#### 3d. Modify `webhooks/stripe.ts`

After creating the Cal.com booking, optionally update the intake record with the Cal.com booking ID for cross-referencing.

### Phase 4: Access Control & Admin

For Mary to view intake records:
1. Add a simple **admin page** (password-protected or behind Cloudflare Access)
2. The admin page calls `GET /api/intake/:id` with authentication
3. Every access is logged in the audit table
4. Use Cloudflare Access (Zero Trust) to restrict admin routes to Mary's email — this is free and avoids building auth

### Phase 5: BAAs & Compliance Documentation

| Vendor | BAA Needed? | Action |
|--------|------------|--------|
| **AWS / Railway** (PHI backend) | **Yes** | Sign BAA before storing any PHI |
| **Stripe** | No | Never passes PHI |
| **Cal.com** | No | Never receives PHI |
| **Cloudflare** | No | Never processes PHI (front-end only) |

Additional documentation to prepare:
- **Privacy Policy** — update to describe PHI collection, use, and storage
- **Notice of Privacy Practices** — required for healthcare providers under HIPAA
- **Risk Assessment** — document threats, vulnerabilities, and mitigations
- **Incident Response Plan** — steps if a breach occurs

### Phase 6: Testing & Validation

1. Verify TLS on all PHI transmission (check certificates, HSTS)
2. Verify database encryption at rest (AWS RDS encryption, or equivalent)
3. Test audit log captures all PHI access events
4. Penetration test the intake API endpoint (input validation, SQL injection, XSS)
5. Verify PHI is never in Stripe metadata, Cal.com payloads, Cloudflare logs, or browser storage
6. Test the full booking flow end-to-end

---

## Summary of Changes to Existing Code

| File | Change |
|------|--------|
| BookingFlow.tsx | Add step 3 (IntakeForm), shift payment to step 4 |
| BookingForm.tsx | Rename/repurpose — becomes minimal "confirm & pay" or merge into IntakeForm |
| **IntakeForm.tsx** (new) | Medical intake form that POSTs to HIPAA backend |
| create-checkout-session.ts | Accept `intakeId` in body, pass in Stripe metadata |
| webhooks/stripe.ts | Optionally update intake record with Cal booking ID |
| **HIPAA backend** (new service) | Separate deployment on AWS/Railway with encrypted DB |

---

## Cost Estimate (Small Practice)

| Item | Monthly Cost |
|------|-------------|
| AWS RDS (db.t4g.micro, encrypted) | ~$15 |
| AWS Lambda / API Gateway | ~$0-5 (low volume) |
| Cloudflare Pages | Free |
| Stripe | 2.9% + $0.30 per transaction |
| Cal.com | Free tier or $12/month |
| **Total infrastructure addition** | **~$15-20/month** |

Want me to proceed with implementing any of these phases? I'd recommend starting with Phase 3 (front-end IntakeForm + BookingFlow changes) since that can be built and tested while the HIPAA backend is being provisioned.