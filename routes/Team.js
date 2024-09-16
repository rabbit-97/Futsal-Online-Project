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

// 나만의 팀 꾸리기 - 팀 생성 api
router.post("/teams", authMiddleware, async (req, res) => {
  try {
    const { teamInternalId, playerWaitingListId } = req.body;
    const userId = req.user.id;

    const team = await prisma.team.create({
      data: {
        teamInternalId,
        playerWaitingListId,
      },
    });

    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ error: "서버 오류" });
  }
});

// 나만의 팀 꾸리기 - 팀 조회 api
router.get("/teams/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id: Number(id) },
      include: {
        TeamInternal: true,
        PlayerWaitingList: true,
      },
    });

    if (!team) {
      return res.status(404).json({ error: "팀이 존재하지 않아요" });
    }

    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ error: "서버 오류" });
  }
});

// 나만의 팀 꾸리기 - 팀에 선수 추가 api
router.post("/teams/:teamId/players", authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { playerId } = req.body;
    const userId = req.user.id;

    // 현재 팀에 추가된 선수 수 확인
    const currentPlayerCount = await prisma.teamInternal.count({
      where: {
        teamId: Number(teamId),
      },
    });

    if (currentPlayerCount >= 3) {
      return res.status(400).json({ error: "선수는 최대 3명이 출전해야 합니다." });
    }

    // 대기 목록에서 선수를 찾기
    const playerInWaitingList = await prisma.playerWaitingList.findUnique({
      where: {
        playerId_userId: {
          playerId,
          userId,
        },
      },
    });

    if (!playerInWaitingList) {
      return res.status(404).json({ error: "선수가 대기 목록에 없습니다." });
    }

    // 팀 내부 데이터 추가
    const teamInternal = await prisma.teamInternal.create({
      data: {
        teamId: Number(teamId),
        playerId,
        userId,
      },
    });

    // 대기 목록에서 선수를 제거
    await prisma.playerWaitingList.delete({
      where: {
        playerId_userId: {
          playerId,
          userId,
        },
      },
    });

    res.status(201).json(teamInternal);
  } catch (error) {
    res.status(500).json({ error: "서버 오류" });
  }
});

// 나만의 팀 꾸리기 - 팀 선수 해제 api
router.delete("/teams/:teamId/players/:playerId", authMiddleware, async (req, res) => {
  try {
    const { teamId, playerId } = req.params;
    const userId = req.user.id;

    // 팀에서 선수 찾기
    const teamInternal = await prisma.teamInternal.findUnique({
      where: {
        teamId_playerId: {
          teamId: Number(teamId),
          playerId,
        },
      },
    });

    if (!teamInternal) {
      return res.status(404).json({ error: "선수가 팀에 없습니다." });
    }

    if (teamInternal.userId !== userId) {
      return res.status(404).json({ error: "이 팀에 접근할 권한이 없습니다." });
    }

    // 팀에서 선수 제거
    await prisma.teamInternal.delete({
      where: {
        id: teamInternal.id,
      },
    });

    // 대기 목록에 선수 추가
    await prisma.playerWaitingList.create({
      data: {
        userId,
        playerId,
      },
    });

    res.status(200).json({ message: "선수가 팀에서 해제되었습니다." });
  } catch (error) {
    res.status(500).json({ error: "서버 오류" });
  }
});

export default router;
