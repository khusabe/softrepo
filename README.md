Software Repository (Node.js + Express + Prisma + React)

Минималистичное веб‑приложение для хранения и скачивания дистрибутивов ПО.

- Backend: Node.js (Express), Prisma (SQLite by default)
- Frontend: React (Vite), Bootstrap
- Хранилище файлов: локально `server/uploads/software`

Быстрый старт (Windows)

1) Установить Node.js LTS (>= 18)
2) Установка зависимостей:
```
cd server
npm install
cd ../client
npm install
```
3) server/.env (минимум):
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="change_me_dev_secret"
PORT=4000
UPLOADS_DIR="uploads/software"
ALLOWLIST_IPS=""
```
4) Prisma и seed:
```
cd ../server
npm run db:push
npm run db:generate
npm run seed
```
5) Запуск dev:
```
# терминал 1
cd server && npm run dev
# терминал 2
cd client && npm run dev
```
Фронт: http://localhost:5173
API: http://localhost:4000/health
Админка: /admin (логин admin/admin123 по умолчанию)

Основные API

- Auth: POST /api/auth/login, POST /api/auth/change-password
- Категории: GET/POST/PUT/DELETE /api/categories
- ПО: GET /api/software, GET /api/software/:id, POST/PUT /api/software (multipart: file), DELETE /api/software/:id, GET /api/software/:id/download
- Статистика: GET /api/stats/overall
- Speed Test: GET /api/speed-test, GET /api/speed-test/ping, POST /api/speed-test/upload, GET /api/speed-test/ip

Деплой на Ubuntu (Nginx + PM2)

```
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2

sudo mkdir -p /opt/softrepo && sudo chown -R $USER:$USER /opt/softrepo
cd /opt/softrepo
# git clone <repo_url> .

cd server
npm ci
npm run db:push && npm run db:generate && npm run seed
pm2 start "npm run dev" --name softrepo-api --time --cwd /opt/softrepo/server
pm2 save

cd ../client
npm ci
npm run build

# Nginx: слушает 80, проксирует на 4000, раздаёт /client/dist и /uploads
```

Публикация в GitHub

```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/softrepo.git
git push -u origin main
```


