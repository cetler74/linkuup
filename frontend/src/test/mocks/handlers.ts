import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:5001/api/v1'

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE_URL}/auth/register`, () => {
    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      phone: '+1234567890',
      created_at: '2024-01-01T00:00:00Z'
    }, { status: 201 })
  }),

  http.post(`${API_BASE_URL}/auth/login`, () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      expires_in: 3600
    }, { status: 200 })
  }),

  http.get(`${API_BASE_URL}/auth/me`, () => {
    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      phone: '+1234567890'
    }, { status: 200 })
  }),

  // Places endpoints
  http.get(`${API_BASE_URL}/places`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test Salon',
        description: 'A beautiful nail salon',
        address: '123 Main St',
        city: 'Lisbon',
        postal_code: '1000-001',
        phone: '+351 123 456 789',
        email: 'info@testsalon.com',
        website: 'https://testsalon.com',
        latitude: 38.7223,
        longitude: -9.1393,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        name: 'Another Salon',
        description: 'Another beautiful nail salon',
        address: '456 Oak Ave',
        city: 'Porto',
        postal_code: '4000-001',
        phone: '+351 987 654 321',
        email: 'info@anothersalon.com',
        website: 'https://anothersalon.com',
        latitude: 41.1579,
        longitude: -8.6291,
        created_at: '2024-01-01T00:00:00Z'
      }
    ], { status: 200 })
  }),

  http.get(`${API_BASE_URL}/places/:id`, ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id: Number(id),
      name: 'Test Salon',
      description: 'A beautiful nail salon',
      address: '123 Main St',
      city: 'Lisbon',
      postal_code: '1000-001',
      phone: '+351 123 456 789',
      email: 'info@testsalon.com',
      website: 'https://testsalon.com',
      latitude: 38.7223,
      longitude: -9.1393,
      created_at: '2024-01-01T00:00:00Z'
    }, { status: 200 })
  }),

  // Services endpoints
  http.get(`${API_BASE_URL}/services`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Manicure',
        description: 'Classic manicure service',
        price: 25.00,
        duration: 60,
        category: 'Nail Care',
        place_id: 1
      },
      {
        id: 2,
        name: 'Pedicure',
        description: 'Classic pedicure service',
        price: 30.00,
        duration: 90,
        category: 'Nail Care',
        place_id: 1
      },
      {
        id: 3,
        name: 'Gel Polish',
        description: 'Gel polish application',
        price: 35.00,
        duration: 75,
        category: 'Nail Care',
        place_id: 1
      }
    ], { status: 200 })
  }),

  http.get(`${API_BASE_URL}/places/:id/services`, ({ params }) => {
    const { id } = params
    return HttpResponse.json([
      {
        id: 1,
        name: 'Manicure',
        description: 'Classic manicure service',
        price: 25.00,
        duration: 60,
        category: 'Nail Care',
        place_id: Number(id)
      },
      {
        id: 2,
        name: 'Pedicure',
        description: 'Classic pedicure service',
        price: 30.00,
        duration: 90,
        category: 'Nail Care',
        place_id: Number(id)
      }
    ], { status: 200 })
  }),

  // Bookings endpoints
  http.get(`${API_BASE_URL}/bookings/my-bookings`, () => {
    return HttpResponse.json([
      {
        id: 1,
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '+351 123 456 789',
        service_id: 1,
        place_id: 1,
        booking_date: '2024-12-25',
        booking_time: '10:00:00',
        status: 'confirmed',
        notes: 'First time customer',
        created_at: '2024-01-01T00:00:00Z'
      }
    ], { status: 200 })
  }),

  http.post(`${API_BASE_URL}/bookings`, () => {
    return HttpResponse.json({
      id: 1,
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      customer_phone: '+351 123 456 789',
      service_id: 1,
      place_id: 1,
      booking_date: '2024-12-25',
      booking_time: '10:00:00',
      status: 'confirmed',
      notes: 'First time customer',
      created_at: '2024-01-01T00:00:00Z'
    }, { status: 201 })
  }),

  http.get(`${API_BASE_URL}/places/:id/availability`, ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      place_id: Number(id),
      date: '2024-12-25',
      available_slots: [
        '09:00:00',
        '10:00:00',
        '11:00:00',
        '14:00:00',
        '15:00:00',
        '16:00:00'
      ]
    }, { status: 200 })
  }),

  // Owner endpoints
  http.get(`${API_BASE_URL}/owner/places`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'My Salon',
        description: 'My beautiful salon',
        address: '123 Main St',
        city: 'Lisbon',
        postal_code: '1000-001',
        phone: '+351 123 456 789',
        email: 'info@mysalon.com',
        website: 'https://mysalon.com',
        latitude: 38.7223,
        longitude: -9.1393,
        created_at: '2024-01-01T00:00:00Z'
      }
    ], { status: 200 })
  }),

  http.post(`${API_BASE_URL}/owner/places`, () => {
    return HttpResponse.json({
      id: 1,
      name: 'New Salon',
      description: 'A new salon',
      address: '789 New St',
      city: 'Lisbon',
      postal_code: '1000-002',
      phone: '+351 111 222 333',
      email: 'info@newsalon.com',
      website: 'https://newsalon.com',
      latitude: 38.7223,
      longitude: -9.1393,
      created_at: '2024-01-01T00:00:00Z'
    }, { status: 201 })
  }),

  http.get(`${API_BASE_URL}/owner/services`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Manicure',
        description: 'Classic manicure service',
        price: 25.00,
        duration: 60,
        category: 'Nail Care',
        place_id: 1
      }
    ], { status: 200 })
  }),

  http.post(`${API_BASE_URL}/owner/services`, () => {
    return HttpResponse.json({
      id: 1,
      name: 'New Service',
      description: 'A new service',
      price: 40.00,
      duration: 90,
      category: 'Nail Care',
      place_id: 1
    }, { status: 201 })
  }),

  http.get(`${API_BASE_URL}/owner/bookings`, () => {
    return HttpResponse.json([
      {
        id: 1,
        customer_name: 'Jane Doe',
        customer_email: 'jane@example.com',
        customer_phone: '+351 987 654 321',
        service_id: 1,
        place_id: 1,
        booking_date: '2024-12-25',
        booking_time: '14:00:00',
        status: 'confirmed',
        notes: 'Regular customer',
        created_at: '2024-01-01T00:00:00Z'
      }
    ], { status: 200 })
  })
]
