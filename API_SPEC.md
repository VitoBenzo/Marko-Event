# Marko Event API – Kurzspezifikation

## 1) Vergangene Events

### GET `/api/past-events`
Liefert alle vergangenen Events (neueste zuerst).

**Response 200**
```json
[
  {
    "id": "pe_01JXYZ...",
    "club_name": "Dream Club",
    "date": "27 FEB 2026",
    "title": "Dream Club · 27 FEB 2026",
    "description": "Aftermovie & Impressionen",
    "created_at": "2026-03-05T14:10:00.000Z",
    "updated_at": "2026-03-05T14:10:00.000Z"
  }
]
```

### POST `/api/past-events` (auth)
Erstellt ein vergangenes Event.

**Request body**
```json
{
  "club_name": "Dream Club",
  "date": "27 FEB 2026",
  "title": "Dream Club · 27 FEB 2026",
  "description": "Aftermovie & Impressionen"
}
```

**Validierung**
- `club_name`: required, string, 1..120
- `date`: required, string, 1..60
- `title`: optional, string, 0..180
- `description`: optional, string, 0..1000

**Response 201**
```json
{
  "id": "pe_01JXYZ...",
  "club_name": "Dream Club",
  "date": "27 FEB 2026",
  "title": "Dream Club · 27 FEB 2026",
  "description": "Aftermovie & Impressionen",
  "created_at": "2026-03-05T14:10:00.000Z",
  "updated_at": "2026-03-05T14:10:00.000Z"
}
```

### PUT `/api/past-events/:id` (auth)
Обновляет событие.

**Request body** — тот же формат, что у `POST`.

**Response 200**
```json
{
  "id": "pe_01JXYZ...",
  "club_name": "Dream Club",
  "date": "01 MAR 2026",
  "title": "Dream Club · 01 MAR 2026",
  "description": "Updated",
  "created_at": "2026-03-05T14:10:00.000Z",
  "updated_at": "2026-03-05T15:00:00.000Z"
}
```

### DELETE `/api/past-events/:id` (auth)
Удаляет событие.

**Response 204**
Пустое тело.

---

## 2) Fotos für Event-Seiten

Текущий фронтенд ожидает `GET /api/photos` и умеет связывать фото с прошедшим событием двумя способами:

1. **Предпочтительный:** поле `past_event_id` в фото-объекте.
2. **Fallback:** парсинг подписи `caption` в формате `Club Name · Date`.

### GET `/api/photos`

**Минимально нужный формат фото для новой логики**
```json
[
  {
    "id": "ph_01JXYZ...",
    "url": "https://.../uploads/photo-1.jpg",
    "caption": "Dream Club · 27 FEB 2026",
    "past_event_id": "pe_01JXYZ..."
  }
]
```

---

## 3) Ошибки

Рекомендуемый формат ошибок:

```json
{
  "error": "ValidationError",
  "message": "club_name is required"
}
```

Коды:
- `400` — неверные данные
- `401` — нет/неверный токен
- `404` — событие не найдено
- `500` — внутренняя ошибка

---

## 4) Hinweise für Backend-Implementierung

- Идентификаторы: строковые (`id`), чтобы не зависеть от типа БД.
- `title` можно генерировать сервером автоматически как `club_name + ' · ' + date`, если не передан.
- Для стабильного порядка в админке и на сайте возвращать сортировку по `date/created_at` (новые сверху).
- При удалении past-event желательно отвязывать `photos.past_event_id = null` (или каскадно удалять по вашей бизнес-логике).
