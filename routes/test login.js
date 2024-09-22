import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

// 회원가입 API
router.post("/signup", async (req, res) => {
  try {
    const { nickName, id, password } = req.body;

    // 필드 유효성 검사
    if (!nickName || !id || !password) {
      return res.status(400).json({ error: "모든 필드를 입력해야 합니다." });
    }

    // 사용자 중복 확인
    const existingUser = await prisma.users.findUnique({
      where: { id },
    });

    if (existingUser) {
      return res.status(409).json({ error: "이미 존재하는 사용자입니다." });
    }

    // 비밀번호 해시 처리
    const hashedPassword = await bcrypt.hash(password, 10);

    // 새로운 사용자 생성
    const newUser = await prisma.users.create({
      data: {
        nickName,
        id,
        password: hashedPassword,
      },
    });

    return res.status(201).json({ message: "회원가입이 완료되었습니다.", userId: newUser.userId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "서버 오류" });
  }
});

// 로그인 API
router.post("/login", async (req, res) => {
  try {
    const { id, password } = req.body;

    // 사용자 이름으로 사용자 검색
    const user = await prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    // 비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "비밀번호가 잘못되었습니다." });
    }

    // JWT 토큰 발급
    const token = jwt.sign({ id: user.id, userId: user.userId }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    return res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "서버 오류" });
  }
});

export default router;
