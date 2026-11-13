const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const CarRequest = require('../models/CarRequest');
const logAction = require('../utils/logAction');

const router = express.Router();
const DOCUMENT_VERSION = '2026-11-13';

router.post('/', [
  body('productId').isMongoId().withMessage('Не удалось определить выбранный автомобиль.'),
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Имя должно содержать от 2 до 60 символов.'),
  body('phone').trim().matches(/^\+?[0-9()\s.-]{7,25}$/).withMessage('Укажите корректный номер телефона.'),
  body('message').optional({ checkFalsy: true }).trim().isLength({ max: 1500 }).withMessage('Комментарий не должен превышать 1500 символов.')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Проверьте данные заявки.', errors: errors.array().map(error => error.msg) });
    }
    if (req.body.terms !== true && req.body.terms !== 'true') {
      return res.status(400).json({ message: 'Необходимо подтвердить ознакомление с Политикой обработки персональных данных.' });
    }
    if (req.body.privacy !== true && req.body.privacy !== 'true') {
      return res.status(400).json({ message: 'Необходимо дать согласие на обработку персональных данных.' });
    }

    const product = await Product.findOne({ _id: req.body.productId, isActive: true }).select('name price');
    if (!product) return res.status(404).json({ message: 'Выбранный автомобиль больше не доступен в каталоге.' });

    const now = new Date();
    const carRequest = await CarRequest.create({
      user: req.user?._id || null,
      product: product._id,
      productName: product.name,
      productPrice: product.price,
      name: req.body.name,
      phone: req.body.phone,
      message: req.body.message || '',
      status: 'pending',
      privacyPolicyVersion: DOCUMENT_VERSION,
      privacyPolicyAcknowledgedAt: now,
      personalDataConsentVersion: DOCUMENT_VERSION,
      personalDataConsentAt: now
    });

    await logAction(req, 'car_request_submitted', {
      requestId: carRequest._id,
      productId: product._id,
      productName: product.name
    });

    res.status(201).json({
      message: `Заявка на автомобиль «${product.name}» отправлена. Менеджер MOTORA свяжется с вами.`,
      requestId: carRequest._id
    });
  } catch (error) { next(error); }
});

module.exports = router;
