import express from "express";
import prisma from "../prismaClient.js";
import authMiddleware from "../middlewares/auth.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// 전체 유저를 조회한 다음 승리 순서대로 출력

// 유저 랭킹 조회 API
// 유저 전적 횟수를 데이터베이스에서 불러오는 방식으로 get 사용
router.get("/rankings", async (req, res) => {
  try {
    // findMany로 데이터베이스에 해당 내용의 모든 정보를 가져온 후 win 카운트가 많은 유저 순서대로 조회
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
    // 조회한 내용을 출력
    res.json(rankings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
export default router;
