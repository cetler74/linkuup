# Manager Dashboard Guide

This guide explains how to use the new manager dashboard functionality for salon owners.

## Features

### Authentication
- **Registration**: Salon managers can create accounts with email, password, and name
- **Login**: Secure authentication with JWT tokens
- **Protected Routes**: Manager dashboard is only accessible to authenticated users

### Salon Management
- **Multiple Salons**: Each user can own and manage multiple salons
- **Salon Creation**: Add new salons with complete information (name, address, contact details)
- **Salon Selection**: Switch between different salons you own

### Booking Management
- **View Bookings**: See all bookings for each salon
- **Status Updates**: Change booking status (pending, confirmed, cancelled, completed)
- **Real-time Stats**: Dashboard shows booking statistics

### Service Management
- **Add Services**: Add services to your salons with custom pricing and duration
- **Edit Services**: Update service prices and durations
- **Delete Services**: Remove services from your salon
- **Service Categories**: Services are categorized (Manicure, Pedicure, Art, etc.)

## How to Use

### 1. Access the Manager Dashboard
- Navigate to `http://localhost:5173/manager`
- You'll be redirected to the login page if not authenticated

### 2. Create an Account
- Click "Don't have an account? Sign up"
- Fill in your name, email, and password
- Click "Create account"

### 3. Login
- Enter your email and password
- Click "Sign in"

### 4. Create Your First Salon
- If you don't have any salons, you'll see a "Create Your First Salon" button
- Fill in the salon information:
  - Salon Name (required)
  - City (required)
  - Region (required)
  - Phone (required)
  - Email (required)
  - Website (optional)
  - Address details (optional)
- Click "Create Salon"

### 5. Add Services to Your Salon
- Select your salon from the salon selection area
- Go to the "Services & Info" tab
- Click "Add Service"
- Choose from available services and set your price and duration
- Click "Add Service"

### 6. Manage Bookings
- Go to the "Bookings" tab
- View all bookings for the selected salon
- Use the dropdown to change booking status
- View booking statistics in the dashboard

### 7. Switch Between Salons
- If you own multiple salons, click on different salon cards to switch
- Each salon has its own bookings and services

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Manager APIs
- `GET /api/manager/salons` - Get user's salons
- `POST /api/manager/salons` - Create new salon
- `GET /api/manager/salons/{id}/bookings` - Get salon bookings
- `GET /api/manager/salons/{id}/services` - Get salon services
- `POST /api/manager/salons/{id}/services` - Add service to salon
- `PUT /api/manager/salons/{id}/services/{service_id}` - Update salon service
- `DELETE /api/manager/salons/{id}/services/{service_id}` - Delete salon service
- `PUT /api/manager/bookings/{id}/status` - Update booking status

## Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email address
- `password_hash` - Hashed password
- `name` - User's full name
- `auth_token` - JWT token for authentication
- `created_at` - Account creation timestamp

### Salons Table
- `id` - Primary key
- `nome` - Salon name
- `cidade` - City
- `regiao` - Region
- `telefone` - Phone number
- `email` - Email address
- `website` - Website URL
- `rua` - Street address
- `porta` - Door number
- `cod_postal` - Postal code
- `pais` - Country
- `estado` - Status (Ativo/Inativo)
- `owner_id` - Foreign key to users table
- `created_at` - Creation timestamp

### Salon Services Table
- `id` - Primary key
- `salon_id` - Foreign key to salons table
- `service_id` - Foreign key to services table
- `price` - Service price for this salon
- `duration` - Service duration in minutes

## Security Features

- **Password Hashing**: Passwords are hashed with salt using SHA-256
- **JWT Tokens**: Secure authentication tokens
- **Authorization**: Users can only access their own salons and data
- **Input Validation**: All inputs are validated on both frontend and backend

## Development Setup

### Backend
1. Install dependencies: `pip install -r backend/requirements.txt`
2. Run the Flask app: `python backend/app.py`
3. Seed sample data: `python scripts/seed_data.py`

### Frontend
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Access at `http://localhost:5173`

## Testing

You can test the functionality by:
1. Creating a user account
2. Adding a salon
3. Adding services to the salon
4. Making bookings through the public interface
5. Managing bookings through the manager dashboard

The system includes sample data for services and one sample salon for testing purposes.
