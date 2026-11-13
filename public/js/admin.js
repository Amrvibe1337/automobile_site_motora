(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const api = window.MotoraAPI;
  if (!api) return;

  const date = value => new Date(value).toLocaleDateString('ru-RU');
  const esc = api.escapeHtml;
  function message(target, value, error = false) {
    const node = $(target);
    if (!node) return;
    node.textContent = value;
    node.classList.toggle('form__status_error', error);
  }

  async function checkAccess() {
    const data = await api.request('/api/auth/me');
    if (!data.authenticated) { window.location.href = 'contacts.html#login'; return false; }
    if (data.user.role !== 'admin') { window.location.href = 'profile.html'; return false; }
    return true;
  }

  async function loadCategories() {
    const categories = await api.request('/api/products/categories');
    $('#product-category').innerHTML = '<option value="">Выберите категорию</option>' + categories.map(item => `<option value="${esc(item.slug)}">${esc(item.name)}</option>`).join('');
  }

  async function loadStats() {
    const stats = await api.request('/api/admin/stats');
    const labels = [['users', 'Пользователи'], ['products', 'Автомобили'], ['feedback', 'Обращения'], ['pendingFeedback', 'Ожидают модерации обращений'], ['requests', 'Заявки на автомобили'], ['pendingRequests', 'Заявки на рассмотрении'], ['subscribers', 'Подписчики'], ['actions', 'Действий в журнале']];
    $('#admin-stats').innerHTML = labels.map(([key, label]) => `<div class="account-panel admin-stat"><strong>${Number(stats[key])}</strong><span>${label}</span></div>`).join('');
  }

  async function loadProducts() {
    const [sort = 'createdAt', direction = 'desc'] = ($('#admin-sort').value || 'createdAt:desc').split(':');
    const products = await api.request(`/api/admin/products?sort=${encodeURIComponent(sort)}&direction=${encodeURIComponent(direction)}`);
    $('#admin-products').innerHTML = products.length ? products.map(product => `<tr>
      <td><b>${esc(product.name)}</b></td><td>${esc(product.category?.name || product.categorySlug)}</td><td>${api.formatPrice(product.price)}</td>
      <td><div class="inline-actions"><button class="button button_small" type="button" data-edit-product="${esc(product._id)}">Изменить</button><button class="button button_light button_small" type="button" data-delete-product="${esc(product._id)}">Удалить</button></div></td>
    </tr>`).join('') : '<tr><td colspan="4">Каталог пуст.</td></tr>';
    window.__motoraProducts = products;
  }

  async function loadUsers() {
    const users = await api.request('/api/admin/users');
    $('#admin-users').innerHTML = users.length ? users.map(user => `<tr>
      <td>${esc(user.name)}</td><td>${esc(user.email)}</td><td>${user.role === 'admin' ? 'Администратор' : 'Пользователь'}</td>
      <td>${user.isActive ? 'Активен' : 'Заблокирован'}</td>
      <td><div class="inline-actions"><button class="button button_small" type="button" data-toggle-user="${esc(user._id)}" data-active="${user.isActive}">${user.isActive ? 'Заблокировать' : 'Активировать'}</button><button class="button button_light button_small" type="button" data-delete-user="${esc(user._id)}">Удалить</button></div></td>
    </tr>`).join('') : '<tr><td colspan="5">Пользователей пока нет.</td></tr>';
  }

  async function loadFeedback() {
    const feedback = await api.request('/api/admin/feedback');
    $('#admin-feedback').innerHTML = feedback.length ? feedback.map(item => `<article class="data-item">
      <div class="data-item__head"><b>${esc(item.subject)} — ${esc(item.name)} (${esc(item.email)})</b><span class="status-pill status-${esc(item.status)}">${item.status === 'pending' ? 'Ожидает' : item.status === 'approved' ? 'Одобрено' : 'Отклонено'}</span></div>
      <p>${esc(item.message)}</p><small>${date(item.createdAt)}</small>
      <div class="inline-actions feedback-actions"><button class="button button_small" type="button" data-feedback-status="approved" data-feedback-id="${esc(item._id)}">Одобрить</button><button class="button button_light button_small" type="button" data-feedback-status="rejected" data-feedback-id="${esc(item._id)}">Отклонить</button><button class="button button_light button_small" type="button" data-feedback-status="pending" data-feedback-id="${esc(item._id)}">Вернуть на рассмотрение</button></div>
    </article>`).join('') : '<p>Обращений пока нет.</p>';
  }

  async function loadRequests() {
    const rows = await api.request('/api/admin/requests');
    const statusLabel = status => status === 'approved' ? 'Одобрена' : status === 'rejected' ? 'Отклонена' : 'На рассмотрении';
    $('#admin-requests').innerHTML = rows.length ? rows.map(item => `<article class="data-item">
      <div class="data-item__head">
        <b>${esc(item.productName)} — ${esc(item.name)}</b>
        <span class="status-pill status-${esc(item.status)}">${statusLabel(item.status)}</span>
      </div>
      <p><b>Телефон:</b> <a href="tel:${esc(item.phone)}">${esc(item.phone)}</a></p>
      <p><b>Цена на момент заявки:</b> ${api.formatPrice(item.productPrice)}</p>
      ${item.message ? `<p><b>Комментарий:</b> ${esc(item.message)}</p>` : ''}
      ${item.user?.email ? `<small>Аккаунт: ${esc(item.user.name || '')} (${esc(item.user.email)})</small><br>` : ''}
      <small>Получена: ${date(item.createdAt)}</small>
      <div class="inline-actions feedback-actions">
        <button class="button button_small" type="button" data-request-status="approved" data-request-id="${esc(item._id)}">Одобрить</button>
        <button class="button button_light button_small" type="button" data-request-status="rejected" data-request-id="${esc(item._id)}">Отклонить</button>
        <button class="button button_light button_small" type="button" data-request-status="pending" data-request-id="${esc(item._id)}">На рассмотрение</button>
      </div>
    </article>`).join('') : '<p>Заявок на автомобили пока нет.</p>';
  }

  async function loadSubscribers() {
    const rows = await api.request('/api/admin/subscribers');
    $('#admin-subscribers').innerHTML = rows.length ? rows.map(item => `<tr>
      <td><a href="mailto:${esc(item.email)}">${esc(item.email)}</a></td>
      <td>${item.user ? esc(item.user.name || 'Зарегистрированный пользователь') : 'Гость'}</td>
      <td>${date(item.createdAt)}</td>
    </tr>`).join('') : '<tr><td colspan="3">Подписчиков пока нет.</td></tr>';
  }

  function clearProductForm() {
    $('#product-form').reset();
    $('#product-id').value = '';
    $('#product-save').textContent = 'Сохранить автомобиль';
  }

  $('#product-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const id = values.id;
    delete values.id;
    try {
      const result = await api.request(id ? `/api/admin/products/${id}` : '/api/admin/products', {
        method: id ? 'PUT' : 'POST', body: JSON.stringify(values)
      });
      message('#product-status', result.message);
      clearProductForm();
      await Promise.all([loadProducts(), loadStats()]);
    } catch (error) { message('#product-status', error.data?.errors?.join(' ') || error.message, true); }
  });

  $('#product-cancel')?.addEventListener('click', clearProductForm);
  $('#admin-sort')?.addEventListener('change', () => loadProducts().catch(error => message('#product-status', error.message, true)));

  document.addEventListener('click', async event => {
    const edit = event.target.closest('[data-edit-product]');
    if (edit) {
      const product = (window.__motoraProducts || []).find(item => item._id === edit.dataset.editProduct);
      if (!product) return;
      $('#product-id').value = product._id;
      $('#product-name').value = product.name;
      $('#product-category').value = product.categorySlug;
      $('#product-price').value = product.price;
      $('#product-engine').value = product.engine || '';
      $('#product-power').value = product.power || '';
      $('#product-acceleration').value = product.acceleration || '';
      $('#product-image').value = product.image || '';
      $('#product-description').value = product.description || '';
      $('#product-save').textContent = 'Сохранить изменения';
      $('#product-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const removeProduct = event.target.closest('[data-delete-product]');
    if (removeProduct) {
      if (!window.confirm('Удалить автомобиль из каталога?')) return;
      try { await api.request(`/api/admin/products/${removeProduct.dataset.deleteProduct}`, { method: 'DELETE' }); await Promise.all([loadProducts(), loadStats()]); }
      catch (error) { window.alert(error.message); }
      return;
    }

    const toggleUser = event.target.closest('[data-toggle-user]');
    if (toggleUser) {
      const isActive = toggleUser.dataset.active !== 'true';
      try { await api.request(`/api/admin/users/${toggleUser.dataset.toggleUser}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }); await loadUsers(); }
      catch (error) { window.alert(error.message); }
      return;
    }

    const removeUser = event.target.closest('[data-delete-user]');
    if (removeUser) {
      if (!window.confirm('Удалить пользователя и связанные с ним обращения, журнал действий и заказы?')) return;
      try { await api.request(`/api/admin/users/${removeUser.dataset.deleteUser}`, { method: 'DELETE' }); await Promise.all([loadUsers(), loadStats()]); }
      catch (error) { window.alert(error.message); }
      return;
    }

    const statusButton = event.target.closest('[data-feedback-status]');
    if (statusButton) {
      try {
        await api.request(`/api/admin/feedback/${statusButton.dataset.feedbackId}/status`, {
          method: 'PATCH', body: JSON.stringify({ status: statusButton.dataset.feedbackStatus })
        });
        await Promise.all([loadFeedback(), loadStats()]);
      } catch (error) { window.alert(error.message); }
    }

    const requestStatusButton = event.target.closest('[data-request-status]');
    if (requestStatusButton) {
      try {
        await api.request(`/api/admin/requests/${requestStatusButton.dataset.requestId}/status`, {
          method: 'PATCH', body: JSON.stringify({ status: requestStatusButton.dataset.requestStatus })
        });
        await Promise.all([loadRequests(), loadStats()]);
      } catch (error) { window.alert(error.message); }
    }
  });

  (async () => {
    try {
      if (!await checkAccess()) return;
      await Promise.all([loadCategories(), loadStats(), loadProducts(), loadUsers(), loadFeedback(), loadRequests(), loadSubscribers()]);
    } catch (error) {
      if (error.status === 401 || error.status === 403) window.location.href = 'profile.html';
      else window.alert(error.message);
    }
  })();
})();
