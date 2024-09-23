import express from "express";
import prisma from "../prismaClient.js";
import authMiddleware from "../middlewares/auth.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// 선수는 무조건 3명, 이하일 수 없음
// 추가 제거 api를 변경 api로 통합

// ** 팀 생성 api **
// post 요청으로 들어오면 팀 생성 api 실행
router.post("/teams", authMiddleware, async (req, res) => {
  try {
    // 선수 데이터와 팀 이름을 요청쪽으로 보낸거에서 데이터를 가져오고 추가로 인증된 유저의 아이디 정보를 가저옴
    const { playerIds, name } = req.body;
    const tokenUserId = req.user.userId;

    // 필드 유효성 검사
    if (!playerIds || playerIds.length !== 3) {
      return res.status(400).json({ error: "3명의 플레이어 ID가 필요합니다." });
    }

    // 사용자 존재 여부 확인
    // 토큰으로 인증된 유저를 데이터베이스에 정보가 있는지 확인 함, 없으면 오류 반환
    const userExists = await prisma.users.findUnique({
      where: { userId: parseInt(tokenUserId) },
    });

    if (!userExists) {
      return res.status(404).json({ error: "사용자가 존재하지 않습니다." });
    }

    // 플레이어 존재 여부 확인
    // 플레이어의 정보를 데이터베이스에서 확인하는데 없으면 오류 반환
    // 팀 배열 안에 각 팀의 함수를 호출해 비동기 작업으로 처리하고 그 결과 프로미스를 반환
    // 이 작업이 끝나야 다음 로직 진행
    const playersExist = await Promise.all(
      playerIds.map(async (playerId) => {
        const player = await prisma.players.findUnique({ where: { playerId } });
        return player !== null;
      })
    );

    if (playersExist.includes(false)) {
      return res.status(404).json({ error: "일부 플레이어가 존재하지 않습니다." });
    }

    // 새로운 팀 생성
    // 위에 과정을 다 거치면 새로운 팀을 생성, 요청쪽에 입력한 선수 데이터들을 팀 인터널즈에 추가
    const newTeam = await prisma.teams.create({
      data: {
        userId: parseInt(tokenUserId),
        name: name || null,
        TeamInternals: {
          create: playerIds.map((playerId) => ({ playerId })),
        },
      },
    });

    res.status(201).json({ message: "팀이 성공적으로 생성되었습니다.", teamId: newTeam.teamId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 오류" });
  }
});
// ** 팀 조회 api **
// 데이터 베이스에 정보를 확인하기 위해 get 사용
router.get("/teams", authMiddleware, async (req, res) => {
  try {
    // 모든 팀 아이디와 속해있는 사용자 아이디, 선수의 정보 가져오기
    const teams = await prisma.teams.findMany({
      select: {
        teamId: true,
        userId: true,
        name: true,
        TeamInternals: {
          select: {
            playerId: true,
          },
        },
      },
    });

    // 선수 정보를 추가
    // 각 팀에 선수 id로 선수 정보를 확인하고 팀 정보와 함께 반환
    const teamWithPlayers = await Promise.all(
      teams.map(async (team) => {
        const players = await prisma.players.findMany({
          where: {
            playerId: { in: team.TeamInternals.map((internal) => internal.playerId) },
          },
          select: {
            playerId: true,
            name: true,
          },
        });

        return {
          teamId: team.teamId,
          userId: team.userId,
          name: team.name,
          players,
        };
      })
    );
    // 반환 값 출력
    res.json(teamWithPlayers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// ** 팀 선수 변경 api **
// 정보만 수정 할 거기에 put 사용
// url로 팀 아이디를 가져올 꺼기에 파라미터로 팀 아이디를 가져오고
// 요청에서 팀에 기존 선수와 교체선수를 요청하여 수정
router.put("/teams/:teamId", authMiddleware, async (req, res) => {
  const { teamId } = req.params;
  const { playerId, newPlayerId } = req.body;
  // deleteMany로 기존 팀 선수 삭제
  try {
    await prisma.teamInternals.deleteMany({
      where: {
        playerId: playerId,
        teamId: parseInt(teamId, 10),
      },
    });
    // 삭제 후 create로 새로운 선수 데이터 추가
    await prisma.teamInternals.create({
      data: {
        teamId: parseInt(teamId, 10),
        playerId: newPlayerId,
      },
    });

    res.status(200).json({ message: "선수가 성공적으로 교체되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "선수 교체에 실패했습니다." });
  }
});

export default router;
