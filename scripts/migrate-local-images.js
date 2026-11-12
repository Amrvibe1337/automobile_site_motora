require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');

const IMAGE_BY_NAME = {
  'Orion 1.6 Comfort': '/img/cars/orion-1-6-comfort.webp',
  'Orion 2.0 Business': '/img/cars/orion-2-0-business.webp',
  'Orion E Sport': '/img/cars/orion-e-sport.webp',
  'Terra X3': '/img/cars/terra-x3.webp',
  'Terra X5': '/img/cars/terra-x5.webp',
  'Terra X7 Hybrid': '/img/cars/terra-x7-hybrid.webp',
  'Aura GT 2.0': '/img/cars/aura-gt-2-0.webp',
  'Aura GT 3.0': '/img/cars/aura-gt-3-0.webp',
  'Aura RS V8': '/img/cars/aura-rs-v8.webp',
  'Vega City 1.4': '/img/cars/vega-city-1-4.webp',
  'Vega Urban 1.6': '/img/cars/vega-urban-1-6.webp',
  'Vega Sport 2.0': '/img/cars/vega-sport-2-0.webp',
  'Volt E1': '/img/cars/volt-e1.webp',
  'Volt H2 Hybrid': '/img/cars/volt-h2-hybrid.webp',
  'Volt E3 AWD': '/img/cars/volt-e3-awd.webp'
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
