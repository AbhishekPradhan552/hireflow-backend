// Import all workers so they auto-start

import "./resume.worker.js";
import "./jobRescore.worker.js";
import "./resumeEmbedding.worker.js";
import "./semanticMatch.worker.js";
import "./jobEmbedding.worker.js";

console.log("🚀 All workers started successfully...");
