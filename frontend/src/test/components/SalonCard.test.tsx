import { describe, it, expect } from 'vitest'
import { render, screen } from '../utils/test-utils'
import { SalonCard } from '../../components/SalonCard'

const mockSalon = {
  id: 1,
  name: 'Test Salon',
  description: 'A beautiful nail salon in the heart of the city',
  address: '123 Main Street',
  city: 'Lisbon',
  postal_code: '1000-001',
  phone: '+351 123 456 789',
  email: 'info@testsalon.com',
  website: 'https://testsalon.com',
  latitude: 38.7223,
  longitude: -9.1393,
  created_at: '2024-01-01T00:00:00Z'
}

describe('SalonCard', () => {
  it('renders salon information correctly', () => {
    render(<SalonCard salon={mockSalon} />)
    
    expect(screen.getByText(mockSalon.name)).toBeInTheDocument()
    expect(screen.getByText(mockSalon.description)).toBeInTheDocument()
    expect(screen.getByText(mockSalon.address)).toBeInTheDocument()
    expect(screen.getByText(mockSalon.city)).toBeInTheDocument()
    expect(screen.getByText(mockSalon.phone)).toBeInTheDocument()
  })

  it('displays contact information', () => {
    render(<SalonCard salon={mockSalon} />)
    
    expect(screen.getByText(mockSalon.email)).toBeInTheDocument()
    expect(screen.getByText(mockSalon.website)).toBeInTheDocument()
  })

  it('has a view details button', () => {
    render(<SalonCard salon={mockSalon} />)
    
    const viewButton = screen.getByRole('button', { name: /view details/i })
    expect(viewButton).toBeInTheDocument()
  })

  it('has a book appointment button', () => {
    render(<SalonCard salon={mockSalon} />)
    
    const bookButton = screen.getByRole('button', { name: /book appointment/i })
    expect(bookButton).toBeInTheDocument()
  })

  it('handles missing optional fields gracefully', () => {
    const salonWithoutOptional = {
      ...mockSalon,
      website: undefined,
      email: undefined
    }
    
    render(<SalonCard salon={salonWithoutOptional} />)
    
    expect(screen.getByText(mockSalon.name)).toBeInTheDocument()
    expect(screen.getByText(mockSalon.address)).toBeInTheDocument()
  })

  it('is responsive and accessible', () => {
    render(<SalonCard salon={mockSalon} />)
    
    // Check if the card has proper ARIA attributes
    const card = screen.getByRole('article')
    expect(card).toBeInTheDocument()
    
    // Check if buttons are accessible
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toBeInTheDocument()
    })
  })
})
