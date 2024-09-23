import express from "express";
import prisma from "../prismaClient.js";
import authMiddleware from "../middlewares/auth.js";
import { io } from "../app.js";

const router = express.Router();

// 대기열은 점수 기반 자동 매치메이킹
// 서로 접속해있는 인원끼리만 매칭이 가능
// 상대방이 수락을 해야만 경기 진행

// // 대기열 등록 API
// 유저 데이터 확인
// router.post("/match", authMiddleware, async (req, res) => {
//   const { userId } = req.body;
//   const token = req.user.userId;

//   try {
//     // 요청한 userId와 인증된 userId가 일치하는지 확인
//     if (userId !== token) {
//       return res.status(403).json({ message: "권한이 없습니다." });
//     }

//     // 요청한 사용자 존재 여부 확인
//     const userExists = await prisma.users.findUnique({
//       where: { userId: token },
//     });

//     if (!userExists) {
//       return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
//     }

//     // 이미 대기열에 있는지 확인
//     const existingRequest = await prisma.matchRequest.findFirst({
//       where: { requesterUserId: userId, status: "대기중" },
//     });

//     if (existingRequest) {
//       return res.status(400).json({ message: "이미 대기열에 있습니다." });
//     }

//     // 대기열에 새로 등록
//     const newMatchRequest = await prisma.matchRequest.create({
//       data: {
//         requesterUser: {
//           connect: { userId: userId },
//         },
//         status: "대기중",
//       },
//     });

//     res.status(200).json({ message: "대기열에 등록되었습니다.", newMatchRequest });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "대기열 등록 중 오류가 발생했습니다." });
//   }
// });

// // 자동 매칭 API
// router.post("/start", authMiddleware, async (req, res) => {
//   const token = req.user.userId;

//   try {
//     // 현재 유저 상태 확인
//     const currentUser = await prisma.matchRequest.findFirst({
//       where: {
//         requesterUserId: token,
//         status: "대기중",
//       },
//       include: { requesterUser: true },
//     });

//     if (!currentUser) {
//       return res.status(403).json({ message: "대기 중인 매칭 요청이 없습니다." });
//     }

//     // 대기 중인 다른 사용자들 중에서 점수 차이가 ±100 이하인 사용자 찾기
//     const potentialMatches = await prisma.matchRequest.findMany({
//       where: {
//         status: "대기중",
//         requesterUserId: { not: token },
//         requesterUser: {
//           score: {
//             gte: currentUser.requesterUser.score - 100,
//             lte: currentUser.requesterUser.score + 100,
//           },
//         },
//       },
//       include: { requesterUser: true },
//     });

//     if (potentialMatches.length === 0) {
//       return res.status(200).json({ message: "적합한 매칭 상대가 없습니다." });
//     }

//     // 첫 번째 적합한 상대 선택
//     const match = potentialMatches[0];

//     // 매칭 상태 업데이트: 양측을 '게임 진행중'으로 변경
//     await prisma.matchRequest.updateMany({
//       where: {
//         OR: [{ id: match.id }, { requesterUserId: currentUser.requesterUserId }],
//       },
//       data: {
//         status: "게임 진행중",
//         opponentUserId: match.requesterUserId,
//       },
//     });

//     // 매칭 결과 응답
//     res.status(200).json({
//       message: "매칭이 성공적으로 성사되었습니다.",
//       matches: [
//         {
//           user1: match.requesterUser,
//           user2: currentUser.requesterUser,
//         },
//       ],
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "매칭 시작 중 오류가 발생했습니다." });
//   }
// });
// // 매칭 상태 API
// router.get("/users/status", async (req, res) => {
//   try {
//     const userStatuses = await prisma.matchRequest.findMany({
//       include: {
//         requesterUser: {
//           select: {
//             userId: true,
//             nickName: true,
//             score: true,
//           },
//         },
//         opponentUser: {
//           select: {
//             userId: true,
//             nickName: true,
//             score: true,
//           },
//         },
//       },
//     });

//     if (userStatuses.length === 0) {
//       return res.status(404).json({ message: "매칭 요청이 없습니다." });
//     }

//     res.status(200).json({ message: "유저 상태 조회 성공", userStatuses });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "유저 상태 조회 중 오류가 발생했습니다." });
//   }
// });

