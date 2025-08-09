# AI Chatbot SaaS Platform

A full-stack AI-powered chatbot SaaS platform built with the PERN stack (PostgreSQL, Express, React, Node.js) and TypeScript.

## Features

- 🤖 AI-powered chatbots using Google Generative AI
- 🆓 Free tier for all users
- 📊 Analytics and conversation monitoring
- 🎨 Customizable chat widgets
- 🔐 JWT-based authentication
- 📱 Responsive React dashboard
- 🐳 Docker containerization
- 🧪 Comprehensive testing suite

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **PostgreSQL** for primary database
- **Redis** for caching and sessions
- **Knex.js** for database migrations and queries
- **JWT** for authentication
- **Socket.IO** for real-time communication

### Frontend
- **React 18** with **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation

### External Services
- **Google Generative AI API** for AI responses
- **Nodemailer** for email services

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose (optional)

### Option 1: Docker Development (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-chatbot-saas
   ```

2. **Start all services with Docker**
   ```bash
   npm run docker:up
   ```

3. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - MailHog (email testing): http://localhost:8025
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

### Option 2: Local Development

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd ai-chatbot-saas
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your configuration
   ```

3. **Start PostgreSQL and Redis**
   ```bash
   # Using Docker for databases only
   docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:15-alpine
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

## Environment Configuration

### Server Environment Variables

Copy `server/.env.example` to `server/.env` and configure:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_chatbot_saas_dev
DB_USER=postgres
DB_PASSWORD=password

# External APIs
GOOGLE_API_KEY=your-google-api-key
GOOGLE_PROJECT_ID=your-google-project-id

# JWT Secrets (generate secure keys for production)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
```

## Available Scripts

### Root Level
- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build both client and server for production
- `npm test` - Run tests for both client and server
- `npm run lint` - Lint both client and server code
- `npm run docker:up` - Start all services with Docker
- `npm run docker:down` - Stop all Docker services
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data

### Server Scripts
- `npm run server:dev` - Start server in development mode
- `npm run server:build` - Build server for production
- `npm run server:test` - Run server tests
- `npm run server:lint` - Lint server code

### Client Scripts
- `npm run client:dev` - Start client in development mode
- `npm run client:build` - Build client for production
- `npm run client:test` - Run client tests
- `npm run client:lint` - Lint client code

## Database Management

### Migrations
```bash
# Run migrations
npm run db:migrate

# Rollback last migration
cd server && npm run db:rollback

# Reset database (rollback all + migrate + seed)
cd server && npm run db:reset
```

### Creating New Migrations
```bash
cd server
npx knex migrate:make migration_name
```

## Testing

### Running Tests
```bash
# All tests
npm test

# Server tests only
npm run server:test

# Client tests only
npm run client:test

# Watch mode
cd server && npm run test:watch

# Coverage report
cd server && npm run test:coverage
```

## Production Deployment

### Using Docker
```bash
# Build and start production containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Run migrations in production
docker-compose exec server npm run db:migrate
```

### Environment Setup
1. Set up production database (PostgreSQL)
2. Set up Redis instance
3. Configure environment variables
4. Set up SSL certificates
5. Configure reverse proxy (nginx)

## API Documentation

The API follows RESTful conventions and includes the following main endpoints:

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/chatbots` - List user's chatbots
- `POST /api/v1/chatbots` - Create new chatbot
- `POST /api/v1/chat/:chatbotId/message` - Send message to chatbot
- `GET /api/v1/analytics/:chatbotId` - Get chatbot analytics

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.