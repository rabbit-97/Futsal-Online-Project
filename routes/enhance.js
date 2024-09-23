import express from "express";
import prisma from "../prismaClient.js";
import authMiddleware from "../middlewares/auth.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// 재화는 유저의 머니를 사용해 강화 진행
// 강화 성공시 카드의 스탯중 하나가 일정 수치만큼 올라감

// 강화 API
// 인증을 통해 유저 데이터 가져오기
// 플레이어 아이디 값을 요청해 정보 가져오기
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
    // 데이터 베이스 내에 유저 안에 머니 값에서 해당 코스트만큼 소모
    const enhancementCost = 100;

    if (user.money < enhancementCost) {
      return res.status(400).json({ error: "강화할 충분한 자금이 없습니다." });
    }
    // 일단 강화 성공 확률은 50퍼센트
    const successChance = Math.random() < 0.5;
    // 만약에 성공 했을 경우
    if (successChance) {
      // 성공 시 랜덤 능력치 강화
      // 스탯중 하나가 1~6 중 하나 스텟 증가
      const stats = ["speed", "goalDecisiveness", "shootPower", "defense", "stamina"];
      const statToEnhance = stats[Math.floor(Math.random() * stats.length)];
      const enhancementAmount = Math.floor(Math.random() * 5) + 1;
      // update로 플레이어 아이디 값에 올라간 능력치 추가
      // 강화 내용 변경시 여기 로직 변경
      const updatedPlayer = await prisma.players.update({
        where: { playerId: Number(playerId) },
        data: {
          [statToEnhance]: { increment: enhancementAmount },
        },
      });
      // 플레이어 아이디 값에 능력치가 올라 간 후 유저 강화비용 소모 - 머니 값 차감
      // 강화 재료 변경시 여기 로직 변경
      const updatedUser = await prisma.users.update({
        where: { userId: userId },
        data: {
          money: { decrement: enhancementCost },
        },
      });
      // 성공 로직을 모두 거치고 해당 데이터 데이터베이스에 입력, 응답
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
      // 그냥 데이터베이스에 저장되어 있는 값 응답
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
