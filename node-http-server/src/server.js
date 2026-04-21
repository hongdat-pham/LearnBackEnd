import http from "http";
import { parseBody } from "./utils.js";

const server = http.createServer(async (req, res) => {
  const { method, url } = req; // Destructure cho gọn

  // Route: GET /
  if (method === "GET" && url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hello World");

    // Route: GET /health
  } else if (method === "GET" && url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" })); // Object → JSON string

    // Tất cả route khác → 404
  } else if (method === "GET" && url === "/about") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        name: "Hong Dat",
        role: "Backend Dev",
        currentDate: new Date().toISOString().split("T")[0],
      }),
    );
  } else if (method === "POST" && url === "/echo") {
    try {
      const data = await parseBody(req); // Gom chunks + parse
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data)); // Trả lại nguyên xi
    } catch (err) {
      // parseBody reject → JSON lỗi
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
    // Route: POST /users — nhận { name, email }, validate rồi trả về
  } else if (method === "POST" && url === "/users") {
    try {
      const data = await parseBody(req);
      const { name, email } = data;

      // Validate — thiếu field nào thì báo lỗi ngay
      if (!name || !email) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "name and email required" }));
        return; // Dừng lại, không chạy tiếp
      }

      // Đủ data → trả về user
      res.writeHead(201, { "Content-Type": "application/json" }); // 201 = Created
      res.end(JSON.stringify({ id: 1, name, email }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  } else if (method === "POST" && url === "/calculate") {
    try {
      const data = await parseBody(req);
      const { a, b, operation } = data;

      // Validate — thiếu field nào thì báo lỗi ngay
      if (a === undefined || b === undefined || !operation) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "a, b and operation required" }));
        return; // Dừng lại, không chạy tiếp
      }

      // Đủ data → trả về user
      let result = 0;
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
          if (b === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Cannot divide by zero" }));
            return;
          }
          result = a / b; // Phải gán vào result
          break;

        default:
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid operation" }));
          return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
