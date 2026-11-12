const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Не задан MONGODB_URI. Создайте .env на основе .env.example.');

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`MongoDB подключена: ${mongoose.connection.name}`);
}

module.exports = connectDB;
