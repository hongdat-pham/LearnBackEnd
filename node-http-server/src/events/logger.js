import { EventEmitter } from "events";
import { appendFile, mkdir } from "fs/promises";

// Tạo class Logger kế thừa EventEmitter
class Logger extends EventEmitter {
  // Hàm helper: format timestamp đẹp
  timestamp() {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
    // → "2024-01-01 10:00:00"
  }

  // Hàm ghi vào file — dùng appendFile để không xóa log cũ
  async writeToFile(filename, content) {
    try {
      await appendFile(`logs/${filename}`, content + "\n");
    } catch {
      console.error(`Không ghi được file log: ${filename}`);
    }
  }
}

// Tạo một instance duy nhất — export để dùng chung toàn app
const logger = new Logger();

// ─── LISTENER 1: In ra console ───────────────────────────
logger.on("note:created", (data) => {
  console.log(`[${logger.timestamp()}] note:created`, data);
});

logger.on("note:deleted", (data) => {
  console.log(`[${logger.timestamp()}] note:deleted`, data);
});
logger.on("server:error", (data) => {
  console.log(`[${logger.timestamp()}] server:error`, data);
});

// ─── LISTENER 2: Ghi vào file events.log ─────────────────
logger.on("note:created", async (data) => {
  const line = `[${logger.timestamp()}] note:created ${JSON.stringify(data)}`;
  await logger.writeToFile("events.log", line);
});

logger.on("server:error", async (data) => {
  const line = `[${logger.timestamp()}] server:error ${JSON.stringify(data)}`;
  await logger.writeToFile("errors.log", line);
});

logger.on("note:deleted", async (data) => {
  const line = `[${logger.timestamp()}] note:deleted ${JSON.stringify(data)}`;
  await logger.writeToFile("events.log", line);
});

export default logger;
