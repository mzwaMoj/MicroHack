import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const cartFixture = {
  orderId: 41,
  branchId: 1,
  items: [
    {
      orderDetailId: 81,
      productId: 1,
      name: 'SmartFeeder One',
      imgName: 'feeder.png',
      unit: 'piece',
      quantity: 2,
      unitPrice: 97.49,
      lineTotal: 194.98,
    },
  ],
  total: 194.98,
};

const setupFixture = {
  issuer: 'OctoCAT Supply Demo',
  accountName: 'branch-1',
  qrCodeDataUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  manualEntryKey: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
};

const configureCheckoutRoutes = async (page: Page) => {
  await page.route('**/api/cart/1', (route) => route.fulfill({ json: cartFixture }));
  await page.route('**/api/cart/1/payment/setup', (route) => route.fulfill({ json: setupFixture }));
  await page.route('**/api/orders/branch/1/history', (route) => route.fulfill({ json: [] }));
};

const loginForCheckout = async (page: Page) => {
  await page.goto('/checkout');
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fcheckout/);
  await page.getByLabel('Email Address').fill('alice@github.com');
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
};

test.describe('Simulated checkout', () => {
  test('requires login and confirms an approved TOTP payment', async ({ page }) => {
    await configureCheckoutRoutes(page);
    await page.route('**/api/cart/1/checkout', async (route) => {
      const request = route.request().postDataJSON();
      expect(request).toMatchObject({
        cardholderName: 'Alice Octocat',
        paymentMethod: 'demo-card-approved',
        otp: '123456',
      });
      await route.fulfill({
        json: {
          paymentAttemptId: 9,
          orderId: 41,
          branchId: 1,
          amount: 194.98,
          providerReference: 'sim_test_approved',
          status: 'approved',
          orderStatus: 'pending',
          paidAt: '2026-09-22T12:00:00.000Z',
        },
      });
    });

    await loginForCheckout(page);
    await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
    await expect(page.getByLabel('Order summary')).toContainText('$194.98');
    await page.getByLabel('Cardholder name').fill('Alice Octocat');
    await page.getByLabel('Authentication code').fill('123456');
    await page.getByRole('button', { name: 'Pay $194.98' }).click();

    await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
    await expect(page.getByText('Order 41 was submitted for $194.98.')).toBeVisible();
  });

  test('shows a decline and keeps the checkout available for retry', async ({ page }) => {
    await configureCheckoutRoutes(page);
    await page.route('**/api/cart/1/checkout', (route) =>
      route.fulfill({
        status: 402,
        json: { error: { code: 'PAYMENT_DECLINED', message: 'The simulated payment was declined' } },
      }),
    );

    await loginForCheckout(page);
    await page.getByLabel('Cardholder name').fill('Alice Octocat');
    await page.getByText('Decline payment').click();
    await page.getByLabel('Authentication code').fill('123456');
    await page.getByRole('button', { name: 'Pay $194.98' }).click();

    await expect(page.getByRole('alert')).toContainText('The simulated payment was declined');
    await expect(page.getByRole('button', { name: 'Pay $194.98' })).toBeVisible();
  });
});