import express, { Router } from 'express';
import Stripe from 'stripe';
import { db } from '../config/firestore';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import crypto from 'crypto';

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

    // Create a new Stripe Customer if they don't have one (for future actual stripe usage)
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.collection('users').doc(userId).update({ stripeCustomerId: customerId });
    }

    // Generate a unique session ID
    const sessionId = crypto.randomBytes(16).toString('hex');

    // Store the session in Firestore
    await db.collection('paymentSessions').doc(sessionId).set({
      userId,
      createdAt: new Date().toISOString(),
      status: 'pending',
    });

    // Return the URL to the web app for the mock payment flow
    const websiteUrl = process.env.WEBSITE_URL || 'http://localhost:3000';
    const sessionUrl = `${websiteUrl}/add-payment?session_id=${sessionId}`;

    return res.status(200).json({ url: sessionUrl });
  } catch (err: any) {
    console.error('Error creating Stripe setup session:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Mock Save Payment Handler (called by the website)
router.post('/mock-save-payment', async (req: express.Request, res: any) => {
  try {
    const { sessionId, paymentMethod } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session ID' });
    }

    const sessionRef = db.collection('paymentSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data()!;
    if (sessionData.status !== 'pending') {
      return res.status(400).json({ error: 'Session is no longer valid' });
    }

    const userId = sessionData.userId;

    // Update user to mark that they have a payment method
    await db.collection('users').doc(userId).update({
      hasPaymentMethod: true,
      // We could store masked card info or payment method here if we wanted to
      mockPaymentMethod: paymentMethod || 'credit_card'
    });

    // Mark session as completed
    await sessionRef.update({ status: 'completed' });

    console.log(`Mock payment method saved successfully for user ${userId}`);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error in mock-save-payment:', err);
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

