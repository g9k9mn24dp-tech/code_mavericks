# Code Mavericks — finished website

This build includes:

- Responsive home page using the supplied Code Mavericks artwork
- Apps and games catalogue
- Product detail dialogs
- Stripe Checkout backend
- Stripe webhook endpoint
- Newsletter form endpoint
- Support form endpoint
- Privacy policy page
- Terms page
- Cookie notice
- Mobile/iPad navigation
- Render deployment configuration

## Run locally

```bash
npm install
cp .env.example .env
npm start
```

Then open http://localhost:3000

## Connect Stripe

1. Create each paid product in Stripe.
2. Create a one-time Price for each product.
3. Copy each `price_...` ID into `.env`.
4. Add your Stripe secret key.
5. In Stripe, create a webhook pointing to:
   `https://YOUR-DOMAIN/api/stripe-webhook`
6. Subscribe it to `checkout.session.completed`.
7. Put the webhook signing secret into `.env`.

The checkout flow is already wired into the site.

## Edit your products

Open:

`public/data/catalog.json`

Change:
- product names
- prices
- descriptions
- status
- feature lists

## Add App Store links

For free products, edit `public/app.js` so the free-product button opens your App Store URL.

For native iOS digital purchases, use the payment method required by the App Store rules that apply to your app and storefront. The included Stripe flow is for purchases made on the website.

## Deploy

This project includes `render.yaml`, so it can be deployed as a Node web service. Add the Stripe environment variables in your hosting dashboard rather than committing your `.env` file.

Before a commercial launch, replace the placeholder support/newsletter logging with a real email provider and review the legal pages for your exact business details.
