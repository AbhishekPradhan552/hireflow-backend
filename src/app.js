import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import jobRoutes from "./routes/job.routes.js";
import candidateRoutes from "./routes/candidate.routes.js";
import resumesRoutes from "./routes/resumes.routes.js";
import orgRoutes from "./routes/org.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import testBillingRoutes from "./routes/testBilling.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import debugRoutes from "./routes/debug.routes.js";
import publicRoutes from "./routes/public.routes.js";
import { redis } from "./queue/connection.js";
import uploadRoutes from "./routes/upload.routes.js";
import inviteRoutes from "./routes/invites.routes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      // localhost
      if (origin.includes("localhost")) {
        return callback(null, true);
      }

      // ngrok
      if (origin.includes("ngrok")) {
        return callback(null, true);
      }

      // vercel previews
      if (origin.includes("vercel.app")) {
        return callback(null, true);
      }

      // production frontend
      if (allowedOrigins.some((o) => origin.startsWith(o))) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

app.get("/health", async (_, res) => {
  try {
    await redis?.ping?.();

    return res.json({
      status: "ok",
      services: {
        redis: "connected",
      },
      uptime: process.uptime(),
    });
  } catch (err) {
    return res.json({
      status: "ok",
      services: {
        redis: "down",
      },
      uptime: process.uptime(),
    });
  }
});

app.use(authRoutes);
app.use(userRoutes);
app.use(jobRoutes);
app.use(candidateRoutes);
app.use(resumesRoutes);
app.use("/org", orgRoutes);
app.use("/billing", billingRoutes);
app.use("/test", testBillingRoutes);
app.use("/webhooks", webhookRoutes);
app.use(debugRoutes);
app.use("/api", publicRoutes);
app.use("/uploads", uploadRoutes);
app.use(inviteRoutes);
export default app;
