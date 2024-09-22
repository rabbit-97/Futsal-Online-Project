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

// 강화 API
router.post("/enhance", authMiddleware, async (req, res) => {
  const { playerId } = req.body;
  const userId = req.user.userId;

  try {
    // 플레이어 정보를 가져옴
    const player = await prisma.players.findUnique({
      where: { playerId: Number(playerId) },
    });

    if (!player) {
      return res.status(404).json({ error: "플레이어를 찾을 수 없습니다." });
    }

    // 유저 정보를 가져옴
    const user = await prisma.users.findUnique({
      where: { userId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    // 강화 비용 설정
    const enhancementCost = 100;

    if (user.money < enhancementCost) {
      return res.status(400).json({ error: "강화할 충분한 자금이 없습니다." });
    }

    const successChance = Math.random() < 0.5;

    if (successChance) {
      // 성공 시 랜덤 능력치 강화
      const stats = ["speed", "goalDecisiveness", "shootPower", "defense", "stamina"];
      const statToEnhance = stats[Math.floor(Math.random() * stats.length)];
      const enhancementAmount = Math.floor(Math.random() * 5) + 1;

      const updatedPlayer = await prisma.players.update({
        where: { playerId: Number(playerId) },
        data: {
          [statToEnhance]: { increment: enhancementAmount },
        },
      });

      const updatedUser = await prisma.users.update({
        where: { userId: userId },
        data: {
          money: { decrement: enhancementCost },
        },
      });

      res.status(200).json({
        message: `강화 성공! ${statToEnhance}가 ${enhancementAmount}만큼 증가했습니다.`,
        player: updatedPlayer,
        user: updatedUser,
      });
    } else {
      // 실패 시 비용만 차감 (능력치 변화 없음)
      await prisma.users.update({
        where: { userId: userId },
        data: {
          money: { decrement: enhancementCost },
        },
      });

      res.status(200).json({
        message: "강화 실패. 능력치 변화는 없습니다.",
        player: player,
        user: user,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "강화 도중 오류가 발생했습니다." });
  }
});

export default router;
