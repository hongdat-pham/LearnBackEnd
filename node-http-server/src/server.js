import http from "http";
import { parseBody, sendJSON } from "./utils.js";
import { readData, writeData } from "./db.js";
import logger from "./events/logger.js"; // thêm dòng này

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
      await writeData(notes); // Lưu mảng đã cập nhật vào file
      logger.emit("note:created", newNote);

      sendJSON(res, 201, newNote);
    } catch (err) {
      logger.emit("server:error", { message: err.message, url });
      sendJSON(res, 400, { error: "Invalid JSON" });
    }

    // ── DELETE /notes/:id ────────────────────────────────
  } else if (method === "DELETE" && url.startsWith("/notes/")) {
    // Tách ID ra từ URL: "/notes/3" → ["", "notes", "3"] → lấy phần tử cuối
    const id = parseInt(url.split("/")[2]);

    if (isNaN(id)) {
      return sendJSON(res, 400, { error: "Invalid ID" });
    }

    const notes = await readData();
    const index = notes.findIndex((n) => n.id === id); // Tìm vị trí note trong mảng

    if (index === -1) {
      return sendJSON(res, 404, { error: "Note not found" });
    }
    const deletedNote = notes[index]; // lưu note lại trước khi xóa
    notes.splice(index, 1); // Xóa đúng 1 phần tử tại vị trí index
    await writeData(notes); // Lưu lại mảng sau khi xóa
    logger.emit("note:deleted", {
      id: deletedNote.id,
      title: deletedNote.title,
    }); // ← thêm

    sendJSON(res, 200, { message: "deleted" });

    // ── 404 fallback ─────────────────────────────────────
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
