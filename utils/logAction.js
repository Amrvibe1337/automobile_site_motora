const UserAction = require('../models/UserAction');

async function logAction(req, action, details = {}) {
  if (!req.user?._id) return;
  try {
    await UserAction.create({
      user: req.user._id,
      action,
      details,
      ip: req.ip || ''
    });
  } catch (error) {
    console.error('Не удалось записать действие пользователя:', error.message);
  }
}

module.exports = logAction;
