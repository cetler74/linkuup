# LinkUup - Nail Salon Directory & Booking Website
## Detailed Implementation Plan

### Project Overview
A mobile-friendly nail salon directory website with search functionality, detailed salon information, map integration, and booking capabilities. Based on Bio Sculpture salon finder with BookSolo-inspired clean design.

### Data Analysis Results
- **1,196 salon records** in the Excel file
- **Key fields**: Código (ID), Nome (Name), País (Country), Telefone (Phone), Email, Website, Address components, Estado (Status)
- **Coverage**: Primarily Portuguese salons with complete address information

### 1. Technical Architecture

#### Frontend Stack
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Leaflet/OpenStreetMap** for mapping
- **Axios** for API calls
- **React Query** for data management
- **React Hook Form** for forms
- **Date-fns** for date handling

#### Backend Stack
- **Flask** (Python 3.13)
- **SQLite** database
- **Flask-CORS** for cross-origin requests
- **Flask-SQLAlchemy** for ORM
- **Marshmallow** for serialization
- **APScheduler** for booking management

#### Development Tools
- **Vite** for frontend build
- **ESLint & Prettier** for code quality
- **Flask-Migrate** for database migrations

### 2. Database Schema Design

#### Core Tables
```sql
-- Salons table (imported from Excel)
CREATE TABLE salons (
    id INTEGER PRIMARY KEY,
    codigo TEXT UNIQUE,
    nome TEXT NOT NULL,
    pais TEXT,
    nif TEXT,
    estado TEXT,
    telefone TEXT,
    email TEXT,
    website TEXT,
    pais_morada TEXT,
    regiao TEXT,
    cidade TEXT,
    rua TEXT,
    porta TEXT,
    cod_postal TEXT,
    latitude REAL,
    longitude REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services table
CREATE TABLE services (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    is_bio_diamond BOOLEAN DEFAULT FALSE
);

-- Salon services (many-to-many)
CREATE TABLE salon_services (
    id INTEGER PRIMARY KEY,
    salon_id INTEGER,
    service_id INTEGER,
    price REAL,
    duration INTEGER, -- minutes
    FOREIGN KEY (salon_id) REFERENCES salons (id),
    FOREIGN KEY (service_id) REFERENCES services (id)
);

-- Time slots
CREATE TABLE time_slots (
    id INTEGER PRIMARY KEY,
    salon_id INTEGER,
    day_of_week INTEGER, -- 0=Monday, 6=Sunday
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (salon_id) REFERENCES salons (id)
);

-- Bookings
CREATE TABLE bookings (
    id INTEGER PRIMARY KEY,
    salon_id INTEGER,
    service_id INTEGER,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration INTEGER,
    status TEXT DEFAULT 'confirmed', -- confirmed, cancelled, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons (id),
    FOREIGN KEY (service_id) REFERENCES services (id)
);

-- Salon managers
CREATE TABLE salon_managers (
    id INTEGER PRIMARY KEY,
    salon_id INTEGER,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons (id)
);
```

### 3. Backend API Endpoints

#### Salon Endpoints
```
GET /api/salons              # List salons with filters
GET /api/salons/{id}         # Get salon details
GET /api/salons/{id}/services # Get salon services
GET /api/salons/search       # Search salons by location/name
```

#### Service Endpoints
```
GET /api/services            # List all services
GET /api/services/bio-diamond # List BIO Diamond services
```

#### Booking Endpoints
```
POST /api/bookings           # Create booking
GET /api/bookings/{id}       # Get booking details
PUT /api/bookings/{id}       # Update booking
DELETE /api/bookings/{id}    # Cancel booking
GET /api/salons/{id}/availability # Get available slots
```

#### Manager Dashboard Endpoints
```
POST /api/auth/login         # Manager login
GET /api/manage/bookings     # Get salon bookings
POST /api/manage/availability # Set availability
PUT /api/manage/bookings/{id} # Update booking
```

### 4. Frontend Structure

#### Page Layout
```
src/
├── components/
│   ├── common/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── SearchBar.tsx
│   │   └── LoadingSpinner.tsx
│   ├── salon/
│   │   ├── SalonCard.tsx
│   │   ├── SalonList.tsx
│   │   ├── SalonDetail.tsx
│   │   └── SalonMap.tsx
│   ├── booking/
│   │   ├── BookingForm.tsx
│   │   ├── ServiceSelector.tsx
│   │   ├── TimeSlotPicker.tsx
│   │   └── BookingConfirmation.tsx
│   └── filters/
│       ├── LocationFilter.tsx
│       ├── ServiceFilter.tsx
│       └── FilterSidebar.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── SearchResults.tsx
│   ├── SalonDetails.tsx
│   ├── BookingPage.tsx
│   └── ManagerDashboard.tsx
├── hooks/
│   ├── useSalons.ts
│   ├── useBookings.ts
│   └── useGeolocation.ts
├── utils/
│   ├── api.ts
│   ├── geocoding.ts
│   └── validation.ts
└── types/
    ├── salon.ts
    ├── booking.ts
    └── api.ts
```

