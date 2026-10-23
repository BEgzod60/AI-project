# Private R2 audio migration and expert review

## Current inventory (2026-10-23)

The previous six-reciter collection was about 2.9 GB. After the owner's request to retain only Mishari Rashid al-Afasy, the current local collection is **6,236 `.webm` files, 531,495,409 bytes (about 507 MiB)**. The read-only audit found **zero duplicate-content groups, zero missing expected verses, and zero missing local database URLs**. The full per-file path, size, SHA-256, source and rights status are in [`reports/audio-r2/audio-files.csv`](../reports/audio-r2/audio-files.csv); [`summary.json`](../reports/audio-r2/summary.json) and [`migration.json`](../reports/audio-r2/migration.json) hold the audit and dry-run results.

### Audio source and permission review

| Source | Local files | Database records | Current rights evidence | Cloud copy decision |
| --- | ---: | ---: | --- | --- |
| Tanzil Project, Afasy verse audio, re-encoded locally to Opus/WebM | 6,236 | 12 symbolic `AudioSource` rows | `project_decision`; permission note says separate audio redistribution terms are undocumented | **Not confirmed; no upload** |
| muslim.uz / SoundCloud external links | 0 | 5 `AudioSource` rows | 3 `permitted` but all 5 currently `rejected` for playback; no local copy | Excluded from migration |
| `SurahAudio` external URLs | 0 | 0 | None in current database | Excluded |

Tanzil's [FAQ](https://tanzil.net/docs/FAQ) says its developer resources are available for noncommercial use, but does not establish that this particular Afasy recording may be copied to and distributed from an independent cloud bucket. Its [Quran text license](https://tanzil.net/docs/Text_License) applies to text; it must not be treated as an audio license. Obtain written permission or a source-specific redistribution license for the recording and its cloud distribution before uploading. Religious-content approval is a separate review gate.

## Architecture

The React players keep using the existing `/media/quran/afasy/SSSAAA.webm` URL contract. Nginx sends Quran media requests to Django. Django reads the private R2 Standard object through the S3 API and streams it back on the same origin, supporting `Range`, `HEAD`, `206`, `416`, `ETag`, and `Cache-Control: private, max-age=300`. The backend sends no R2 key or bucket URL to the browser. `R2_PUBLIC_BASE_URL` is intentionally unused during review. Other media and all existing API routes remain as before. If R2 is disabled or not configured, Django serves the local file. If an enabled R2 object is missing and a local file exists, Django uses it; otherwise it returns 404. A non-missing R2 error returns 502 when there is no local copy.

The frontend learning player now tries the same-origin file first and retains the existing Tanzil stream as a playback fallback. Quran text, prayer times, tasbeh and PWA files are outside the media migration.

## Private review environment

The old accountless quick tunnel was public and has been stopped. Do not restart it for review. The provided [`docker-compose.review.yml`](../docker-compose.review.yml) binds the website only to `127.0.0.1:8091`, excludes audio from Docker images and mounts, and uses a separate `review-data/` SQLite database. It does **not** create public exposure or grant reviewer access by itself.

Before exposing a review hostname, put **the entire site, including `/api/`, `/media/`, and `/admin/`, behind a Cloudflare Access allowlist** for the named reviewers. Ensure the origin is reachable only through the protected reverse proxy or tunnel; a direct public origin would bypass Access. Keep the R2 bucket private: disable both `r2.dev` and public custom-domain access. Cloudflare documents [private bucket access](https://developers.cloudflare.com/r2/buckets/public-buckets/) and [Access policies](https://developers.cloudflare.com/r2/tutorials/cloudflare-access/). A presigned URL is a bearer token, so this integration uses the same-origin authenticated gateway instead. No public audio domain is required.

After rights and upload approval, create `backend/.env.review` from `backend/.env.example` and set the Django values, the five R2 values, and `R2_AUDIO_ENABLED=true`; leave `R2_PUBLIC_BASE_URL` blank. Use an R2 token with Object Read & Write permission restricted to the approved bucket. Never commit either `.env` file. Make `review-data/` and a **copy** of the local SQLite database with the SQLite backup API; the existing `backend/db.sqlite3` must not be mounted or modified by review deployment. A future startup check should verify all migrated objects before removing local audio from a deployment host. The review Compose file already omits that media mount.

## Audit, dry run and approved migration

All commands below are run from the repository root with the backend virtual environment. Audit and dry run are read-only for the production database and make no R2 requests:

```bash
backend/venv/bin/python backend/manage.py audit_audio_media --output-dir reports/audio-r2
backend/venv/bin/python backend/manage.py migrate_audio_r2 \
  --manifest reports/audio-r2/audio-files.csv --report reports/audio-r2/migration.json
```

After the owner explicitly approves the **exact bucket, private access settings, recording distribution rights, and upload**, run the following in a credentialed environment (the command refuses to upload without both confirmation flags):

```bash
backend/venv/bin/python backend/manage.py migrate_audio_r2 \
  --manifest reports/audio-r2/audio-files.csv \
  --report reports/audio-r2/migration.json \
  --upload --approved-bucket=YOUR_EXACT_BUCKET_NAME --rights-confirmed
```

The command uploads batches of 100, preserves the relative key (`quran/afasy/001001.webm`), sets `Content-Type: audio/webm` and private cache headers, sends `Content-MD5`, and checks remote size and SHA-256 metadata after each PUT. Rerunning it skips matching remote objects; conflicting objects are reported rather than overwritten. Transient failures are retried with backoff. The report is written atomically after every batch, and originals are never deleted. Uploads are individual PUTs because these small files are far below R2's [single-upload limit](https://developers.cloudflare.com/r2/objects/upload-objects/).

Only after the report shows all 6,236 files as `uploaded` or `skipped`, verify representative first, middle, and last verses over the protected review hostname with `GET`, `HEAD`, and `Range`; then start the review stack. Do not switch on R2 delivery while the upload is incomplete.

## Limits and cost

Cloudflare's current [R2 Standard pricing](https://developers.cloudflare.com/r2/pricing/) includes 10 GB-month storage, 1 million Class A operations and 10 million Class B operations per month, with no egress fee. Usage above those limits is billable; this is not a promise of a zero-cost deployment. The 6,236 initial PUTs fit below the stated Class A allowance if no other account usage consumes it. Every proxied playback makes at least a metadata and object read request, so Class B usage should be monitored. This configuration does not enable a paid plan or create a bucket.
