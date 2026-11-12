(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const api = window.MotoraAPI;
  if (!api || !$('#cart-items')) return;

  const status = (selector, message, error = false) => {
    const node = $(selector);
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('form__status_error', error);
  };

  function render(data) {
    const root = $('#cart-items');
    const items = data.items || [];
    root.innerHTML = items.length ? items.map(({ product, quantity, lineTotal }) => `
      <article class="cart-item" data-cart-item="${api.escapeHtml(product._id)}">
        <img class="cart-item__image" src="${api.escapeHtml(product.image || '/img/cars/car-placeholder.svg')}" alt="${api.escapeHtml(product.name)}" onerror="this.onerror=null;this.src='/img/cars/car-placeholder.svg'" />
        <div class="cart-item__details">
          <h3>${api.escapeHtml(product.name)}</h3>
          <p class="cart-item__price">${api.formatPrice(product.price)} за автомобиль</p>
          <div class="cart-item__controls">
            <label>Количество <input class="form__input cart-quantity" type="number" min="1" max="10" value="${quantity}" aria-label="Количество: ${api.escapeHtml(product.name)}" /></label>
            <button class="text-button cart-remove" type="button">Удалить</button>
          </div>
        </div>
        <strong class="cart-item__total">${api.formatPrice(lineTotal)}</strong>
      </article>`).join('') : '<div class="cart-empty"><h3>Корзина пока пуста</h3><p>Добавьте понравившийся автомобиль из каталога кнопкой с изображением корзины.</p><a class="button" href="catalog.html">Перейти в каталог</a></div>';

    $('#cart-total').textContent = api.formatPrice(data.total || 0);
    $('#cart-summary-count').textContent = String(data.count || 0);
    const count = $('#cart-count');
    if (count) count.textContent = String(data.count || 0);
    $('#cart-clear').disabled = items.length === 0;
    $('#checkout-submit').disabled = items.length === 0;

    $('#checkout-form').hidden = !data.authenticated;
    $('#cart-login-prompt').hidden = Boolean(data.authenticated) || items.length === 0;
  }

  async function refresh() {
    try {
      const data = await api.request('/api/cart');
      render(data);
      return data;
    } catch (error) {
      status('#cart-message', error.message, true);
      return null;
    }
  }

  $('#cart-items').addEventListener('change', async event => {
    const input = event.target.closest('.cart-quantity');
    if (!input) return;
    const row = input.closest('[data-cart-item]');
    const quantity = Number(input.value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      status('#cart-message', 'Количество должно быть от 1 до 10.', true);
      await refresh();
      return;
    }
    try {
      const data = await api.request(`/api/cart/${row.dataset.cartItem}`, {
        method: 'PATCH', body: JSON.stringify({ quantity })
      });
      render(data);
      status('#cart-message', 'Корзина обновлена.');
    } catch (error) { status('#cart-message', error.message, true); }
  });

  $('#cart-items').addEventListener('click', async event => {
    const button = event.target.closest('.cart-remove');
    if (!button) return;
    const row = button.closest('[data-cart-item]');
    try {
      const data = await api.request(`/api/cart/${row.dataset.cartItem}`, { method: 'DELETE' });
      render(data);
      status('#cart-message', 'Автомобиль удалён из корзины.');
    } catch (error) { status('#cart-message', error.message, true); }
  });

  $('#cart-clear').addEventListener('click', async () => {
    try {
      const data = await api.request('/api/cart', { method: 'DELETE' });
      render(data);
      status('#cart-message', 'Корзина очищена.');
    } catch (error) { status('#cart-message', error.message, true); }
  });

  $('#checkout-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const submit = $('#checkout-submit');
    submit.disabled = true;
    try {
      const values = Object.fromEntries(new FormData(form).entries());
      const result = await api.request('/api/cart/checkout', {
        method: 'POST', body: JSON.stringify(values)
      });
      status('#checkout-status', `${result.message} Номер заказа: ${result.order.orderNumber || result.order.id}.`);
      form.reset();
      await refresh();
    } catch (error) {
      status('#checkout-status', error.data?.errors?.join(' ') || error.message, true);
      if (error.status === 401) $('#cart-login-prompt').hidden = false;
      await refresh();
    } finally { submit.disabled = false; }
  });

  refresh();
})();