### 5. Key Features Implementation

#### Search & Filter System
- **Location-based search**: By city, region, postal code
- **Service filtering**: Including BIO Diamond services
- **Text search**: Salon name search
- **Map-based search**: Search within map bounds

#### Mobile-Responsive Design
- **Breakpoints**: 320px, 768px, 1024px, 1200px
- **Touch optimization**: 44px minimum touch targets
- **Swipe gestures**: For image galleries and maps
- **Progressive Web App**: Offline capability

#### Booking System
- **Service selection**: Choose from available services
- **Date/time picker**: Calendar with available slots
- **Customer form**: Contact information collection
- **Confirmation**: Email/SMS notifications

#### Map Integration
- **OpenStreetMap**: Free alternative to Google Maps
- **Salon markers**: Clickable with salon info
- **Clustering**: For dense areas
- **Mobile gestures**: Pinch to zoom, pan

### 6. Data Enhancement Strategy

#### Geocoding
- Use Nominatim API to convert addresses to coordinates
- Batch process existing salon addresses
- Store lat/lng for map display

#### Service Data
- Add standard nail salon services
- Include BIO Diamond product line
- Set realistic pricing and duration

#### Sample Services to Add
```json
[
  {
    "name": "Basic Manicure",
    "category": "Manicure",
    "duration": 45,
    "price": 25
  },
  {
    "name": "BIO Diamond Manicure",
    "category": "BIO Diamond",
    "duration": 60,
    "price": 40,
    "is_bio_diamond": true
  },
  {
    "name": "Gel Polish",
    "category": "Polish",
    "duration": 30,
    "price": 20
  },
  {
    "name": "BIO Diamond Gel System",
    "category": "BIO Diamond",
    "duration": 90,
    "price": 55,
    "is_bio_diamond": true
  }
]
```

### 7. UI/UX Design Specifications

#### Color Scheme (BookSolo-inspired)
- **Primary**: #1E3A8A (Deep blue)
- **Secondary**: #F59E0B (Amber)
- **Background**: #F8FAFC (Light gray)
- **Text**: #1F2937 (Dark gray)
- **Success**: #10B981 (Green)
- **Error**: #EF4444 (Red)

#### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: 600 weight
- **Body**: 400 weight
- **Base size**: 16px

#### Components
- **Cards**: Subtle shadows, rounded corners
- **Buttons**: Consistent padding, hover states
- **Forms**: Clear labels, validation feedback
- **Maps**: Full-screen option, custom markers

### 8. Development Phases

#### Phase 1: Foundation (Days 1-2)
- Set up project structure
- Create database and import data
- Basic Flask API setup
- React project initialization

#### Phase 2: Core Features (Days 3-5)
- Salon listing and search
- Basic filtering
- Map integration
- Responsive layout

#### Phase 3: Booking System (Days 6-7)
- Service management
- Booking form
- Calendar integration
- Email notifications

#### Phase 4: Manager Dashboard (Day 8)
- Authentication system
- Booking management
- Availability settings

#### Phase 5: Polish & Deploy (Days 9-10)
- UI refinements
- Performance optimization
- Testing
- Deployment setup

### 9. Deployment Strategy

#### Frontend Deployment
- **Netlify** or **Vercel** for static hosting
- Automatic deployments from Git
- Custom domain setup

#### Backend Deployment
- **Railway** or **PythonAnywhere** for Flask API
- SQLite database included
- Environment variable configuration

#### Database Considerations
- SQLite for development and small-scale production
- Migration path to PostgreSQL if needed
- Regular backups

### 10. Testing Strategy

#### Frontend Testing
- Component unit tests with Jest
- Integration tests with React Testing Library
- E2E tests with Playwright

#### Backend Testing
- API endpoint tests with pytest
- Database tests with test fixtures
- Integration tests for booking flow

### 11. SEO & Performance

#### SEO Optimization
- Meta tags for each page
- Structured data for salons
- Sitemap generation
- Local SEO optimization

#### Performance
- Image optimization
- Code splitting
- Lazy loading
- Caching strategies

### 12. Future Enhancements

#### Phase 2 Features
- User accounts and profiles
- Review and rating system
- Payment integration
- Advanced analytics

#### Advanced Features
- Multi-language support (Portuguese/English)
- Mobile app (React Native)
- SMS notifications
- Loyalty program integration

This implementation plan provides a comprehensive roadmap for building a professional, scalable nail salon directory and booking website that meets all the specified requirements while maintaining high standards for user experience and code quality.
