import "module-alias/register";

import "dotenv/config";
import app from "./app.js";
import { setupQueueMonitor } from "./queue/monitor.js";

setupQueueMonitor(app);

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
