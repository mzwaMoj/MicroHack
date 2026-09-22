import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.VITE_API_URL ?? 'http://localhost:3000';

test.describe('Shopping cart', () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.get(`${apiBaseUrl}/api/cart/1`);
    if (response.ok()) {
      const cart = await response.json();
      await Promise.all(
        cart.items.map((item: { orderDetailId: number }) =>
          request.delete(`${apiBaseUrl}/api/cart/1/items/${item.orderDetailId}`),
        ),
      );
    }
  });

  test('adds, updates, persists, and removes a cart item', async ({ page }) => {
    await page.goto('/products');
    const productCard = page.getByRole('heading', { name: 'SmartFeeder One' }).locator('../..');

    await productCard.getByRole('button', { name: 'Increase quantity of SmartFeeder One' }).click();
    await productCard.getByRole('button', { name: 'Increase quantity of SmartFeeder One' }).click();
    await productCard.getByRole('button', { name: /Add 2 SmartFeeder One to cart/ }).click();
    await expect(page.getByRole('status')).toContainText('Product added to cart.');

    await page.getByRole('link', { name: 'Cart', exact: true }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole('heading', { name: 'SmartFeeder One' })).toBeVisible();
    await expect(page.getByLabel('Cart total')).toContainText('$194.98');

    await page.getByRole('button', { name: 'Increase SmartFeeder One quantity' }).click();
    await expect(page.getByLabel('Cart total')).toContainText('$292.47');

    await page.reload();
    await expect(page.getByLabel('SmartFeeder One quantity', { exact: true })).toHaveText('3');
    await expect(page.getByLabel('Cart total')).toContainText('$292.47');

    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  });
});