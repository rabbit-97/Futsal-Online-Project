import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// 회원가입 API
router.post("/signup", async (req, res) => {
  try {
    const { id, password } = req.body;

    // 필수 입력값 확인
    if (!id || !password) {
      return res.status(400).json({ error: "ID와 비밀번호를 모두 입력하세요." });
    }

    // 이미 사용자가 존재하는지 확인
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (existingUser) {
      return res.status(400).json({ error: "이미 존재하는 사용자입니다." });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 새로운 사용자 생성
    const user = await prisma.user.create({
      data: {
        id,
        password: hashedPassword,
        cash: 10000,
        creatrdAt: new Date(),
        winCount: 0,
        looseCount: 0,
      },
    });

    res.status(201).json({ message: "회원가입 성공", user });
  } catch (error) {
    console.error("회원가입 API 오류:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 로그인 API
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 사용자 이름으로 사용자 검색
    const user = await prisma.user.findUnique({
      where: { id: username }, // 사용자 이름을 ID로 사용
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
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET, // .env 파일에서 JWT_SECRET 값 가져오기
      { expiresIn: "24h" } // 토큰 만료 시간 설정
    );

    res.status(200).json({ token }); // 토큰을 클라이언트에 반환
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 오류" });
  }
});

export default router;
