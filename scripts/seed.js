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
  {
    name: 'Rolls-Royce Phantom',
    categorySlug: 'sedans',
    price: 22800000,
    engine: 'Бензин 6,7',
    power: '571 л.с.',
    acceleration: '5,2 с',
    image: '/img/cars/rolls.jpg',
    description: 'Rolls-Royce Phantom - эталон мировой роскоши с фирменной бесшумной плавностью хода, богатейшей отделкой ручной работы и звездным небом на потолке'
  },
  {
    name: 'Mercedes-Maybach S 680',
    categorySlug: 'sedans',
    price: 20000000,
    engine: 'Бензин 6.0',
    power: '612 л.с.',
    acceleration: '4,4 с',
    image: '/img/cars/maybach.jpg',
    description: 'Mercedes-Maybach S 680 4MATIC - вершина комфорта для пассажиров сзади: раздельные кресла с массажем, премиальная акустика и максимум пространства'
  },
  {
    name: 'Aurus Senat',
    categorySlug: 'sedans',
    price: 34500000,
    engine: 'Бензин 4.4',
    power: '598 л.с.',
    acceleration: '6 с',
    image: '/img/cars/aurus.jpg',
    description: 'Aurus Senat - российский представительский люксовый седан с классическим монументальным дизайном и мощным силовым агрегатом'
  },
  {
    name: 'BMW X6',
    categorySlug: 'suvs',
    price: 10500000,
    engine: 'Бензин 4.4',
    power: '407 л.с.',
    acceleration: '4,6 с',
    image: '/img/cars/bmw.jpg',
    description: 'BMW X6 — эталон динамики и управляемости с богатым выбором двигателей и современным цифровым салоном.'
  },
  {
    name: 'Mercedes-Benz GLE',
    categorySlug: 'suvs',
    price: 12000000,
    engine: 'Дизель 3.0',
    power: '435 л.с.',
    acceleration: '5 с',
    image: '/img/cars/mercgle.jpg',
    description: 'Mercedes-Benz GLE — машина с акцентом на максимальный комфорт, плавность хода и роскошные материалы отделки.'
  },
  {
    name: 'Porsche Cayenne',
    categorySlug: 'suvs',
    price: 11500000,
    engine: 'Бензин 3.0',
    power: '353 л.с.',
    acceleration: '6,2 с',
    image: '/img/cars/porshecayenne.jpg',
    description: 'Porsche Cayenne — спортивный характер на каждый день с отточенной управляемостью.'
  },
  {
    name: 'Bentley Continental GT',
    categorySlug: 'coupes',
    price: 16000000,
    engine: 'Бензин 4.0 Biturbo',
    power: '542 л.с.',
    acceleration: '4,0 с',
    image: '/img/cars/bentley.jpg',
    description: 'Bentley Continental GT — автомобиль класса гран-туризмо с мощными двигателями внутреннего сгорания и роскошной отделкой'
  },
  {
    name: 'Audi A5',
    categorySlug: 'coupes',
    price: 5290000,
    engine: 'Бензин 2.0',
    power: '260л.с.',
    acceleration: '6,0 с',
    image: '/img/cars/audia5.jpg',
    description: 'Audi A5 - стильные двухдверные автомобили с фирменной системой полного привода и современным цифровым кокпитом'
  },
  {
    name: 'BMW M4',
    categorySlug: 'coupes',
    price: 14000000,
    engine: 'Бензин 3.0',
    power: '510 л.с.',
    acceleration: '3,5 с',
    image: '/img/cars/bmwcoupe.jpg',
    description: 'BMW M4 Coupe - спортивно-ориентированные премиум-купе с острой управляемостью и передовой электроникой'
  },
  {
    name: 'MINI Cooper S',
    categorySlug: 'hatch',
    price: 4000000,
    engine: 'Бензин 2.0',
    power: '200 л.с.',
    acceleration: '6,8 с',
    image: '/img/cars/minicooper.jpg',
    description: 'MINI Cooper S - культовый британский премиум-хэтчбек в ретро-футуристичном стиле.'
  },
  {
    name: 'Mercedes-AMG A35 4MATIC',
    categorySlug: 'hatch',
    price: 4900000,
    engine: 'Бензин 2.0',
    power: '306 л.с.',
    acceleration: '4,7 с',
    image: '/img/cars/merc-a-class.jpg',
    description: 'Mercedes-Benz A-Класс (A-Class Hatchback) — воплощение элегантности и передовой цифровой среды (система MBUX с огромными сдвоенными экранами). Предлагает богатое оснащение, комфортную подвеску и премиальные варианты отделки интерьера с атмосферной подсветкой на 64 цвета.'
  },
  {
    name: 'Audi RS 3',
    categorySlug: 'hatch',
    price: 6240000,
    engine: 'Бензин 2.5',
    power: '400 л.с.',
    acceleration: '4,1 с',
    image: '/img/cars/audirs3.jpg',
    description: 'Audi RS 3 - эталонный представитель немецкого премиум-сегмента в компактном классе.'
  },
  {
    name: 'Zeekr 001',
    categorySlug: 'electric',
    price: 10000000,
    engine: 'Электро',
    power: '530 л.с.',
    acceleration: '3,0 с',
    image: '/img/cars/zeekr.jpg',
    description: 'Zeekr - суббренд Geely, предлагающий спортивную динамику, футуристичный дизайн, передовые батареи и богато отделанные материалы интерьера.'
  },
  {
    name: 'Tesla Model X',
    categorySlug: 'electric',
    price: 12000000,
    engine: 'Электрический',
    power: '670 л.с.',
    acceleration: '3,9 с',
    image: '/img/cars/teslaX.jpg',
    description: 'Tesla Model X - классика чистых электромобилей с передовым автопилотом, высокой динамикой и развитой экосистемой'
  },
  {
    name: 'Lixiang L9',
    categorySlug: 'electric',
    price: 9000000,
    engine: 'гибрид (REEV)',
    power: '451 л.с.',
    acceleration: '5,3 с',
    image: '/img/cars/lixiangL9.jpg',
    description: 'Крупный последовательный гибрид (REEV) с богатым оснащением салона, продвинутым экраном, пневмоподвеской и высоким уровнем комфорта'
  }
];

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '');
}

(async () => {
  try {
    await connectDB();

    // Создаём все коллекции заранее, даже если часть из них пока пуста.
    for (const Model of [User, Category, Product, Feedback, UserAction, Order]) {
      const exists = await mongoose.connection.db
        .listCollections({ name: Model.collection.name })
        .hasNext();

      if (!exists) await Model.createCollection();
      await Model.createIndexes();
    }

    const categoryMap = {};

    for (const item of categories) {
      const category = await Category.findOneAndUpdate(
        { slug: item.slug },
        item,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      categoryMap[item.slug] = category;
    }

    for (const car of cars) {
      const {
        name,
        categorySlug,
        price,
        engine,
        power,
        acceleration,
        image,
        description
      } = car;

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
          description: description || `${name} — автомобиль из каталога MOTORA.`,
          isActive: true
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
        {
          $set: {
            name: process.env.ADMIN_NAME || 'Администратор MOTORA',
            email: adminEmail,
            passwordHash,
            role: 'admin',
            isActive: true
          }
        },
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
