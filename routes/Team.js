import express from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middlewares/auth.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
  errorFormat: "pretty",
});
// 선수는 무조건 3명, 이하일 수 없음
// 추가 제거 api를 변경 api로 통합

// ** 팀 생성 api **
router.post("/teams", authMiddleware, async (req, res) => {
  try {
    const { playerIds, name } = req.body;
    const tokenUserId = req.user.userId;

    // 필드 유효성 검사
    if (!playerIds || playerIds.length !== 3) {
      return res.status(400).json({ error: "3명의 플레이어 ID가 필요합니다." });
    }

    // 사용자 존재 여부 확인
    const userExists = await prisma.users.findUnique({
      where: { userId: parseInt(tokenUserId) },
    });

    if (!userExists) {
      return res.status(404).json({ error: "사용자가 존재하지 않습니다." });
    }

    // 플레이어 존재 여부 확인
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
router.get("/teams", authMiddleware, async (req, res) => {
  try {
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

    res.json(teamWithPlayers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// ** 팀 선수 변경 api **
router.put("/teams/:teamId", authMiddleware, async (req, res) => {
  const { teamId } = req.params;
  const { playerId, newPlayerId } = req.body;

  try {
    await prisma.teamInternals.deleteMany({
      where: {
        playerId: playerId,
        teamId: parseInt(teamId, 10),
      },
    });

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
