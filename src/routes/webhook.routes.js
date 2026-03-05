import express from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";

const router = express.Router();
//razorpay webhook must use raw body for signature verification

router.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["x-razorpay-signature"];
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

      //verify razporpay signature (critical  security)
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

      if (signature !== expectedSignature) {
        return res.status(400).json({ error: "invalid webhook signature" });
      }

      //parse webhook payload after verification
      const eventData = JSON.parse(req.body.toString());
      const eventType = eventData.event;

      //Common observability fields
      const baseUpdate = {
        lastWebhookEvent: eventType,
        lastWebhookAt: new Date(),
      };
      //handle event using switch-case

      switch (eventType) {
        //subscription activated("first-succesful payment")
        case "subscription.activated": {
          const subId = eventData.payload.subscription.entity.id;

          const currentEnd = new Date(
            eventData.payload.subscription.entity.current_end * 1000,
          );
          await prisma.organizationSubscription.update({
            where: { providerSubscriptionId: subId },
            data: {
              status: "ACTIVE",
              currentPeriodEnd: currentEnd,
              ...baseUpdate,
            },
          });
          break;
        }
        //subcription renewal charged successfully
        case "subscription.charged": {
          const subId = eventData.payload.subscripton.entity.id;
          const currentEnd = new Date(
            eventData.payload.subscripton.entity.current_end * 1000,
          );

          await prisma.organizationSubscription.update({
            where: { providerSubscriptionId: subId },
            data: {
              status: "ACTIVE",
              currentPeriodEnd: currentEnd,
              ...baseUpdate,
            },
          });
          break;
        }
        //subscription cancelled or halted
        case "subscription.cancelled":
        case "subscription.halted": {
          const subId = eventData.payload.subscription.entity.id;

          await prisma.organizationSubscription.update({
            where: { providerSubscriptionId: subId },
            data: {
              status: "CANCELED",
              plan: "FREE",
              providerSubscriptionId: null,
              currentPeriodEnd: null,
              ...baseUpdate,
            },
          });
          break;
        }

        //payment failed -> mark past due
        case "payment.failed": {
          const subId = eventData.payload.payment.entity.subscription_id;

          if (subId) {
            await prisma.organizationSubscription.update({
              where: { providerSubscriptionId: subId },
              data: {
                status: "PAST_DUE",
                ...baseUpdate,
              },
            });
          }
          break;
        }

        //ignore unrelated event safely
        default:
          console.log("Unhandeled Razorpay event:", eventType);
          break;
      }
      //always return 200 otherwise razorpay retries webhook repeatedly
      return res.json({ received: true });
    } catch (err) {
      console.error("Webhook processing error:", err);
      return res.status(500).json({ error: "Webhook failed" });
    }
  },
);

export default router;
