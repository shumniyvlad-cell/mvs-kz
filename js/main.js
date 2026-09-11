/* МВС Казахстан — интерактив: медленно, мягко, один раз.
   Зависимости: GSAP 3.13 + ScrollTrigger + SplitText, Lenis — локально в /vendor. */

(() => {
  'use strict';

  const CONFIG = {
    // Куда отправлять заявку (n8n / Telegram-бот / CRM). Пусто — демо-режим: форма ничего не шлёт и говорит об этом.
    formEndpoint: '',
    // Начало первого дня по Алматы (UTC+5)
    eventStart: '2026-09-26T00:00:00+05:00',
    sku: {
      online:  'MVS_ONL_260926-ALM_STANDARD',
      offline: 'MVS_OFL_260926-ALM_STANDARD',
      vip:     'MVS_VIP_260926-ALM_STANDARD'
    },
    docs: {
      RUB: {
        agreement: 'https://docs.storage.talpismethod.team/docs/agreement-ru.pdf',
        policy:    'https://docs.storage.talpismethod.team/docs/policy-ru.pdf',
        offer:     'https://docs.storage.talpismethod.team/docs/offer-ru.pdf'
      },
      AED: {
        agreement: 'https://docs.storage.talpismethod.team/docs/agreement-mvs.pdf',
        policy:    'https://docs.storage.talpismethod.team/docs/policy-mvs.pdf',
        offer:     'https://docs.storage.talpismethod.team/docs/offer-mvs.pdf'
      }
    }
  };

  const html = document.documentElement;
  const body = document.body;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const hasGsap  = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const hasSplit = hasGsap && typeof SplitText !== 'undefined';
  const motion   = hasGsap && html.classList.contains('motion');
  if (!motion) { html.classList.remove('motion'); html.classList.add('reduced'); }
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (hasSplit) gsap.registerPlugin(SplitText);
    gsap.registerEase('soft', gsap.parseEase('cubic-bezier(.32,.72,0,1)'));
    gsap.registerEase('softOut', gsap.parseEase('cubic-bezier(.22,1,.36,1)'));
  }

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isDesktop = () => matchMedia('(min-width: 900px)').matches;
  const navH = () => ($('#nav') ? $('#nav').offsetHeight : 76);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ---------- Плавный скролл ---------- */
  let lenis = null;
  if (motion && typeof Lenis !== 'undefined' && finePointer) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const goTo = (target) => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) { lenis.scrollTo(el, { offset: -navH() + 1, duration: 1.5 }); return; }
    const y = el.getBoundingClientRect().top + window.scrollY - navH() + 1;
    window.scrollTo({ top: y, behavior: motion ? 'smooth' : 'auto' });
  };

  /* ---------- Меню ---------- */
  const burger = $('#burger');
  const menu = $('#menu');
  const openMenu = () => {
    menu.hidden = false;
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
    body.classList.add('menu-open');
    lenis && lenis.stop();
  };
  const closeMenu = () => {
    if (menu.hidden) return;
    menu.hidden = true;
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    body.classList.remove('menu-open');
    lenis && lenis.start();
  };
  burger.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));

  /* ---------- Якоря ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2 || !$(id)) return;
      e.preventDefault();
      closeMenu();
      goTo(id);
      history.replaceState(null, '', id);
    });
  });

  /* ---------- «Через N дней» ---------- */
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  $$('[data-countdown]').forEach((el) => {
    const days = Math.ceil((new Date(CONFIG.eventStart) - Date.now()) / 864e5);
    el.textContent = days > 1 ? `через ${days} ${plural(days, 'день', 'дня', 'дней')}`
      : days === 1 ? 'уже завтра'
      : days === 0 ? 'уже сегодня'
      : 'семинар прошёл';
  });

  /* ---------- Тема шапки и рейла ---------- */
  const setDark = (on) => body.classList.toggle('on-dark', !!on);

  /* ---------- Слова-маска героя: раскладка текста в SVG (нужна и без анимаций) ---------- */
  const mask = $('.mask');
  const maskLines = $$('.mask__t');
  const maskQ = $('.mask__q');
  const maskG = $('.mask__g');
  const maskOpen = $('.mask__open');
  const maskImg = $('.mask__img');
  const maskShade = $('.mask__shade');
  const maskQG = $('.mask__qg');
  let maskCenter = { x: 0, y: 0 }, maskSize = { w: 0, h: 0 };

  const layoutMask = () => {
    if (!mask) return;
    const W = mask.clientWidth || window.innerWidth, H = mask.clientHeight || window.innerHeight;
    maskSize = { w: W, h: H };
    const wrap = $('.hero__content');
    const x = wrap ? wrap.getBoundingClientRect().left + parseFloat(getComputedStyle(wrap).paddingLeft) : 64;
    const bottomH = ($('.hero__bottom') ? $('.hero__bottom').offsetHeight : 160) + 64;
    const top = navH() + H * 0.04 + 46;
    const avail = H - top - bottomH;
    const fs = Math.max(72, Math.min(W * 0.108, avail / 3.06));
    maskLines.forEach((t, i) => {
      t.textContent = t.dataset.line;
      t.setAttribute('x', x);
      t.setAttribute('y', top + fs * 0.94 + i * fs * 1.02);
      t.setAttribute('font-size', fs);
    });
    const measure = (t) => { let l = 0; try { l = t.getComputedTextLength(); } catch (e) {} return l || fs * 0.5 * t.dataset.line.length; };
    const l3 = maskLines[2];
    maskQ.setAttribute('font-size', fs);
    maskQ.setAttribute('x', x + measure(l3) + fs * 0.06);
    maskQ.setAttribute('y', l3.getAttribute('y'));
    const maxLen = Math.max(...maskLines.map(measure));
    maskCenter = { x: x + maxLen * 0.42, y: top + fs * 1.55 };
  };
  layoutMask();

  /* ---------- Модальное окно и форма ---------- */
  const modal = $('#modal');
  const panel = $('.modal__panel', modal);
  const form = $('#regForm');
  const done = $('#formDone');
  const errEl = $('#formError');
  const titleEl = $('#modalTitle');
  const kickerEl = $('#modalKicker');
  let lastFocus = null;

  const openModal = (btn) => {
    const key = btn.dataset.form;                 // online | online-norf | offline | offline-norf
    const base = key.replace('-norf', '');
    const foreign = key.endsWith('-norf');
    const currency = foreign ? 'AED' : 'RUB';
    titleEl.textContent = `Записаться на «Мировоззренческий семинар» ${base === 'online' ? 'Онлайн' : 'Офлайн'}`;
    kickerEl.textContent = foreign ? 'Оплата зарубежной картой' : 'Оплата картой РФ';
    form.item_sku.value = CONFIG.sku[base];
    form.currency.value = currency;
    form.form_name.value = '#popup:' + key;
    const docs = CONFIG.docs[currency];
    $$('[data-doc]', form).forEach((a) => { a.href = docs[a.dataset.doc]; });
    form.reset();
    form.classList.remove('is-invalid');
    errEl.textContent = '';
    form.hidden = false;
    done.hidden = true;
    modal.hidden = false;
    body.classList.add('modal-open');
    lenis && lenis.stop();
    lastFocus = btn;
    if (motion) gsap.fromTo(panel, { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'soft' });
    setTimeout(() => form.name.focus(), 60);
  };
  const closeModal = () => {
    if (modal.hidden) return;
    const finish = () => {
      modal.hidden = true;
      body.classList.remove('modal-open');
      lenis && lenis.start();
      lastFocus && lastFocus.focus();
    };
    if (motion) gsap.to(panel, { y: 12, autoAlpha: 0, duration: 0.35, ease: 'soft', onComplete: finish });
    else finish();
  };
  $$('[data-form]').forEach((b) => b.addEventListener('click', () => openModal(b)));
  $$('[data-close]', modal).forEach((b) => b.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeMenu(); }
    if (e.key === 'Tab' && !modal.hidden) {
      const f = $$('button, [href], input, [tabindex]:not([tabindex="-1"])', panel).filter((el) => !el.hidden && el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('is-invalid');
    if (!form.checkValidity()) {
      errEl.textContent = 'Проверьте имя, email и телефон и отметьте все согласия.';
      const first = form.querySelector(':invalid');
      first && first.focus();
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    data.page = location.href;
    data.sent_at = new Date().toISOString();
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Отправляем…';
    try {
      if (CONFIG.formEndpoint) {
        const r = await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
      } else {
        await new Promise((r) => setTimeout(r, 450));
      }
      form.hidden = true;
      done.hidden = false;
      $('.demo-only', done).hidden = !!CONFIG.formEndpoint;
      errEl.textContent = '';
    } catch (err) {
      errEl.textContent = 'Не получилось отправить заявку. Попробуйте ещё раз или напишите в Instagram @leonid_talpis.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'Зарегистрироваться';
    }
  });

  /* ---------- Вопросы: плавное раскрытие ---------- */
  $$('.faq__item').forEach((d) => {
    const sum = $('summary', d);
    const content = $('.faq__body', d);
    sum.addEventListener('click', (e) => {
      if (!motion) return;                        // без анимаций работает нативный <details>
      e.preventDefault();
      if (d.open) {
        gsap.to(content, { height: 0, duration: 0.5, ease: 'soft', onComplete: () => { d.open = false; gsap.set(content, { clearProps: 'height' }); ScrollTrigger.refresh(); } });
      } else {
        d.open = true;
        gsap.fromTo(content, { height: 0 }, { height: 'auto', duration: 0.6, ease: 'soft', onComplete: () => { gsap.set(content, { clearProps: 'height' }); ScrollTrigger.refresh(); } });
      }
    });
  });

  /* ---------- Без GSAP дальше нечего делать ---------- */
  if (!hasGsap) return;

  /* ---------- Служебные триггеры (работают и при reduce-motion) ---------- */
  const nav = $('#nav');
  ScrollTrigger.create({ start: 'top -30', end: 99999, toggleClass: { targets: nav, className: 'is-scrolled' } });
  // Шапка прячется при скролле вниз и возвращается при скролле вверх
  ScrollTrigger.create({ start: 240, end: 'max', onUpdate: (s) => nav.classList.toggle('is-hidden', s.direction === 1), onLeaveBack: () => nav.classList.remove('is-hidden') });

  const rail = $('.rail'), railFill = $('.rail__fill'), railPin = $('.rail__pin');
  if (rail) {
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => { gsap.set(railFill, { scaleY: s.progress }); railPin.style.top = (s.progress * 100) + '%'; } });
  }

  // Тёмный финал: шапка и рейл перекрашиваются в светлый
  $$('[data-theme]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: () => `top ${navH() * 0.6}px`, end: () => `bottom ${navH() * 0.6}px`,
      onToggle: (s) => { if (s.isActive) setDark(sec.dataset.theme === 'dark'); }
    });
  });

  window.addEventListener('resize', debounce(() => { layoutMask(); ScrollTrigger.refresh(); }, 200));

  if (!motion) return;

  /* ---------- Курсор с подписями (мышь) ---------- */
  if (finePointer) {
    const cur = $('.cursor'), lab = $('.cursor__label');
    if (cur) {
      html.classList.add('cursor-on');
      const qx = gsap.quickTo(cur, 'x', { duration: 0.3, ease: 'softOut' });
      const qy = gsap.quickTo(cur, 'y', { duration: 0.3, ease: 'softOut' });
      window.addEventListener('mousemove', (e) => { qx(e.clientX); qy(e.clientY); cur.classList.add('is-on'); }, { passive: true });
      document.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
      document.addEventListener('mouseover', (e) => {
        const labelled = e.target.closest('[data-cursor]');
        if (labelled) { lab.textContent = labelled.dataset.cursor; cur.classList.add('is-label'); cur.classList.remove('is-link'); return; }
        cur.classList.remove('is-label');
        cur.classList.toggle('is-link', !!e.target.closest('a, button, summary, label'));
      });
    }

    // Магнитные кнопки
    $$('[data-magnet]').forEach((b) => {
      const qx = gsap.quickTo(b, 'x', { duration: 0.45, ease: 'soft' });
      const qy = gsap.quickTo(b, 'y', { duration: 0.45, ease: 'soft' });
      b.addEventListener('mousemove', (e) => {
        const r = b.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * 0.18);
        qy((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      b.addEventListener('mouseleave', () => { qx(0); qy(0); });
    });
  }

  /* ---------- Герой ---------- */
  // Мобильная дверь-кадр: clip-path от волосяной щели до приоткрытой двери (интро) и до полного экрана (скролл)
  const CLIP = {
    hair: 'inset(24vh 49.8vw 66vh 49.8vw round 20px)',
    door: 'inset(13vh 5vw 58vh 5vw round 20px)',
    open: 'inset(0vh 0vw 0vh 0vw round 0px)'
  };

  const introDesktop = () => {
    const kicker = $('.hero__kicker'), tag = $('.hero__tag');
    const rest = $$('.hero__text > *, .hero__content .actions');
    gsap.set([mask, kicker, tag, ...rest, nav, rail].filter(Boolean), { visibility: 'visible' });
    gsap.set(maskLines, { y: 90, opacity: 0 });
    gsap.set(maskQ, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' });
    gsap.set(maskImg, { scale: 1.1, svgOrigin: `${maskSize.w / 2} ${maskSize.h / 2}` });
    gsap.set([kicker, ...rest], { autoAlpha: 0, y: 22 });
    gsap.set([nav, rail, tag].filter(Boolean), { autoAlpha: 0 });
    const tl = gsap.timeline({ defaults: { ease: 'soft' }, delay: 0.15 });
    tl.to(maskLines, { y: 0, opacity: 1, duration: 1.3, stagger: 0.14, ease: 'softOut' }, 0.1)
      .to(maskImg, { scale: 1, duration: 2.8, ease: 'softOut' }, 0)
      .to(maskQ, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.6)' }, 0.95)
      .to(kicker, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.5)
      .to(rest, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 }, 1.0)
      .to([nav, rail, tag].filter(Boolean), { autoAlpha: 1, duration: 0.8 }, 1.2);
  };

  const introMobile = () => {
    const scene = $('.scene'), img = $('.scene__img'), kicker = $('.hero__kicker');
    const lines = $$('.hero__title .line > span');
    const rest = $$('.hero__text > *, .hero__content .actions');
    gsap.set([scene, kicker, ...lines, ...rest, nav].filter(Boolean), { visibility: 'visible' });
    gsap.set(scene, { clipPath: CLIP.hair });
    gsap.set(img, { scale: 1.08, yPercent: -18, transformOrigin: '50% 50%' });
    gsap.set(lines, { yPercent: 112 });
    gsap.set([kicker, ...rest], { autoAlpha: 0, y: 22 });
    gsap.set(nav, { autoAlpha: 0 });
    const tl = gsap.timeline({ defaults: { ease: 'soft' }, delay: 0.15 });
    tl.to(scene, { clipPath: CLIP.door, duration: 1.6 })
      .to(img, { scale: 1, duration: 2.6, ease: 'softOut' }, 0)
      .to(kicker, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.5)
      .to(lines, { yPercent: 0, duration: 1.25, ease: 'softOut', stagger: 0.14 }, 0.6)
      .to(rest, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 }, 1.1)
      .to(nav, { autoAlpha: 1, duration: 0.8 }, 1.2);
  };

  // Переход через порог. Десктоп: буквы растут, мы уходим сквозь них в кадр. Мобильный: дверь раскрывается на весь экран.
  let crossTL = null;
  const crossing = () => {
    if (crossTL) { crossTL.scrollTrigger && crossTL.scrollTrigger.kill(); crossTL.kill(); crossTL = null; }
    const hero = $('.hero'), content = $('.hero__content'), top = $('.hero__top');
    if (isDesktop()) {
      const veil = $('.hero__veil');
      gsap.set(maskG, { svgOrigin: `${maskCenter.x} ${maskCenter.y}` });
      crossTL = gsap.timeline({
        scrollTrigger: { trigger: hero, start: 'top top', end: '+=200%', pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true }
      });
      crossTL.to([content, top], { autoAlpha: 0, y: -16, ease: 'none', duration: 0.35 }, 0)
        .to(maskQG, { autoAlpha: 0, ease: 'none', duration: 0.2 }, 0)
        .to(maskG, { scale: 9, ease: 'power2.in', duration: 0.75 }, 0)
        .to(maskShade, { opacity: 0, ease: 'none', duration: 0.45 }, 0.15)
        .to(maskOpen, { opacity: 1, ease: 'none', duration: 0.35 }, 0.4)
        .to(maskImg, { scale: 1.06, ease: 'none', duration: 1 }, 0)
        .to(veil, { opacity: 1, ease: 'none', duration: 0.3 }, 0.7);
    } else {
      const scene = $('.scene'), img = $('.scene__img'), veil = $('.scene__veil'), tag = $('.scene__tag');
      crossTL = gsap.timeline({
        scrollTrigger: { trigger: hero, start: 'top top', end: '+=110%', pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true }
      });
      crossTL.to([content, top, tag], { autoAlpha: 0, y: -16, ease: 'none', duration: 0.45 }, 0)
        .fromTo(scene, { clipPath: CLIP.door }, { clipPath: CLIP.open, ease: 'soft', duration: 1, immediateRender: false }, 0)
        .to(img, { scale: 1.05, yPercent: 0, ease: 'soft', duration: 1 }, 0)
        .to(veil, { opacity: 1, ease: 'none', duration: 0.5 }, 0.5);
    }
  };

  /* ---------- Поле невидимых причин ---------- */
  const field = () => {
    const words = $$('.field__words span');
    if (!words.length) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const pin = $('.field__pin');
      gsap.set(words, { y: (i) => (i % 2 ? 46 : -46) });
      const tl = gsap.timeline({ scrollTrigger: { trigger: pin, start: 'top top', end: '+=150%', pin: true, scrub: 0.5, anticipatePin: 1, invalidateOnRefresh: true } });
      tl.to(words, { filter: 'blur(0px)', opacity: 1, y: 0, duration: 1, ease: 'none', stagger: { each: 0.1, from: 'random' } }, 0.1);
      return () => gsap.set(words, { clearProps: 'all' });
    });
    mm.add('(max-width: 899px)', () => {
      gsap.to(words, { filter: 'blur(0px)', opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.field__words', start: 'top 85%', end: 'top 35%', scrub: true } });
    });
  };

  /* ---------- Появления ---------- */
  const reveals = () => {
    // Заголовки и крупные строки — масками по строкам
    if (hasSplit) {
      $$('.split').forEach((el) => {
        SplitText.create(el, {
          type: 'lines', mask: 'lines', linesClass: 'sl', autoSplit: true,
          onSplit(self) {
            gsap.set(el, { visibility: 'visible' });
            return gsap.from(self.lines, { yPercent: 110, duration: 1.05, ease: 'softOut', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
          }
        });
      });
    } else {
      gsap.set('.split', { visibility: 'visible' });
    }

    // Остальные блоки: opacity 0 → 1, translateY 22px → 0, один раз
    $$('.reveal').forEach((el) => {
      gsap.set(el, { visibility: 'visible' });
      gsap.from(el, { autoAlpha: 0, y: 22, duration: 0.85, ease: 'soft', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    $$('.stack').forEach((st) => {
      const items = $$('li', st);
      gsap.from(items, { autoAlpha: 0, y: 14, duration: 0.85, stagger: 0.1, ease: 'soft', scrollTrigger: { trigger: st, start: 'top 82%', once: true } });
      gsap.to(items, { '--rs': 1, duration: 1.1, stagger: 0.1, ease: 'soft', scrollTrigger: { trigger: st, start: 'top 82%', once: true } });
    });

    // Эхо: фраза повторяется — как сценарий
    $$('.echo').forEach((e) => {
      gsap.from($$('.echo__ghost', e), { y: 0, opacity: 0, duration: 1.3, ease: 'soft', stagger: 0.16, scrollTrigger: { trigger: e, start: 'top 80%', once: true } });
    });

    $$('.steps').forEach((s) => {
      gsap.to(s, { '--ls': 1, duration: 1.5, ease: 'soft', scrollTrigger: { trigger: s, start: 'top 75%', once: true } });
      gsap.from($$('li', s), { autoAlpha: 0, x: -10, duration: 0.8, stagger: 0.16, ease: 'soft', scrollTrigger: { trigger: s, start: 'top 75%', once: true } });
    });

    // Счётчики фактов набегают от нуля
    $$('.facts dt[data-count]').forEach((dt) => {
      const target = parseInt(dt.dataset.count, 10), suffix = dt.dataset.suffix || '';
      const o = { v: 0 };
      gsap.to(o, { v: target, duration: 1.2, ease: 'softOut', scrollTrigger: { trigger: dt, start: 'top 85%', once: true },
        onUpdate: () => { dt.textContent = Math.round(o.v).toLocaleString('ru-RU') + suffix; } });
    });

    // Параллакс внутри рамок и на полноэкранных фото
    $$('.media').forEach((f) => {
      const img = $('img', f);
      if (!img) return;
      gsap.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('.bleed').forEach((f) => {
      const img = $('img', f);
      gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  };

  // Коридор тем: горизонтальный проход (только на десктопе)
  const corridor = () => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const sec = $('.work'), track = $('.work__track'), prog = $('.work__progress i');
      if (!sec || !track) return;
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tl = gsap.timeline({
        scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      tl.to(track, { x: () => -dist(), ease: 'none' }, 0);
      if (prog) tl.to(prog, { scaleX: 1, ease: 'none' }, 0);
    });
  };

  let lastDesktop = isDesktop();
  const start = () => {
    layoutMask();
    if (isDesktop()) introDesktop(); else introMobile();
    crossing();
    field();
    reveals();
    corridor();
    ScrollTrigger.refresh();
    if (location.hash && $(location.hash)) setTimeout(() => goTo(location.hash), 200);
  };

  window.addEventListener('resize', debounce(() => {
    const d = isDesktop();
    if (d !== lastDesktop) { lastDesktop = d; location.reload(); return; }   // раскладка героя разная — проще перезагрузить
    if (d) { layoutMask(); crossing(); ScrollTrigger.refresh(); }
  }, 250));

  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
