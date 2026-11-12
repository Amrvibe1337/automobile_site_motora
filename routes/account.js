const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const UserAction = require('../models/UserAction');
const Order = require('../models/Order');
const { requireAuth } = require('../middleware/auth');
const logAction = require('../utils/logAction');
const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const [feedback, actions, orders] = await Promise.all([
      Feedback.find({ user: req.user._id }).sort({ createdAt: -1 }).lean(),
      UserAction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30).lean(),
      Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean()
    ]);
    res.json({
      user: { id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone, role: req.user.role },
      feedback,
      actions,
      orders,
      recentViewed: req.session.recentViewed || [],
      searchHistory: (req.session.searchHistory || []).slice(0, 5),
      cart: (req.session.cart || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
    });
  } catch (error) { next(error); }
});

router.patch('/profile', [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Имя должно содержать от 2 до 60 символов.'),
  body('email').trim().isEmail().withMessage('Укажите корректный email.').normalizeEmail()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Проверьте данные профиля.', errors: errors.array().map(e => e.msg) });
    const exists = await User.findOne({ email: req.body.email, _id: { $ne: req.user._id } });
    if (exists) return res.status(409).json({ message: 'Этот email уже используется.' });
    const oldEmail = req.user.email;
    req.user.name = req.body.name;
    req.user.email = req.body.email;
    await req.user.save();
    await logAction(req, 'profile_update', { oldEmail, newEmail: req.user.email });
    res.json({ message: 'Профиль успешно обновлён.', user: { name: req.user.name, email: req.user.email } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Этот email уже используется.' });
    next(error);
  }
});

router.patch('/password', [
  body('currentPassword').notEmpty().withMessage('Введите текущий пароль.'),
  body('newPassword').isLength({ min: 8, max: 72 }).withMessage('Новый пароль должен содержать от 8 до 72 символов.')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Проверьте форму смены пароля.', errors: errors.array().map(e => e.msg) });
    const user = await User.findById(req.user._id).select('+passwordHash');
    const ok = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Старый пароль указан неверно.' });
    if (req.body.currentPassword === req.body.newPassword) return res.status(400).json({ message: 'Новый пароль должен отличаться от старого.' });
    user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await user.save();
    await logAction(req, 'password_changed');
    res.json({ message: 'Пароль успешно изменён.' });
  } catch (error) { next(error); }
});

module.exports = router;
