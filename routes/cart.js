const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { requireAuth } = require('../middleware/auth');
const logAction = require('../utils/logAction');

const router = express.Router();
const MAX_QUANTITY_PER_PRODUCT = 10;

function readCart(req) {
  const raw = Array.isArray(req.session.cart) ? req.session.cart : [];
  const grouped = new Map();
  for (const row of raw) {
    const productId = String(row?.productId || row?.product || '');
    const quantity = Math.max(1, Math.min(MAX_QUANTITY_PER_PRODUCT, Number.parseInt(row?.quantity, 10) || 1));
    if (!mongoose.isValidObjectId(productId)) continue;
    grouped.set(productId, Math.min(MAX_QUANTITY_PER_PRODUCT, (grouped.get(productId) || 0) + quantity));
  }
  return [...grouped.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

async function buildCart(req) {
  const rows = readCart(req);
  if (!rows.length) {
    req.session.cart = [];
    return { items: [], total: 0, count: 0, authenticated: Boolean(req.user) };
  }

  const products = await Product.find({
    _id: { $in: rows.map(row => row.productId) },
    isActive: true
  }).select('name price image slug categorySlug').lean();
  const byId = new Map(products.map(product => [String(product._id), product]));
  const validRows = rows.filter(row => byId.has(row.productId));
  req.session.cart = validRows;

  const items = validRows.map(row => {
    const product = byId.get(row.productId);
    return {
      product,
      quantity: row.quantity,
      lineTotal: Number(product.price) * row.quantity
    };
  });
  return {
    items,
    total: items.reduce((sum, item) => sum + item.lineTotal, 0),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    authenticated: Boolean(req.user)
  };
}

router.get('/', async (req, res, next) => {
  try {
    res.json(await buildCart(req));
  } catch (error) { next(error); }
});

// Сначала объявляем checkout, чтобы маршрут не перехватился параметром :productId.
router.post('/checkout', requireAuth, [
  body('phone').trim().isLength({ min: 10, max: 18 }).matches(/^[+0-9() -]+$/)
    .withMessage('Укажите корректный контактный телефон.'),
  body('comment').optional({ checkFalsy: true }).trim().isLength({ max: 500 })
    .withMessage('Комментарий не должен превышать 500 символов.')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Проверьте данные заказа.', errors: errors.array().map(error => error.msg) });
    }

    const cart = readCart(req);
    if (!cart.length) return res.status(400).json({ message: 'Корзина пуста.' });

    const products = await Product.find({
      _id: { $in: cart.map(row => row.productId) },
      isActive: true
    }).select('name price').lean();
    const byId = new Map(products.map(product => [String(product._id), product]));
    if (products.length !== cart.length) {
      req.session.cart = cart.filter(row => byId.has(row.productId));
      return res.status(409).json({ message: 'Некоторые автомобили больше недоступны. Корзина обновлена, проверьте её ещё раз.' });
    }

    const items = cart.map(row => {
      const product = byId.get(row.productId);
      return {
        product: product._id,
        name: product.name,
        price: Number(product.price),
        quantity: row.quantity
      };
    });
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await Order.create({
      user: req.user._id,
      items,
      total,
      customer: {
        name: req.user.name,
        email: req.user.email,
        phone: req.body.phone,
        comment: req.body.comment || ''
      }
    });

    req.session.cart = [];
    await logAction(req, 'order_created', {
      orderId: order._id,
      total: order.total,
      itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0)
    });
    res.status(201).json({
      message: 'Заказ оформлен! Менеджер MOTORA свяжется с вами для подтверждения.',
      order: { id: order._id, orderNumber: order.orderNumber, createdAt: order.createdAt, total: order.total, status: order.status }
    });
  } catch (error) { next(error); }
});

router.post('/:productId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.productId)) return res.status(400).json({ message: 'Некорректный автомобиль.' });
    const product = await Product.findOne({ _id: req.params.productId, isActive: true }).select('_id name');
    if (!product) return res.status(404).json({ message: 'Автомобиль не найден или больше недоступен.' });

    const cart = readCart(req);
    const existing = cart.find(row => row.productId === String(product._id));
    if (existing && existing.quantity >= MAX_QUANTITY_PER_PRODUCT) {
      return res.status(400).json({ message: `В корзине уже максимально допустимое количество: ${MAX_QUANTITY_PER_PRODUCT}.` });
    }
    if (existing) existing.quantity += 1;
    else cart.push({ productId: String(product._id), quantity: 1 });
    req.session.cart = cart;

    res.json({
      message: `${product.name} добавлен${existing ? ' ещё раз' : ''} в корзину.`,
      count: cart.reduce((sum, row) => sum + row.quantity, 0),
      productId: String(product._id)
    });
  } catch (error) { next(error); }
});

router.patch('/:productId', [
  body('quantity').isInt({ min: 1, max: MAX_QUANTITY_PER_PRODUCT })
    .withMessage(`Количество должно быть от 1 до ${MAX_QUANTITY_PER_PRODUCT}.`)
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const cart = readCart(req);
    const row = cart.find(item => item.productId === String(req.params.productId));
    if (!row) return res.status(404).json({ message: 'Позиция не найдена в корзине.' });
    row.quantity = Number(req.body.quantity);
    req.session.cart = cart;
    res.json(await buildCart(req));
  } catch (error) { next(error); }
});

router.delete('/:productId', async (req, res, next) => {
  try {
    req.session.cart = readCart(req).filter(row => row.productId !== String(req.params.productId));
    res.json(await buildCart(req));
  } catch (error) { next(error); }
});

router.delete('/', async (req, res, next) => {
  try {
    req.session.cart = [];
    res.json(await buildCart(req));
  } catch (error) { next(error); }
});

module.exports = router;
