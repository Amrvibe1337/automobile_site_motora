const express = require('express');
const { body, validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');
const logAction = require('../utils/logAction');
const router = express.Router();

router.post('/', [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Имя должно содержать от 2 до 60 символов.'),
  body('email').trim().isEmail().withMessage('Укажите корректный email.').normalizeEmail(),
  body('subject').trim().isLength({ min: 2, max: 80 }).withMessage('Выберите тему обращения.'),
  body('message').trim().isLength({ min: 5, max: 3000 }).withMessage('Сообщение должно содержать от 5 до 3000 символов.')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Проверьте форму обратной связи.', errors: errors.array().map(e => e.msg) });
    if (!req.body.terms || !req.body.privacy) return res.status(400).json({ message: 'Необходимо подтвердить ознакомление с Политикой и дать отдельное согласие на обработку персональных данных.' });
    const feedback = await Feedback.create({
      user: req.user?._id || null,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone || '',
      subject: req.body.subject,
      message: req.body.message,
      model: req.body.model || '',
      privacyPolicyVersion: '2026-11-10',
      privacyPolicyAcknowledgedAt: new Date(),
      personalDataConsentVersion: '2026-11-10',
      personalDataConsentAt: new Date()
    });
    await logAction(req, 'feedback_submitted', { feedbackId: feedback._id, subject: feedback.subject });
    res.status(201).json({ message: 'Спасибо! Обращение сохранено, менеджер MOTORA свяжется с вами.' });
  } catch (error) { next(error); }
});

module.exports = router;
