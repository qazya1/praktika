# Shaverma Study — упрощённая система заказов

Учебная версия проекта, выделенная из идей репозитория `shaverma`. Исходный репозиторий не изменяется.

## Что реализовано

- серверная прикладная подсистема на Python, FastAPI, SQLAlchemy и MySQL;
- меню, корзина, создание заказа и история заказов пользователя;
- авторизация клиента через проверяемые `initData` Telegram Mini Apps и MAX Mini Apps;
- отдельная авторизация сотрудников по логину и паролю;
- роли `cashier`, `cook`, `director` и разграничение смены статусов заказа;
- отдельная управляющая подсистема для Telegram/MAX;
- уведомление сотрудников о новом заказе;
- адаптивный пользовательский интерфейс и служебный интерфейс на HTML/CSS/TypeScript;
- функциональные тесты основных API-сценариев.

## Что намеренно удалено

Платежи, чеки, QR, бонусы, рефералы, несколько заведений, сложные директорские таблицы, фоновые очереди уведомлений и расширенная аналитика. Для задания достаточно базового цикла: **меню → корзина → заказ → обработка сотрудником**.

## Архитектура

```text
frontend/                 пользовательский и служебный веб-интерфейсы
backend/                  прикладная подсистема: API, MySQL, роли, заказы
manager/                  управляющая подсистема: Telegram/MAX и уведомления
mysql                     хранение пользователей, меню, сотрудников и заказов
```

Backend уведомляет Manager через внутренний HTTP-метод. Manager отправляет сообщения сотрудникам через Bot API Telegram и MAX. Ошибка мессенджера не отменяет созданный заказ.

## Запуск через Docker

```bash
cp .env.example .env
docker compose up --build
```

После запуска:

- клиент: `http://localhost:5173/`
- кабинет сотрудников: `http://localhost:5173/staff.html`
- Swagger backend: `http://localhost:8000/docs`
- health manager: `http://localhost:8100/health`

Демо-сотрудники создаются автоматически:

| Логин | Пароль | Роль |
|---|---|---|
| `cashier` | `cashier123` | кассир |
| `cook` | `cook123` | повар |
| `director` | `director123` | директор |

`DEV_AUTH=true` разрешает запуск клиентского интерфейса в обычном браузере. В production необходимо установить `DEV_AUTH=false` и задать реальные токены ботов.

## Локальный запуск без Docker

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Manager:

```bash
cd manager
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8100 --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Тестирование

```bash
cd backend
python -m pytest -q
```

Проверяются: загрузка меню, авторизация клиента, оформление заказа, вход сотрудников и разрешённые/запрещённые переходы статусов.

## Интеграция Mini Apps

Frontend берёт исходную строку:

- Telegram: `window.Telegram.WebApp.initData`;
- MAX: `window.WebApp.initData`.

Строка отправляется backend, где проверяется HMAC-подпись и срок действия. Небезопасные объекты `initDataUnsafe` для авторизации не используются.

## Основные API

- `GET /api/menu`
- `POST /api/auth/messenger`
- `GET /api/orders/me`
- `POST /api/orders`
- `POST /api/staff/login`
- `GET /api/staff/orders`
- `PATCH /api/staff/orders/{order_id}/status`

## Обновлённый интерфейс

Фронтенд оставлен простым, но больше не выглядит как технический шаблон: добавлены логотип, hero-блок, изображения товаров, категории, полноценная корзина и аккуратный кабинет сотрудников. Backend возвращает `image_url` для каждого товара. Подробности — в `docs/FRONTEND.md`.
