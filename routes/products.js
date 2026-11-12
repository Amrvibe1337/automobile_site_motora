const express = require('express');
const { query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const router = express.Router();

router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.json(categories);
  } catch (error) { next(error); }
});

router.get('/', [
  query('q').optional({ checkFalsy: true }).isLength({ min: 2, max: 80 }).withMessage('Поисковый запрос должен содержать от 2 до 80 символов.')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const { q = '', category = 'all', sort = 'default', trackSearch = '0' } = req.query;
    const filter = { isActive: true };
    if (category && category !== 'all') filter.categorySlug = String(category);
    const term = String(q).trim().slice(0, 80);
    if (term) filter.$or = [
      { name: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      { engine: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
    ];

    let query = Product.find(filter).populate('category', 'name slug');
    if (sort === 'price_asc' || sort === 'asc') query = query.sort({ price: 1 });
    else if (sort === 'price_desc' || sort === 'desc') query = query.sort({ price: -1 });
    else query = query.sort({ categorySlug: 1, name: 1 });
    const products = await query.lean();

    if (term.length >= 2 && trackSearch === '1') {
      const history = req.session.searchHistory || [];
      req.session.searchHistory = [term, ...history.filter(x => x.toLowerCase() !== term.toLowerCase())].slice(0, 5);
    }
    res.json({ products, count: products.length });
  } catch (error) { next(error); }
});

router.post('/session/view/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).select('name slug');
    if (!product) return res.status(404).json({ message: 'Автомобиль не найден.' });
    const viewed = req.session.recentViewed || [];
    req.session.recentViewed = [
      { id: product._id.toString(), name: product.name, slug: product.slug, viewedAt: new Date() },
      ...viewed.filter(item => String(item.id) !== product._id.toString())
    ].slice(0, 10);
    res.json({ message: 'Просмотр сохранён в сессии.' });
  } catch (error) { next(error); }
});

module.exports = router;
