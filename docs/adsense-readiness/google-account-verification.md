# Google AdSense Account Verification

> **Status: account-side verification pending.** This checklist records the required evidence but does not claim access to, configuration of, or approval by Google.

## Privacy & Messaging

Use AdSense **Privacy & messaging** to configure and publish a **European regulations** message for `hellorun.online`.

- Use Google’s own certified consent management solution or another Google-certified CMP that integrates with the IAB Transparency and Consent Framework.
- Cover visitors in the EEA, the United Kingdom, and Switzerland.
- Keep “purposes for your own use” set to **None** unless a separate legal and product review establishes a documented HelloRun purpose that must be included in the Google message.
- Do not recreate Google advertising purposes in HelloRun’s Cookie Preferences. HelloRun controls only Functional and Analytics choices.
- Review the final message language and choices for accuracy before publishing; Google’s default wording does not transfer compliance responsibility to Google.
- Verify that the message is published for the correct site and that a returning visitor can reopen Google’s privacy choices through the provider-supported control.

Official references:

- [Google consent-management requirements for EEA, UK, and Switzerland](https://support.google.com/adsense/answer/13554116)
- [Google Privacy & messaging guidelines](https://support.google.com/adsense/answer/12226986)
- [Purposes for a publisher’s own use](https://support.google.com/adsense/answer/10960671)

## Site And Account Gate

In AdSense **Sites**, open `hellorun.online` and record:

- ownership verification status;
- site approval status;
- `ads.txt` status, which must be **Authorized**;
- any required identity, address, payment, or account-activation task;
- any unresolved blocking item in the Policy Center; and
- whether the European regulations message is published and active for the site.

Google can verify ownership through ad code, `ads.txt`, or the site meta tag. HelloRun currently exposes the publisher meta tag and a public `ads.txt`, but the account-side result must still be confirmed.

Official references:

- [AdSense site management and ownership verification](https://support.google.com/adsense/answer/12131223)
- [Check site and ads.txt status](https://support.google.com/adsense/answer/12170222)
- [Google ads.txt guide](https://support.google.com/adsense/answer/12171612)

## Evidence Record

Complete this section during the authenticated account review:

| Check | Result | Date | Evidence or note |
| --- | --- | --- | --- |
| `hellorun.online` ownership | Pending | — | — |
| Site status | Pending | — | — |
| `ads.txt` status | Pending | — | — |
| Account setup tasks | Pending | — | — |
| Policy Center | Pending | — | — |
| European regulations message | Pending | — | — |
| Certified CMP and TCF coverage | Pending | — | — |

Do not record screenshots containing account identifiers, payment details, addresses, or other sensitive account data in the repository. Record only the minimum status evidence needed for the approval gate.

## Production Evidence — August 2, 2026

The repository-controlled release gate passed without changing deployment infrastructure:

- Release commit: `42d96ac`; previous release point: `5b59b83`.
- Existing PM2 process `hellorun` restarted successfully and remained stable with zero unstable restarts.
- Public homepage, `/healthz`, and `/readyz` returned `200`.
- Link audit: 46 sitemap pages, 106 unique same-origin links, zero actionable failures.
- Image audit: 82 unique images referenced by 46 sitemap pages, zero failures.
- Metadata audit: 46 sitemap HTML pages, zero findings; `robots.txt`, `sitemap.xml`, and `ads.txt` returned `200`.
- Public HTML loaded the Google AdSense bootstrap and rendered zero manual ad units.
- `ADSENSE_MANUAL_PLACEMENTS_ENABLED` was unset in the PM2 process.
- Privacy v1.7 and Cookie Policy v1.5 drafts were prepared idempotently for full-admin review. Published versions remain Privacy v1.4 and Cookie Policy v1.3 until that review is completed.

This production evidence does not verify Google’s account-side ownership, `ads.txt` authorization result, Policy Center, account tasks, CMP publication, Search Console indexing, or site-review status. Those rows remain pending until checked in the authenticated Google interfaces.
