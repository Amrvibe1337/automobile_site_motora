const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const rateLimitModule = require('express-rate-limit');
const rateLimit = rateLimitModule.rateLimit || rateLimitModule.default || rateLimitModule;
const User = require('../models/User');
const logAction = require('../utils/logAction');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Слишком много попыток входа. Повторите через 15 минут.' }
});

function validationFailed(req, res) {
  const result = validationResult(req);
  if (result.isEmpty()) return false;
  res.status(400).json({ message: 'Проверьте заполнение формы.', errors: result.array().map(e => e.msg) });
  return true;
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
}
function saveSession(req) {
  return new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
}

router.get('/me', (req, res) => {
  if (!req.user) return res.json({ authenticated: false });
  res.json({ authenticated: true, user: {
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role
  }});
});

router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 60 }).withMessage('Имя должно содержать от 3 до 60 символов.'),
  body('email').trim().isEmail().withMessage('Укажите корректный email.').normalizeEmail(),
  body('phone').trim().isLength({ min: 10, max: 18 }).matches(/^[+0-9() -]+$/).withMessage('Укажите корректный номер телефона.'),
  body('password').isLength({ min: 8, max: 72 }).withMessage('Пароль должен содержать не менее 8 символов.'),
  body('password_confirm').custom((value, { req }) => value === req.body.password).withMessage('Пароли не совпадают.')
], async (req, res, next) => {
  try {
    if (validationFailed(req, res)) return;
    if (!req.body.terms || !req.body.privacy) return res.status(400).json({ message: 'Необходимо подтвердить ознакомление с Политикой и дать отдельное согласие на обработку персональных данных.' });
    const exists = await User.findOne({ email: req.body.email });
    if (exists) return res.status(409).json({ message: 'Пользователь с таким email уже зарегистрирован.' });

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({
      name: req.body.username,
      email: req.body.email,
      phone: req.body.phone || '',
      passwordHash,
      privacyPolicyVersion: '2026-11-10',
      privacyPolicyAcknowledgedAt: new Date(),
      personalDataConsentVersion: '2026-11-10',
      personalDataConsentAt: new Date()
    });

    const guestCart = Array.isArray(req.session.cart) ? [...req.session.cart] : [];
    const guestViewed = Array.isArray(req.session.recentViewed) ? [...req.session.recentViewed] : [];
    const guestSearchHistory = Array.isArray(req.session.searchHistory) ? [...req.session.searchHistory].slice(0, 5) : [];
    await regenerateSession(req);
    req.session.userId = user._id.toString();
    req.session.recentViewed = guestViewed;
    req.session.searchHistory = guestSearchHistory;
    req.session.cart = guestCart;

    req.user = user;
    await logAction(req, 'register', { email: user.email });
    await saveSession(req);
    res.status(201).json({ message: 'Регистрация завершена. Добро пожаловать в MOTORA!' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Этот email уже используется.' });
    next(error);
  }
});

router.post('/login', loginLimiter, [
  body('email').trim().isEmail().withMessage('Укажите корректный email.').normalizeEmail(),
  body('password').isLength({ min: 1, max: 72 }).withMessage('Пароль должен содержать не более 72 символов.')
], async (req, res, next) => {
  try {
    if (validationFailed(req, res)) return;
    const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
    const valid = user && user.isActive && await bcrypt.compare(req.body.password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Неверный email или пароль.' });

    const guestCart = Array.isArray(req.session.cart) ? [...req.session.cart] : [];
    const recentViewed = Array.isArray(req.session.recentViewed) ? req.session.recentViewed : [];
    const searchHistory = Array.isArray(req.session.searchHistory) ? req.session.searchHistory.slice(0, 5) : [];
    await regenerateSession(req);
    req.session.userId = user._id.toString();
    req.session.recentViewed = recentViewed;
    req.session.searchHistory = searchHistory;
    req.session.cart = guestCart;
    req.session.cookie.maxAge = req.body.remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    req.user = user;
    await logAction(req, 'login', { email: user.email });
    await saveSession(req);
    res.json({ message: 'Вход выполнен.' });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await logAction(req, 'logout');
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie('motora.sid');
      res.json({ message: 'Вы вышли из аккаунта.' });
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
