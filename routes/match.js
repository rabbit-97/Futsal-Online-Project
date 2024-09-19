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

// 게임 매치 api
router.get("/match/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const match = await getMatch(userId);

    if (match) {
      res.status(200).json({ message: "매칭 성공", match });
    } else {
      res.status(200).json({ message: "매칭 중, 대기열에 추가됨" });
    }
  } catch (error) {
    res.status(500).json({ message: "매칭 실패", error: error.message });
  }
});

const getMatch = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { winCount: true, looseCount: true },
  });

  const userScore = user.winCount - user.looseCount;

  const match = await prisma.matchQueue.findFirst({
    where: {
      userId: { not: userId },
      score: {
        gte: userScore - 100,
        lte: userScore + 100,
      },
    },
    orderBy: { queuedAt: "asc" },
  });

  if (match) {
    await prisma.matchQueue.delete({
      where: { userId: match.userId },
    });
    return match;
  }

  return null;
};

export default router;
