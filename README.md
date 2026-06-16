# 🎵 PartyPlay — Общий плейлист для вечеринок

Синхронизированный музыкальный плеер с общим плейлистом в реальном времени.  
Открываешь — создаёшь комнату — кидаешь ссылку — музыка играет у всех сразу.

---

## ✨ Фичи

- 🎧 **Синхронизированный плеер** — play/pause/seek синхронизируется у всех
- 📋 **Общий плейлист** — добавляй треки по ссылке
- 🔗 **Поддержка источников** — YouTube, VK Music, Яндекс.Музыка, SoundCloud
- 👥 **Голосование за скип** — большинство голосует → трек скипается
- 🏠 **Комнаты** — создай или войди по 6-значному коду
- 🎙 **Никнеймы** — без регистрации
- 📱 **PWA** — устанавливается как приложение на телефон

---

## 🚀 Быстрый старт (локально)

### 1. Установи зависимости

**yt-dlp** (нужен для скачивания музыки):
```bash
# macOS
brew install yt-dlp ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp

# Windows — скачай yt-dlp.exe и ffmpeg, добавь в PATH
```

### 2. Бэкенд
```bash
cd backend
npm install
cp .env.example .env
npm run dev
# Сервер запустится на http://localhost:3001
```

### 3. Фронтенд
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# Откроется на http://localhost:5173
```

---

## ☁️ Деплой в облако

### Бэкенд → Railway.app (рекомендую)

1. Зарегистрируйся на [railway.app](https://railway.app)
2. New Project → Deploy from GitHub → выбери папку `backend`
3. Railway автоматически подхватит `Dockerfile`
4. В настройках добавь переменную: `PORT=3001`
5. Скопируй выданный URL (например `https://partyplay-backend.up.railway.app`)

> ⚠️ Railway не поддерживает `yt-dlp` без Docker. Dockerfile уже включает всё нужное.

### Альтернатива: Render.com
1. New Web Service → Connect GitHub
2. Runtime: Docker
3. Укажи папку `backend`

### Фронтенд → Vercel

```bash
cd frontend
npm install -g vercel
vercel
```

Или через GitHub: импортируй репо в [vercel.com](https://vercel.com), укажи root directory = `frontend`.

**Важно**: после деплоя бэкенда обнови `.env` фронтенда:
```
VITE_API_URL=https://твой-бэкенд.railway.app
VITE_WS_URL=wss://твой-бэкенд.railway.app
```

---

## 🐳 Docker Compose (всё сразу)

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    volumes:
      - ./audio:/app/audio
  
  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    environment:
      - VITE_API_URL=http://localhost:3001
      - VITE_WS_URL=ws://localhost:3001
    depends_on:
      - backend
```

```bash
docker-compose up --build
```

---

## 🏗 Архитектура

```
frontend/              ← React + Vite PWA
├── src/
│   ├── App.jsx        ← роутинг Lobby ↔ Room
│   ├── components/
│   │   ├── Lobby.jsx  ← создание/вход в комнату
│   │   ├── Room.jsx   ← основной экран, WS-оркестрация
│   │   ├── Player.jsx ← аудиоплеер с синхронизацией
│   │   ├── Playlist.jsx ← плейлист + добавление треков
│   │   └── Members.jsx ← список участников
│   ├── hooks/
│   │   └── useSocket.js ← WebSocket с авто-реконнектом
│   └── utils/
│       └── api.js     ← REST вызовы

backend/               ← Node.js + Express + ws
├── src/
│   └── index.js       ← сервер, WS, yt-dlp интеграция
└── Dockerfile         ← с yt-dlp + ffmpeg
```

### WebSocket протокол

| Клиент → Сервер | Описание |
|---|---|
| `JOIN` | Войти в комнату |
| `ADD_TRACK` | Добавить трек (запускает скачивание) |
| `PLAY` / `PAUSE` | Управление воспроизведением |
| `SEEK` | Перемотка |
| `VOTE_SKIP` | Голос за скип |
| `NEXT_TRACK` | Следующий трек (только хост) |

| Сервер → Клиент | Описание |
|---|---|
| `ROOM_STATE` | Полный стейт при входе |
| `TRACK_ADDED` | Новый трек в плейлисте |
| `TRACK_READY` | Трек скачан, можно играть |
| `PLAY` / `PAUSE` / `SEEK` | Синхронизация плеера |
| `SKIP_VOTE` | Обновление голосов |
| `TRACK_SKIPPED` | Трек пропущен |
| `MEMBER_JOINED/LEFT` | Изменение участников |

---

## 🔮 Roadmap (следующие фичи)

- [ ] **Квиз "Угадай мелодию"** — кто быстрее напишет название трека
- [ ] **Синхронное Karaoke** — SubRip субтитры поверх плеера  
- [ ] **Реакции** — эмодзи-реакции летят по экрану
- [ ] **История** — сохранение плейлиста после окончания сессии
- [ ] **Очередь** — предлагать следующий трек, не прерывая текущий

---

## ⚠️ Дисклеймер

Проект создан для тестирования концепции. Скачивание защищённого контента может нарушать условия использования сервисов. Используй на свой страх и риск.
