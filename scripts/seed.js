require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Feedback = require('../models/Feedback');
const UserAction = require('../models/UserAction');
const Order = require('../models/Order');

const categories = [
  { name: 'Седаны', slug: 'sedans' },
  { name: 'Кроссоверы', slug: 'suvs' },
  { name: 'Купе', slug: 'coupes' },
  { name: 'Хэтчбеки', slug: 'hatch' },
  { name: 'Гибриды и электро', slug: 'electric' }
];

const cars = [
  ['Orion 1.6 Comfort', 'sedans', 1890000, 'Бензин 1.6', '123 л.с.', '10,9 с', '/img/cars/orion-1-6-comfort.webp'],
  ['Orion 2.0 Business', 'sedans', 2390000, 'Бензин 2.0', '150 л.с.', '9,1 с', '/img/cars/orion-2-0-business.webp'],
  ['Orion E Sport', 'sedans', 3450000, 'Электро', '306 л.с.', '5,8 с', '/img/cars/orion-e-sport.webp'],
  ['Terra X3', 'suvs', 2750000, 'Бензин 2.0', '170 л.с.', '9,8 с', '/img/cars/terra-x3.webp'],
  ['Terra X5', 'suvs', 3890000, 'Дизель 2.2', '200 л.с.', '8,2 с', '/img/cars/terra-x5.webp'],
  ['Terra X7 Hybrid', 'suvs', 5290000, 'Гибрид 2.5', '306 л.с.', '6,9 с', '/img/cars/terra-x7-hybrid.webp'],
  ['Aura GT 2.0', 'coupes', 3790000, 'Бензин 2.0 Turbo', '245 л.с.', '6,2 с', '/img/cars/aura-gt-2-0.webp'],
  ['Aura GT 3.0', 'coupes', 5290000, 'Бензин 3.0 Turbo', '340 л.с.', '4,9 с', '/img/cars/aura-gt-3-0.webp'],
  ['Aura RS V8', 'coupes', 7490000, 'Бензин 4.0 V8', '450 л.с.', '4,1 с', '/img/cars/aura-rs-v8.webp'],
  ['Vega City 1.4', 'hatch', 1290000, 'Бензин 1.4', '99 л.с.', '12,3 с', '/img/cars/vega-city-1-4.webp'],
  ['Vega Urban 1.6', 'hatch', 1590000, 'Бензин 1.6', '123 л.с.', '10,5 с', '/img/cars/vega-urban-1-6.webp'],
  ['Vega Sport 2.0', 'hatch', 2190000, 'Бензин 2.0 Turbo', '190 л.с.', '7,4 с', '/img/cars/vega-sport-2-0.webp'],
  ['Volt E1', 'electric', 2990000, 'Электро', '204 л.с.', '7,3 с', '/img/cars/volt-e1.webp'],
  ['Volt H2 Hybrid', 'electric', 4450000, 'Гибрид 2.5', '245 л.с.', '7,1 с', '/img/cars/volt-h2-hybrid.webp'],
  ['Volt E3 AWD', 'electric', 5990000, 'Электро', '408 л.с.', '4,7 с', '/img/cars/volt-e3-awd.webp']
];

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '');
}

(async () => {
  try {
    await connectDB();
    // Создаём все коллекции заранее, даже если часть из них пока пуста.
    for (const Model of [User, Category, Product, Feedback, UserAction, Order]) {
      const exists = await mongoose.connection.db.listCollections({ name: Model.collection.name }).hasNext();
      if (!exists) await Model.createCollection();
      await Model.createIndexes();
    }
    const categoryMap = {};
    for (const item of categories) {
      const category = await Category.findOneAndUpdate({ slug: item.slug }, item, { upsert: true, new: true, setDefaultsOnInsert: true });
      categoryMap[item.slug] = category;
    }

    for (const [name, categorySlug, price, engine, power, acceleration, image] of cars) {
      await Product.findOneAndUpdate(
        { name },
        {
          name,
          slug: slugify(name),
          category: categoryMap[categorySlug]._id,
          categorySlug,
          price,
          engine,
          power,
          acceleration,
          image: typeof image === 'string' ? image : '',
          description: `${name} — автомобиль из каталога MOTORA.`
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const adminEmail = String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    if (adminEmail && adminPassword) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await User.findOneAndUpdate(
        { email: adminEmail },
        { $set: { name: process.env.ADMIN_NAME || 'Администратор MOTORA', email: adminEmail, passwordHash, role: 'admin', isActive: true } },
        { upsert: true, new: true }
      );
      console.log(`Администратор создан/обновлён: ${adminEmail}`);
    } else {
      console.log('Администратор не создан: задайте ADMIN_EMAIL и ADMIN_PASSWORD в .env.');
    }

    console.log(`Готово: ${categories.length} категорий, ${cars.length} автомобилей.`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
