# OAuth Authentication System - SmartWiki

## Overview

SmartWiki implements a comprehensive OAuth authentication system with multi-tenancy support, role-based access control (RBAC), and enhanced security features including MFA, rate limiting, and account lockout protection.

## Features

### 🔐 Authentication Methods
- **Email/Password**: Traditional authentication with enhanced security
- **OAuth Providers**: Google, GitHub, Microsoft, Facebook (via Auth0)
- **Multi-Factor Authentication (MFA)**: TOTP-based 2FA with QR codes
- **Team Invitations**: Email-based user invitations with role assignment

### 🏢 Multi-Tenancy
- **Tenant Isolation**: Complete data separation between tenants
- **User Limits**: Configurable user limits per tenant
- **Tenant Settings**: Customizable tenant-specific configurations

### 👥 Role-Based Access Control (RBAC)
- **System Roles**: GUEST, VIEWER, EDITOR, ADMIN
- **Custom Permissions**: Fine-grained permission system
- **Role Assignments**: Dynamic role assignment to users
- **Permission Inheritance**: Hierarchical permission structure

### 🛡️ Security Features
- **Rate Limiting**: Configurable rate limits for auth endpoints
- **Account Lockout**: Temporary lockout after failed attempts
- **JWT Tokens**: Secure token-based authentication
- **Session Management**: Proper session handling and cleanup
- **Password Security**: Bcrypt hashing with salt rounds

## Architecture

### Backend Components

```
src/
├── services/
│   ├── authService.ts          # Core authentication logic
│   ├── oauthService.ts         # OAuth provider integration
│   └── invitationService.ts    # Team invitation management
├── middleware/
│   └── auth.ts                 # Authentication & authorization middleware
├── routes/
│   ├── auth.ts                 # Authentication endpoints
│   └── oauth.ts                # OAuth endpoints
└── test/
    └── auth.test.ts            # Comprehensive test suite
```

### Frontend Components

```
src/
├── components/auth/
│   ├── LoginForm.tsx           # Login form with OAuth buttons
│   ├── RegisterForm.tsx        # Registration form
│   ├── ProtectedRoute.tsx      # Route protection component
│   └── OAuthCallback.tsx       # OAuth callback handler
└── hooks/
    └── useAuth.ts              # Authentication hook & context
```

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/smartwiki"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-key-min-32-chars"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# Auth0 Configuration
AUTH0_DOMAIN="your-domain.auth0.com"
AUTH0_CLIENT_ID="your-auth0-client-id"
AUTH0_CLIENT_SECRET="your-auth0-client-secret"
AUTH0_AUDIENCE="https://smartwiki-api"

# Email Configuration (for invitations)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@smartwiki.com"

# Frontend URL
FRONTEND_URL="http://localhost:3001"

# Security
CORS_ORIGIN="http://localhost:3001"
RATE_LIMIT_WINDOW_MS="900000"  # 15 minutes
RATE_LIMIT_MAX_REQUESTS="100"

# Admin User (for seeding)
ADMIN_PASSWORD="Admin123!"
DEMO_PASSWORD="Demo123!"
```

### 2. Auth0 Setup

1. **Create Auth0 Application**:
   - Go to Auth0 Dashboard → Applications
   - Create a new "Single Page Application"
   - Note the Domain, Client ID, and Client Secret

2. **Configure OAuth Providers**:
   - Go to Authentication → Social
   - Enable Google, GitHub, Microsoft
   - Configure redirect URLs

3. **Application Settings**:
   ```
   Allowed Callback URLs:
   http://localhost:3001/auth/callback
   
   Allowed Logout URLs:
   http://localhost:3001
   
   Allowed Web Origins:
   http://localhost:3001
   ```

### 3. Database Setup

```bash
# Generate Prisma client
cd backend
npx prisma generate

# Run database migrations
npx prisma migrate dev --name enhanced-auth-system

# Seed the database with initial data
npm run db:seed
```

### 4. Start the Application

```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

## API Endpoints

### Authentication Endpoints

#### POST `/api/v1/auth/register`
Register a new user with email/password.

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "tenantId": "tenant-uuid"
}
```

#### POST `/api/v1/auth/login`
Login with email/password or MFA code.

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "mfaCode": "123456",
  "tenantId": "tenant-uuid"
}
```

#### POST `/api/v1/auth/refresh`
Refresh access token using refresh token.

```json
{
  "refreshToken": "refresh-token-here"
}
```

#### GET `/api/v1/auth/profile`
Get current user profile (requires authentication).

#### PUT `/api/v1/auth/profile`
Update user profile (requires authentication).

### MFA Endpoints

#### POST `/api/v1/auth/mfa/setup`
Setup MFA for authenticated user.

#### POST `/api/v1/auth/mfa/enable`
Enable MFA with verification code.

```json
{
  "verificationCode": "123456"
}
```

#### POST `/api/v1/auth/mfa/disable`
Disable MFA with password confirmation.

```json
{
  "password": "Password123!"
}
```

### OAuth Endpoints

#### GET `/api/v1/oauth/authorize/:provider`
Get OAuth authorization URL.

