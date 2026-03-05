  let i18n = {};
  let currentLang = 'de';

  function t(key, fallback = '') {
    return i18n[key] ?? fallback;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value || ''), window.location.origin);
      if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'maps:') {
        return url.href;
      }
      return null;
    } catch {
      return null;
    }
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function extractEventLabel(caption) {
    const normalized = String(caption || '').trim();
    if (!normalized) return '';

    if (normalized.includes('·')) {
      const parts = normalized.split('·').map((item) => item.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return parts[0] + ' · ' + parts[1];
      }
    }

    if (normalized.includes('|')) {
      const parts = normalized.split('|').map((item) => item.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return parts[0] + ' · ' + parts[1];
      }
    }

    return normalized;
  }

  async function loadTranslations(lang) {
    try {
      const res = await fetch('lang/' + lang + '/site.json');
      if (!res.ok) throw new Error('Translation file not found');
      return await res.json();
    } catch (err) {
      if (lang !== 'de') {
        return loadTranslations('de');
      }
      return {};
    }
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const value = t(key, el.textContent);

      if (key === 'footer.copy') {
        const yearEl = document.getElementById('year');
        const year = yearEl ? yearEl.textContent : String(new Date().getFullYear());
        el.innerHTML = value.replace('{year}', '<span id="year">' + year + '</span>');
        return;
      }

      el.textContent = value;
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      if (!key) return;
      const value = t(key, el.innerHTML);
      el.innerHTML = value;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (!key) return;
      const value = t(key, el.getAttribute('placeholder') || '');
      el.setAttribute('placeholder', value);
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria-label');
      if (!key) return;
      const value = t(key, el.getAttribute('aria-label') || '');
      el.setAttribute('aria-label', value);
    });

    document.title = t('meta.title', document.title);
    document.documentElement.lang = currentLang;
  }

  async function setLanguage(lang) {
    currentLang = lang;
    i18n = await loadTranslations(lang);
    applyTranslations();
    localStorage.setItem('site-language', lang);
  }

  async function initI18n() {
    const langSelect = document.getElementById('language-select');
    const saved = localStorage.getItem('site-language');
    const browserLang = (navigator.language || 'de').toLowerCase();
    const initial = saved || (browserLang.startsWith('ru') ? 'ru' : 'de');

    if (langSelect) {
      langSelect.value = initial;
      langSelect.addEventListener('change', async (e) => {
        await setLanguage(e.target.value);
      });
    }

    await setLanguage(initial);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('loaded');

    const nav = document.querySelector('nav');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
      const current = window.scrollY;
      if (current > lastScrollY && current > 80) {
        if (nav) nav.classList.add('hidden');
      } else {
        if (nav) nav.classList.remove('hidden');
      }
      lastScrollY = current;
    });

    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (mobileBtn && mobileMenu) {
      const toggleMenu = () => {
        mobileBtn.classList.toggle('active');
        mobileMenu.classList.toggle('open');
      };
      mobileBtn.addEventListener('click', toggleMenu);
      mobileBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleMenu();
        }
      });
      mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          mobileBtn.classList.remove('active');
          mobileMenu.classList.remove('open');
        });
      });
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animation = 'fadeUp 0.7s ease both';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.mix-card, .past-event-item, .gallery-item, .next-event').forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });

    await initI18n();
    loadSiteData();
  });

  function showToast(message, type = 'success') {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('success', 'error', 'show');
    if (type === 'success') {
      toast.classList.add('success');
    } else if (type === 'error') {
      toast.classList.add('error');
    }
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button');
    const originalText = btn.textContent;

    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span>';

    const data = {
      name: document.getElementById('f-name').value,
      email: document.getElementById('f-email').value,
      event_type: document.getElementById('f-type').value,
      message: document.getElementById('f-msg').value,
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Request failed');

      btn.textContent = t('form.sent', '✓ Gesendet!');
      btn.style.background = 'linear-gradient(135deg, #059669, #0d9488)';
      showToast(t('toast.success', 'Anfrage erfolgreich gesendet.'), 'success');

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.disabled = false;
        form.reset();
      }, 2000);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t('form.error', 'Fehler – nochmal versuchen');
      showToast(t('toast.error', 'Es gab einen Fehler. Bitte später erneut versuchen.'), 'error');

      setTimeout(() => {
        btn.textContent = originalText;
      }, 3000);
    }
  }

  function openModal(name) {
    const el = document.getElementById('modal-' + name);
    if (!el) return;
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }

  function closeModal(name) {
    const el = document.getElementById('modal-' + name);
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => {
        m.classList.remove('open');
        m.setAttribute('aria-hidden', 'true');
      });
    }
  });

  async function loadSiteData() {
    try {
      const res = await fetch('/api/event');
      if (res.ok) {
        const ev = await res.json();
        const datEl = document.getElementById('ev-date-display');
        if (datEl && ev.date) datEl.textContent = ev.date;
        const locDisp = document.getElementById('ev-location-display');
        if (locDisp && ev.location) locDisp.textContent = ev.location;
        const desc = document.getElementById('event-description');
        if (desc && ev.description) desc.textContent = ev.description;
        const locVal = document.getElementById('ev-loc-val');
        if (locVal && ev.location) locVal.textContent = ev.location;
        const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
        const encodedAddr = encodeURIComponent(ev.address || ev.location || '');
        const mapsUrl = encodedAddr
          ? (isApple ? 'maps://maps.apple.com/?q=' + encodedAddr : 'https://www.google.com/maps/search/' + encodedAddr)
          : null;
        const addrVal = document.getElementById('ev-addr-val');
        if (addrVal) {
          addrVal.textContent = '';
          if (mapsUrl) {
            const safeMapsUrl = safeUrl(mapsUrl);
            if (safeMapsUrl) {
              const a = document.createElement('a');
              a.href = safeMapsUrl;
              a.target = '_blank';
              a.rel = 'noopener noreferrer';
              a.style.color = '#a78bfa';
              a.style.textDecoration = 'none';
              a.textContent = (ev.address || ev.location || '') + ' 📍';
              addrVal.appendChild(a);
            }
          } else if (ev.address || ev.location) {
            addrVal.textContent = ev.address || ev.location;
          }
        }
        const timeVal = document.getElementById('ev-time-val');
        if (timeVal && ev.time) timeVal.textContent = ev.time;
        const genreVal = document.getElementById('ev-genre-val');
        if (genreVal && ev.genre) genreVal.textContent = ev.genre;
        if (ev.image_url) {
          const area = document.getElementById('event-image-area');
          const imageUrl = safeUrl(ev.image_url);
          if (area && imageUrl) {
            area.textContent = '';
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = 'Event';
            area.appendChild(img);
          }
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden des Events', e);
    }

    try {
      const res = await fetch('/api/mixes');
      if (res.ok) {
        const mixes = await res.json();
        const grid = document.querySelector('.mixes-grid');
        if (grid && mixes.length) {
          grid.innerHTML = mixes.map((m, i) =>
            (() => {
              const safeMixUrl = safeUrl(m.url);
              const title = escapeHtml(m.title);
              const genre = escapeHtml(m.genre);
              const duration = escapeHtml(m.duration);
              return (
            '<div class="mix-card">' +
              '<div class="mix-num">' + String(i + 1).padStart(2, '0') + '</div>' +
              '<div class="mix-info">' +
                '<div class="mix-title">' + title + '</div>' +
                '<div class="mix-meta">' + genre + '</div>' +
              '</div>' +
              '<div class="mix-duration">' + duration + '</div>' +
              '<div class="mix-play">' +
                (safeMixUrl ? '<a href="' + safeMixUrl + '" target="_blank" rel="noopener noreferrer">▶</a>' : '▶') +
              '</div>' +
            '</div>'
              );
            })()
          ).join('');
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden der Mixes', e);
    }

    try {
      const list = document.querySelector('.past-events-list');
      if (!list) {
        throw new Error('Past events list container not found');
      }

      const pastRes = await fetch('/api/past-events');

      if (pastRes.ok) {
        const pastEvents = await pastRes.json();
        if (Array.isArray(pastEvents) && pastEvents.length) {
          list.innerHTML = pastEvents.map((eventItem) => {
            const label = String(eventItem.title || (String(eventItem.club_name || '') + ' · ' + String(eventItem.date || '')).trim()).trim();
            const slug = slugify(label);
            const eventId = String(eventItem.id || '').trim();
            return (
              '<a class="past-event-item" href="past-event.html?id=' + encodeURIComponent(eventId) + '&event=' + encodeURIComponent(slug) + '&label=' + encodeURIComponent(label) + '">' +
                '<span class="past-event-name">' + escapeHtml(label) + '</span>' +
                '<span class="past-event-meta">' + escapeHtml(t('pastEvents.open', 'Open')) + ' →</span>' +
              '</a>'
            );
          }).join('');
          return;
        }
      }

      const [reviewsRes, photosRes] = await Promise.all([
        fetch('/api/reviews'),
        fetch('/api/photos')
      ]);

      if (!reviewsRes.ok) {
        list.innerHTML = '<div class="past-events-empty">' + escapeHtml(t('pastEvents.empty', 'Noch keine vergangenen Events.')) + '</div>';
        return;
      }

      const reviews = await reviewsRes.json();
      const photos = photosRes.ok ? await photosRes.json() : [];
      const eventMap = new Map();

      reviews.forEach((review) => {
        const label = String(review.event_label || '').trim();
        const slug = slugify(label);
        if (!label || !slug || eventMap.has(slug)) return;
        eventMap.set(slug, { label, slug });
      });

      photos.forEach((photo) => {
        const label = extractEventLabel(photo.caption || '');
        const slug = slugify(label);
        if (!label || !slug || eventMap.has(slug)) return;
        eventMap.set(slug, { label, slug });
      });

      const events = Array.from(eventMap.values());
      list.innerHTML = events.length
        ? events.map((eventItem) =>
            '<a class="past-event-item" href="past-event.html?event=' + encodeURIComponent(eventItem.slug) + '&label=' + encodeURIComponent(eventItem.label) + '">' +
              '<span class="past-event-name">' + escapeHtml(eventItem.label) + '</span>' +
              '<span class="past-event-meta">' + escapeHtml(t('pastEvents.open', 'Open')) + ' →</span>' +
            '</a>'
          ).join('')
        : '<div class="past-events-empty">' + escapeHtml(t('pastEvents.empty', 'Noch keine vergangenen Events.')) + '</div>';
    } catch (e) {
      console.error('Fehler beim Laden vergangener Events', e);
    }

    try {
      const res = await fetch('/api/photos');
      if (res.ok) {
        const photos = await res.json();
        if (photos.length > 0) {
          const grid = document.querySelector('.gallery-grid');
          if (grid) {
            grid.innerHTML = photos.map((p, i) =>
              (() => {
                const photoUrl = safeUrl(p.url);
                if (!photoUrl) return '';
                const caption = escapeHtml(p.caption || '');
                const altText = caption || escapeHtml(t('gallery.photoAlt', 'Event Foto'));
                return (
              '<div class="gallery-item' + (i === 0 ? '" style="grid-column:span 2;aspect-ratio:2/1"' : '"') + '>' +
                '<img src="' + photoUrl + '" alt="' + altText + '">' +
                '<div class="gallery-overlay">' + caption + '</div>' +
              '</div>'
                );
              })()
            ).join('');
          }
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden der Fotos', e);
    }
  }
