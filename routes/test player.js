import express from "express";
import prisma from "../prismaClient.js";
import authMiddleware from "../middlewares/auth.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// 선수 추가 API
router.post("/players", authMiddleware, async (req, res) => {
  try {
    const { name, speed, goalDecisiveness, shootPower, defense, stamina, tier } = req.body;

    // 입력된 필드들이 유효한지 확인
    if (!name || !speed || !goalDecisiveness || !shootPower || !defense || !stamina || !tier) {
      return res.status(400).json({ error: "모든 필드를 입력해야 합니다." });
    }

    // 새로운 플레이어 생성
    const newPlayer = await prisma.players.create({
      data: {
        name,
        speed,
        goalDecisiveness,
        shootPower,
        defense,
        stamina,
        tier,
      },
    });

    // 생성된 플레이어 정보 반환
    res.status(201).json(newPlayer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 선수 목록 api
router.get("/players", async (req, res) => {
  try {
    // 모든 선수 조회
    const players = await prisma.players.findMany({
      select: {
        playerId: true,
        name: true,
        speed: true,
        goalDecisiveness: true,
        shootPower: true,
        defense: true,
        stamina: true,
        tier: true,
        createdAt: true,
      },
    });

    if (!players || players.length === 0) {
      return res.status(404).json({ error: "선수 데이터가 없습니다." });
    }

    return res.status(200).json(players);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "서버 오류 발생" });
  }
});

export default router;
