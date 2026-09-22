import { test, expect } from '@playwright/test';

/**
 * Product catalog discovery E2E tests
 * Implements: frontend/tests/features/product-navigation.feature
 *
 * Covers:
 * - Navigation from home page to product catalog
 * - Product search with valid matches
 * - Product search with no matches (empty state)
 */

test.describe('Product catalog discovery', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate away from about:blank so localStorage context is available
    await page.goto('/');
  });

  test('Navigate from the home page to the product catalog', async ({ page }) => {
    // Given I am on the home page
    await page.goto('/');
    await expect(page.locator('h1:has-text("Smart Cat Tech")')).toBeVisible();

    // When I select the Products navigation link
    await page.click('nav a:has-text("Products")');

    // Then I land on the product catalog page
    await expect(page).toHaveURL(/\/products/);

    // And I see the catalog header "Products"
    await expect(page.locator('h1:has-text("Products")')).toBeVisible();
  });

  test('Search for a product by name', async ({ page }) => {
    // Given I am viewing the product catalog
    await page.goto('/products');
    await expect(page.locator('h1:has-text("Products")')).toBeVisible();

    // And the catalog includes "SmartFeeder One"
    // Wait for product grid to load
    const productGrid = page.locator('div[class*="grid"]').filter({ hasText: 'SmartFeeder One' });
    await expect(productGrid).toBeVisible();

    // When I search for "SmartFeeder"
    const searchInput = page.locator('input[aria-label="Search products"]');
    await searchInput.fill('SmartFeeder');

    // Then the results list shows "SmartFeeder One"
    const productCard = page.locator('h3:has-text("SmartFeeder One")');
    await expect(productCard).toBeVisible();

    // And the product description is visible in the results
    const description = page.locator('text=/AI-powered feeder.*nap cycles/i').first();
    await expect(description).toBeVisible();
  });

  test('Filter products by supplier', async ({ page }) => {
    // Given I am viewing the product catalog
    await page.goto('/products');
    await expect(page.locator('h1:has-text("Products")')).toBeVisible();
    await expect(page.locator('h3:has-text("SmartFeeder One")')).toBeVisible();

    // When I filter by the supplier that owns SmartFeeder One
    await page.getByLabel('Filter by supplier').selectOption({ label: 'CatNip Creations' });

    // Then matching products remain and products from other suppliers are hidden
    await expect(page.locator('h3:has-text("SmartFeeder One")')).toBeVisible();
    await expect(page.locator('h3:has-text("CatFlix Entertainment Portal")')).toHaveCount(0);
  });

  test('Filter products by price range and clear filters', async ({ page }) => {
    // Given I am viewing the product catalog
    await page.goto('/products');
    await expect(page.locator('h1:has-text("Products")')).toBeVisible();
    await expect(page.locator('h3:has-text("SmartFeeder One")')).toBeVisible();

    // When I enter a price range that includes SmartFeeder One
    await page.getByLabel('Minimum price').fill('120');
    await page.getByLabel('Maximum price').fill('140');

    // Then only products in that range are shown
    await expect(page.locator('h3:has-text("SmartFeeder One")')).toBeVisible();
    await expect(page.locator('h3:has-text("CatFlix Entertainment Portal")')).toHaveCount(0);

    // When I clear filters
    await page.getByRole('button', { name: 'Clear' }).click();

    // Then the full catalog is restored
    await expect(page.locator('h3:has-text("SmartFeeder One")')).toBeVisible();
    await expect(page.locator('h3:has-text("CatFlix Entertainment Portal")')).toBeVisible();
  });

  test('Search for a product with no matches', async ({ page }) => {
    // Given I am viewing the product catalog
    await page.goto('/products');
    await expect(page.locator('h1:has-text("Products")')).toBeVisible();

    // Wait for initial products to load
    await expect(page.locator('div[class*="grid"]').first()).toBeVisible();

    // When I search for "Space Tuna"
    const searchInput = page.locator('input[aria-label="Search products"]');
    await searchInput.fill('Space Tuna');

    // Then I see the empty state message "No products found"
    const emptyState = page.locator('[role="status"]');
    await expect(emptyState).toContainText('No products found');

    // And I am prompted to adjust the search filters
    await expect(emptyState).toContainText(/clearing.*changing.*search filters/i);
  });
});
