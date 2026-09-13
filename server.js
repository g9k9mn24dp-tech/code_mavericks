import express from "express";
import Stripe from "stripe";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3000;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const prices = {
  "literally-illiterate": process.env.STRIPE_PRICE_LITERALLY,

  "dungeon-adventurer-pack": process.env.STRIPE_PRICE_DUNGEON_ADVENTURER,
  "dungeon-campaign-pack": process.env.STRIPE_PRICE_DUNGEON_CAMPAIGN,
  "dungeon-founders-pack": process.env.STRIPE_PRICE_DUNGEON_FOUNDERS
};

// Stripe webhook must use raw body before express.json().
app.post("/api/stripe-webhook", express.raw({type:"application/json"}), (req,res)=>{
  if(!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(400).send("Stripe webhook not configured.");
  try{
    const event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if(event.type === "checkout.session.completed"){
      const session = event.data.object;
      // TODO: Add entitlement fulfilment here:
      // - save purchase in DB
      // - unlock web content
      // - issue licence
      // - send access email
      console.log("Purchase complete:", session.id, session.metadata?.productId);
    }
    res.json({received:true});
  }catch(err){
    res.status(400).send(`Webhook error: ${err.message}`);
  }
});

app.use(express.json());
app.use(express.static("public", { extensions: ["html"] }));

app.post("/api/create-checkout-session", async (req,res)=>{
  if(!stripe) return res.status(503).json({error:"Stripe not configured"});
  const productId = req.body?.productId;
  const price = prices[productId];
  if(!price) return res.status(400).json({error:"No Stripe Price ID configured for this product"});
  try{
    const origin = `${req.protocol}://${req.get("host")}`;
    const session = await stripe.checkout.sessions.create({
      mode:"payment",
      line_items:[{price,quantity:1}],
      success_url:`${origin}/?checkout=success`,
      cancel_url:`${origin}/?checkout=cancelled`,
      allow_promotion_codes:true,
      metadata:{productId}
    });
    res.json({url:session.url});
  }catch(err){
    console.error(err);
    res.status(500).json({error:"Could not start checkout"});
  }
});

async function sendEmail({ subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const supportEmail =
    process.env.SUPPORT_EMAIL || "codemavericks2706@outlook.com";

  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured");
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Code Mavericks <onboarding@resend.dev>",
      to: [supportEmail],
      subject,
      text
    })
  });

  if (!response.ok) {
    console.error("Email error:", await response.text());
    return false;
  }

  return true;
}

app.post("/api/newsletter", async (req, res) => {
  const email = req.body?.email;

  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  const sent = await sendEmail({
    subject: "New Maverick List signup",
    text: `New newsletter signup:

${email}`
  });

  if (!sent) {
    return res.status(500).json({ error: "Could not send signup notification" });
  }

  res.json({ ok: true });
});

app.post("/api/support", async (req, res) => {
  const { name, email, product, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const sent = await sendEmail({
    subject: `Code Mavericks support request - ${product || "General enquiry"}`,
    text: `New support request

Name: ${name}
Email: ${email}
Product: ${product || "General enquiry"}

Message:
${message}`
  });

  if (!sent) {
    return res.status(500).json({ error: "Could not send support request" });
  }

  res.json({ ok: true });
});

app.get("/health", (_req,res)=>res.json({ok:true}));

app.listen(PORT, "0.0.0.0", ()=>console.log(`Code Mavericks running on port ${PORT}`));
