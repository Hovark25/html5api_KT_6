const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.get("/health", (_, res) => res.json({ ok: true }));

let sseClients = new Set();
let counter = 1;

app.get("/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  res.write("retry: 2000\n\n");

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

setInterval(() => {
  const payload = {
    id: counter++,
    title: "Новый пост",
    text: "Событие от SSE сервера",
    time: new Date().toISOString(),
  };
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) res.write(data);
}, 3000);

io.on("connection", (socket) => {
  socket.on("join", (name) => {
    socket.data.name = name || "anon";
    io.emit("sys", `${socket.data.name} подключился`);
  });

  socket.on("chat", (msg) => {
    const name = socket.data.name || "anon";
    io.emit("chat", { name, msg, time: new Date().toLocaleTimeString() });
  });

  socket.on("disconnect", () => {
    const name = socket.data.name || "anon";
    io.emit("sys", `${name} отключился`);
  });
});

const PORT = 3001;
server.listen(PORT, () => console.log("Server on http://localhost:" + PORT));