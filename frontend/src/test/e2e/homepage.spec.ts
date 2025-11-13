import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should display the homepage correctly', async ({ page }) => {
    await page.goto('/')
    
    // Check if the main elements are present
    await expect(page.getByText(/find your perfect nail salon/i)).toBeVisible()
    await expect(page.getByRole('textbox', { name: /search/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /search/i })).toBeVisible()
  })

  test('should navigate to search results when searching', async ({ page }) => {
    await page.goto('/')
    
    // Fill in search form
    await page.getByRole('textbox', { name: /search/i }).fill('manicure')
    await page.getByRole('button', { name: /search/i }).click()
    
    // Should navigate to search results
    await expect(page).toHaveURL(/\/search/)
    await expect(page.getByText(/search results/i)).toBeVisible()
  })

  test('should display featured salons', async ({ page }) => {
    await page.goto('/')
    
    // Wait for salons to load
    await expect(page.getByText(/featured salons/i)).toBeVisible()
    
    // Check if salon cards are present
    const salonCards = page.locator('[data-testid="salon-card"]')
    await expect(salonCards).toHaveCount.greaterThan(0)
  })

  test('should display popular services', async ({ page }) => {
    await page.goto('/')
    
    // Wait for services to load
    await expect(page.getByText(/popular services/i)).toBeVisible()
    
    // Check if service cards are present
    const serviceCards = page.locator('[data-testid="service-card"]')
    await expect(serviceCards).toHaveCount.greaterThan(0)
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Check if mobile navigation is present
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()
    
    // Check if content is properly displayed on mobile
    await expect(page.getByText(/find your perfect nail salon/i)).toBeVisible()
  })

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/')
    
    // Test navigation to different pages
    await page.getByRole('link', { name: /about/i }).click()
    await expect(page).toHaveURL(/\/about/)
    
    await page.goto('/')
    await page.getByRole('link', { name: /contact/i }).click()
    await expect(page).toHaveURL(/\/contact/)
  })
})
