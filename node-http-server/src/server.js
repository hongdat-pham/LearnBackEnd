import http from "http";

const server = http.createServer((req, res) => {
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
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
