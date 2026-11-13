const express = require('express');
const { body, validationResult } = require('express-validator');
const Subscriber = require('../models/Subscriber');
const logAction = require('../utils/logAction');

const router = express.Router();
const DOCUMENT_VERSION = '2026-11-13';

router.post('/', [
  body('email').trim().isEmail().withMessage('Укажите корректный email.').normalizeEmail()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Проверьте email.', errors: errors.array().map(error => error.msg) });
    }
    if (req.body.terms !== true && req.body.terms !== 'true') {
      return res.status(400).json({ message: 'Необходимо подтвердить ознакомление с Политикой обработки персональных данных.' });
    }
    if (req.body.privacy !== true && req.body.privacy !== 'true') {
      return res.status(400).json({ message: 'Необходимо дать согласие на обработку персональных данных.' });
    }

    if (req.body.newsletterConsent !== true && req.body.newsletterConsent !== 'true') {
      return res.status(400).json({ message: 'Необходимо отдельно согласиться на получение новостей и специальных предложений по email.' });
    }

    // Гарантируем наличие уникального индекса до обработки конкурентных подписок.
    await Subscriber.init();

    const email = String(req.body.email).trim().toLowerCase();
    const existing = await Subscriber.findOne({ email }).select('_id status');
    if (existing) {
      return res.status(200).json({
        message: 'Этот email уже есть в списке рассылки. Повторная подписка не создана.'
      });
    }

    const now = new Date();
    let subscriber;
    try {
      subscriber = await Subscriber.create({
        email,
        user: req.user?._id || null,
        status: 'active',
        privacyPolicyVersion: DOCUMENT_VERSION,
        privacyPolicyAcknowledgedAt: now,
        personalDataConsentVersion: DOCUMENT_VERSION,
        personalDataConsentAt: now,
        newsletterConsentVersion: DOCUMENT_VERSION,
        newsletterConsentAt: now
      });
    } catch (error) {
      // Защита от двух одновременных запросов с одинаковым email.
      if (error.code === 11000) {
        return res.status(200).json({
          message: 'Этот email уже есть в списке рассылки. Повторная подписка не создана.'
        });
      }
      throw error;
    }

    await logAction(req, 'newsletter_subscribed', { subscriberId: subscriber._id, email });

    res.status(200).json({
      message: 'Вы успешно подписались на новости MOTORA.'
    });
  } catch (error) { next(error); }
});

module.exports = router;
