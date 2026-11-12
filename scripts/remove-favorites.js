require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function removeLegacyFavoriteSessionData(db) {
  const collections = await db.listCollections({ name: 'sessions' }, { nameOnly: true }).toArray();
  if (!collections.length) {
    console.log('Коллекция sessions отсутствует — очищать старые сессии не требуется.');
    return;
  }

  const sessions = db.collection('sessions');
  let cleaned = 0;
  let invalid = 0;
  const cursor = sessions.find(
    { session: { $type: 'string' } },
    { projection: { _id: 1, session: 1 } }
  );

  for await (const document of cursor) {
    let data;
    try {
      data = JSON.parse(document.session);
    } catch {
      invalid += 1;
      continue;
    }
    if (!data || !Object.prototype.hasOwnProperty.call(data, 'favorites')) continue;
    delete data.favorites;
    await sessions.updateOne(
      { _id: document._id },
      { $set: { session: JSON.stringify(data) } }
    );
    cleaned += 1;
  }

  // Дополнительная очистка на случай нестандартного формата хранения сессий.
  const directFields = await sessions.updateMany(
    { favorites: { $exists: true } },
    { $unset: { favorites: '' } }
  );

  console.log(`Очищено сессий со старым избранным: ${cleaned + directFields.modifiedCount}.`);
  if (invalid) console.warn(`Не удалось разобрать сессий: ${invalid}; они оставлены без изменений.`);
}

(async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const existing = await db.listCollections({ name: 'favorites' }, { nameOnly: true }).toArray();

    if (existing.length) {
      await db.dropCollection('favorites');
      console.log('Коллекция favorites удалена.');
    } else {
      console.log('Коллекция favorites уже отсутствует.');
    }

    await removeLegacyFavoriteSessionData(db);
    console.log('Готово. Корзина (cart), пользователи, обращения, журнал действий и заказы не изменялись.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Не удалось удалить старую функциональность избранного:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
})();