Query parameters:
- `redirect_uri`: Callback URL
- `tenant_id`: Target tenant (optional)
- `state`: CSRF protection state

#### POST `/api/v1/oauth/callback`
Handle OAuth callback and exchange code for tokens.

```json
{
  "code": "authorization-code",
  "state": "csrf-state",
  "redirect_uri": "http://localhost:3001/auth/callback",
  "tenant_id": "tenant-uuid"
}
```

#### POST `/api/v1/oauth/link`
Link OAuth account to existing user.

#### DELETE `/api/v1/oauth/unlink/:provider`
Unlink OAuth account from user.

#### GET `/api/v1/oauth/accounts`
Get user's linked OAuth accounts.

### Team Invitation Endpoints

#### POST `/api/v1/auth/invite`
Send team invitation (requires authentication).

```json
{
  "email": "newuser@example.com",
  "roleId": "role-uuid",
  "message": "Welcome to our team!"
}
```

#### POST `/api/v1/auth/accept-invitation`
Accept team invitation and create account.

```json
{
  "token": "invitation-token",
  "firstName": "New",
  "lastName": "User",
  "password": "Password123!",
  "username": "newuser"
}
```

#### POST `/api/v1/auth/reject-invitation`
Reject team invitation.

```json
{
  "token": "invitation-token"
}
```

#### GET `/api/v1/auth/invitations`
Get tenant invitations (requires authentication).

## Frontend Usage

### Authentication Context

```tsx
import { AuthProvider, useAuth } from '@/hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminPanel />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
```

### Using Authentication Hook

```tsx
function LoginComponent() {
  const { login, loginWithOAuth, user, isAuthenticated, logout } = useAuth();

  const handleLogin = async () => {
    try {
      await login({
        email: 'user@example.com',
        password: 'Password123!'
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleOAuthLogin = async (provider: string) => {
    try {
      await loginWithOAuth(provider);
    } catch (error) {
      console.error('OAuth login failed:', error);
    }
  };

  if (isAuthenticated) {
    return (
      <div>
        <p>Welcome, {user?.firstName}!</p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={() => handleOAuthLogin('google')}>
        Login with Google
      </button>
    </div>
  );
}
```

### Protected Routes

```tsx
// Require authentication
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Require specific role
<ProtectedRoute requiredRole="ADMIN">
  <AdminPanel />
</ProtectedRoute>

// Require specific permission
<ProtectedRoute requiredPermission="articles:write">
  <CreateArticle />
</ProtectedRoute>
```

## Security Considerations

### 1. Token Security
- JWT tokens are signed with a secure secret
- Refresh tokens have longer expiration
- Tokens are stored in localStorage (consider httpOnly cookies for production)

### 2. Rate Limiting
- Authentication endpoints are rate-limited
- Account lockout after failed attempts
- Password reset rate limiting

### 3. OAuth Security
- State parameter validation prevents CSRF attacks
- Secure token exchange with Auth0
- Provider account linking validation

### 4. Password Security
- Minimum 8 characters with complexity requirements
- Bcrypt hashing with 12 salt rounds
- MFA support for additional security

### 5. Multi-Tenancy Security
- Complete data isolation between tenants
- User limit enforcement per tenant
- Tenant-scoped queries and operations

## Testing

The authentication system includes comprehensive test coverage:

```bash
# Run authentication tests
cd backend
npm run test src/test/auth.test.ts

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

Test coverage includes:
- User registration and validation
- Login with various scenarios
- MFA setup and verification
- OAuth flow testing
- Team invitation workflow
- Authorization middleware
- Rate limiting behavior
- Account lockout functionality

## Troubleshooting

### Common Issues

1. **OAuth Callback Errors**:
   - Check Auth0 callback URL configuration
   - Verify environment variables
   - Ensure state parameter validation

2. **Token Refresh Issues**:
   - Check JWT secret configuration
   - Verify token expiration settings
   - Clear localStorage if tokens are corrupted

3. **MFA Problems**:
   - Ensure system time is synchronized
   - Check QR code generation
   - Verify TOTP secret handling

4. **Email Invitations Not Sending**:
   - Check SMTP configuration
   - Verify email credentials
   - Check spam/junk folders

5. **Rate Limiting**:
   - Check rate limit configuration
   - Clear rate limit cache if needed
   - Adjust limits for development

### Debugging

Enable debug logging by setting:

```env
LOG_LEVEL=debug
DEBUG=smartwiki:auth
```

Monitor authentication logs:

```bash
tail -f logs/smartwiki.log | grep AUTH
```

## Production Deployment

### Security Checklist

- [ ] Use strong JWT secret (32+ characters)
- [ ] Configure HTTPS for all communications
- [ ] Set up proper CORS policies
- [ ] Enable rate limiting and monitoring
- [ ] Configure secure cookie settings
- [ ] Set up database connection pooling
- [ ] Enable audit logging
- [ ] Configure backup strategies
- [ ] Set up monitoring and alerting
- [ ] Review and test security measures

### Environment Variables

Ensure all production environment variables are properly configured and secured using your deployment platform's secrets management.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the test files for usage examples
- Create an issue in the project repository
- Consult the Auth0 documentation for OAuth-specific issues