// // 모든 매칭 요청 삭제
// router.delete("/users/status/delete", async (req, res) => {
//   try {
//     const deletedRequests = await prisma.matchRequest.deleteMany();
//     res
//       .status(200)
//       .json({ message: "모든 매칭 요청이 삭제되었습니다.", count: deletedRequests.count });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "매칭 요청 삭제 중 오류가 발생했습니다." });
//   }
// });

// 대기열 배열: 사용자가 매칭을 요청할 때마다 추가되는 배열, 대기열에 등록되어있는 객체(유저)들이 저장
let matchQueue = [];
// 매칭 상태 저장: 현재 매칭 중인 사용자를 쌍으로 저장하는 객체, 키는 본인 아이디이고 값은 상대방 사용자 아이디
let pendingMatches = {};
// 게임 동의 상태 저장 : 각 사용자가 게임 시작에 동의를 했는지 여부를 저장하는 객체, 키는 사용자 아이디, 값은 불리언 값으로 동의 여부를 나타냄
let gameAgreements = {}; // 매칭 동의 상태 저장

// 대기열 등록 api - 웹소켓 사용
// 클라이언트에서 요청을 보내기에 post 사용, 엔드포인트 /match에서 사용자 id를 포함한 요청을 보냄
router.post("/match", (req, res) => {
  const { userId } = req.body;
  // 대기열에 추가 -  배열에 사용자 아이디를 추가
  matchQueue.push({ userId });
  console.log(`${userId}가 대기열에 추가되었습니다.`);

  // 자동으로 매칭을 시도하는 함수
  matchUsers();
  // 등록되면 메세지 호출 - 터미널에 나타남
  res.status(200).json({ message: `${userId}가 대기열에 등록되었습니다.` });
});

// 자동 매칭 로직
// 일단 매칭이 될때 서로 50점 차이로 설정 - 원하는 값으로 변경
const SCORE_THRESHOLD = 50; // 점수 차이가 50 이내일 때 매칭

//
function matchUsers() {
  // 대기열에 두 명 이상의 사용자가 있어야 매칭을 시도
  if (matchQueue.length < 2) return;

  const user1 = matchQueue[0];
  const user2 = matchQueue[1];

  // 점수 차이 확인
  if (Math.abs(user1.score - user2.score) <= SCORE_THRESHOLD) {
    // 점수 차이가 기준 이내이면 매칭 진행
    matchQueue.splice(0, 2); // 대기열에서 두 사용자 제거

    // 매칭 상태 저장
    pendingMatches[user1.userId] = user2.userId;
    pendingMatches[user2.userId] = user1.userId;

    // 게임 동의 초기화
    gameAgreements[user1.userId] = false;
    gameAgreements[user2.userId] = false;

    // 매칭 결과 전송
    console.log(`매칭 완료: ${user1.userId} <-> ${user2.userId}`);
  } else {
    // 점수 차이가 기준을 초과하면 user1을 대기열에 다시 추가
    console.log(
      `점수 차이가 너무 납니다: ${user1.userId} (${user1.score}) <-> ${user2.userId} (${user2.score})`
    );
    matchQueue.push(user1); // user1을 대기열에 다시 추가
  }
}
// 게임 동의 API
// 클라이언트에 요청을 보내야해서 post 사용
router.post("/agree", (req, res) => {
  const { userId } = req.body;
  // 상대방 아이디를 가져옴
  const opponentUserId = pendingMatches[userId];

  // 사용자가 동의하면 gameAgreements 객체에서 해당 사용자의 아이디 값을 true로 설정
  if (opponentUserId) {
    gameAgreements[userId] = true;

    // 두 사용자가 모두 동의했는지 확인
    if (gameAgreements[userId] && gameAgreements[opponentUserId]) {
      console.log(`게임 시작: ${userId} <-> ${opponentUserId}`);

      // 동의 상태 초기화, 대기열에서 없애버림
      delete pendingMatches[userId];
      delete pendingMatches[opponentUserId];
      delete gameAgreements[userId];
      delete gameAgreements[opponentUserId];

      return res.status(200).json({ message: "게임이 시작되었습니다!", opponent: opponentUserId });
    }

    // 상대방이 게임 시작 동의를 안하면 게임 시작 x
    return res
      .status(200)
      .json({ message: `${userId}가 게임에 동의했습니다. 상대방의 동의를 기다리는 중...` });
  } else {
    return res.status(404).json({ message: "매칭 요청이 없습니다." });
  }
});

export default router;
