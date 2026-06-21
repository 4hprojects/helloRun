# WebP Upload Conversion

## Purpose

HelloRun stores uploaded files in Cloudflare R2. Uploaded images should be normalized to WebP before storage so public media, proof images, and organizer assets use a consistent, compressed format.

PDFs and non-image uploads are not converted.

## Policy

All image uploads that pass through the shared R2 file helper are converted to WebP by default.

The shared helper accepts `convertImagesToWebp: false` as an explicit opt-out for future cases that must preserve the original image format. Existing WebP files are kept as WebP without recompression.

This policy does not migrate or rewrite existing R2 objects. It only applies to new file uploads.

## Current Implementation

The conversion logic lives in `src/services/upload.service.js`.

`normalizeFileForUpload()` handles MIME type and extension normalization. For JPEG and PNG uploads, it uses Sharp to rotate according to metadata and encode WebP at quality 82. For PDFs, non-images, and already-WebP images, it returns the original buffer and content type.

`uploadFileToR2()` uses the normalized file payload for the R2 object body, content type, and object key extension.

## Affected Upload Paths

These upload paths use the shared R2 file helper and should store image files as WebP:

- Organizer verification documents: ID proof and business proof images.
- Event branding images: banner, logo, poster, payment QR upload, and gallery.
- Blog images: cover and gallery.
- Certificate visual assets: backgrounds, organizer logo, event logo, event artwork, signature, and sponsor logos.
- Payment receipt images.
- Runner result proof images.

## Not Affected

These assets are intentionally not converted by this policy:

- PDF uploads.
- Generated certificate PDFs.
- Generated QR code assets that do not pass through the shared image upload helper.
- Existing remote image URLs pasted into forms.
- Existing Cloudflare R2 objects uploaded before this policy.

## Implementation Checklist

- Keep image conversion enabled by default in `uploadFileToR2()`.
- Keep `convertImagesToWebp: false` available as the explicit opt-out.
- Keep PDF and non-image handling unchanged.
- Ensure returned R2 URLs and keys use `.webp` for converted images.
- Do not fetch or rewrite user-provided remote image URLs.

## Test Checklist

- JPEG uploads normalize to `image/webp` and `.webp`.
- PNG uploads normalize to `image/webp` and `.webp`.
- Existing WebP uploads remain `image/webp` and `.webp`.
- PDF uploads remain `application/pdf` and `.pdf`.
- Explicit opt-out preserves the original image MIME type and extension.
- At least one public media path and one proof/review path are covered by upload tests.

## Rollback

If production review quality, OCR, or user support feedback shows a regression, set the shared helper back to opt-in conversion and selectively enable WebP per upload path. Proof and receipt uploads can also be moved to a higher WebP quality setting if review fidelity is the only concern.
