(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const api = window.MotoraAPI;
  if (!api) return;

  function list(target, items, render, emptyText) {
    const node = $(target);
    if (!node) return;
    node.innerHTML = items.length ? items.map(render).join('') : `<p>${api.escapeHtml(emptyText)}</p>`;
  }
  function status(target, message, error = false) {
    const node = $(target);
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('form__status_error', error);
  }
  const date = value => new Date(value).toLocaleString('ru-RU');
  const orderStatus = value => ({ created: 'Создан', processing: 'В обработке', completed: 'Завершён', cancelled: 'Отменён' }[value] || value);
  const actionName = value => ({
    register: 'Регистрация', login: 'Вход в систему', logout: 'Выход из системы',
    profile_update: 'Изменение профиля', password_changed: 'Смена пароля',
    feedback_submitted: 'Отправка обращения', order_created: 'Оформление заказа',
    favorite_add: 'Историческое действие из предыдущей версии сайта', favorite_remove: 'Историческое действие из предыдущей версии сайта'
  }[value] || value);

  async function init() {
    try {
      const data = await api.request('/api/account');
      $('#profile-name').value = data.user.name;
      $('#profile-email').value = data.user.email;
      $('#profile-greeting').textContent = `Здравствуйте, ${data.user.name}! Здесь собраны ваши данные, заказы и обращения.`;

      $('#summary-orders').textContent = String(data.orders.length);
      $('#summary-feedback').textContent = String(data.feedback.length);
      $('#summary-viewed').textContent = String(data.recentViewed.length);
      $('#summary-cart').textContent = String(data.cart || 0);

      list('#account-viewed-list', data.recentViewed || [], item =>
        `<article class="data-item"><b>${api.escapeHtml(item.name)}</b><p><small>${date(item.viewedAt)}</small></p><a class="text-link" href="catalog.html">Открыть каталог</a></article>`,
        'Просмотренные автомобили появятся здесь.');

      list('#account-searches-list', (data.searchHistory || []).slice(0, 5), (item, index) =>
        `<article class="data-item"><b>${index + 1}.</b> «${api.escapeHtml(item)}»</article>`,
        'История поиска пока пуста.');

      list('#account-feedback-list', data.feedback || [], item =>
        `<article class="data-item"><div class="data-item__head"><b>${api.escapeHtml(item.subject)}</b><span class="status-pill status-${api.escapeHtml(item.status)}">${item.status === 'pending' ? 'На рассмотрении' : item.status === 'approved' ? 'Одобрено' : 'Отклонено'}</span></div><p>${api.escapeHtml(item.message)}</p><small>${date(item.createdAt)}</small></article>`,
        'Вы ещё не отправляли обращений.');

      list('#account-orders-list', data.orders || [], order => {
        const items = (order.items || []).map(item => `<li>${api.escapeHtml(item.name)} × ${item.quantity} — ${api.formatPrice(item.price * item.quantity)}</li>`).join('');
        return `<article class="data-item order-card"><div class="data-item__head"><b>${api.escapeHtml(order.orderNumber || String(order._id).slice(-8).toUpperCase())}</b><span class="status-pill status-${api.escapeHtml(order.status)}">${orderStatus(order.status)}</span></div><small>${date(order.createdAt)}</small><ul class="order-card__items">${items}</ul><strong>Итого: ${api.formatPrice(order.total)}</strong></article>`;
      }, 'Заказов пока нет. Добавьте автомобиль в корзину и оформите первый заказ.');

      list('#account-actions-list', data.actions || [], item =>
        `<article class="data-item"><b>${api.escapeHtml(actionName(item.action))}</b><p><small>${date(item.createdAt)}</small></p></article>`,
        'Действий пока нет.');
    } catch (error) {
      if (error.status === 401) window.location.href = 'contacts.html#login';
      else status('#profile-status', error.message, true);
    }
  }

  $('#profile-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const result = await api.request('/api/account/profile', { method: 'PATCH', body: JSON.stringify(values) });
      status('#profile-status', result.message);
      $('#profile-greeting').textContent = `Здравствуйте, ${result.user.name}! Здесь собраны ваши данные, заказы и обращения.`;
    } catch (error) { status('#profile-status', error.data?.errors?.join(' ') || error.message, true); }
  });

  $('#password-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    if (values.newPassword !== $('#new-password-confirm').value) {
      status('#password-status', 'Новые пароли не совпадают.', true);
      return;
    }
    try {
      const result = await api.request('/api/account/password', { method: 'PATCH', body: JSON.stringify(values) });
      status('#password-status', result.message);
      form.reset();
    } catch (error) { status('#password-status', error.data?.errors?.join(' ') || error.message, true); }
  });

  init();
})();
