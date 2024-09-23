import express from "express";
import prisma from "../prismaClient.js";
import authMiddleware from "../middlewares/auth.js";
import { io } from "../app.js";

const router = express.Router();

// // 대기열은 점수 기반 자동 매치메이킹
// // 서로 접속해있는 인원끼리만 매칭이 가능
// // 상대방이 수락을 해야만 경기 진행

// '서진님' 게임 진행 로직 추가

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

// 유저 매칭을 시도하는 함수
function matchUsers() {
  // 대기열에 두 명 이상의 사용자가 있어야 매칭을 시도
  if (matchQueue.length < 2) return;

  const user1 = matchQueue[0];
  const user2 = matchQueue[1];

  matchQueue.splice(0, 2); // 대기열에서 두 사용자 제거

  // 매칭 상태 저장
  pendingMatches[user1.userId] = user2.userId;
  pendingMatches[user2.userId] = user1.userId;

  // 게임 동의 초기화
  gameAgreements[user1.userId] = false;
  gameAgreements[user2.userId] = false;

  // 매칭 결과 전송
  console.log(`매칭 완료: ${user1.userId} <-> ${user2.userId}`);
  io.to(user1.userId).emit("matchFound", { opponentId: user2.userId });
  io.to(user2.userId).emit("matchFound", { opponentId: user1.userId });
}

// 매칭 후 양측의 동의 여부를 확인하는 API
router.post("/agree", async (req, res) => {
  const { userId } = req.body;
  const opponentUserId = pendingMatches[userId];

  if (opponentUserId) {
    gameAgreements[userId] = true;

    // 양측 모두 동의했을 경우 게임 시작
    if (gameAgreements[userId] && gameAgreements[opponentUserId]) {
      console.log(`게임 시작: ${userId} <-> ${opponentUserId}`);

      const gameResult = await playGame(userId, opponentUserId);

      delete pendingMatches[userId];
      delete pendingMatches[opponentUserId];
      delete gameAgreements[userId];
      delete gameAgreements[opponentUserId];

      io.to(userId).emit("gameStarted", { result: gameResult });
      io.to(opponentUserId).emit("gameStarted", { result: gameResult });

      return res.status(200).json({
        message: "게임이 시작되었습니다!",
        result: gameResult,
      });
    }

    return res
      .status(200)
      .json({ message: `${userId}가 게임에 동의했습니다. 상대방의 동의를 기다리는 중...` });
  } else {
    return res.status(404).json({ message: "매칭 요청이 없습니다." });
  }
});

// 게임을 진행하는 함수
const playGame = async (userId, opponentUserId) => {
  // 유저의 팀 정보 가져오기
  const userTeam = await prisma.teams.findFirst({
    where: { userId },
    select: { teamId: true },
  });

  if (!userTeam) {
    throw new Error("유저가 소속된 팀이 없습니다.");
  }

  // 상대 팀과 내 팀의 플레이어 정보 가져오기
  const myTeam = await prisma.teamInternals.findMany({
    where: { teamId: userTeam.teamId },
    select: { playerId: true },
  });

  const opponentTeam = await prisma.teams.findFirst({
    where: { userId: opponentUserId },
    select: { teamId: true },
  });

  if (!opponentTeam) {
    throw new Error("상대방의 팀이 없습니다.");
  }

  const enemyTeam = await prisma.teamInternals.findMany({
    where: { teamId: opponentTeam.teamId },
    select: { playerId: true },
  });

  // 팀 능력치 계산 및 결과 도출
  const myTeamPlayerIds = myTeam.map(({ playerId }) => playerId);
  const myTeamPlayers = await prisma.players.findMany({
    where: { playerId: { in: myTeamPlayerIds } },
    select: {
      speed: true,
      goalDecisiveness: true,
      shootPower: true,
      defense: true,
      stamina: true,
    },
  });

  const enemyTeamPlayerIds = enemyTeam.map(({ playerId }) => playerId);
  const enemyPlayers = await prisma.players.findMany({
    where: { playerId: { in: enemyTeamPlayerIds } },
    select: {
      speed: true,
      goalDecisiveness: true,
      shootPower: true,
      defense: true,
      stamina: true,
    },
  });

  const myTeamTotalPower = myTeamPlayers.reduce((total, player) => {
    return (
      total +
      player.speed +
      player.goalDecisiveness +
      player.shootPower +
      player.defense +
      player.stamina
    );
  }, 0);

  const enemyTeamTotalPower = enemyPlayers.reduce((total, player) => {
    return (
      total +
      player.speed +
      player.goalDecisiveness +
      player.shootPower +
      player.defense +
      player.stamina
    );
  }, 0);

  const maxScore = myTeamTotalPower + enemyTeamTotalPower;
  const randomValue = Math.random() * maxScore;

  let result;
  let newMyScore;
  let newEnemyScore;

  // 유저 및 상대방의 점수 처리 로직
  const myScore = await prisma.users.findUnique({ where: { userId }, select: { score: true } });
  const enemyScore = await prisma.users.findUnique({
    where: { userId: opponentUserId },
    select: { score: true },
  });

  if (randomValue < myTeamTotalPower) {
    const aScore = Math.floor(Math.random() * 4) + 2;
    const bScore = Math.floor(Math.random() * Math.min(3, aScore));
    result = `내 팀의 승리: A ${aScore} - ${bScore} B`;

    newMyScore = myScore.score + 10;
    newEnemyScore = Math.max(enemyScore.score - 5, 0);
  } else if (randomValue > myTeamTotalPower) {
    const bScore = Math.floor(Math.random() * 4) + 2;
    const aScore = Math.floor(Math.random() * Math.min(3, bScore));
    result = `적 팀의 승리: B ${bScore} - ${aScore} A`;

    newMyScore = Math.max(myScore.score - 5, 0);
    newEnemyScore = enemyScore.score + 10;
  } else {
    const drawScore = Math.floor(Math.random() * 4) + 2;
    result = `무승부: A ${drawScore} - ${drawScore} B`;

    newMyScore = myScore.score + 3;
    newEnemyScore = enemyScore.score + 3;
  }

  // 최종 점수 업데이트
  await prisma.users.update({ where: { userId }, data: { score: newMyScore } });
  await prisma.users.update({ where: { userId: opponentUserId }, data: { score: newEnemyScore } });

  return { result, myScore: newMyScore, enemyScore: newEnemyScore };
};

export default router;
