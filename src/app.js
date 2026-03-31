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

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok" }));

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

export default app;
