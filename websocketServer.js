import { Server } from "socket.io";
import http from "http";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 대기열 배열 - 매칭을 위해 대기중인 사용자 정보를 저장하는 배열, 각 사용자는 사용자 아이디와 소켓 아이디를 포함시킴
let matchQueue = [];

// WebSocket 서버 초기화 함수
// 웹소켓 서버를 초기화 - app.js에도 있는 함수 HTTP 서버 인스턴스를 전달 받음
export function initWebSocketServer(server) {
  // io는 새로 생성된 웹소켓 서버의 인스턴스
  // CORS 설정을 통해 다른 도메인에서 요청을 허용함. 여기서는 모든 도메인(*) 애서의 요청을 허용
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // io.on("connection", ... )은 클라이언트가 웹 소켓 서버에 연결될 때 호출되는 이벤트 리스너
  // 연결된 클라이언트의 소켓 id를 콘솔에 로그한다.
  io.on("connection", (socket) => {
    console.log("클라이언트가 연결되었습니다:", socket.id);

    // 대기열 등록 처리
    // 클라이언트가 "matchQueue" - '라우트/매치.js 안에 대기열 저장하는 배열' 이벤트를 보낼때 실행 됨
    socket.on("matchQueue", async (userId) => {
      // 전달된 userId와 현재 소켓 id를 사용해 대기열에 추가
      matchQueue.push({ userId, socketId: socket.id });
      // 대기열에 추가된 후, matchUsers 함수를 호출해서 매칭을 시도
      console.log(`${userId}가 대기열에 추가되었습니다.`);
      await matchUsers();
    });

    // 클라이언트가 연결을 끊을 때 호출되는 이벤트 리스너.
    // 연결이 종료되면 클라이언트를 대기열에서 제외시킴
    socket.on("disconnect", () => {
      console.log("클라이언트가 연결 종료되었습니다:", socket.id);
      matchQueue = matchQueue.filter((user) => user.socketId !== socket.id);
    });
  });

  // 사용자 매칭 로직
  // 대기열에서 두명의 사용자를 매칭한다.
  // 대기열에 두명 이상의 사용자가 없으면 아무 작업도 하지 않고 함수를 종료
  async function matchUsers() {
    if (matchQueue.length < 2) return;

    // 매칭 생성 요청
    // 대기열의 첫 번째, 두번째 사용자를 선택
    const user1 = matchQueue[0];
    const user2 = matchQueue[1];
    // 프리즈마를 사용해 새로운 매칭 요청을 데이터베이스에 생성. 두 사용자 간의 매칭을 나타내기 위한 용도
    await prisma.matchRequest.create({
      data: {
        requesterUser: { connect: { userId: user1.userId } },
        opponentUser: { connect: { userId: user2.userId } },
        status: "게임 진행중",
      },
    });
    // 각 사용자에게 매칭이 완료되었다는 메시지를 전송
    io.to(user1.socketId).emit("matchFound", { opponent: user2.userId });
    io.to(user2.socketId).emit("matchFound", { opponent: user1.userId });
    // 매칭 후에는 대기열에서 매칭된 인원 제거
    matchQueue.splice(0, 2);
  }

  return io; // 초기화 된 io를 반환 - 다른 파일에서 io를 사용할 수 있음
}
