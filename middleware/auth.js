const User = require('../models/User');

async function attachUser(req, res, next) {
  try {
    if (!req.session?.userId) return next();
    const user = await User.findById(req.session.userId);
    if (!user || !user.isActive) {
      req.session.destroy(() => {});
      return next();
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Для выполнения действия войдите в аккаунт.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Требуется авторизация.' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Доступ разрешён только администратору.' });
  next();
}

module.exports = { attachUser, requireAuth, requireAdmin };
