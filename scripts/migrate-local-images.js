require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');

const IMAGE_BY_NAME = {
  'Rolls-Royce Phantom': 'img/cars/rolls.jpg',
  'Mercedes-Maybach S 680': 'img/cars/maybach.jpg',
  'Aurus Senat': 'img/cars/aurus.jpg',
  'BMW X6': 'img/cars/bmw.jpg',
  'Mercedes-Benz GLE': 'img/cars/mercgle.jpg',
  'Porsche Cayenne': 'img/cars/porshecayenne.jpg',
  'Bentley Continental GT': 'img/cars/bentley.jpg',
  'Audi A5': 'img/cars/audia5.jpg',
  'BMW M4': 'img/cars/bmwcoupe.jpg',
  'MINI Cooper S': 'img/cars/minicooper.jpg',
  'Mercedes-AMG A35 4MATIC': 'img/cars/merc-a-class.jpg',
  'Audi RS 3': 'img/cars/audirs3.jpg',
  'Zeekr 001': 'img/cars/zeekr.jpg',
  'Tesla Model X': 'img/cars/teslaX.jpg',
  'Lixiang L9': 'img/cars/lixiangL9.jpg'
};

function assertLocalAssetsExist() {
  for (const imagePath of Object.values(IMAGE_BY_NAME)) {
    const absolutePath = path.join(__dirname, '..', 'public', imagePath.replace(/^\//, ''));
    if (!fs.existsSync(absolutePath)) throw new Error(`Не найден локальный файл: ${absolutePath}`);
  }
}

(async () => {
  try {
    assertLocalAssetsExist();
    await connectDB();

    let matched = 0;
    let modified = 0;
    const missing = [];

    for (const [name, image] of Object.entries(IMAGE_BY_NAME)) {
      const result = await Product.updateOne({ name }, { $set: { image } });
      matched += result.matchedCount;
      modified += result.modifiedCount;
      if (result.matchedCount === 0) missing.push(name);
    }

    console.log(`Найдено автомобилей: ${matched}/${Object.keys(IMAGE_BY_NAME).length}`);
    console.log(`Обновлено путей к изображениям: ${modified}`);
    if (missing.length) console.warn(`Не найдены в БД (не создавались): ${missing.join(', ')}`);
    console.log('Миграция завершена. Остальные поля и коллекции не изменялись.');
    if (matched === 0) process.exitCode = 1;
  } catch (error) {
    console.error('Не удалось обновить локальные изображения:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
