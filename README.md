# SmartWiki

A modern, AI-powered wiki system with compliance monitoring and advanced search capabilities.

## Features

- 🤖 **AI-Powered Assistant** - Integrated with AWS Bedrock for intelligent content assistance
- 🔍 **Advanced Search** - RAG-based search with semantic understanding
- 📊 **Compliance Monitoring** - Real-time compliance checking and reporting
- 🎨 **Modern UI** - Built with React 18, Next.js 14, and Tailwind CSS
- 🔐 **Secure Authentication** - JWT-based auth with role-based access control
- 📱 **Responsive Design** - Mobile-first approach with dark mode support
- 🚀 **High Performance** - Optimized for speed and scalability

## Tech Stack

### Frontend
- **React 18.2+** - Modern React with hooks and suspense
- **Next.js 14+** - Full-stack React framework
- **TypeScript 5.0+** - Type-safe development
- **Tailwind CSS 3.4+** - Utility-first CSS framework
- **Zustand 4.4+** - Lightweight state management
- **React Query** - Server state management
- **Radix UI** - Accessible component primitives

### Backend
- **Node.js 18+** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe server development
- **Prisma ORM** - Database toolkit
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage

### Infrastructure
- **AWS Bedrock** - AI/ML services
- **AWS S3** - File storage
- **AWS Cognito** - User authentication
- **AWS Lambda** - Serverless functions
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline

## Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cgbarlow/smartwiki.git
   cd smartwiki
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env
   ```

4. **Start the database**
   ```bash
   npm run docker:up
   ```

5. **Run database migrations**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

6. **Start the development servers**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Development

### Project Structure
```
smartwiki/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Next.js pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── stores/         # Zustand stores
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript definitions
│   ├── public/             # Static assets
│   └── tests/              # Test files
├── backend/                 # Node.js backend application
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   └── utils/          # Utility functions
│   ├── prisma/             # Database schema and migrations
│   └── tests/              # Test files
├── infrastructure/          # AWS CDK infrastructure
└── docs/                   # Documentation
```

### Available Scripts

```bash
# Development
npm run dev                 # Start both frontend and backend
npm run dev:frontend        # Start frontend only
npm run dev:backend         # Start backend only

# Building
npm run build              # Build both applications
npm run build:frontend     # Build frontend only
npm run build:backend      # Build backend only

# Testing
npm run test              # Run all tests
npm run test:frontend     # Run frontend tests
npm run test:backend      # Run backend tests
npm run test:e2e          # Run end-to-end tests

# Linting and formatting
npm run lint              # Lint all code
npm run format            # Format all code

# Database
npm run db:generate       # Generate Prisma client
npm run db:migrate        # Run database migrations
npm run db:push           # Push schema to database
npm run db:studio         # Open Prisma Studio
npm run db:seed           # Seed database with sample data

# Docker
npm run docker:up         # Start Docker services
npm run docker:down       # Stop Docker services
npm run docker:build      # Build Docker images
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For questions and support, please open an issue on GitHub or contact the development team.