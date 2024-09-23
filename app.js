import express from "express";
import http from "http";
import dotenv from "dotenv";
import teamRouter from "./routes/Team.js";
import playerRouter from "./routes/test player.js";
import loginRouter from "./routes/test login.js";
import rankRouter from "./routes/rank.js";
import matchRouter from "./routes/match.js";
import enhanceRouter from "./routes/enhance.js";
import { initWebSocketServer } from "./wepsocketServer.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = initWebSocketServer(server);

app.use(express.json());

app.use("/api", [teamRouter, loginRouter, rankRouter, matchRouter, playerRouter, enhanceRouter]);

server.listen(PORT, () => {
  console.log(`${PORT} 포트로 서버가 열렸어요!!`);
});
