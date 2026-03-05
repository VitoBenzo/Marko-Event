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
    if (url.protocol === 'http:' || url.protocol === 'https:') {
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
    el.textContent = value;
  });

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

async function loadPastEvent() {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get('id') || '';
  const eventSlug = params.get('event') || '';
  const eventLabelFromQuery = (params.get('label') || '').trim();

  const titleEl = document.getElementById('past-event-title');
  const galleryEl = document.getElementById('past-event-gallery');
  if (!titleEl || !galleryEl) return;

  try {
    const [pastRes, photosRes] = await Promise.all([
      fetch('/api/past-events'),
      fetch('/api/photos')
    ]);

    if (!photosRes.ok) throw new Error('Photos request failed');
    const photos = await photosRes.json();
    const pastEvents = pastRes.ok ? await pastRes.json() : [];

    let selectedEvent = null;
    if (Array.isArray(pastEvents) && pastEvents.length) {
      selectedEvent = pastEvents.find((item) => String(item.id || '') === String(eventId || '')) || null;

      if (!selectedEvent && eventSlug) {
        selectedEvent = pastEvents.find((item) => {
          const label = String(item.title || (String(item.club_name || '') + ' · ' + String(item.date || '')).trim()).trim();
          return slugify(label) === eventSlug;
        }) || null;
      }
    }

    const selectedLabel = selectedEvent
      ? String(selectedEvent.title || (String(selectedEvent.club_name || '') + ' · ' + String(selectedEvent.date || '')).trim()).trim()
      : '';

    const resolvedLabel = selectedLabel || eventLabelFromQuery || t('pastEvents.title', 'Past Event');
    titleEl.textContent = resolvedLabel;
    document.title = 'Marko Event – ' + resolvedLabel;

    const normalizedTarget = slugify(resolvedLabel);
    const eventPhotos = photos.filter((photo) => {
      if (selectedEvent && selectedEvent.id && photo.past_event_id) {
        return String(photo.past_event_id) === String(selectedEvent.id);
      }
      const photoLabel = extractEventLabel(photo.caption || '');
      return slugify(photoLabel) === normalizedTarget;
    });

    if (!eventPhotos.length) {
      galleryEl.innerHTML = '<div class="past-events-empty">' + t('pastEvents.emptyPhotos', 'Für dieses Event sind noch keine Fotos verfügbar.') + '</div>';
      return;
    }

    galleryEl.innerHTML = eventPhotos.map((photo) => {
      const imageUrl = safeUrl(photo.url);
      if (!imageUrl) return '';
      const caption = String(photo.caption || '').trim();
      const altText = caption || t('gallery.photoAlt', 'Event Foto');
      return (
        '<div class="past-event-photo">' +
          '<img src="' + imageUrl + '" alt="' + escapeHtml(altText) + '">' +
          (caption ? '<div class="past-event-caption">' + escapeHtml(caption) + '</div>' : '') +
        '</div>'
      );
    }).join('');
  } catch (error) {
    galleryEl.innerHTML = '<div class="past-events-empty">' + t('pastEvents.loadError', 'Fehler beim Laden der Fotos.') + '</div>';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  document.body.classList.add('loaded');
  await initI18n();
  await loadPastEvent();
});
