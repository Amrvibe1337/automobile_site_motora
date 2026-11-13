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


/* Главный слайдер MOTORA */
const heroSlider = $('[data-slider]');

if (heroSlider) {
  const track = $('.hero-slider__track', heroSlider);
  const slides = $$('[data-slide]', heroSlider);
  const dots = $$('[data-slide-to]', heroSlider);
  const previous = $('[data-slider-prev]', heroSlider);
  const next = $('[data-slider-next]', heroSlider);
  const viewport = $('.hero-slider__viewport', heroSlider);
  let activeSlide = 0;
  let autoplayId = null;

  const showSlide = (index) => {
    activeSlide = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${activeSlide * 100}%)`;

    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === activeSlide;
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
    });

    dots.forEach((dot, dotIndex) => {
      const active = dotIndex === activeSlide;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-pressed', String(active));
    });
  };

  const stopAutoplay = () => {
    if (autoplayId !== null) window.clearInterval(autoplayId);
    autoplayId = null;
  };

  const startAutoplay = () => {
    stopAutoplay();
    if (reduce || slides.length < 2 || document.hidden) return;
    autoplayId = window.setInterval(() => showSlide(activeSlide + 1), 6000);
  };

  previous?.addEventListener('click', () => {
    showSlide(activeSlide - 1);
    startAutoplay();
  });

  next?.addEventListener('click', () => {
    showSlide(activeSlide + 1);
    startAutoplay();
  });

  dots.forEach((dot) => dot.addEventListener('click', () => {
    showSlide(Number(dot.dataset.slideTo));
    startAutoplay();
  }));

  heroSlider.addEventListener('mouseenter', stopAutoplay);
  heroSlider.addEventListener('mouseleave', startAutoplay);
  heroSlider.addEventListener('focusin', stopAutoplay);
  heroSlider.addEventListener('focusout', (event) => {
    if (!heroSlider.contains(event.relatedTarget)) startAutoplay();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  // На сенсорных экранах можно переключать слайды свайпом.
  let touchStartX = null;
  viewport?.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0]?.clientX ?? null;
  }, { passive: true });
  viewport?.addEventListener('touchend', (event) => {
    if (touchStartX === null) return;
    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
    const distance = touchEndX - touchStartX;
    if (Math.abs(distance) > 45) showSlide(activeSlide + (distance < 0 ? 1 : -1));
    touchStartX = null;
    startAutoplay();
  }, { passive: true });

  showSlide(0);
  startAutoplay();
}

/* Кредитный калькулятор каталога. Не зависит от статичных карточек: каталог загружается через API. */
const cp = $('#c-price');
const cDown = $('#c-down');
const cTerm = $('#c-term');

if (cp && cDown && cTerm) {
  function calc() {
    const price = Number(cp.value);
    const down = Number(cDown.value);
    const months = Number(cTerm.value);
    const monthlyRate = 0.12 / 12;
    const principal = price * (1 - down / 100);

    $('#o-price').textContent = fmt(price) + ' ₽';
    $('#o-down').textContent = down + '% (' + fmt((price * down) / 100) + ' ₽)';
    $('#o-term').textContent = months + ' мес.';
    $('#o-pay').textContent = fmt(
      (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
    ) + ' ₽';
  }

  [cp, cDown, cTerm].forEach(input => input.addEventListener('input', calc));
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
    if (f.matches('form[data-api]')) return;
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

/* Уведомление о необходимых cookies */
(() => {
  const cookieName = 'motora_cookie_consent';
  const hasChoice = document.cookie.split(';').some(value => value.trim().startsWith(`${cookieName}=`));
  if (hasChoice) return;

  const banner = document.createElement('section');
  banner.className = 'cookie-banner';
  banner.setAttribute('aria-label', 'Уведомление об использовании cookies');
  banner.innerHTML = `
    <h2>Мы используем cookies</h2>
    <p>Необходимые cookies помогают сохранять пользовательскую сессию, поддерживать вход в личный кабинет и запоминать ваш выбор. Аналитические и рекламные cookies в этой версии сайта не используются. Подробнее — в <a href="cookie-policy.html" target="_blank" rel="noopener">Политике cookies</a>.</p>
    <div class="cookie-banner__actions">
      <button class="button" type="button" data-cookie-choice="accepted">Понятно, принять</button>
      <button class="button button_light" type="button" data-cookie-choice="necessary">Только необходимые</button>
    </div>`;
  document.body.appendChild(banner);

  banner.addEventListener('click', event => {
    const button = event.target.closest('[data-cookie-choice]');
    if (!button) return;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${cookieName}=${button.dataset.cookieChoice}; Max-Age=15552000; Path=/; SameSite=Lax${secure}`;
    banner.remove();
  });
})();
