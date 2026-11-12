require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');

const IMAGE_PATH = '/img/cars/aura-rs-v8.webp';

(async () => {
  try {
    await connectDB();
    const result = await Product.updateOne(
      { name: 'Aura RS V8' },
      { $set: { image: IMAGE_PATH } }
    );

    if (result.matchedCount === 0) {
      console.error('Автомобиль Aura RS V8 не найден. Сначала выполните: npm run seed');
      process.exitCode = 1;
    } else if (result.modifiedCount === 0) {
      console.log('Изображение Aura RS V8 уже содержит локальный путь.');
    } else {
      console.log('Изображение Aura RS V8 успешно обновлено в MongoDB.');
    }
  } catch (error) {
    console.error('Не удалось обновить изображение:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
