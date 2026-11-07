/* RE:TURN - site behaviour. No dependencies. */
(() => {
  'use strict';

  const SHOP = 'https://www.ticket.return.de.com/';
  const SITE = 'https://return.de.com/';
  const TZ = 'Europe/Berlin';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- navigation ---------- */
  const nav = document.getElementById('nav');
  const sentinel = document.getElementById('hero-sentinel');
  if (nav && sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      nav.classList.toggle('is-solid', !entry.isIntersecting);
    }).observe(sentinel);
  } else if (nav) {
    nav.classList.add('is-solid');
  }

  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');
  const setMenu = (open) => {
    if (!burger || !menu) return;
    menu.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-open', open);
    if (open) {
      const first = menu.querySelector('a');
      if (first) first.focus();
    }
  };
  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(menu.hidden));
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) {
        setMenu(false);
        burger.focus();
      }
    });
  }

  /* ---------- hero entry animation safety net ---------- */
  window.setTimeout(() => document.documentElement.classList.remove('hero-anim'), 2500);

  /* ---------- scroll reveal ---------- */
  let revealObserver = null;
  // Fade-up reveals only when the page is actually visible; a hidden tab gets static content.
  if (!reduce.matches && document.visibilityState === 'visible' && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  }
  const watchReveal = (root) => {
    root.querySelectorAll('[data-reveal]').forEach((el) => {
      if (revealObserver) revealObserver.observe(el);
      else el.classList.add('in');
    });
  };
  watchReveal(document);
  // Safety net: whatever is still hidden after 10 s becomes visible without animation.
  window.setTimeout(() => {
    document.querySelectorAll('[data-reveal]:not(.in)').forEach((el) => el.classList.add('in'));
  }, 10000);

  /* ---------- hero video ---------- */
  const video = document.querySelector('.hero__video');
  if (video) {
    if (reduce.matches) {
      video.removeAttribute('autoplay');
      video.pause();
    } else {
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  /* ---------- SoundCloud: the player loads only after a click ---------- */
  const player = document.getElementById('sc-player');
  const loadBtn = document.getElementById('sc-load');
  if (player && loadBtn) {
    loadBtn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = player.dataset.embed;
      iframe.title = 'RE:TURN on SoundCloud';
      iframe.allow = 'autoplay; encrypted-media';
      iframe.setAttribute('scrolling', 'no');
      player.replaceChildren(iframe);
      player.classList.add('is-loaded');
      iframe.focus();
    });
  }

  /* ---------- events ---------- */
  const berlinNow = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type) => (parts.find((p) => p.type === type) || {}).value;
    return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
  };
  const utcDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  };
  const shiftDate = (iso, days) => {
    const dt = utcDate(iso);
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
  };
  const fmt = (iso, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts }).format(utcDate(iso));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  const relative = (iso, now) => {
    if (iso === now.date || iso === shiftDate(now.date, -1)) return 'Tonight';
    if (iso === shiftDate(now.date, 1)) return 'Tomorrow';
    const diff = Math.round((utcDate(iso) - utcDate(now.date)) / 864e5);
    const weekday = fmt(iso, { weekday: 'long' });
    if (diff > 1 && diff < 7) return `This ${weekday}`;
    return `${weekday}, ${fmt(iso, { day: 'numeric', month: 'long' })}`;
  };
  const entryText = (ev) => {
    if (!ev.entry) return '';
    if (typeof ev.entry === 'string') return ev.entry;
    const { ladies, gents } = ev.entry;
    if (ladies == null || gents == null) return `${ladies ?? gents} €`;
    return ladies === gents ? `${ladies} €` : `${ladies} € ladies, ${gents} € gents`;
  };
  const lowestPrice = (ev) => {
    if (!ev.entry || typeof ev.entry === 'string') return undefined;
    const nums = Object.values(ev.entry).filter((v) => typeof v === 'number');
    return nums.length ? Math.min(...nums) : undefined;
  };
  const lineupText = (ev) => ev.lineup.join(', ') + (ev.opening ? `, opening ${ev.opening}` : '');

  const renderFeatured = (ev, now) => `
    <article class="featured" data-reveal>
      <div class="featured__date" aria-hidden="true">
        <span class="featured__day">${fmt(ev.date, { day: '2-digit' })}</span>
        <span class="featured__month">${fmt(ev.date, { month: 'short' })}<small>${fmt(ev.date, { weekday: 'long' })}</small></span>
      </div>
      <div class="featured__body">
        <p class="featured__when"><strong>Next night</strong> ${esc(relative(ev.date, now))}, doors ${esc(ev.doors || '22:00')}
          <span class="sr-only">(${fmt(ev.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })})</span></p>
        <h3 class="featured__lineup">${ev.lineup.map((n) => `<span class="glitch" data-text="${esc(n)}">${esc(n)}</span>`).join('')}</h3>
        ${ev.opening ? `<p class="featured__opening">Opening: ${esc(ev.opening)}</p>` : ''}
        <p class="featured__meta"><span>${esc(ev.genre || 'Techno')}</span><span>${esc(entryText(ev))}</span><span>${esc(ev.age || '18+')}</span></p>
        <a class="btn btn--red" href="${esc(ev.tickets || SHOP)}" target="_blank" rel="noopener">Tickets</a>
      </div>
    </article>`;

  const renderRow = (ev) => {
    const names = ev.lineup.join(', ');
    return `
    <li class="event" data-reveal>
      <time class="event__date" datetime="${esc(ev.date)}">
        <span class="event__day">${fmt(ev.date, { day: '2-digit' })}</span>
        <span class="event__rest">${fmt(ev.date, { weekday: 'short' })}<br>${fmt(ev.date, { month: 'short' })}</span>
      </time>
      <div class="event__main">
        <h3 class="event__lineup"><span class="glitch" data-text="${esc(names)}">${esc(names)}</span></h3>
        <p class="event__meta">${ev.opening ? `<span>Opening: ${esc(ev.opening)}</span>` : ''}<span>Doors ${esc(ev.doors || '22:00')}</span><span>${esc(entryText(ev))}</span></p>
      </div>
      <a class="btn btn--ghost event__tickets" href="${esc(ev.tickets || SHOP)}" target="_blank" rel="noopener">Tickets</a>
    </li>`;
  };

  const offsetFor = (iso) => {
    try {
      const part = new Intl.DateTimeFormat('en', { timeZone: TZ, timeZoneName: 'longOffset' })
        .formatToParts(new Date(`${iso}T20:00:00Z`)).find((x) => x.type === 'timeZoneName');
      const m = part && part.value.match(/([+-]\d{2}:\d{2})/);
      return m ? m[1] : '';
    } catch (e) {
      return '';
    }
  };

  const injectJsonLd = (events, venue) => {
    const v = venue || {};
    const place = {
      '@type': 'Place',
      name: v.name || 'Matrix Club Berlin',
      address: {
        '@type': 'PostalAddress',
        streetAddress: v.street || 'Warschauer Platz 18',
        postalCode: v.zip || '10245',
        addressLocality: v.city || 'Berlin',
        addressCountry: 'DE',
      },
    };
    const ld = events.map((ev) => {
      const price = lowestPrice(ev);
      return {
        '@context': 'https://schema.org',
        '@type': 'MusicEvent',
        name: `RE:TURN with ${lineupText(ev)}`,
        startDate: `${ev.date}T${ev.doors || '22:00'}:00${offsetFor(ev.date)}`,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: place,
        organizer: { '@type': 'Organization', name: 'RE:TURN Collective', url: SITE },
        performer: ev.lineup.map((n) => ({ '@type': 'MusicGroup', name: n })),
        image: `${SITE}assets/og.jpg`,
        offers: {
          '@type': 'Offer',
          url: ev.tickets || SHOP,
          priceCurrency: 'EUR',
          ...(price != null ? { price } : {}),
          availability: 'https://schema.org/InStock',
        },
      };
    });
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  };

  const render = (data) => {
    const now = berlinNow();
    const featuredEl = document.getElementById('featured');
    const listEl = document.getElementById('events');
    const emptyEl = document.getElementById('events-empty');
    if (!featuredEl || !listEl) return;

    const events = (data.events || [])
      .filter((ev) => ev && ev.date && Array.isArray(ev.lineup) && ev.lineup.length)
      .sort((a, b) => a.date.localeCompare(b.date));
    // A night counts as upcoming until 07:00 Berlin time the morning after.
    const upcoming = events.filter((ev) => ev.date >= now.date || (shiftDate(ev.date, 1) === now.date && now.hour < 7));

    if (!upcoming.length) {
      featuredEl.innerHTML = '';
      listEl.innerHTML = '';
      listEl.hidden = true;
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    const [next, ...rest] = upcoming;
    featuredEl.innerHTML = renderFeatured(next, now);
    listEl.innerHTML = rest.map(renderRow).join('');
    listEl.hidden = rest.length === 0;
    if (emptyEl) emptyEl.hidden = true;
    document.querySelectorAll('[data-next-tickets]').forEach((a) => {
      a.href = next.tickets || data.shop || SHOP;
    });
    watchReveal(featuredEl);
    watchReveal(listEl);
    injectJsonLd(upcoming, data.venue);
  };

  let inline = { events: [] };
  try {
    inline = JSON.parse(document.getElementById('events-data').textContent);
  } catch (e) { /* keep empty */ }

  const load = async () => {
    try {
      const res = await fetch('data/events.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(String(res.status));
      return await res.json();
    } catch (e) {
      return inline;
    }
  };
  load().then(render).catch(() => render(inline));
})();
