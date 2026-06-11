# CashKitty — Market Research

## Date: Jun 2026

## The Problem
Employers give domestic helpers weekly petty cash for household expenses (groceries, taxi, supplies). Current tracking is manual:
- Envelope of receipts
- Handwritten notebook
- Weekly reconciliation by employer
- Zero real-time visibility for employer during the week

This is a universally acknowledged pain point (Sassy Mama HK, expat forums, helper forums all discuss it).

---

## Existing Solutions

| App | Target User | What It Does | Gap vs CashKitty |
|-----|-------------|-------------|------------------|
| **Enrich Planner** | Helper (personal finances) | Budget, expense tracking, loan mgmt, goal setting. Free. Android only. Multi-currency (HKD/PHP/RP). | Tracks helper's OWN money. No employer visibility. No petty cash kitty concept. |
| **KttiPay** | Groups (travel/shared) | Pooled kitty with shared debit card | Not designed for employer-helper dynamic. No receipt OCR. |
| **Planto** | HK consumers | Bank sync, budget tracking, 300K+ downloads | General purpose. No petty cash workflow. No multi-party visibility. |
| **Paper notebook + receipts** | Helper + employer | Manual tracking | The status quo. Error-prone, no real-time visibility, receipts get lost. |
| **Splitwise** | Friends/roommates | Shared expenses, IOUs | Peer-to-peer model. Not employer-employee. No OCR. |
| **QuickBooks / Xero** | Small business | Professional expense tracking | Overkill for household. Not designed for this use case. |

### Key Insight
**No app exists** for the two-sided employer-helper petty cash workflow: employer tops up → helper records expenses (with receipt photo/OCR) → employer sees spending in real-time → weekly reconciliation automated.

---

## Market Size

### Hong Kong (Primary)
- ~340,000 domestic helpers
- ~340,000 employer households
- Nearly all use some form of weekly petty cash system
- Employer demographic: expats + local HK families, dual-income, time-poor

### Adjacent Markets
| Market | Domestic Helpers | Notes |
|--------|-----------------|-------|
| Singapore | ~250,000 | Similar dynamics, English-speaking employers |
| Taiwan | ~220,000 | Growing market |
| Middle East (UAE, Saudi, Kuwait) | ~5,000,000+ | Massive but different dynamics |
| Malaysia | ~130,000 | |
| UK / Europe | Growing | Au pairs, live-in housekeepers |

### Total Addressable Market (HK + Singapore)
- ~590,000 households
- If 5% adopt at HKD 30/month: ~HKD 10.6M/year
- If 10% adopt at HKD 50/month: ~HKD 35.4M/year

---

## Who Pays?

**Employer pays** (not the helper). Reasoning:
- Employer is the one with the pain (lack of visibility, weekly reconciliation hassle)
- Employer has purchasing power
- Helper has no incentive to pay — the notebook works for them
- Freemium: helper gets free access to log; employer pays for dashboard/reports/OCR

---

## Validation Questions (Still Open)

1. Is the pain big enough for employers to pay? Or is the notebook "good enough"?
2. What would employers pay? (HKD 20/month? 50? 100?)
3. Would helpers willingly adopt a phone app for tracking? (Most have smartphones)
4. Privacy/trust concerns — would helpers feel surveilled or micromanaged?
5. Language — app needs English (employer) + Tagalog/Bahasa (helper)?
6. Does receipt OCR actually work well for HK receipts (Chinese characters, thermal paper)?

---

## Competitive Advantages of CashKitty

1. **Receipt OCR** — snap a photo, auto-extract amount + categorize (AI-powered)
2. **Two-sided visibility** — employer dashboard + helper input
3. **Auto-categorization** — learns spending patterns over time
4. **Trend reports** — spending by category, daily/weekly/monthly views
5. **No hardware needed** — just phones both parties already have
6. **HK-specific** — built for this market's dynamics (weekly cash, Chinese receipts)

## Additional Dimension: Salary, Loan & Repayment Tracker

Beyond petty cash, employers also manage:
- **Monthly salary payments** — need record keeping for tax/visa purposes
- **Loans/advances to helper** — very common (helper asks for advance, flights home, family emergencies)
- **Repayment tracking** — deducted from salary over months, easy to lose track
- **Annual summary** — needed for contract renewal, visa applications

This expands CashKitty from "petty cash tracker" to **full employer-helper financial management**:
- Petty cash kitty (current)
- Salary payment log
- Loan ledger (amount, date, repayment schedule)
- Auto-deduction tracking from salary
- Annual statement generation

This makes the app significantly more valuable and stickier — salary + loan data = high switching cost.

---

## Potential Pricing Models

| Model | Price | What's Included |
|-------|-------|-----------------|
| Free tier | $0 | Helper logs expenses manually, basic history |
| Premium (employer) | HKD 39-59/month | OCR, dashboard, reports, trends, categories |
| Family plan | HKD 79-99/month | Multiple helpers, export, annual summary |

