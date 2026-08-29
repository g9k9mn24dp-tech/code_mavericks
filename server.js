import express from "express";
import Stripe from "stripe";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3000;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const prices = {
  "literally-illiterate": process.env.STRIPE_PRICE_LITERALLY,
  "steampunk-chronicles": process.env.STRIPE_PRICE_STEAMPUNK,
  "number-outlaw": process.env.STRIPE_PRICE_NUMBER_OUTLAW
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

// Optional placeholders: connect these to Resend/Mailchimp/etc.
app.post("/api/newsletter", (req,res)=>{
  if(!req.body?.email) return res.status(400).json({error:"Email required"});
  console.log("Newsletter signup:", req.body.email);
  res.json({ok:true});
});

app.post("/api/support", (req,res)=>{
  const {name,email,message} = req.body || {};
  if(!name || !email || !message) return res.status(400).json({error:"Missing fields"});
  console.log("Support request:", req.body);
  res.json({ok:true});
});

app.get("/health", (_req,res)=>res.json({ok:true}));

app.listen(PORT, "0.0.0.0", ()=>console.log(`Code Mavericks running on port ${PORT}`));
