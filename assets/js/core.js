/* Меню: открытие/закрытие, фокус, Esc, запоминание языка. Без библиотек. */
(function(){
  var menu = document.getElementById('mnMenu');
  var openBtn = document.getElementById('mnOpen');
  var closeBtn = document.getElementById('mnClose');
  if(!menu || !openBtn || !closeBtn) return;
  var root = document.documentElement, last = null;

  // видео в углу панели: грузим только при первом открытии меню, на паузу — когда меню закрыто
  var vid = menu.querySelector('.mn-menu__video video');
  var conn = navigator.connection;
  var skipVideo = !vid || !!(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));
  var calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var stopTimer = 0;
  function startVideo(){
    if(skipVideo) return;
    clearTimeout(stopTimer);
    if(!vid.dataset.ready){
      [].forEach.call(vid.querySelectorAll('source[data-src]'), function(s){ s.src = s.getAttribute('data-src'); s.removeAttribute('data-src'); });
      vid.dataset.ready = '1'; vid.load();
    }
    if(calm) return;                                   // при «уменьшить анимацию» — только первый кадр
    var p = vid.play(); if(p && p.catch) p.catch(function(){});
  }
  function stopVideo(){
    if(skipVideo) return;
    stopTimer = setTimeout(function(){ if(!isOpen()) vid.pause(); }, 1300);  // после того как панель уехала (закрытие 1.25s)
  }

  function isOpen(){ return menu.classList.contains('is-open'); }
  function open(){
    last = document.activeElement;
    menu.classList.add('is-open'); root.classList.add('menu-open');
    openBtn.setAttribute('aria-expanded','true');
    startVideo();
    setTimeout(function(){ closeBtn.focus({preventScroll:true}); }, 60);
  }
  function close(restoreFocus){
    menu.classList.remove('is-open'); root.classList.remove('menu-open');
    openBtn.setAttribute('aria-expanded','false');
    stopVideo();
    if(restoreFocus !== false) (last || openBtn).focus({preventScroll:true});
  }
  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', function(){ close(); });

  document.addEventListener('keydown', function(e){
    if(!isOpen()) return;
    if(e.key === 'Escape'){ close(); return; }
    if(e.key !== 'Tab') return;                       // не выпускаем фокус из меню
    var f = [].slice.call(menu.querySelectorAll('a[href],button')).filter(function(n){ return n.offsetParent !== null; });
    if(!f.length) return;
    var a = f[0], z = f[f.length-1];
    if(e.shiftKey && document.activeElement === a){ e.preventDefault(); z.focus(); }
    else if(!e.shiftKey && document.activeElement === z){ e.preventDefault(); a.focus(); }
  });

  // ссылка на текущую страницу / якорь — просто закрыть меню
  menu.addEventListener('click', function(e){
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if(!a) return;
    var lang = a.getAttribute('data-lang');
    if(lang){ try{ localStorage.setItem('lang', lang); }catch(_){} }
    if(a.pathname === location.pathname && a.origin === location.origin) close(false);
  });

  // возврат по «Назад» (bfcache) не должен показывать открытое меню
  window.addEventListener('pageshow', function(){ if(isOpen()) close(false); });
})();

;
/* Контактная панель + отправка заявки напрямую в Firestore (REST, без SDK).
   Коллекция `leads`: правила разрешают только create с проверкой полей. */
