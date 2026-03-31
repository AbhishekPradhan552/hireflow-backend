import "module-alias/register";
import "dotenv/config";

import app from "./app.js";
import { setupQueueMonitor } from "./queue/monitor.js";
import prisma from "./lib/prisma.js";

setupQueueMonitor(app);

const PORT = 5001;

// 🔥 DB warmup function
async function warmupDB() {
  try {
    console.log("🔄 Warming up DB...");

    await prisma.$queryRaw`SELECT 1`;

    console.log("✅ DB is ready");
  } catch (err) {
    console.log("⚠️ DB warmup failed (will retry on request)");
  }
}

// 🚀 Start server properly
const startServer = async () => {
  await warmupDB(); // 👈 important

  app.listen(PORT, () => {
    console.log(`🚀 Backend running at http://localhost:${PORT}`);
  });
};

startServer();
