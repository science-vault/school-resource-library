# School Library upload backend

Status: implementation prepared; not activated or verified against live Google services.
The public website must keep upload-config.js enabled:false until the acceptance checks below pass.

## Existing private Drive folders

- Root: 1tV3FNgeK-IkdyReDZcqZmDMcgYPelVoy
- Pending: 1wk4Im_5H0z_ljN4jUEkYonfCJtyXMyZd
- Approved: 1upugSTAFfPZnhK9TF55QvljJpEAZrgcp
- Rejected: 1q84cDE7TlnNlYHGCT_0K0V1oP_lNPnEf

Never share the root, pending folder or submission register publicly.
Only an individually approved file is made readable by anyone with its link.

## One-time owner setup

1. Open the School Library Apps Script project. Copy Code.gs and appsscript.json from this directory into it. Enable display of the manifest in Project Settings if needed.
2. Review the script and scopes. Run initializeSchoolLibrary and authorise it using the Google account that owns the School Library folders. This creates a private Sheets register; it does not publish resources.
3. Create an OAuth 2.0 Web application client in a Google Cloud project. Configure Google Identity Services with authorised JavaScript origin https://science-vault.github.io. Complete Google's OAuth consent configuration. Do not put any client secret in website files.
4. In Apps Script Project Settings → Script properties, set CLIENT_ID to the public Google web client ID. Set ADMIN_SUBS initially to an impossible placeholder such as SET_ADMIN_SUBJECT. Do not use an email address as the subject identifier.
5. Deploy a version as a Web app: execute as the owner, accessible to Anyone (all protected POST actions still require a server-verified Google sign-in). Review Google's permission request. Save the /exec deployment URL.
6. Temporarily configure a controlled test copy of contribute.html with that endpoint and client ID. Sign in as the intended administrator and copy the Account ID shown. Put that Google subject identifier in ADMIN_SUBS. Re-sign in and verify admin access. Never bootstrap by accepting a browser-supplied admin flag.
7. Complete live tests below. Then set site/upload-config.js endpoint, clientId and enabled:true and publish. The GitHub Pages website itself remains public.
8. When server code changes, deploy a new Apps Script version; saving editor code alone does not update the deployed web app.

## Required live acceptance checks before activation

- Anonymous, expired and wrong-client Google tokens cannot start uploads or review files.
- Two separate contributor accounts cannot access each other's submission IDs.
- Owner account can access pending files; signed-out browsers cannot.
- PDF and PPTX files upload successfully, including a file larger than 25 MiB.
- Pause, network interruption and lost-response recovery resume from Drive's confirmed byte offset.
- A second account cannot review. Admin must explicitly confirm public sharing.
- A file is absent from public catalogue before approval and visible/downloadable after approval.
- Rejected files remain private and do not appear in public catalogue.
- An identical approved file is blocked using Drive's checksum.
- Verify cross-origin POST and GET from the actual GitHub Pages origin and mobile browsers. Apps Script ContentService redirects must resolve to readable JSON. If deployment/domain policy blocks this, use a hosted backend with proper CORS; do not weaken authentication.
- Google Workspace policy may prohibit public web-app access or public file sharing. Respect policy rather than bypassing it.

## Limits and behaviour

- 500 MiB per file, 1 MiB chunks, 10 starts per contributor per UTC day.
- Global daily reservation allowance: 2 GiB. Started files count even if not completed.
- Session lifetime: up to 30 minutes; cached sessions can expire earlier. Re-sign in and use My submissions to resume.
- The browser never receives the owner's Google access token or Drive resumable upload URL.
- Supported formats are explicitly allowlisted. Type checking is metadata validation, not malware scanning; admins must inspect submissions.
- The admin can approve/reject and leave a note. Metadata editing is not included in this first version.
- Rejected files are retained, not deleted. Remove abandoned upload sessions and records through an owner-maintained retention process.
- This is a small-volume free-tier implementation. Sheets scans and Apps Script quotas limit scale. No unlimited storage or traffic is promised.
- Google token verification uses Google's HTTPS tokeninfo endpoint with audience, issuer, expiry and verified-email checks. This is suitable for controlled validation; Google's recommended production approach is a supported server token-verification library. Before a larger public rollout, migrate authentication verification to such a backend.
- Approved school resources follow School / Year / Subject / Type / Year created. This cloud layout does not change the existing repository-file importer.
