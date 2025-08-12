# AI Chatbot SaaS - Client Application

React frontend application for the AI Chatbot SaaS platform, built with Vite and Tailwind CSS.

## Environment Variables

The application uses Vite environment variables (prefixed with `VITE_`):

- `VITE_API_URL` - Backend API URL (default: http://localhost:3001/api/v1)
- `VITE_SERVER_URL` - WebSocket server URL (default: http://localhost:3001)

Create a `.env` file in the client directory:

```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_SERVER_URL=http://localhost:3001
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all

# Run tests with coverage
npm run test:coverage
```

## Building the Chat Widget

The chat widget can be built separately for embedding:

```bash
npm run build:widget
```

## Tech Stack

- React 19 with Vite
- Tailwind CSS for styling
- React Router for navigation
- Socket.io for real-time communication
- Recharts for analytics visualization
- Jest and Playwright for testing
