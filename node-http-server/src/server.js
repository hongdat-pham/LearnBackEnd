import http from "http";
import { parseBody, sendJSON } from "./utils.js";
import { readData, writeData } from "./db.js";
import logger from "./events/logger.js";
import { createReadStream, createWriteStream, mkdirSync } from "fs";
import readline from "readline";

// Đảm bảo thư mục uploads/ tồn tại khi server khởi động
mkdirSync("./uploads", { recursive: true });

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  // ── GET / ────────────────────────────────────────────
  if (method === "GET" && url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hello World");

    // ── GET /health ──────────────────────────────────────
  } else if (method === "GET" && url === "/health") {
    sendJSON(res, 200, { status: "ok" });

    // ── GET /about ───────────────────────────────────────
  } else if (method === "GET" && url === "/about") {
    sendJSON(res, 200, {
      name: "Hong Dat",
      role: "Backend Dev",
      currentDate: new Date().toISOString().split("T")[0],
    });

    // ── POST /echo ───────────────────────────────────────
  } else if (method === "POST" && url === "/echo") {
    try {
      const data = await parseBody(req);
      sendJSON(res, 200, data);
    } catch {
      sendJSON(res, 400, { error: "Invalid JSON" });
    }

    // ── POST /users ──────────────────────────────────────
  } else if (method === "POST" && url === "/users") {
    try {
      const { name, email } = await parseBody(req);
      if (!name || !email) {
        return sendJSON(res, 400, { error: "name and email required" });
      }
      sendJSON(res, 201, { id: 1, name, email });
    } catch {
      sendJSON(res, 400, { error: "Invalid JSON" });
    }

    // ── POST /calculate ──────────────────────────────────
  } else if (method === "POST" && url === "/calculate") {
    try {
      const { a, b, operation } = await parseBody(req);
      if (a === undefined || b === undefined || !operation) {
        return sendJSON(res, 400, { error: "a, b and operation required" });
      }
      let result;
      switch (operation) {
        case "add":
          result = a + b;
          break;
        case "subtract":
          result = a - b;
          break;
        case "multiply":
          result = a * b;
          break;
        case "divide":
          if (b === 0)
            return sendJSON(res, 400, { error: "Cannot divide by zero" });
          result = a / b;
          break;
        default:
          return sendJSON(res, 400, { error: "Invalid operation" });
      }
      sendJSON(res, 200, { result });
    } catch {
      sendJSON(res, 400, { error: "Invalid JSON" });
    }

    // ── GET /notes/export/csv ────────────────────────────
    // ⚠️ Phải đặt TRƯỚC route /notes/export và DELETE /notes/:id
  } else if (method === "GET" && url === "/notes/export/csv") {
    const notes = await readData();
    res.writeHead(200, {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="notes.csv"',
    });
    res.write("id,title,content,createdAt\n");
    for (const note of notes) {
      const line = `${note.id},"${note.title}","${note.content}",${note.createdAt}\n`;
      res.write(line);
    }
    res.end();

    // ── GET /notes/export ────────────────────────────────
    // ⚠️ Phải đặt TRƯỚC DELETE /notes/:id
  } else if (method === "GET" && url === "/notes/export") {
    const fileStream = createReadStream("./data/notes.json");

    fileStream.on("error", () => {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No data file found" }));
    });

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="notes.json"',
    });
    fileStream.pipe(res);

    // ── GET /notes ───────────────────────────────────────
  } else if (method === "GET" && url === "/notes") {
    const notes = await readData();
    sendJSON(res, 200, notes);

    // ── POST /notes ──────────────────────────────────────
  } else if (method === "POST" && url === "/notes") {
    try {
      const { title, content } = await parseBody(req);
      if (!title || !content) {
        logger.emit("server:error", {
          message: "title and content are required",
          url,
        });
        return sendJSON(res, 400, { error: "title and content are required" });
      }

      const notes = await readData();

      // Tạo ID: lấy ID lớn nhất hiện tại rồi +1, nếu chưa có note nào thì bắt đầu từ 1
      const newId =
        notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;

      const newNote = {
        id: newId,
        title,
        content,
        createdAt: new Date().toISOString().split("T")[0],
      };

      notes.push(newNote);
      await writeData(notes);
      logger.emit("note:created", newNote);

      sendJSON(res, 201, newNote);
    } catch (err) {
      logger.emit("server:error", { message: err.message, url });
      sendJSON(res, 400, { error: "Invalid JSON" });
    }

    // ── DELETE /notes/:id ────────────────────────────────
  } else if (method === "DELETE" && url.startsWith("/notes/")) {
    const id = parseInt(url.split("/")[2]);

    if (isNaN(id)) {
      return sendJSON(res, 400, { error: "Invalid ID" });
    }

    const notes = await readData();
    const index = notes.findIndex((n) => n.id === id);

    if (index === -1) {
      return sendJSON(res, 404, { error: "Note not found" });
    }

    const deletedNote = notes[index];
    notes.splice(index, 1);
    await writeData(notes);
    logger.emit("note:deleted", {
      id: deletedNote.id,
      title: deletedNote.title,
    });

    sendJSON(res, 200, { message: "deleted" });

    // ── POST /upload ─────────────────────────────────────
  } else if (method === "POST" && url === "/upload") {
    const filename = req.headers["x-filename"] || `upload_${Date.now()}.bin`;
    const savePath = `./uploads/${filename}`;

    const fileWriteStream = createWriteStream(savePath);

    // Pipe request body thẳng vào file — không đọc vào RAM!
    req.pipe(fileWriteStream);

    fileWriteStream.on("finish", () => {
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Uploaded", filename }));
    });

    fileWriteStream.on("error", () => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Upload failed" }));
    });

    // ── GET /logs ─────────────────────────────────────────
  } else if (method === "GET" && url === "/logs") {
    const logPath = "./logs/events.log";
    const fileStream = createReadStream(logPath);

    // Xử lý lỗi — file chưa tồn tại (chưa có event nào)
    fileStream.on("error", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "No logs yet" }));
    });

    // Tạo readline interface — đọc stream từng dòng một
    const rl = readline.createInterface({ input: fileStream });

    res.writeHead(200, { "Content-Type": "text/plain" });

    let lineNumber = 0;
    rl.on("line", (line) => {
      lineNumber++;
      res.write(`${lineNumber}: ${line}\n`); // Ghi từng dòng kèm số thứ tự
    });

    rl.on("close", () => {
      res.end(); // Đóng response sau khi đọc hết file
    });

    // ── 404 ──────────────────────────────────────────────
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
