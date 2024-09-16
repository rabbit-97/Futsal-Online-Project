import jwt from 'jsonwebtoken';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '토큰이 제공되지 않았습니다.' });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodedToken;

    next();
  } catch (error) {
    console.error('토큰 검증 실패:', error);
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

export default authMiddleware;
