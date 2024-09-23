import express from "express";
import http from "http";
import dotenv from "dotenv";
import teamRouter from "./routes/Team.js";
import playerRouter from "./routes/test player.js";
import loginRouter from "./routes/test login.js";
import rankRouter from "./routes/rank.js";
import matchRouter from "./routes/match.js";
import enhanceRouter from "./routes/enhance.js";
import { initWebSocketServer } from "./websocketServer.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// express 기반으로 HTTP 서버를 생성, 이 서버는 웹소켓 서버로 사용될 수 있음.
const server = http.createServer(app);

// init웹소켓서버 함수를 호출해서 웹소켓 서버를 초기화, 이 함수에 HTTP 서버를 인자로 전달해서 웹소켓이 HTTP 서버를 통해 작동하도록 설정
// 반환된 io 객체는 웹소켓과 관련된 모든 기능을 처리
const io = initWebSocketServer(server);

app.use(express.json());

app.use("/api", [teamRouter, loginRouter, rankRouter, matchRouter, playerRouter, enhanceRouter]);

server.listen(PORT, () => {
  console.log(`${PORT} 포트로 서버가 열렸어요!!`);
});

export { io };