(function(){
  var root = document.documentElement;
  var panel = document.getElementById('contact-panel');
  var backdrop = document.getElementById('contact-backdrop');
  var openBtn = document.getElementById('open-contact');
  var closeBtn = document.getElementById('close-contact');
  var form = document.getElementById('contact-form');
  if(!panel || !openBtn || !form) return;

  function openPanel(){ panel.classList.add('is-open'); backdrop.classList.add('is-open'); root.classList.add('contact-open'); }
  function closePanel(){ panel.classList.remove('is-open'); backdrop.classList.remove('is-open'); root.classList.remove('contact-open'); }
  openBtn.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  backdrop.addEventListener('click', closePanel);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closePanel(); });

  // placeholder скрывается, как только в поле появился текст
  [].slice.call(panel.querySelectorAll('.contact-field__input, .contact-field__textarea')).forEach(function(inp){
    var wrap = inp.parentNode;
    function sync(){ wrap.classList.toggle('has-value', inp.value.length > 0); }
    inp.addEventListener('input', sync); sync();
  });

  // выбор услуги
  var toggle = document.getElementById('service-toggle');
  var opts = document.getElementById('service-options');
  var label = document.getElementById('service-label');
  var plus = document.getElementById('service-plus');
  var hidden = document.getElementById('service-input');
  function setOpen(o){ opts.classList.toggle('is-open', o); toggle.setAttribute('aria-expanded', String(o)); plus.textContent = o ? '–' : '+'; }
  toggle.addEventListener('click', function(){ setOpen(!opts.classList.contains('is-open')); });
  [].slice.call(opts.querySelectorAll('button')).forEach(function(b){
    b.addEventListener('click', function(){
      hidden.value = b.textContent; label.textContent = b.textContent;
      toggle.classList.add('has-value'); setOpen(false);
    });
  });

  // отправка
  var status = document.getElementById('contact-status');
  var submitBtn = form.querySelector('.contact-panel__submit');
  var FIELDS = ['name','email','company','role','service','message'];
  var busy = false;

  function say(text, bad){ status.textContent = text; status.classList.toggle('is-error', !!bad); }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(busy) return;
    var d = form.elements;
    if(d.website && d.website.value){ say(form.dataset.ok); return; }          // honeypot
    var email = (d.email.value || '').trim();
    if(!(d.name.value || '').trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !(d.message.value || '').trim()){
      say('Name, a valid email and a message are required.', true);
      return;
    }
    var fields = { createdAt: { timestampValue: new Date().toISOString() },
                   page: { stringValue: location.pathname } };
    FIELDS.forEach(function(k){
      var v = d[k] ? String(d[k].value || '').trim().slice(0, k === 'message' ? 4000 : 300) : '';
      fields[k] = { stringValue: v };
    });

    var url = 'https://firestore.googleapis.com/v1/projects/' + form.dataset.project +
              '/databases/(default)/documents/leads?key=' + encodeURIComponent(form.dataset.key);
    busy = true; submitBtn.disabled = true; say('…');
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: fields }) })
      .then(function(r){ if(!r.ok) throw new Error(r.status); form.reset(); say(form.dataset.ok); })
      .catch(function(){ say(form.dataset.error, true); })
      .then(function(){ busy = false; submitBtn.disabled = false; });
  });
})();

;
/* Ленивые видео: на первом экране грузится только hero (в разметке),
   остальные ~13 роликов получают src, когда секция подходит к экрану,
   и ставятся на паузу, когда уходят далеко (экономия CPU/батареи). */
(function(){
  var vids = [].slice.call(document.querySelectorAll('video[data-src]'));
  if(!vids.length) return;

  // Режим экономии трафика: не качаем фоновые ролики вообще
  var c = navigator.connection;
  if(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;

  function play(v){ var p = v.play(); if(p && p.catch) p.catch(function(){}); }

  function load(v){
    if(!v.dataset.src) return;
    v.src = v.dataset.src;
    v.removeAttribute('data-src');
    v.load();
    if(v.hasAttribute('data-autoplay')) play(v);
  }

  if(!('IntersectionObserver' in window)){ vids.forEach(load); return; }

  // 1) подгрузка заранее — за ~1.5 экрана до появления
  var loader = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      loader.unobserve(en.target);
      (en.target.__videos || [en.target]).forEach(load);
    });
  }, { rootMargin: '150% 0px' });

  // 2) play/pause по видимости
  var player = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      var v = en.target;
      if(en.isIntersecting){ if(v.src) play(v); } else if(!v.paused){ v.pause(); }
    });
  }, { rootMargin: '25% 0px' });

  vids.forEach(function(v){
    var forId = v.getAttribute('data-lazy-for');
    if(forId){
      // оверлей-«takeover» фиксирован на экране: грузим по приближению его секции
      var sec = document.getElementById(forId);
      if(sec){ (sec.__videos = sec.__videos || []).push(v); loader.observe(sec); return; }
    }
    loader.observe(v);
    if(v.hasAttribute('data-autoplay')) player.observe(v);
  });
})();
