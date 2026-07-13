const { verifyToken } = require('../utils/jwt');
const { prisma } = require('../utils/prisma');

async function getActiveUserFromToken(token) {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const userId = decoded.id || decoded.userId;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, status: true },
  });
  if (!user || user.status !== 'ACTIVE') return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const user = await getActiveUserFromToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}

async function softAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const user = await getActiveUserFromToken(token);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
}

function requireRole(...roles) {
  const allowedRoles = roles.flat().filter(Boolean);
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authMiddleware, softAuthMiddleware, requireRole };
