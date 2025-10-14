# Stripe Payment Integration Guide 🏦

This guide provides comprehensive instructions for setting up and using Stripe payment integration in the Gathr marketplace platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Stripe Dashboard Configuration](#stripe-dashboard-configuration)
- [Webhook Setup](#webhook-setup)
- [Testing Webhooks](#testing-webhooks)
- [API Endpoints](#api-endpoints)
- [Frontend Integration](#frontend-integration)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## 🔍 Overview

The Gathr platform uses Stripe for secure payment processing with the following features:
- **Checkout Sessions**: Secure payment collection
- **Webhooks**: Real-time payment status updates
- **Refunds**: Merchant-initiated refunds
- **Multi-currency**: Supports INR (Indian Rupees)

## ⚙️ Prerequisites

- Node.js v18 or higher
- Stripe account (Test and Live modes)
- Backend server running on port 5000
- Frontend running on port 3000

## 🔧 Environment Setup

### Backend Environment Variables

Add these variables to your `backend/.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret

# Other required variables
CLERK_SECRET_KEY=your_clerk_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
FRONTEND_URL=http://localhost:3000
```

### Frontend Environment Variables

Add to your `frontend/.env.local` file:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

## 🎛️ Stripe Dashboard Configuration

### 1. Create Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create account or sign in
3. Complete account verification for live payments

### 2. Get API Keys

1. Navigate to **Developers > API Keys**
2. Copy your **Publishable Key** and **Secret Key**
3. Use **Test keys** for development, **Live keys** for production

### 3. Configure Webhook Endpoints

1. Go to **Developers > Webhooks**
2. Click **"Add endpoint"**
3. Set endpoint URL: `http://localhost:5000/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Webhook Signing Secret**

## 🔗 Webhook Setup

### Local Development with Stripe CLI

The easiest way to test webhooks locally is using the Stripe CLI:

#### 1. Install Stripe CLI

**Windows (PowerShell):**
```powershell
# Download and install from: https://github.com/stripe/stripe-cli/releases
# Or use winget:
winget install stripe.stripe-cli
```

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download from GitHub releases or use package manager
```

#### 2. Login to Stripe

```bash
stripe login
```

#### 3. Forward Webhooks to Local Server

**Start webhook forwarding (run this command):**
```bash
stripe listen --forward-to localhost:5000/stripe/webhook
```

**Important:** This command will:
- Display your webhook signing secret
- Forward all webhook events to your local server
- Show real-time webhook events in the terminal

**Copy the webhook signing secret** from the output and add it to your `.env` file:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### 4. Test Webhook Events

Trigger test events:
```bash
# Test successful payment
stripe trigger checkout.session.completed

# Test failed payment
stripe trigger payment_intent.payment_failed
```

### Production Webhook Setup

For production, configure webhooks in the Stripe Dashboard:

1. **Endpoint URL**: `https://yourdomain.com/stripe/webhook`
2. **Events**: Select the same events as development
3. **Signing Secret**: Copy and store securely

## 🚀 Testing Webhooks

### Manual Testing Commands

```bash
# Test checkout session completion
stripe trigger checkout.session.completed

# Test payment intent success
stripe trigger payment_intent.succeeded

# Test payment failure
stripe trigger payment_intent.payment_failed

# Listen to all events (for debugging)
stripe listen --forward-to localhost:5000/stripe/webhook --print-secret
```

### Webhook Event Monitoring

Monitor webhook events in real-time:
```bash
# View recent webhook events
stripe events list

# View specific event details
stripe events retrieve evt_...

# Resend failed webhooks
stripe events resend evt_...
```

## 📡 API Endpoints

### Payment Flow Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/stripe/create-order-from-cart` | Create order from cart items |
| `POST` | `/stripe/create-checkout-session` | Create Stripe checkout session |
| `POST` | `/stripe/payment-status` | Get payment status |
| `POST` | `/stripe/webhook` | Stripe webhook handler |
| `POST` | `/stripe/refund` | Process refunds |

### Request/Response Examples

#### Create Order from Cart
```bash
curl -X POST http://localhost:5000/stripe/create-order-from-cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "clerkId": "user_...",
    "addressId": "address_id"
  }'
```

#### Create Checkout Session
```bash
curl -X POST http://localhost:5000/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "orderId": "order_id",
    "clerkId": "user_..."
  }'
```

## 🎨 Frontend Integration

### StripeCheckout Component Usage

```jsx
import StripeCheckout from '@/components/StripeCheckout';

// In your cart/checkout page
<StripeCheckout 
  items={cartItems} 
  totalPrice={totalAmount} 
/>
```

### Payment Flow

1. **Cart**: User adds items to cart
2. **Checkout**: User clicks "Pay with Stripe"
3. **Order Creation**: Backend creates order from cart
4. **Session**: Stripe checkout session created
5. **Payment**: User completes payment on Stripe
6. **Webhook**: Payment status updated via webhook
7. **Success**: User redirected to success page

## 🔒 Security Considerations

### Webhook Security

1. **Always verify webhook signatures**:
   ```javascript
   const event = stripe.webhooks.constructEvent(
     payload,
     signature,
     process.env.STRIPE_WEBHOOK_SECRET
   );
   ```

2. **Use HTTPS in production**
3. **Validate webhook events** before processing
4. **Idempotency**: Handle duplicate webhook events

### API Security

1. **Authentication**: All endpoints require Clerk authentication
2. **Authorization**: Role-based access control
3. **Input validation**: Validate all request data
4. **Error handling**: Don't expose sensitive information

## 🛠️ Troubleshooting

### Common Issues

#### 1. Webhook Signature Verification Failed

**Error**: `Webhook signature verification failed`

**Solutions**:
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Ensure webhook endpoint receives raw body
- Check if webhook URL is accessible

```bash
# Test webhook endpoint
curl -X POST http://localhost:5000/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

#### 2. Checkout Session Creation Fails

**Error**: `Failed to create checkout session`

**Solutions**:
- Verify Stripe API keys are correct
- Check order exists and has items
- Ensure user has proper permissions

#### 3. Payment Status Not Updating

**Error**: Order status remains "pending"

**Solutions**:
- Check webhook events are being received
- Verify database connection
- Check order ID matches in webhook

### Debug Commands

```bash
# Check webhook events
stripe events list --limit 10

# Test specific webhook
stripe events resend evt_...

# View logs
stripe logs tail

# Check account balance
stripe balance retrieve
```

### Database Issues

```bash
# Check order status
# Query your database for order payment_status

# Check webhook logs
# Look at your application logs for webhook processing
```

## 📊 Monitoring & Analytics

### Stripe Dashboard

Monitor payments in the Stripe Dashboard:
- **Payments**: View successful/failed payments
- **Webhooks**: Monitor webhook delivery status
- **Logs**: View API request logs
- **Analytics**: Payment trends and insights

### Application Logs

Monitor your application logs for:
- Webhook processing
- Payment status updates
- Error messages
- Performance metrics

## 🔄 Development Workflow

### 1. Start Development Environment

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start webhook forwarding
stripe listen --forward-to localhost:5000/stripe/webhook

# Terminal 3: Start frontend
cd frontend
npm run dev
```

### 2. Test Payment Flow

1. Add items to cart
2. Proceed to checkout
3. Complete test payment
4. Verify webhook processing
5. Check order status update

### 3. Production Deployment

1. Update environment variables for production
2. Configure production webhook endpoints
3. Test with live Stripe keys (small amounts)
4. Monitor webhook delivery
5. Set up error alerting

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Webhook Testing Guide](https://stripe.com/docs/webhooks/test)
- [Security Best Practices](https://stripe.com/docs/security)

## 🆘 Support

For issues related to:
- **Stripe Integration**: Check Stripe documentation and support
- **Application Logic**: Review code in `backend/stripeIntegration.js`
- **Frontend Issues**: Check `frontend/src/components/StripeCheckout.jsx`
- **Webhook Problems**: Use Stripe CLI and dashboard monitoring

---

**Last Updated**: December 2024  
**Stripe API Version**: 2023-10-16  
**Maintainer**: Ankit Kumar
