# Known limitations / محدودیت‌های نسخه فعلی

1. The reference site was partially inaccessible during the audit (timeouts). The delivered app is a newly designed functional scaffold, not an exact one-to-one reproduction.
2. No payment gateway, bank callback, webhook verification, automated payouts, settlement accounting, refunds or transaction receipts are implemented. Order payment statuses are manually operated.
3. No outbound email/SMS delivery and no password reset-by-email route. Newsletter only collects addresses; emailing must use an external consent-compliant service.
4. Birth chart uses tropical geocentric ecliptic coordinates, a simplified Ascendant, and Equal Houses. It cannot replace specialist ephemerides/house systems and does not auto-resolve historic daylight-saving rules. Interpretations are symbolic, not scientific predictions.
5. Scheduled sessions collect requested dates but do not prevent double bookings or issue calendar invites.
6. This is a React SPA, not SSR. SEO sitemap and robots are basic; dynamic metatags, indexing and social sharing tags require additional work.
7. Default sample images/content/products do not represent the original site's licensed catalog. Demo digital files are absent until an administrator uploads and links them.
8. Videos are represented by external HTTPS links. No private streaming, DRM, video transcoding, upload/resume or live lessons.
9. The rich-text editor is plain multiline text; it does not support embedded HTML, images inside paragraphs, tables, Markdown render or complex publishing workflows.
10. The API allows a user to save and delete charts but doesn't provide self-service full account deletion, email verification, email-based recovery, privacy export, or retention policies.
11. Newsletter double-opt-in, GDPR/locale legal pages and cookie consent aren't implemented.
12. SQLite uses built-in `node:sqlite` on supported Node 22; migration/versioning and scaling to multiple concurrent servers are not implemented.
13. The client was statically parsed and the database/backup tested. Installing dependencies/building UI and browser end-to-end testing were unavailable in the authoring container due to blocked npm registry access. Complete QA before production deployment.
