// Client = API communication
// Engine = AI logic orchestration
// Later if you switch provider:
// You only modify engine.

import { requestEmbedding } from "./openrouter.client.js";

export async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) {
    return null;
  }

  return await requestEmbedding(text);
}
