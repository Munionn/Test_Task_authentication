# Authentication Application

Full-stack authentication application with NestJS backend and Next.js frontend.

## Tech Stack

- **Backend**: NestJS, TypeORM, PostgreSQL, JWT Authentication
- **Frontend**: Next.js 16, React 19, Tailwind CSS, Zustand, React Hook Form, Zod
- **Database**: PostgreSQL 15
- **Containerization**: Docker & Docker Compose
- **API Documentation**: Swagger/OpenAPI

## Prerequisites

### For Development Mode:
- Node.js 20+ 
- pnpm (package manager)
- PostgreSQL 15+ (or use Docker for database only)

### For Docker Compose:
- Docker 20.10+
- Docker Compose 2.0+

## Quick Start with Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/Munionn/Test_Task_authentication.git
cd TestTaskAuthentication
```

### 2. Configure environment variables (optional)

Create a `.env` file in the root directory (optional, defaults are provided in docker-compose.yml):

```env
JWT_SECRET=your-strong-secret-key-here
JWT_REFRESH_SECRET=your-strong-refresh-secret-key-here
JWT_ACCESS_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

### 3. Build and start all services

```bash
docker-compose up -d --build
```

This command will:
- Build Docker images for backend and frontend
- Start PostgreSQL database
- Start pgAdmin (database management tool)
- Start NestJS backend server
- Start Next.js frontend application

### 4. Access the application

Once all services are running, you can access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Swagger Documentation**: http://localhost:5000/api
- **PostgreSQL**: localhost:5432
- **pgAdmin**: http://localhost:5050
  - Email: `admin@admin.com`
  - Password: `admin`


### 5. Stop services

To stop all services:

```bash
docker-compose down
```

To stop and remove volumes (this will delete all database data):

```bash
docker-compose down -v
```

### 6. Rebuild after code changes

If you make changes to the code, rebuild the containers:

```bash
docker-compose up -d --build
```

## Development Mode Setup

### 1. Prerequisites

Make sure you have installed:
- Node.js 20+
- pnpm: `npm install -g pnpm`
- PostgreSQL 15+ (or use Docker for database only)

### 2. Start PostgreSQL Database

You can use Docker to run only the database:

```bash
docker-compose up -d postgres
```

Or use your local PostgreSQL installation.

### 3. Backend Setup

#### 3.1 Navigate to backend directory

```bash
cd server
```

#### 3.2 Install dependencies

```bash
pnpm install
```

#### 3.3 Configure environment variables

Create a `.env` file in the `server` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=postgres

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_ACCESS_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**⚠️ Important**: 
- Change `JWT_SECRET` and `JWT_REFRESH_SECRET` to strong, unique values
- Update database credentials if different from defaults

#### 3.4 Run database migrations

The application uses TypeORM with `synchronize: true` in development, so tables will be created automatically on first run.

#### 3.5 Start the backend server

```bash
# Development mode with hot-reload
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod
```

The backend will be available at http://localhost:5000

### 4. Frontend Setup

#### 4.1 Navigate to frontend directory

Open a new terminal and navigate to:

```bash
cd client
```

#### 4.2 Install dependencies

```bash
pnpm install
```

#### 4.3 Configure environment variables

The frontend uses `next.config.ts` for configuration. The API URL is set to `http://localhost:5000` by default.

If you need to change it, edit `client/next.config.ts`:

```typescript
env: {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
}
```

Or create a `.env.local` file in the `client` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

#### 4.4 Start the frontend development server

```bash
pnpm run dev
```

The frontend will be available at http://localhost:3000

## Project Structure

```
.
├── client/                 # Next.js frontend application
│   ├── app/               # Next.js app directory
│   │   ├── login/         # Login page
│   │   ├── register/      # Registration page
│   │   └── profile/       # Profile pages
│   ├── components/        # React components
│   ├── lib/               # Utilities and API client
│   ├── store/             # Zustand state management
│   └── Dockerfile         # Frontend Dockerfile
├── server/                # NestJS backend application
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   │   ├── dto/       # Data Transfer Objects
│   │   │   ├── entities/  # TypeORM entities
│   │   │   ├── guards/    # Auth guards
│   │   │   ├── strategies/ # JWT strategy
│   │   │   └── filters/   # Exception filters
│   │   └── main.ts        # Application entry point
│   └── Dockerfile         # Backend Dockerfile
├── docker-compose.yml     # Docker Compose configuration
└── README.md              # This file
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register a new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/logout` | Logout user | Yes |
| POST | `/auth/refresh` | Refresh access token | No |
| GET | `/auth/profile` | Get user profile | Yes |
| PUT | `/auth/profile` | Update user profile | Yes |

## API Documentation (Swagger)

Interactive API documentation is available at:

**http://localhost:5000/api**

Features:
- View all available endpoints
- See request/response schemas
- Test endpoints directly from the browser
- Authenticate using JWT Bearer token or cookies

## Environment Variables

### Backend (.env in server directory)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | PostgreSQL host | `localhost` | No |
| `DB_PORT` | PostgreSQL port | `5432` | No |
| `DB_USERNAME` | Database username | `postgres` | No |
| `DB_PASSWORD` | Database password | `postgres` | No |
| `DB_DATABASE` | Database name | `postgres` | No |
| `JWT_SECRET` | JWT access token secret | - | **Yes** |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | - | **Yes** |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiration | `24h` | No |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `7d` | No |
| `PORT` | Backend server port | `5000` | No |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | No |
| `NODE_ENV` | Environment mode | `development` | No |

### Frontend (next.config.ts or .env.local)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:5000` |

## Troubleshooting

### Backend won't start

1. **Check database connection**:
   ```bash
   # Test PostgreSQL connection
   psql -h localhost -U postgres -d postgres
   ```

2. **Check environment variables**:
   ```bash
   cd server
   cat .env
   ```
   Make sure `JWT_SECRET` and `JWT_REFRESH_SECRET` are set.

3. **Check port availability**:
   ```bash
   # Check if port 5000 is in use
   lsof -i :5000
   ```

### Frontend won't connect to backend

1. **Check CORS configuration** in `server/src/main.ts`
2. **Verify API URL** in `client/next.config.ts` or `.env.local`
3. **Check browser console** for CORS errors
4. **Verify backend is running** on port 5000

### Database connection errors

1. **Check PostgreSQL is running**:
   ```bash
   docker-compose ps postgres
   ```

2. **Check database credentials** in `.env` file

3. **Reset database** (⚠️ This will delete all data):
   ```bash
   docker-compose down -v
   docker-compose up -d postgres
   ```

### Docker issues

1. **Rebuild containers**:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

2. **Check container logs**:
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```

3. **Remove all containers and volumes** (⚠️ This will delete all data):
   ```bash
   docker-compose down -v
   docker system prune -a
   ```

## Development Commands

### Backend

```bash
cd server

# Install dependencies
pnpm install

# Development mode
pnpm run start:dev

# Build for production
pnpm run build

# Run production build
pnpm run start:prod

# Run linter
pnpm run lint

# Run tests
pnpm run test
```

### Frontend

```bash
cd client

# Install dependencies
pnpm install

# Development mode
pnpm run dev

# Build for production
pnpm run build

# Run production build
pnpm run start

# Run linter
pnpm run lint
```

