# Marko Event — Deploy & Security Checklist (Nginx + API)

Статус релиза: **выпускать только после выполнения всех MUST**.

## 1) MUST: Auth / пароль админки

- [ ] Пароль в БД хранится **только в hash** (`argon2id` или `bcrypt`, cost >= 12).
- [ ] Нет plaintext паролей в коде, `.env`, логах, SQL дампах.
- [ ] Endpoint `POST /api/login` защищён rate-limit (например `5 попыток / 15 минут / IP`).
- [ ] После N неудачных попыток включается lockout/задержка.
- [ ] Включён аудит-лог входов (успех/ошибка, IP, user-agent, timestamp).
- [ ] Токен авторизации имеет короткий TTL (например `15-60 минут`) + refresh-ротация.

## 2) MUST: Токены и сессии

Предпочтительно перейти на cookie-схему:
- `Set-Cookie: admin_session=...; HttpOnly; Secure; SameSite=Strict; Path=/api`

Если остаётся Bearer:
- [ ] TTL короткий.
- [ ] Подпись JWT с сильным секретом (`>=32 bytes`).
- [ ] Отзыв токенов/ротация при logout и смене пароля.

## 3) MUST: HTTPS и Nginx

- [ ] Домен доступен только по HTTPS.
- [ ] HTTP (`:80`) делает redirect на HTTPS.
- [ ] Включён HSTS.
- [ ] TLS не ниже 1.2 (лучше 1.3).

Пример минимального блока Nginx:

```nginx
server {
  listen 80;
  server_name your-domain.tld;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name your-domain.tld;

  ssl_certificate /etc/letsencrypt/live/your-domain.tld/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.tld/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

  add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self';" always;

  root /var/www/marko-event;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /uploads/ {
    autoindex off;
    add_header X-Content-Type-Options "nosniff" always;
    try_files $uri =404;
  }
}
```

## 4) MUST: API hardening

- [ ] CORS только для вашего домена (без `*`).
- [ ] Валидация всех входных полей на сервере (длина, тип, формат).
- [ ] Endpoint-ы админки закрыты middleware авторизации.
- [ ] JSON ошибки без утечек stack trace.
- [ ] В production отключены debug/verbose ответы.

## 5) MUST: Upload security

- [ ] Проверка MIME + расширения + magic bytes файла.
- [ ] Лимит размера файла (например `<= 8MB`).
- [ ] Переименование файла на сервере (UUID), не использовать исходное имя как путь.
- [ ] Запрет выполнения скриптов в директории `/uploads`.
- [ ] При отдаче файлов выставлять корректный `Content-Type`.

## 6) MUST: Database / секреты

- [ ] `DATABASE_URL`, JWT_SECRET, admin secrets хранятся только в env/secret manager.
- [ ] Нет секретов в Git.
- [ ] Бэкапы БД включены и проверено восстановление.
- [ ] Права БД минимальные (least privilege).

## 7) SHOULD: Мониторинг и аварийность

- [ ] Логи приложения и Nginx централизованы.
- [ ] Алерты: 5xx всплеск, ошибки логина, рост 401/403.
- [ ] Health endpoint (`/api/health`) и uptime мониторинг.

## 8) Быстрый pre-release smoke test

- [ ] Открывается `index.html`, `admin.html`, `past-event.html`.
- [ ] Логин в админку работает только через HTTPS.
- [ ] CRUD для past-events работает (`GET/POST/PUT/DELETE`).
- [ ] Загрузка фото работает, фото корректно попадают в event-страницу.
- [ ] В браузере нет mixed-content ошибок.
- [ ] Security headers видны в ответе (`curl -I https://your-domain.tld`).

## 9) Команды для финальной проверки

```bash
# Проверка заголовков
curl -I https://your-domain.tld

# Проверка CSP/HSTS
curl -sI https://your-domain.tld | grep -Ei "content-security-policy|strict-transport-security|x-frame-options|x-content-type-options|referrer-policy"

# Проверка API авторизации (пример)
curl -s -X POST https://your-domain.tld/api/login \
  -H 'Content-Type: application/json' \
  -d '{"password":"WRONG"}'
```

---

## Release decision

- **GO**: все пункты MUST закрыты.
- **NO-GO**: хотя бы один MUST не закрыт (особенно auth, HTTPS, upload, CORS).
