const express = require('express');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Feedback = require('../models/Feedback');
const UserAction = require('../models/UserAction');
const Order = require('../models/Order');
const CarRequest = require('../models/CarRequest');
const Subscriber = require('../models/Subscriber');
const { requireAdmin } = require('../middleware/auth');
const logAction = require('../utils/logAction');
const router = express.Router();
router.use(requireAdmin);

function isLocalProductImage(imagePath) {
  if (!imagePath) return true;
  if (!/^\/img\/cars\/[a-z0-9-]+\.(?:webp|svg|jpg|jpeg|png)$/i.test(imagePath)) return false;
  const carsDirectory = path.resolve(__dirname, '..', 'public', 'img', 'cars');
  const absolutePath = path.resolve(__dirname, '..', 'public', imagePath.slice(1));
  return absolutePath.startsWith(carsDirectory + path.sep) && fs.existsSync(absolutePath);
}


function makeSlug(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
}
function validate(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ message: 'Проверьте данные.', errors: errors.array().map(e => e.msg) });
  return true;
}

router.get('/stats', async (req, res, next) => {
  try {
    const [users, products, feedback, pendingFeedback, actions, requests, pendingRequests, subscribers] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: 'pending' }),
      UserAction.countDocuments(),
      CarRequest.countDocuments(),
      CarRequest.countDocuments({ status: 'pending' }),
      Subscriber.countDocuments({ status: 'active' })
    ]);
    res.json({ users, products, feedback, pendingFeedback, actions, requests, pendingRequests, subscribers });
  } catch (error) { next(error); }
});

router.get('/products', async (req, res, next) => {
  try {
    const allowed = ['name', 'price', 'createdAt', 'categorySlug'];
    const sortBy = allowed.includes(req.query.sort) ? req.query.sort : 'createdAt';
    const direction = req.query.direction === 'asc' ? 1 : -1;
    const products = await Product.find().populate('category', 'name slug').sort({ [sortBy]: direction }).lean();
    res.json(products);
  } catch (error) { next(error); }
});

router.post('/products', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Название должно содержать от 2 до 100 символов.'),
  body('price').isFloat({ min: 1 }).withMessage('Цена должна быть положительным числом.'),
  body('categorySlug').trim().notEmpty().withMessage('Выберите категорию.'),
  body('image').optional({ checkFalsy: true }).custom(isLocalProductImage).withMessage('Укажите существующий локальный файл из public/img/cars/ (например, /img/cars/aura-rs-v8.webp). Внешние URL запрещены.')
], async (req, res, next) => {
  try {
    if (validate(req, res)) return;
    const category = await Category.findOne({ slug: req.body.categorySlug });
    if (!category) return res.status(400).json({ message: 'Выбранная категория не найдена.' });
    const product = await Product.create({
      name: req.body.name, slug: makeSlug(req.body.name), category: category._id,
      categorySlug: category.slug, price: Number(req.body.price), engine: req.body.engine || '',
      power: req.body.power || '', acceleration: req.body.acceleration || '', image: req.body.image || '',
      description: req.body.description || ''
    });
    await logAction(req, 'admin_product_create', { productId: product._id, name: product.name });
    res.status(201).json({ message: 'Автомобиль добавлен.', product });
  } catch (error) { next(error); }
});

router.put('/products/:id', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Название должно содержать от 2 до 100 символов.'),
  body('price').isFloat({ min: 1 }).withMessage('Цена должна быть положительным числом.'),
  body('categorySlug').trim().notEmpty().withMessage('Выберите категорию.'),
  body('image').optional({ checkFalsy: true }).custom(isLocalProductImage).withMessage('Укажите существующий локальный файл из public/img/cars/ (например, /img/cars/aura-rs-v8.webp). Внешние URL запрещены.')
], async (req, res, next) => {
  try {
    if (validate(req, res)) return;
    const category = await Category.findOne({ slug: req.body.categorySlug });
    if (!category) return res.status(400).json({ message: 'Выбранная категория не найдена.' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Автомобиль не найден.' });
    Object.assign(product, {
      name: req.body.name, category: category._id, categorySlug: category.slug,
      price: Number(req.body.price), engine: req.body.engine || '', power: req.body.power || '',
      acceleration: req.body.acceleration || '', image: req.body.image || '', description: req.body.description || ''
    });
    await product.save();
    await logAction(req, 'admin_product_update', { productId: product._id, name: product.name });
    res.json({ message: 'Данные автомобиля обновлены.', product });
  } catch (error) { next(error); }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Автомобиль не найден.' });
    // В истории заказов сохраняем снимок позиции без ссылки на удалённый товар.
    await Order.updateMany(
      { 'items.product': product._id },
      { $set: { 'items.$[item].product': null } },
      { arrayFilters: [{ 'item.product': product._id }] }
    );
    await logAction(req, 'admin_product_delete', { productId: product._id, name: product.name });
    res.json({ message: 'Автомобиль удалён.' });
  } catch (error) { next(error); }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('name email phone role isActive createdAt').sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (error) { next(error); }
});

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: 'Нельзя заблокировать собственную учётную запись.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден.' });
    user.isActive = Boolean(req.body.isActive);
    await user.save();
    await logAction(req, 'admin_user_status', { targetUserId: user._id, isActive: user.isActive });
    res.json({ message: user.isActive ? 'Пользователь активирован.' : 'Пользователь заблокирован.' });
  } catch (error) { next(error); }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: 'Нельзя удалить собственную учётную запись.' });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден.' });
    await logAction(req, 'admin_user_delete', { targetUserId: user._id, email: user.email });
    // Каскадное удаление персональных данных и связанных записей пользователя.
    await Promise.all([
      Feedback.deleteMany({ user: user._id }),
      CarRequest.updateMany({ user: user._id }, { $set: { user: null } }),
      Subscriber.updateMany({ user: user._id }, { $set: { user: null } }),
      UserAction.deleteMany({ user: user._id }), Order.deleteMany({ user: user._id })
    ]);
    res.json({ message: 'Пользователь и связанные с ним записи удалены.' });
  } catch (error) { next(error); }
});

router.get('/feedback', async (req, res, next) => {
  try {
    const rows = await Feedback.find().populate('user', 'name email').sort({ createdAt: -1 }).lean();
    res.json(rows);
  } catch (error) { next(error); }
});

router.patch('/feedback/:id/status', async (req, res, next) => {
  try {
    const status = ['pending', 'approved', 'rejected'].includes(req.body.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ message: 'Неизвестный статус обращения.' });
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!feedback) return res.status(404).json({ message: 'Обращение не найдено.' });
    await logAction(req, 'admin_feedback_moderated', { feedbackId: feedback._id, status });
    res.json({ message: 'Статус обращения изменён.' });
  } catch (error) { next(error); }
});


router.get('/requests', async (req, res, next) => {
  try {
    const rows = await CarRequest.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json(rows);
  } catch (error) { next(error); }
});

router.patch('/requests/:id/status', async (req, res, next) => {
  try {
    const status = ['pending', 'approved', 'rejected'].includes(req.body.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ message: 'Неизвестный статус заявки.' });
    const carRequest = await CarRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!carRequest) return res.status(404).json({ message: 'Заявка не найдена.' });
    await logAction(req, 'admin_car_request_moderated', { requestId: carRequest._id, status });
    res.json({ message: 'Статус заявки изменён.' });
  } catch (error) { next(error); }
});

router.get('/subscribers', async (req, res, next) => {
  try {
    const rows = await Subscriber.find({ status: 'active' })
      .select('email createdAt user')
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(rows);
  } catch (error) { next(error); }
});

module.exports = router;
