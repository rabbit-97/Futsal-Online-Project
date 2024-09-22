import express from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
  errorFormat: "pretty",
});

// 대기열은 점수 기반 자동 매치메이킹
// 서로 접속해있는 인원끼리만 매칭이 가능
// 상대방이 수락을 해야만 경기 진행

// 대기열 등록 API
router.post("/match", authMiddleware, async (req, res) => {
  const { userId } = req.body;
  const token = req.user.userId;

  try {
    // 요청한 userId와 인증된 userId가 일치하는지 확인
    if (userId !== token) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    // 요청한 사용자 존재 여부 확인
    const userExists = await prisma.users.findUnique({
      where: { userId: token },
    });

    if (!userExists) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 이미 대기열에 있는지 확인
    const existingRequest = await prisma.matchRequest.findFirst({
      where: { requesterUserId: userId, status: "대기중" },
    });

    if (existingRequest) {
      return res.status(400).json({ message: "이미 대기열에 있습니다." });
    }

    // 대기열에 새로 등록
    const newMatchRequest = await prisma.matchRequest.create({
      data: {
        requesterUser: {
          connect: { userId: userId },
        },
        status: "대기중",
      },
    });

    res.status(200).json({ message: "대기열에 등록되었습니다.", newMatchRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "대기열 등록 중 오류가 발생했습니다." });
  }
});

// 자동 매칭 API
router.post("/start", authMiddleware, async (req, res) => {
  const token = req.user.userId;

  try {
    // 현재 유저 상태 확인
    const currentUser = await prisma.matchRequest.findFirst({
      where: {
        requesterUserId: token,
        status: "대기중",
      },
      include: { requesterUser: true },
    });

    if (!currentUser) {
      return res.status(403).json({ message: "대기 중인 매칭 요청이 없습니다." });
    }

    // 대기 중인 다른 사용자들 중에서 점수 차이가 ±100 이하인 사용자 찾기
    const potentialMatches = await prisma.matchRequest.findMany({
      where: {
        status: "대기중",
        requesterUserId: { not: token },
        requesterUser: {
          score: {
            gte: currentUser.requesterUser.score - 100,
            lte: currentUser.requesterUser.score + 100,
          },
        },
      },
      include: { requesterUser: true },
    });

    if (potentialMatches.length === 0) {
      return res.status(200).json({ message: "적합한 매칭 상대가 없습니다." });
    }

    // 첫 번째 적합한 상대 선택
    const match = potentialMatches[0];

    // 매칭 상태 업데이트: 양측을 '게임 진행중'으로 변경
    await prisma.matchRequest.updateMany({
      where: {
        OR: [{ id: match.id }, { requesterUserId: currentUser.requesterUserId }],
      },
      data: {
        status: "게임 진행중",
        opponentUserId: match.requesterUserId,
      },
    });

    // 매칭 결과 응답
    res.status(200).json({
      message: "매칭이 성공적으로 성사되었습니다.",
      matches: [
        {
          user1: match.requesterUser,
          user2: currentUser.requesterUser,
        },
      ],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "매칭 시작 중 오류가 발생했습니다." });
  }
});
// 매칭 상태 API
router.get("/users/status", async (req, res) => {
  try {
    const userStatuses = await prisma.matchRequest.findMany({
      include: {
        requesterUser: {
          select: {
            userId: true,
            nickName: true,
            score: true,
          },
        },
        opponentUser: {
          select: {
            userId: true,
            nickName: true,
            score: true,
          },
        },
      },
    });

    if (userStatuses.length === 0) {
      return res.status(404).json({ message: "매칭 요청이 없습니다." });
    }

    res.status(200).json({ message: "유저 상태 조회 성공", userStatuses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "유저 상태 조회 중 오류가 발생했습니다." });
  }
});

// 모든 매칭 요청 삭제
router.delete("/users/status/delete", async (req, res) => {
  try {
    const deletedRequests = await prisma.matchRequest.deleteMany();
    res
      .status(200)
      .json({ message: "모든 매칭 요청이 삭제되었습니다.", count: deletedRequests.count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "매칭 요청 삭제 중 오류가 발생했습니다." });
  }
});
// 매칭 상태 API
router.get("/users/status", async (req, res) => {
  try {
    const userStatuses = await prisma.matchRequest.findMany({
      include: {
        requesterUser: {
          select: {
            userId: true,
            nickName: true,
            score: true,
          },
        },
        opponentUser: {
          select: {
            userId: true,
            nickName: true,
            score: true,
          },
        },
      },
    });

    if (userStatuses.length === 0) {
      return res.status(404).json({ message: "매칭 요청이 없습니다." });
    }

    res.status(200).json({ message: "유저 상태 조회 성공", userStatuses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "유저 상태 조회 중 오류가 발생했습니다." });
  }
});

// 모든 매칭 요청 삭제
router.delete("/users/status/delete", async (req, res) => {
  try {
    const deletedRequests = await prisma.matchRequest.deleteMany();
    res
      .status(200)
      .json({ message: "모든 매칭 요청이 삭제되었습니다.", count: deletedRequests.count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "매칭 요청 삭제 중 오류가 발생했습니다." });
  }
});

export default router;
