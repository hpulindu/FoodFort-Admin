# Food Fort Admin

A standalone, mobile-first admin dashboard for Food Fort. It is a separate Vite + React SPA that talks to the **same** Firebase project (`food-fort-dfe63`), Firestore data, Cloud Functions, Storage and Stripe connected-account flow as the customer website.

Access is **admin-only**: a user must have the Firebase custom claim `admin: true` to sign in. Non-admin / staff-only accounts are rejected and signed out.

## Stack

React 19, Vite 7, TypeScript, Tailwind CSS v4, React Router v6, TanStack Query, Firebase v12 (Auth + Firestore + Functions + Storage), Recharts, `xlsx`, lucide-react, sonner.

## Setup

```bash
cd foodfort-admin
npm install
cp .env.example .env.local   # then fill in the Firebase web config (same project as the customer app)
npm run dev                  # http://localhost:5174
```

`.env.local` mirrors the customer app's `VITE_FIREBASE_*` values (all public web config).

## Build & deploy (Hostinger subdomain)

```bash
npm run build      # outputs static files to dist/
```

Upload the contents of `dist/` to the subdomain's web root. `public/.htaccess` is included and copied into `dist/` — it rewrites unknown routes to `index.html` so client-side routing works on deep links.

## Granting admin access

Admins are provisioned from the customer repo's script (Admin SDK), which sets both `staff: true` and `admin: true`:

```bash
# from the repo root
npx tsx scripts/provision-staff.ts <email> <password> --admin
```

## Screens

- **Login** – email/password, force token refresh, admin-claim check.
- **Dashboard** – today's active orders, revenue snapshot (excludes the Skryptone service fee), open/paused status with a quick pause toggle, top items, quick actions.
- **Orders** – real-time board, filters (status / date / type), detail drawer with call/email links, status updates, cancel & refund, optional silent new-order browser notification.
- **Revenue** – daily / weekly / monthly / custom ranges using `Australia/Perth` boundaries.
- **Exports** – orders, order items, revenue, refunds, menu and audit log to `.xlsx`.
- **Menu** – categories, items, sauces; reorder, availability toggles, image upload/replace/remove.
- **Settings** – kitchen/ordering hours, pause toggle + reason, admin profile, recent admin activity.

## Backend

The admin-only callable Functions (`adminUpdateOrderStatus`, `adminRefundOrder`, menu/sauce CRUD, `adminUpdateOperationHours`, `adminSetOrderingPaused`, …) live in the customer repo under `functions/src/admin.ts` and are deployed with the rest of the Functions codebase.

### Refunds

Refunds are issued from the Stripe **connected account** (`stripe.refunds.create({ ... }, { stripeAccount })`) and intentionally **do not** refund the platform application fee (`refund_application_fee: false`). The Skryptone service fee stays with the platform; the merchant absorbs it on refunds.

### Revenue rule

Owner revenue excludes `serviceFee`. The primary metric is `subtotal − refundedSubtotalEquivalent`.
