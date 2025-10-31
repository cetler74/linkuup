import { test, expect } from '@playwright/test'

test.describe('Booking Flow', () => {
  test('should complete the booking process', async ({ page }) => {
    // Start from homepage
    await page.goto('/')
    
    // Search for salons
    await page.getByRole('textbox', { name: /search/i }).fill('manicure')
    await page.getByRole('button', { name: /search/i }).click()
    
    // Wait for search results
    await expect(page).toHaveURL(/\/search/)
    await expect(page.getByText(/search results/i)).toBeVisible()
    
    // Click on first salon
    const firstSalon = page.locator('[data-testid="salon-card"]').first()
    await expect(firstSalon).toBeVisible()
    await firstSalon.getByRole('button', { name: /view details/i }).click()
    
    // Should navigate to salon details
    await expect(page).toHaveURL(/\/salon\/\d+/)
    
    // Click book appointment
    await page.getByRole('button', { name: /book appointment/i }).click()
    
    // Should navigate to booking page
    await expect(page).toHaveURL(/\/book\/\d+/)
    
    // Fill booking form
    await page.getByLabel(/customer name/i).fill('John Doe')
    await page.getByLabel(/email/i).fill('john@example.com')
    await page.getByLabel(/phone/i).fill('+351 123 456 789')
    
    // Select service
    await page.getByRole('combobox', { name: /service/i }).selectOption({ label: /manicure/i })
    
    // Select date
    await page.getByLabel(/date/i).fill('2024-12-25')
    
    // Select time
    await page.getByRole('combobox', { name: /time/i }).selectOption({ label: /10:00/i })
    
    // Add notes
    await page.getByLabel(/notes/i).fill('First time customer')
    
    // Submit booking
    await page.getByRole('button', { name: /book appointment/i }).click()
    
    // Should show confirmation
    await expect(page.getByText(/booking confirmed/i)).toBeVisible()
    await expect(page.getByText(/john@example.com/i)).toBeVisible()
  })

  test('should validate booking form', async ({ page }) => {
    await page.goto('/book/1')
    
    // Try to submit without filling required fields
    await page.getByRole('button', { name: /book appointment/i }).click()
    
    // Should show validation errors
    await expect(page.getByText(/name is required/i)).toBeVisible()
    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/phone is required/i)).toBeVisible()
  })

  test('should show available time slots', async ({ page }) => {
    await page.goto('/book/1')
    
    // Select a date
    await page.getByLabel(/date/i).fill('2024-12-25')
    
    // Should show available time slots
    await expect(page.getByText(/available times/i)).toBeVisible()
    
    // Check if time slots are clickable
    const timeSlots = page.locator('[data-testid="time-slot"]')
    await expect(timeSlots).toHaveCount.greaterThan(0)
  })

  test('should handle booking conflicts', async ({ page }) => {
    await page.goto('/book/1')
    
    // Fill form with a time that might be booked
    await page.getByLabel(/customer name/i).fill('John Doe')
    await page.getByLabel(/email/i).fill('john@example.com')
    await page.getByLabel(/phone/i).fill('+351 123 456 789')
    await page.getByLabel(/date/i).fill('2024-12-25')
    await page.getByRole('combobox', { name: /time/i }).selectOption({ label: /10:00/i })
    
    // Submit booking
    await page.getByRole('button', { name: /book appointment/i }).click()
    
    // Should either confirm or show conflict message
    const confirmation = page.getByText(/booking confirmed/i)
    const conflict = page.getByText(/time slot not available/i)
    
    await expect(confirmation.or(conflict)).toBeVisible()
  })

  test('should be mobile-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/book/1')
    
    // Check if form is properly displayed on mobile
    await expect(page.getByLabel(/customer name/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/phone/i)).toBeVisible()
    
    // Check if buttons are accessible
    await expect(page.getByRole('button', { name: /book appointment/i })).toBeVisible()
  })
})
