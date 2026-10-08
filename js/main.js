const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* меню */
const burger = $('.burger');
const menu = $('.nav__list');

function setMenu(open) {
  menu.classList.toggle('active', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  document.body.style.overflow = open ? 'hidden' : '';
}

burger.addEventListener('click', () =>
  setMenu(burger.getAttribute('aria-expanded') !== 'true')
);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenu(false);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.header')) setMenu(false);
});

matchMedia('(min-width:768px)').addEventListener('change', (e) => {
  if (e.matches) setMenu(false);
});

const hdr = $('.header');
const onScroll = () =>
  hdr.classList.toggle('header_scrolled', scrollY > 8);

addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* избранное (сохраняется в localStorage) */
let fav = [];

try {
  fav = JSON.parse(localStorage.getItem('motora_fav') || '[]');
} catch (e) {}

const saveFav = () => {
  try {
    localStorage.setItem('motora_fav', JSON.stringify(fav));
  } catch (e) {}

  $('#fav-count').textContent = fav.length;
};

$$('.product__fav').forEach((b) => {
  const name = b.closest('.product').dataset.name;
  b.setAttribute('aria-pressed', String(fav.includes(name)));

  b.addEventListener('click', () => {
    fav = fav.includes(name)
      ? fav.filter((n) => n !== name)
      : [...fav, name];

    b.setAttribute('aria-pressed', String(fav.includes(name)));
    saveFav();
  });
});

saveFav();

/* каталог: фильтр, поиск, сортировка */
const products = $$('.product');

if (products.length) {
  let cat = 'all';

  const q = $('#search');
  const sort = $('#sort');
  const chips = $$('.chip');

  function apply() {
    const text = q.value.trim().toLowerCase();
    let shown = 0;

    products.forEach((p) => {
      const ok =
        (cat === 'all' || p.dataset.cat === cat) &&
        p.dataset.name.toLowerCase().includes(text);

      p.hidden = !ok;
      shown += ok;
    });

    $$('.products').forEach((g) => {
      const items = [...g.children];

      if (sort.value !== 'default') {
        items.sort(
          (a, b) =>
            (a.dataset.price - b.dataset.price) *
            (sort.value === 'asc' ? 1 : -1)
        );
      } else {
        items.sort(
          (a, b) => products.indexOf(a) - products.indexOf(b)
        );
      }

      items.forEach((i) => g.appendChild(i));
    });

    $$('.catalog__section').forEach(
      (s) => (s.hidden = !$$('.product:not([hidden])', s).length)
    );

    $('#empty').hidden = shown > 0;
    $('#count').textContent = 'Найдено моделей: ' + shown;
  }

  chips.forEach((c) =>
    c.addEventListener('click', () => {
      cat = c.dataset.cat;
      chips.forEach((x) =>
        x.setAttribute('aria-pressed', String(x === c))
      );
      apply();
    })
  );

  q.addEventListener('input', apply);
  sort.addEventListener('change', apply);

  if (location.hash) {
    const c = chips.find((x) => '#' + x.dataset.cat === location.hash);

    if (c) c.click();
    else apply();
  } else {
    apply();
  }

  /* окно «Подробнее» */
  const dlg = $('#car-dialog');

  $$('[data-open]').forEach((b) =>
    b.addEventListener('click', () => {
      const p = b.closest('.product');
      const img = $('.product__img', p);

      $('#d-img').src = img.currentSrc || img.src;
      $('#d-img').alt = img.alt;
      $('#d-title').textContent = p.dataset.name;
      $('#d-price').textContent = fmt(p.dataset.price) + ' ₽';
      $('#d-engine').textContent = p.dataset.engine;
      $('#d-power').textContent = p.dataset.power;
      $('#d-acc').textContent = p.dataset.acc;
      $('#d-model').value = p.dataset.name;

      dlg.showModal();
    })
  );

  $('[data-close]', dlg).addEventListener('click', () => dlg.close());

  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });

  /* калькулятор */
  const cp = $('#c-price');
  const cd = $('#c-down');
  const ct = $('#c-term');

  function calc() {
    const price = +cp.value;
    const down = +cd.value;
    const n = +ct.value;
    const r = 0.12 / 12;
    const P = price * (1 - down / 100);

    $('#o-price').textContent = fmt(price) + ' ₽';
    $('#o-down').textContent =
      down + '% (' + fmt((price * down) / 100) + ' ₽)';
    $('#o-term').textContent = n + ' мес.';
    $('#o-pay').textContent =
      fmt((P * r) / (1 - Math.pow(1 + r, -n))) + ' ₽';
  }

  [cp, cd, ct].forEach((i) => i.addEventListener('input', calc));
  calc();
}

/* таймер акции */
const cd = $('#countdown');

if (cd) {
  const end = new Date(cd.dataset.end).getTime();

  const tick = () => {
    let s = Math.max(0, Math.floor((end - Date.now()) / 1000));

    if (!s) {
      cd.textContent = 'Акция завершена';
      return;
    }

    const v = [
      [Math.floor(s / 86400), 'дн.'],
      [Math.floor((s % 86400) / 3600), 'ч.'],
      [Math.floor((s % 3600) / 60), 'мин.'],
      [s % 60, 'сек.'],
    ];

    cd.innerHTML = v
      .map(
        ([n, u]) =>
          `<span class="countdown__cell"><b>${String(n).padStart(
            2,
            '0'
          )}</b><span>${u}</span></span>`
      )
      .join('');
  };

  tick();
  setInterval(tick, 1000);
}

/* счётчики на странице «О компании» */
const nums = $$('[data-count]');

if (nums.length) {
  const run = (el) => {
    const to = +el.dataset.count;
    const t0 = performance.now();
    const dur = reduce ? 1 : 1400;

    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(to * (1 - Math.pow(1 - k, 3)));

      if (k < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          run(e.target);
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.4 }
  );

  nums.forEach((n) => io.observe(n));
}

/* «Открыто сейчас» (время Москвы) */
const st = $('#open-status');

if (st) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());

  const day = p.find((x) => x.type === 'weekday').value;
  const h = +p.find((x) => x.type === 'hour').value;
  const wk = !['Sat', 'Sun'].includes(day);
  const on = wk ? h >= 9 && h < 21 : h >= 10 && h < 19;

  st.textContent = on ? 'Сейчас открыто' : 'Сейчас закрыто';
  st.classList.add(on ? 'open-status_on' : 'open-status_off');
}

/* формы: проверка паролей и сообщение об отправке */
const reg = $('form[name="register"]');

if (reg) {
  const p1 = reg.elements.password;
  const p2 = reg.elements.password_confirm;

  const check = () =>
    p2.setCustomValidity(
      p1.value !== p2.value ? 'Пароли не совпадают' : ''
    );

  p1.addEventListener('input', check);
  p2.addEventListener('input', check);
}

const messages = {
  feedback: 'Спасибо! Мы ответим на ваш email.',
  register: 'Регистрация прошла успешно.',
  login: 'Вход выполнен.',
  subscribe: 'Вы подписаны на новости.',
  request: 'Заявка отправлена. Менеджер перезвонит вам.',
};

$$('form[action="#"]').forEach((f) =>
  f.addEventListener('submit', (e) => {
    e.preventDefault();

    if (f.name === 'calc') return;

    let s = $('.form__status', f);

    if (!s) {
      s = document.createElement('p');
      s.className = 'form__status';
      s.setAttribute('role', 'status');
      f.appendChild(s);
    }

    s.textContent = messages[f.name] || 'Готово.';
    f.reset();

    if (f.name === 'request') {
      setTimeout(() => $('#car-dialog').close(), 1500);
    }
  })
);
