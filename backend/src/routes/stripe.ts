import express, { Router } from 'express';
import Stripe from 'stripe';
import { db } from '../config/firestore';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_secret';
const stripe = new Stripe(stripeSecretKey);

// Create a Setup Session for the user to link their card
router.post('/create-setup-session', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    
    // Fetch user to check if they already have a stripeCustomerId
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data()!;
    let customerId = userData.stripeCustomerId;

    // Create a new Stripe Customer if they don't have one
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.collection('users').doc(userId).update({ stripeCustomerId: customerId });
    }

    // Create a Checkout Session in 'setup' mode
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: customerId,
      success_url: `${process.env.WEBSITE_URL || 'http://localhost:3000'}/setup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.WEBSITE_URL || 'http://localhost:3000'}/setup/cancel`,
      metadata: { userId }, // Pass userId for the webhook
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('Error creating Stripe setup session:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Stripe Webhook Handler
// Important: This needs the raw body to verify the signature. 
// We will parse it with express.raw() in the index.ts before it reaches here.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: any, res: any) => {
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    // We'll skip verification in development if the signature is missing or mock secret
    if (stripeWebhookSecret === 'whsec_mock_secret') {
      event = JSON.parse(req.body.toString('utf8'));
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig as string, stripeWebhookSecret);
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // We only care about setup mode for tokenization
      if (session.mode === 'setup') {
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        
        if (userId && customerId) {
          try {
            // Update user to mark that they have a payment method
            await db.collection('users').doc(userId).update({
              hasPaymentMethod: true,
            });
            console.log(`Payment method saved successfully for user ${userId}`);
          } catch (e) {
            console.error('Failed to update user after setup completion', e);
          }
        }
      }
      break;
    }
    // You could also listen to payment_intent events if charging asynchronously
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.status(200).send();
});

export default router;
