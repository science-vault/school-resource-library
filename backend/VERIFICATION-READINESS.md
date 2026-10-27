# Google OAuth verification preparation

Status: NOT SUBMITTED. Checked 27 October 2026.

## Confirmed configuration
- App: School Library - Upload and Approval Backend.
- Apps Script project: 1OfSkH1EdIQ1et_w2CPUoWZLzEz9vFipoWFoXBLhlwXABPRvlBu7vDCl7.
- Apps Script settings currently show GCP Default.
- No production backend deployment or completed live upload test has been verified.
- Public contribution page deliberately keeps uploads disabled.

## Submission blockers
1. Create/select a standard Google Cloud project and associate it with this script. A default Apps Script project cannot be submitted for OAuth verification.
2. Configure Google Auth Platform branding, support/developer contacts and the web sign-in client.
3. Publish accurate privacy information and verify ownership of the website used in the consent screen.
4. Review the exact scopes requested by the deployed app and use the least privilege possible. The prepared manifest currently declares full Drive, Sheets and external-request access. Full Drive access must not be represented as access to a single folder.
5. Review verification exceptions and any restricted-scope assessment requirements before proceeding. No paid service or assessment has been authorised.
6. Finish authorised live testing and record a demonstration of the real consent, upload, private pending state, admin review and approval process.
7. Submit only when the app is functional and the submission statements can be supported by evidence.

## Current environment blocker
Google Cloud Console at https://console.cloud.google.com/home/ returned "Site Unavailable — Unable to access this site" twice in the setup browser. No project creation or verification submission was completed.

## Draft feature description
School Library is a resource catalogue for Years 7–12 containing teaching materials from multiple schools. Contributors sign in and submit original files with school, year, subject and resource metadata. The intended workflow retains submissions privately until a designated administrator approves them. Approved files are individually shared for library access; rejected files remain private. The website does not request contributors' Google Drive file access; the proposed server runs using the library owner's separate authorisation.

This describes the intended workflow, not a claim that live implementation has passed acceptance testing.

## Required demonstration evidence
- Genuine Google sign-in and owner authorisation, matching app branding.
- Server-side contributor/admin permission separation.
- An upload larger than GitHub's browser limit with interruption/recovery.
- Private pending and rejected files unavailable while signed out.
- An explicit admin approval followed by public catalogue visibility.
- No owner access token or Drive resumable-session URL exposed to the browser.

## Official guidance
- https://developers.google.com/apps-script/guides/client-verification
- https://developers.google.com/apps-script/guides/cloud-platform-projects
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
