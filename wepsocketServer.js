import { Server } from "socket.io";
import http from "http";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
let matchQueue = [];

// WebSocket 서버 초기화 함수
export function initWebSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("클라이언트가 연결되었습니다:", socket.id);

    socket.on("joinQueue", async (userId) => {
      matchQueue.push({ userId, socketId: socket.id });
      console.log(`${userId}가 대기열에 추가되었습니다.`);
      await matchUsers();
    });

    socket.on("disconnect", () => {
      console.log("클라이언트가 연결 종료되었습니다:", socket.id);
      matchQueue = matchQueue.filter((user) => user.socketId !== socket.id);
    });
  });

  // 사용자 매칭 로직
  async function matchUsers() {
    if (matchQueue.length < 2) return;

    const user1 = matchQueue[0];
    const user2 = matchQueue[1];

    await prisma.matchRequest.create({
      data: {
        requesterUser: { connect: { userId: user1.userId } },
        opponentUser: { connect: { userId: user2.userId } },
        status: "게임 진행중",
      },
    });

    io.to(user1.socketId).emit("matchFound", { opponent: user2.userId });
    io.to(user2.socketId).emit("matchFound", { opponent: user1.userId });

    matchQueue.splice(0, 2);
  }

  return io; // io를 반환
}
