# Game Release Calendar

Aplicación web full-stack **privada** para seguir lanzamientos de videojuegos, clasificar interés, gestionar reservas/pagos y descubrir títulos. Nombre visual: **Game Release Calendar**. Repositorio: `Escape-Mode`.

Despliegue previsto en **Railway** (un único servicio Express + React + Prisma + PostgreSQL).

> Esta documentación incluye hasta la **Fase 5** (PWA, ajustes, accesibilidad, seguridad endurecida y despliegue Railway). La aplicación está lista para uso personal en producción.

## Funcionalidades (objetivo completo)

- Próximos lanzamientos y calendario
- Modo Descubrir con tarjetas deslizables
- Interés, reservas, pagos parciales/completos y ofertas manuales
- Presupuesto y comparador de precios
- PWA instalable
- Interfaz en español

## Arquitectura

```
Usuario
  │
  ▼
Aplicación Railway
  ├── React + Vite (estáticos servidos por Express)
  ├── Express (/api)
  ├── Prisma
  └── Integración RAWG (solo servidor)
        │
        ▼
  PostgreSQL Railway
```

En producción hay **una sola URL pública**. Express sirve `/api` y el frontend compilado.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React, TypeScript, Vite, React Router, Tailwind, TanStack Query, RHF, Zod |
| Backend | Node.js, Express, TypeScript, Prisma, Zod, bcrypt, Helmet |
| Datos | PostgreSQL |
| Tooling | pnpm workspaces, ESLint, Prettier, Vitest, Docker |

## Requisitos

- Node.js 20+
- pnpm 9+
- Docker (opcional, para PostgreSQL local)
- Cuenta RAWG (API key privada, solo en variables de entorno del servidor)

## Instalación

```bash
pnpm install
cp .env.example .env
# Edita .env con tus valores (nunca subas este archivo)
```

## PostgreSQL local

### Opción A — PostgreSQL embebido (recomendado si no tienes Docker/sudo)

```bash
# Terminal 1: deja esto abierto
pnpm db:embedded

# Terminal 2
pnpm db:use-embedded
pnpm prisma:deploy
pnpm prisma:seed
pnpm dev
```

El servidor embebido usa el puerto **5433** y guarda datos en `data/` (ignorado por git).

### Opción B — Docker Compose

```bash
docker compose up -d
```

Configuración orientativa del contenedor:

- Imagen: PostgreSQL 16
- Base de datos: `game_calendar`
- Usuario: `postgres`
- Contraseña: `postgres` (solo desarrollo)
- Puerto: `5432`

`DATABASE_URL` de ejemplo (sustituye si cambias credenciales):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/game_calendar
```

## Variables de entorno

Crea `.env` en la raíz a partir de `.env.example`:

```env
DATABASE_URL=
RAWG_API_KEY=
SESSION_SECRET=
ADMIN_EMAIL=
ADMIN_INITIAL_PASSWORD=
SESSION_DURATION_DAYS=30
NODE_ENV=development
PORT=3000
```

Notas:

- `SESSION_SECRET` debe ser una cadena larga y aleatoria (≥ 32 caracteres).
- `RAWG_API_KEY` **solo** en el servidor. Nunca uses prefijo `VITE_`, ni la pongas en el frontend, README con valor real, ni en commits.
- Opcional: `SEED_DEV_GAMES=true` para cargar juegos de ejemplo en el seed.

## Prisma

```bash
pnpm prisma:generate
pnpm prisma:migrate        # desarrollo (crea/aplica migraciones)
pnpm prisma:deploy         # producción / Railway
pnpm prisma:seed           # usuario admin (idempotente)
pnpm db:studio
```

El seed crea el administrador con `ADMIN_EMAIL` y `ADMIN_INITIAL_PASSWORD` si no existe. No imprime la contraseña.

## Desarrollo

```bash
# Terminal 1: PostgreSQL
docker compose up -d

# Migraciones + seed
pnpm prisma:migrate
pnpm prisma:seed

# Cliente (5173) + servidor (3000) con proxy /api
pnpm dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api`
- Health: `http://localhost:3000/api/health` (también vía proxy en Vite)