---

## Distribution Channels

1. **Expat communities** — Sassy Mama, GeoExpat, AsiaXpat, HK Moms Facebook groups
2. **Helper agencies** — partner with Fair Employment Agency, HelperPlace, Anytime
3. **Word of mouth** — employer WhatsApp groups
4. **Instagram/Facebook ads** — target expat parents in HK
5. **Helper communities** — Filipino/Indonesian Facebook groups, Sunday gatherings in Central

---

## Pricing Model

| Tier | Price | Target | Features |
|------|-------|--------|----------|
| **Free** | $0 | Helper | Manual expense logging, basic history |
| **Starter** | HKD 29/month | Employer (price-sensitive) | Dashboard, categories, weekly summary |
| **Premium** | HKD 49/month | Employer (sweet spot) | + Receipt OCR, trend reports, auto-categorize |
| **Family** | HKD 79/month | Multiple helpers / power users | + Multi-helper, CSV export, annual tax summary |

**Why HKD 49 is the sweet spot:**
- Less than one taxi ride — trivial vs HKD 2,000-8,000/month flowing through petty cash
- Employers spending HKD 5,000+/month on a helper won't blink at HKD 49 for peace of mind
- Low enough for impulse sign-up, high enough to be sustainable

**Revenue potential (HK only):**
- 1,000 paying users x HKD 49 = HKD 49K/month
- 5,000 paying users x HKD 49 = HKD 245K/month

---

## Defensibility & Moats

### What's NOT a Moat
- UI/features — anyone can build CRUD + OCR with AI tools
- Receipt OCR — Gemini/Claude Vision available to everyone
- Basic category recommendations

### What CAN Be a Moat

**1. Data Network Effects (strongest)**
- More receipts processed → better OCR + categorization for HK-specific merchants (ParknShop, Wellcome, wet markets, 7-Eleven)
- Trained on thousands of HK thermal receipts (Chinese/English) → accuracy competitors can't match on day 1
- Spending pattern data → better budget predictions per household

**2. Two-Sided Lock-In**
- Both employer AND helper use the app → switching means convincing both parties
- Transaction history accumulates — nobody wants to lose 6 months of records
- Like WhatsApp — technically simple, but everyone's already on it

**3. Distribution & Community (most practical)**
- First to HK expat Facebook/WhatsApp groups = first in mind
- Partnerships with helper agencies (Fair Employment, HelperPlace) = built-in distribution
- If 50 employers in one school's parent group use it, the 51st follows
- Winner-take-most in niche market — room for 1-2 players, not 10

**4. Multi-Language + Localization**
- Tagalog + Bahasa Indonesia + English UI (most competitors won't bother)
- HK-specific receipt parsing (Chinese characters, store names, Octopus top-ups)
- Too small a market for big players to care about

**5. Expand the Relationship (future moat)**
- Become the OS for employer-helper relationship:
  - Petty cash (today)
  - Salary payments + payslips
  - Leave tracking
  - Contract renewal reminders
  - Grocery lists + meal planning
- Each feature adds switching cost

### Strategy
- Launch fast → get 500 users → build word-of-mouth before anyone notices
- Nail HK receipt OCR (data advantage)
- Lock in helper agencies as distribution partners
- Expand features: "helper management app" not just "petty cash"
- The moat isn't in code — it's in being first, local, and sticky

---

## Next Steps

### Validation
- [ ] Process quick survey results
- [ ] Talk to 5 employers (Shuchi, Kritika, Anu, Nupur, Anisha) about petty cash + salary + loan pain
- [ ] Talk to 2-3 helpers — would they use an app? What language? What phone?
- [ ] Test receipt OCR on real HK receipts (ParknShop, Wellcome, wet market, 7-Eleven)
- [ ] Check if Enrich Planner is still active / well-adopted

### Build
- [ ] Add salary payment tracker (log monthly payments, generate payslip)
- [ ] Add loan/advance ledger (amount, date, reason, repayment schedule)
- [ ] Add auto-deduction from salary (link loan repayment to monthly salary)
- [ ] Add annual statement generation (for contract renewal / visa)
- [ ] Define MVP for employer-side features (what's minimum to charge?)

### Decide (by Jul 8)
- [ ] Personal tool or product?
- [ ] If product: target audience, launch plan, distribution

---

## Sources
- [Sassy Mama HK - Tracking Finances and Petty Cash](https://www.sassymamahk.com/expert-domestic-worker-employer-advice-tracking-finances-petty-cash/)
- [Sassy Mama SG - Managing Helper's Petty Cash](https://www.sassymamasg.com/ask-andreas-how-to-manage-helpers-petty-cash/)
- [Enrich Planner App](https://enrichhk.org/enrich-planner-app)
- [KttiPay](https://kttipay.com/)
- [Planto HK](https://www.planto.hk/en/)
- [HelperPlace](https://www.helperplace.com/)
