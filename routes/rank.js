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

// 전체 유저를 조회한 다음 승리 순서대로 출력

// 유저 랭킹 조회 API
router.get("/rankings", async (req, res) => {
  try {
    const rankings = await prisma.users.findMany({
      select: {
        userId: true,
        win: true,
        draw: true,
        lose: true,
      },
      orderBy: {
        win: "desc",
      },
    });

    res.json(rankings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
export default router;
