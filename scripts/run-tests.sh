#!/bin/bash

# LinkUup Test Runner Script
# This script runs all tests for the LinkUup project

set -e

echo "🧪 Starting LinkUup Test Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the project root
if [ ! -f "package.json" ] && [ ! -d "backend" ] && [ ! -d "frontend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Parse command line arguments
RUN_BACKEND=true
RUN_FRONTEND=true
RUN_E2E=true
VERBOSE=false
COVERAGE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-only)
            RUN_FRONTEND=false
            RUN_E2E=false
            shift
            ;;
        --frontend-only)
            RUN_BACKEND=false
            RUN_E2E=false
            shift
            ;;
        --e2e-only)
            RUN_BACKEND=false
            RUN_FRONTEND=false
            shift
            ;;
        --no-e2e)
            RUN_E2E=false
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --backend-only    Run only backend tests"
            echo "  --frontend-only   Run only frontend tests"
            echo "  --e2e-only       Run only end-to-end tests"
            echo "  --no-e2e         Skip end-to-end tests"
            echo "  --verbose        Enable verbose output"
            echo "  --coverage       Generate coverage reports"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Backend Tests
if [ "$RUN_BACKEND" = true ]; then
    print_status "Running backend tests..."
    
    cd backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_warning "Virtual environment not found. Creating one..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    pip install -r requirements.txt
    
    # Run tests
    if [ "$COVERAGE" = true ]; then
        print_status "Running backend tests with coverage..."
        pytest tests/test_existing_db.py tests/test_existing_apis.py tests/test_api_endpoints.py -v --cov=. --cov-report=html --cov-report=term-missing
    else
        print_status "Running backend tests..."
        pytest tests/test_existing_db.py tests/test_existing_apis.py tests/test_api_endpoints.py -v
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Backend tests passed!"
    else
        print_error "Backend tests failed!"
        exit 1
    fi
    
    cd ..
fi

# Frontend Tests
if [ "$RUN_FRONTEND" = true ]; then
    print_status "Running frontend tests..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm ci
    
    # Run unit tests
    print_status "Running frontend unit tests..."
    if [ "$COVERAGE" = true ]; then
        npm run test:coverage
    else
        npm run test:run
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Frontend unit tests passed!"
    else
        print_error "Frontend unit tests failed!"
        exit 1
    fi
    
    cd ..
fi

# End-to-End Tests
if [ "$RUN_E2E" = true ]; then
    print_status "Running end-to-end tests..."
    
    cd frontend
    
    # Install Playwright browsers
    print_status "Installing Playwright browsers..."
    npx playwright install --with-deps
    
    # Start backend server in background
    print_status "Starting backend server..."
    cd ../backend
    source venv/bin/activate
    python main.py &
    BACKEND_PID=$!
    sleep 5
    
    # Start frontend server in background
    print_status "Starting frontend server..."
    cd ../frontend
    npm run build
    npm run preview &
    FRONTEND_PID=$!
    sleep 5
    
    # Run E2E tests
    print_status "Running end-to-end tests..."
    npm run test:e2e
    
    if [ $? -eq 0 ]; then
        print_success "End-to-end tests passed!"
    else
        print_error "End-to-end tests failed!"
        # Clean up background processes
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # Clean up background processes
    print_status "Cleaning up background processes..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    
    cd ..
fi

print_success "All tests completed successfully! 🎉"

# Show coverage summary if requested
if [ "$COVERAGE" = true ]; then
    print_status "Coverage reports generated:"
    if [ "$RUN_BACKEND" = true ]; then
        echo "  - Backend: backend/htmlcov/index.html"
    fi
    if [ "$RUN_FRONTEND" = true ]; then
        echo "  - Frontend: frontend/coverage/index.html"
    fi
fi
