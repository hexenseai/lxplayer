# LXPlayer Project Context

## Project Overview
LXPlayer is a learning management system with interactive video capabilities, built using modern web technologies.

## Architecture
- **Backend**: FastAPI (Python) with SQLModel ORM
- **Frontend**: Next.js (TypeScript/React) with Tailwind CSS
- **Database**: PostgreSQL with Alembic migrations
- **Authentication**: JWT tokens with role-based access control

## Key Components

### Backend Structure
```
apps/api/
├── app/
│   ├── main.py              # FastAPI app with CORS setup
│   ├── models.py            # SQLModel database models
│   ├── schemas.py           # Pydantic schemas for API
│   ├── auth.py              # Authentication logic
│   ├── db.py                # Database connection
│   └── routers/             # API route handlers
│       ├── auth.py          # Authentication endpoints
│       ├── users.py         # User management
│       ├── companies.py     # Company management
│       ├── styles.py        # Style management
│       ├── trainings.py     # Training management
│       ├── assets.py        # Asset management
│       └── frame_configs.py # Frame configuration
├── alembic/                 # Database migrations
└── requirements.txt         # Python dependencies
```

### Frontend Structure
```
apps/web/
├── app/                     # Next.js app directory
│   ├── (auth)/             # Authentication pages
│   ├── admin/              # Admin dashboard pages
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/             # React components
│   ├── admin/              # Admin-specific components
│   ├── player/             # Video player components
│   ├── AdminDashboard.tsx  # Main dashboard
│   ├── AdminLeftNavbar.tsx # Left navigation
│   └── Navbar.tsx          # Top navigation
├── lib/
│   ├── api.ts              # API client
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Utility functions
└── package.json            # Node.js dependencies
```

## User Roles
- **SuperAdmin**: Full system access, can manage all companies and users
- **Admin**: Company-level access, can manage users within their company
- **User**: Basic access, can view and interact with content

## Database Schema
- **Users**: User accounts with role-based permissions
- **Companies**: Organization/company information
- **Styles**: UI styling configurations
- **Trainings**: Learning content and courses
- **Assets**: Media files and resources
- **Frame Configs**: Video player frame configurations

## API Endpoints
- `/auth/login` - User authentication
- `/auth/me` - Get current user info
- `/users/` - User management (CRUD)
- `/companies/` - Company management (CRUD)
- `/styles/` - Style management (CRUD)
- `/trainings/` - Training management (CRUD)
- `/assets/` - Asset management (CRUD)
- `/frame-configs/` - Frame configuration (CRUD)

## Development Workflow
1. **Backend Development**: FastAPI with SQLModel
2. **Database Migrations**: Alembic for schema changes
3. **Frontend Development**: Next.js with TypeScript
4. **API Integration**: Custom API client with error handling
5. **Testing**: Manual testing with PowerShell scripts

## Common Issues and Solutions

### Database Schema Mismatches
- **Problem**: Model fields don't match database columns
- **Solution**: Run migrations or temporarily comment out fields
- **Prevention**: Always run migrations after model changes

### Authentication Issues
- **Problem**: JWT tokens invalid or expired
- **Solution**: Re-login or refresh tokens
- **Prevention**: Proper token validation and refresh logic

### CORS Issues
- **Problem**: Frontend can't access backend API
- **Solution**: Check CORS settings in main.py
- **Prevention**: Proper CORS configuration for development

### Foreign Key Constraints
- **Problem**: Cannot drop tables due to dependencies
- **Solution**: Drop constraints first, then tables
- **Prevention**: Careful migration planning

## Development Tools
- **Backend Testing**: PowerShell scripts for API testing
- **Database**: PostgreSQL with psql command line
- **Frontend**: Next.js with hot reload
- **Debugging**: Console logging and network inspection

## Environment Setup
- **Backend**: Python 3.12+ with FastAPI
- **Frontend**: Node.js with Next.js
- **Database**: PostgreSQL 13+
- **Development**: Hot reload enabled for both frontend and backend

## Code Standards
- **Python**: PEP 8 with type hints
- **TypeScript**: Strict mode with proper typing
- **API**: RESTful design with proper HTTP status codes
- **Error Handling**: User-friendly messages with detailed logging

## Testing Strategy
- **API Testing**: PowerShell scripts for endpoint validation
- **Integration Testing**: Manual testing of complete workflows
- **Error Testing**: Verify error handling and user feedback
- **Authentication Testing**: Role-based access control validation

## Deployment Considerations
- **Environment Variables**: Database URLs, JWT secrets
- **CORS Settings**: Production vs development configurations
- **Database Migrations**: Run migrations before deployment
- **Static Assets**: Proper serving of frontend assets

## Performance Considerations
- **Database Queries**: Efficient queries with proper indexing
- **API Responses**: Pagination for large datasets
- **Frontend**: Code splitting and lazy loading
- **Caching**: Appropriate caching strategies

## Security Considerations
- **Authentication**: JWT tokens with proper expiration
- **Authorization**: Role-based access control
- **Input Validation**: Pydantic schemas for API validation
- **CORS**: Proper origin restrictions in production
