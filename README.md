# Business Snapshot

A deployable working concept for a small-business snapshot tool.

The app scores whether a local business looks accurate, trustworthy, and easy to choose across Google, its website, maps, reviews, hours, phone/address info, service or menu details, ordering links, and lead paths.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Ship online

This is a standard Next.js app and can be deployed to Vercel, Netlify, or any host that supports Next.js.

V1 stores dashboard business snapshots in browser `localStorage`. Prospect share links encode the report data into the URL, so a prospect can open the report online without logging in or accessing your local browser storage.

## Included

- Splash page for the broader concept
- New Business Snapshot form
- configured brand score out of 100
- Business info accuracy checks
- Optional restaurant/menu/ordering checks
- Red / amber / green score bands
- Prospect-facing report
- Print / Save as PDF export
- Copyable share link
- Dashboard with lowest-score-first sorting
- Seeded example business snapshots
- Provider boundary for manual data now and Google Places or listing APIs later



## Brand Configuration

The current working brand name is configured in src/lib/brand.js. Change BRAND there to update app copy and metadata.
