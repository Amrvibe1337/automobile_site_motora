require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');
const { attachUser } = require('./middleware/auth');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.use(session({
  name: 'motora.sid',
  secret: process.env.SESSION_SECRET || 'local-motora-session-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 30 * 24 * 60 * 60,
    autoRemove: 'native'
  }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: (Number(process.env.SESSION_DAYS) || 1) * 24 * 60 * 60 * 1000
  }
}));

app.use(attachUser);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/subscribers', require('./routes/subscribers'));
app.use('/api/account', require('./routes/account'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'MOTORA API' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', (req, res) => res.status(404).json({ message: 'API-маршрут не найден.' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  res.status(status).json({ message: status >= 500 ? 'Внутренняя ошибка сервера.' : err.message });
});

connectDB()
  .then(() => app.listen(PORT, () => console.log(`MOTORA доступен: http://localhost:${PORT}`)))
  .catch(error => {
    console.error('Не удалось запустить сервер:', error.message);
    process.exit(1);
  });
