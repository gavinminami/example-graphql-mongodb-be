# example-graphql-mongodb-be

Example implementation of GraphQL+MongoDB

# GraphQL TypeScript Server

## Getting Started

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the root directory with:

```env
# Server Configuration
PORT=4000                                    # Port number for the server
NODE_ENV=development                         # Environment (development/production)

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/mydb     # MongoDB connection string

# Authentication
JWT_SECRET=your_jwt_secret_here             # Secret key for JWT tokens
JWT_EXPIRES_IN=30d                          # JWT expiration time (e.g., 30d, 24h, 60m)

# Security
MAX_LOGIN_ATTEMPTS=5                        # Maximum failed login attempts
LOCKOUT_DURATION_MINUTES=15                 # Account lockout duration in minutes
```

All variables are optional except `JWT_SECRET` and `MONGODB_URI`. Default values will be used if not specified.

### Development

#### Generate TypeScript types from GraphQL schema

Whenever you make changes to the GraphQL schema, regenerate the types:

```bash
npm run generate
```

#### Start the development server

This will start the development server:

```bash
npm run dev
```

The GraphQL server will be available at `http://localhost:4000`

### Testing

The project uses Jest for unit testing. To run the tests:

```bash
npm test
```

Test files are located in the `src/__tests__` directory and follow the naming convention `*.test.ts`. The test suite includes:

- Password complexity validation
- Authentication flows
- GraphQL resolvers
- Database operations

### Authentication

To access protected endpoints, include a JWT token in the Authorization header:

You can obtain a token by calling the `login` mutation:

```graphql
mutation Login {
  login(email: "user@example.com", password: "password") {
    token
    user {
      id
      email
    }
  }
}
```

### Available Scripts

- `npm run generate` - Generate TypeScript types from GraphQL schema
- `npm test` - Run unit tests
