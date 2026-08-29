# Publish Code Mavericks from an iPad

The project is ready for a Node.js web host. Render is a straightforward option because it can deploy this Express server directly from GitHub.

## Part 1 — Put the project on GitHub

1. Download `code-mavericks-final.zip` to the Files app.
2. Uncompress it in Files.
3. Create a new GitHub repository called `code-mavericks`.
4. Upload the CONTENTS of the uncompressed `code-mavericks-final` folder to the root of that repository.
   The repository root should contain:
   - package.json
   - server.js
   - render.yaml
   - public/
5. Do NOT upload a real `.env` file or any Stripe secret key.

## Part 2 — Deploy it on Render

1. Sign in to Render.
2. Choose **New → Web Service**.
3. Connect your GitHub account and select `code-mavericks`.
4. Use:
   - Language: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check: `/health`
5. Create the service.

Render will give you a public `onrender.com` URL after the deploy finishes.

## Part 3 — Add Stripe

In Stripe:

1. Create each paid product.
2. Create a one-time price for each product.
3. Copy the `price_...` IDs.

In Render → your service → Environment, add:

- STRIPE_SECRET_KEY
- STRIPE_PRICE_LITERALLY
- STRIPE_PRICE_STEAMPUNK
- STRIPE_PRICE_NUMBER_OUTLAW

Then redeploy.

## Part 4 — Stripe webhook

In Stripe create a webhook endpoint:

`https://YOUR-RENDER-ADDRESS.onrender.com/api/stripe-webhook`

Listen for:

`checkout.session.completed`

Copy the webhook signing secret (`whsec_...`) to Render as:

`STRIPE_WEBHOOK_SECRET`

Redeploy once more.

## Part 5 — Test before live payments

Use Stripe test mode first.

1. Open your Render URL on Safari.
2. Open a paid product.
3. Tap **Buy securely**.
4. Complete a Stripe test checkout.
5. Confirm the site returns with the payment-success message.
6. Confirm the webhook event succeeded in Stripe.

## Part 6 — Connect your own domain

After the test site works, add your Code Mavericks domain in the hosting dashboard and follow the DNS records it gives you.

## Before commercial launch

Replace the placeholder:
- support form logging with a real email service,
- newsletter logging with a mailing-list provider,
- privacy/terms templates with policies reviewed for your actual business,
- webhook TODO with fulfilment logic if buyers need accounts, downloads, licences or unlocks.
