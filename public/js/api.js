(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || 'Не удалось выполнить запрос.');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function formatPrice(value) {
    return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
  }

  function showStatus(form, message, isError = false) {
    let status = $('.form__status', form);
    if (!status) {
      status = document.createElement('p');
      status.className = 'form__status';
      status.setAttribute('role', 'status');
      form.appendChild(status);
    }
    status.textContent = message;
    status.classList.toggle('form__status_error', isError);
  }

  // API формы: регистрация, авторизация и обратная связь.
  document.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-api]');
    if (!form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!form.reportValidity()) return;

    const values = Object.fromEntries(new FormData(form).entries());
    const type = form.dataset.api;
    const endpoint = type === 'register' ? '/api/auth/register'
      : type === 'login' ? '/api/auth/login'
      : type === 'feedback' ? '/api/feedback' : null;
    if (!endpoint) return;

    const submit = $('button[type="submit"]', form);
    if (submit) submit.disabled = true;
    try {
      if (type === 'register') {
        values.terms = Boolean(values.terms);
        values.privacy = Boolean(values.privacy);
      }
      if (type === 'feedback') {
        values.terms = Boolean(values.terms);
        values.privacy = Boolean(values.privacy);
      }
      if (type === 'login') values.remember = Boolean(values.remember);
      const result = await request(endpoint, { method: 'POST', body: JSON.stringify(values) });
      showStatus(form, result.message || 'Готово.');
      form.reset();
      if (type === 'register' || type === 'login') {
        window.setTimeout(() => { window.location.href = 'profile.html'; }, 500);
      }
    } catch (error) {
      const details = error.data?.errors?.join(' ') || error.message;
      showStatus(form, details, true);
    } finally {
      if (submit) submit.disabled = false;
    }
  }, true);

  // Ссылки кабинета/админки и выход показываются в соответствии с ролью.
  async function updateNavigation() {
    const nav = $('.nav__list');
    if (!nav) return;
    try {
      const data = await request('/api/auth/me');
      const signup = $('.nav__signup', nav);
      if (data.authenticated) {
        if (signup) {
          signup.href = 'profile.html';
          signup.textContent = 'Личный кабинет';
        }
        if (!$$('.nav__logout', nav).length) {
          const item = document.createElement('li');
          item.className = 'nav__item';
          item.innerHTML = '<button class="button button_light nav__logout" type="button">Выйти</button>';
          nav.appendChild(item);
          $('.nav__logout', item).addEventListener('click', async () => {
            try {
              await request('/api/auth/logout', { method: 'POST', body: '{}' });
              window.location.href = 'index.html';
            } catch (error) { window.alert(error.message); }
          });
        }
        if (data.user.role === 'admin' && !$('.nav__admin', nav)) {
          const item = document.createElement('li');
          item.className = 'nav__item';
          item.innerHTML = '<a class="nav__link nav__admin" href="admin.html">Админ-панель</a>';
          nav.appendChild(item);
        }
        const greeting = $('#profile-greeting');
        if (greeting) greeting.textContent = `Здравствуйте, ${data.user.name}! Управляйте профилем и своими обращениями.`;
      } else {
        if (signup) {
          signup.href = 'contacts.html#signup';
          signup.textContent = 'Регистрация';
        }
        if (!$$('.nav__login', nav).length) {
          const item = document.createElement('li');
          item.className = 'nav__item';
          item.innerHTML = '<a class="nav__link nav__login" href="contacts.html#login">Вход</a>';
          nav.appendChild(item);
        }
      }
    } catch (error) {
      console.warn('Не удалось получить состояние авторизации:', error.message);
    }
  }

  // Динамический каталог получает товары из MongoDB и сохраняет фильтры лабы 2.
  const catalogRoot = $('.catalog');
  if (catalogRoot) {
    const search = $('#search');
    const sort = $('#sort');
    const chips = $$('.toolbar .chip');
    let category = 'all';
    let searchTimer = null;
    let searchHistoryTimer = null;

    function productCard(product) {
      const categoryName = product.category?.name || product.categorySlug;
      const image = product.image || '/img/cars/car-placeholder.svg';
      return `<article class="product"
        data-id="${escapeHtml(product._id)}"
        data-cat="${escapeHtml(product.categorySlug)}"
        data-name="${escapeHtml(product.name)}"
        data-price="${Number(product.price)}"
        data-engine="${escapeHtml(product.engine)}"
        data-power="${escapeHtml(product.power)}"
        data-acc="${escapeHtml(product.acceleration)}"
        data-description="${escapeHtml(product.description || '')}">
        <div class="product__media">
          <img class="product__img" src="${escapeHtml(image)}" data-fallback="/img/cars/car-placeholder.svg" onerror="this.onerror=null;this.src=this.dataset.fallback" alt="${escapeHtml(product.name)}" loading="lazy" />
          <button class="product__cart" type="button" data-cart aria-label="Добавить ${escapeHtml(product.name)} в корзину" title="Добавить в корзину"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></button>
        </div>
        <h3 class="product__title">${escapeHtml(product.name)}</h3>
        <p class="product__price">${formatPrice(product.price)}</p>
        <button class="button product__btn" type="button" data-open>Подробнее</button>
      </article>`;
    }

    async function loadCatalog(trackSearch = false) {
      const term = search?.value.trim() || '';
      if (term.length === 1) {
        const count = $('#count');
        const empty = $('#empty');
        if (count) count.textContent = 'Для поиска введите минимум 2 символа.';
        if (empty) { empty.hidden = false; empty.textContent = 'Введите не менее двух символов для поиска.'; }
        catalogRoot.innerHTML = '';
        const comparison = $('#catalog-comparison-body');
        if (comparison) comparison.innerHTML = '';
        return;
      }
      const params = new URLSearchParams({
        q: search?.value.trim() || '',
        category,
        sort: sort?.value || 'default',
        trackSearch: trackSearch ? '1' : '0'
      });
      try {
        const data = await request(`/api/products?${params.toString()}`);
        const grouped = new Map();
        for (const product of data.products) {
          const slug = product.categorySlug || 'other';
          if (!grouped.has(slug)) grouped.set(slug, { name: product.category?.name || slug, products: [] });
          grouped.get(slug).products.push(product);
        }
        catalogRoot.innerHTML = [...grouped.entries()].map(([slug, group]) => `
          <section class="section catalog__section" id="${escapeHtml(slug)}">
            <h2 class="heading">${escapeHtml(group.name)}</h2>
            <div class="products">${group.products.map(productCard).join('')}</div>
          </section>`).join('');
        const comparison = $('#catalog-comparison-body');
        if (comparison) comparison.innerHTML = data.products.map(product => `<tr><th scope="row">${escapeHtml(product.name)}</th><td>${escapeHtml(product.category?.name || product.categorySlug)}</td><td>${escapeHtml(product.engine)}</td><td>${escapeHtml(product.power)}</td><td>${escapeHtml(product.acceleration)}</td><td>${formatPrice(product.price)}</td></tr>`).join('');
        const count = $('#count');
        const empty = $('#empty');
        if (count) count.textContent = `Найдено моделей: ${data.count}`;
        if (empty) { empty.hidden = data.count > 0; empty.textContent = 'Ничего не найдено. Измените запрос или фильтр.'; }
        await loadCart();
      } catch (error) {
        const count = $('#count');
        if (count) count.textContent = error.message;
      }
    }

    document.addEventListener('click', event => {
      const chip = event.target.closest('.toolbar .chip');
      if (!chip) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      category = chip.dataset.cat || 'all';
      chips.forEach(item => item.setAttribute('aria-pressed', String(item === chip)));
      loadCatalog();
    }, true);

    if (search) search.addEventListener('input', event => {
      event.stopImmediatePropagation();
      window.clearTimeout(searchTimer);
      window.clearTimeout(searchHistoryTimer);
      searchTimer = window.setTimeout(() => loadCatalog(false), 280);
      searchHistoryTimer = window.setTimeout(() => loadCatalog(true), 1000);
    }, true);

    $('#catalog-search')?.addEventListener('submit', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.clearTimeout(searchTimer);
      window.clearTimeout(searchHistoryTimer);
      if (search?.reportValidity()) loadCatalog(true);
    }, true);

    if (sort) sort.addEventListener('change', event => {
      event.stopImmediatePropagation();
      loadCatalog();
    }, true);

    // Кнопка «Подробнее» делегирована на документ, поскольку карточки загружаются через API.
    document.addEventListener('click', event => {
      const button = event.target.closest('.catalog [data-open]');
      if (!button) return;
      const card = button.closest('.product');
      const id = card?.dataset.id;
      if (id) request(`/api/products/session/view/${id}`, { method: 'POST', body: '{}' }).catch(() => {});
      const dialog = $('#car-dialog');
      if (!dialog || dialog.open) return;
      const image = $('.product__img', card);
      $('#d-img').src = image?.currentSrc || image?.src || '';
      $('#d-img').alt = image?.alt || card.dataset.name;
      $('#d-title').textContent = card.dataset.name;
      $('#d-price').textContent = formatPrice(card.dataset.price);
      $('#d-engine').textContent = card.dataset.engine;
      $('#d-power').textContent = card.dataset.power;
      $('#d-acc').textContent = card.dataset.acc;
      $('#d-description').textContent = card.dataset.description?.trim() || 'Описание пока не добавлено.';
      $('#d-model').value = card.dataset.name;
      dialog.showModal();
    });

    loadCatalog();
  }

  // Корзина хранится в серверной сессии MongoDB, а заказ записывается в коллекцию orders.
  async function loadCart() {
    try {
      const data = await request('/api/cart');
      const ids = new Set((data.items || []).map(item => String(item.product._id)));
      $$('.product[data-id]').forEach(card => {
        const button = $('[data-cart]', card);
        if (!button) return;
        const active = ids.has(String(card.dataset.id));
        button.classList.toggle('is-in-cart', active);
        button.setAttribute('aria-label', `${active ? 'Добавить ещё один' : 'Добавить'} автомобиль ${card.dataset.name} в корзину`);
      });
      const count = $('#cart-count');
      if (count) count.textContent = String(data.count || 0);
      return data;
    } catch (error) {
      console.warn('Корзина недоступна:', error.message);
      return null;
    }
  }

  function showToast(message, isError = false) {
    let toast = $('#motora-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'motora-toast';
      toast.className = 'motora-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.toggle('motora-toast_error', isError);
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2800);
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('.product__cart[data-cart]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const card = button.closest('.product');
    const id = card?.dataset.id;
    if (!id || button.disabled) return;
    button.disabled = true;
    try {
      const result = await request(`/api/cart/${id}`, { method: 'POST', body: '{}' });
      button.classList.add('is-in-cart');
      button.setAttribute('aria-label', `Добавить ещё один автомобиль ${card.dataset.name} в корзину`);
      const count = $('#cart-count');
      if (count) count.textContent = String(result.count || 0);
      showToast(result.message || 'Автомобиль добавлен в корзину.');
    } catch (error) {
      showToast(error.message, true);
    } finally {
      button.disabled = false;
    }
  }, true);

  window.MotoraAPI = { request, escapeHtml, formatPrice, loadCart, showToast };
  updateNavigation();
  if ($('#cart-count')) loadCart();
})();
