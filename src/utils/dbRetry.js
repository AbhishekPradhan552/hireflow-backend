export async function dbRetry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (err) {
    // detect DB connection errors (optional but good)
    const isDbError =
      err.message?.includes("Can't reach database") ||
      err.message?.includes("ECONNRESET") ||
      err.message?.includes("timeout");

    if (retries > 0 && isDbError) {
      console.log(`🔁 Retrying DB... (${3 - retries + 1})`);
      await new Promise((res) => setTimeout(res, delay));
      return dbRetry(fn, retries - 1, delay);
    }

    throw err; // if not DB error OR retries finished
  }
}
