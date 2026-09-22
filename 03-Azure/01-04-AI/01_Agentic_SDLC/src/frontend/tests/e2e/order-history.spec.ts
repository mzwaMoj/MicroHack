import { test, expect } from '@playwright/test';

const orderHistoryFixture = [
  {
    orderId: 1,
    branchId: 1,
    orderDate: '2026-09-21T10:00:00.000Z',
    name: 'Q2 Feline Tech Refresh',
    description: 'Quarterly smart cat tech product refresh',
    status: 'delivered',
    total: 1449.9,
    details: [
      {
        orderDetailId: 1,
        productId: 2,
        productName: 'AutoClean Litter Dome',
        quantity: 5,
        unitPrice: 199.99,
        lineTotal: 999.95,
        notes: 'AutoClean Litter Domes for new locations',
      },
      {
        orderDetailId: 2,
        productId: 3,
        productName: 'CatFlix Entertainment Portal',
        quantity: 5,
        unitPrice: 89.99,
        lineTotal: 449.95,
        notes: 'Entertainment portals for waiting areas',
      },
    ],
  },
];

test.describe('Order history', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Navigate to order history from the main navigation', async ({ page }) => {
    await page.getByRole('link', { name: 'Orders' }).click();

    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByRole('heading', { name: 'Order History' })).toBeVisible();
  });

  test('View order list and selected order details', async ({ page }) => {
    await page.route('**/api/orders/branch/*/history', async (route) => {
      await route.fulfill({ json: orderHistoryFixture });
    });

    await page.goto('/orders');

    await expect(page.getByRole('heading', { name: 'Order History' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Q2 Feline Tech Refresh/ })).toBeVisible();

    const details = page.getByLabel('Order details');
    await expect(details).toContainText('$1,449.90');
    await expect(details).toContainText('AutoClean Litter Dome');
    await expect(details).toContainText('CatFlix Entertainment Portal');
    await expect(details).toContainText('5 x $199.99');
  });

  test('Show empty state when a branch has no order history', async ({ page }) => {
    await page.route('**/api/orders/branch/*/history', async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto('/orders');

    await expect(page.getByRole('heading', { name: 'No orders yet' })).toBeVisible();
    await page.getByRole('link', { name: 'Browse products' }).click();
    await expect(page).toHaveURL(/\/products/);
  });
});