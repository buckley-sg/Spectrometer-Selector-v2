# Web3Forms Setup

This document describes how the quote-submission email relay works, how to
obtain and rotate the access key, and how to verify end-to-end delivery.

## What Web3Forms does

Web3Forms (https://web3forms.com) is a free-tier HTTP-to-email relay. The
client submits a JSON POST; Web3Forms forwards the content as an email to a
destination address configured in their dashboard. This removes the need for
us to run a backend server purely to accept form submissions.

## The access key

The access key is a UUID that identifies *which destination address* a
submission should be forwarded to. It is **public-safe by design**:

- The destination address (`sales@evolve-sensing.com`) is locked to the key
  server-side at Web3Forms. An attacker who steals the key cannot redirect
  submissions anywhere else.
- The key is embedded in the compiled JavaScript bundle that ships with the
  GitHub Pages deployment. Anyone who inspects the bundle can find it.
- The only abuse vector is spamming the destination inbox. Web3Forms
  rate-limits submissions per key and includes captcha options.

If you ever need to rotate the key (e.g., you see abuse), see the
"Rotating the key" section below.

## Obtaining an access key

1. Go to https://web3forms.com.
2. Enter `sales@evolve-sensing.com` as the destination email.
3. Web3Forms sends a confirmation email to that address. Open it and click
   the confirmation link (if asked).
4. Web3Forms emails (or shows in-browser) a UUID access key in the format
   `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.
5. Save the key somewhere secure. You will paste it into:
   - `.env` for local development
   - GitHub repository secrets for the Pages deployment

## Configuring local development

```bash
cp .env.example .env
```

Edit `.env` and paste your key:

```
VITE_WEB3FORMS_KEY=034d5239-d710-4b62-9d07-5c160afdf614
```

(The value shown above is a placeholder format — use your actual key.)

Then:

```bash
npm run dev
```

The Vite dev server reads `.env` at startup. If you change `.env`, restart
the dev server.

To verify: open the app, run any search that returns results, click
"Request a quote", fill in the form, and submit. Check
`sales@evolve-sensing.com` for the email.

## Configuring GitHub Pages deployment

The GitHub Actions workflow (`.github/workflows/deploy.yml`) reads the key
from a repository secret and injects it into the build:

```yaml
- run: npm run build
  env:
    GITHUB_PAGES: "true"
    VITE_WEB3FORMS_KEY: ${{ secrets.VITE_WEB3FORMS_KEY }}
```

To set the secret:

1. Go to the repository on GitHub
   (https://github.com/buckley-sg/Spectrometer-Selector-v2).
2. Settings → Secrets and variables → Actions.
3. Click "New repository secret".
4. Name: `VITE_WEB3FORMS_KEY`. Value: your UUID key.
5. Click "Add secret".

Trigger a deployment by pushing to `master` (or clicking "Run workflow" on
the Actions tab). The built site will include the key and quote submissions
will start working.

**Do not commit the key to the repository directly.** It is public-safe in
principle, but keeping it in GitHub Secrets lets you rotate it without a
code commit.

## Rotating the key

If you need to revoke the current key and switch to a new one:

1. Go to https://web3forms.com and sign in (or re-request a key for
   `sales@evolve-sensing.com` if you don't have an account linked).
2. Generate a new key.
3. In the old Web3Forms dashboard, delete or disable the old key.
4. Update `.env` locally and the `VITE_WEB3FORMS_KEY` repository secret.
5. Trigger a new GitHub Pages deployment.

## Testing end-to-end

After any configuration change, verify delivery works:

1. Load the live site (https://buckley-sg.github.io/Spectrometer-Selector-v2/).
2. Enter a search that returns results — e.g., `200 / 550 / 0.5`.
3. Click "Request a quote".
4. Fill in test values:
   - Name: `Test User`
   - Email: `test@example.com`
   - Application: `End-to-end delivery test — please ignore.` (34 chars, passes ≥20)
5. Select any spectrometer, click SEND.
6. Within ~30 seconds, `sales@evolve-sensing.com` should receive an email
   with subject starting `Quote Request: ...`.

If the email does not arrive:
- Check `sales@evolve-sensing.com` spam folder.
- Open browser DevTools → Network tab → find the POST to `api.web3forms.com/submit`.
  Inspect the response for an error message.
- Verify the access key matches between `.env` (or the GitHub secret) and
  the Web3Forms dashboard.

## Free-tier limits

As of 2026, Web3Forms free tier allows **250 submissions per month** per
destination address. At Evolve's current ICP volume, this is expected to be
ample. If usage approaches the cap:

- Web3Forms paid plans start at a few dollars a month for higher volume.
- The upgrade path to HubSpot Forms (planned for v2.1) routes submissions
  directly to the CRM and removes the Web3Forms dependency entirely.

## Data handling

- Web3Forms stores submission content only as long as needed to deliver the
  email. Their privacy policy is at https://web3forms.com/privacy.
- No PII is stored client-side by this application. Submissions are
  fire-and-forget POSTs with no localStorage/cookies.
- The email Reply-To header is set to the customer's email, so sales can
  reply directly from their inbox.