## Compilación y arranque local tipo producción

```bash
pnpm build
NODE_ENV=production pnpm start
```

Express servirá el cliente desde `client/dist` y la API bajo `/api`.

## Tests

```bash
pnpm test
```

## Docker (imagen de la app)

```bash
docker build -t game-release-calendar .
docker run --env-file .env -p 3000:3000 game-release-calendar
```

Las migraciones se ejecutan automáticamente al arrancar el contenedor (`scripts/docker-entrypoint.sh`).

## Railway

### 1. Servicios

1. Crea un proyecto en Railway.
2. Añade **PostgreSQL**.
3. Añade un servicio desde este repositorio (Dockerfile).

### 2. Variables del servicio de aplicación

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
RAWG_API_KEY=VALOR_PRIVADO
SESSION_SECRET=VALOR_LARGO_Y_ALEATORIO
ADMIN_EMAIL=CORREO_DEL_USUARIO
ADMIN_INITIAL_PASSWORD=CONTRASEÑA_INICIAL
SESSION_DURATION_DAYS=30
NODE_ENV=production
```

Railway inyecta `PORT` automáticamente.

### 3. Migraciones y seed

Las migraciones corren al arrancar el contenedor. Tras el primer deploy exitoso, ejecuta el seed una vez en la **Console** del servicio Escape-Mode:

```bash
pnpm prisma:seed
```

El seed es idempotente.

### 4. Healthcheck

La ruta `GET /api/health` debe responder JSON con `"status":"ok"`.

### 5. Dominio

Usa el dominio público del **único** servicio de aplicación. No configures un dominio separado para el frontend.

## PWA

- Manifest + iconos + modo standalone (tema oscuro `#0b1220`)
- Service Worker con precache de estáticos y caché `NetworkFirst` de GETs de lectura (`/api/games`, `/api/dashboard`, `/api/budget`, `/api/preferences`)
- Aviso visible sin conexión; las mutaciones no se simulan como guardadas
- Pantalla `offline.html` de respaldo
- Toast de actualización cuando hay una nueva versión

No hay escrituras offline en esta versión.

## Seguridad

- Cookies HTTP-only, `sameSite=lax`, `secure` en producción
- Tokens de sesión hasheados (SHA-256) en PostgreSQL
- bcrypt para contraseñas
- Helmet con CSP en producción (incluye `worker-src` para el SW)
- Rate limiting general, login y RAWG
- Validación Zod; body ≤ 1 MB; `Cache-Control: no-store` en `/api`
- Sin registro público; sin secretos en el frontend
- Consultas siempre filtradas por usuario autenticado

## Ajustes (`/settings`)

Plataformas preferidas, meses de descubrimiento, vista de calendario, agrupación de presupuesto, ocultar descartados, reducir animaciones y cerrar sesión.

## Estructura

```
Escape-Mode/
├── client/          # React + Vite + PWA
├── server/          # Express + TypeScript
├── shared/          # Schemas y tipos compartidos
├── prisma/          # Schema, migraciones, seed
├── scripts/         # DB embebida, smokes, entrypoint Docker
├── Dockerfile
├── docker-compose.yml
├── railway.json
└── README.md
```

## Problemas frecuentes

| Problema | Qué revisar |
|----------|-------------|
| El servidor no arranca | Mensaje de variables faltantes; completa `.env` |
| Error de conexión a DB | `pnpm db:embedded` + `pnpm db:use-embedded`, o `docker compose up -d` |
| Cookie no persiste en dev | Usa el proxy de Vite (`localhost:5173`), no mezcles orígenes |
| 401 en `/api/auth/me` | Ejecuta seed e inicia sesión en `/login` |
| RAWG no devuelve resultados | Comprueba `RAWG_API_KEY` real en `.env` (no `VITE_*`); con placeholder, Descubrir degrada sin tumbar la app |
| PWA no instala en local | El SW solo se activa en build de producción |

## Estado

Fases 1–5 implementadas. Listo para desplegar en Railway (migraciones al arrancar el contenedor).

## Licencia

Uso personal / privado.
