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

// 유저 랭킹 조회 API
router.get("/ranking", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: [
        {
          winCount: "desc",
        },
        {
          looseCount: "asc",
        },
      ],
      select: {
        id: true,
        winCount: true,
        looseCount: true,
      },
    });

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 오류" });
  }
});

export default router;
