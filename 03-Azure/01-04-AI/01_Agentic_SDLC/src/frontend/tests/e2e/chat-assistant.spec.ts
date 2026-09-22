import { expect, test } from '@playwright/test';

const chatResponse = {
  answer: 'SmartFeeder One monitors eating habits and can help identify overeating.',
  citations: [
    { sourceId: 'product-1', sourceType: 'product', title: 'SmartFeeder One' },
  ],
  products: [
    {
      productId: 1,
      supplierId: 1,
      name: 'SmartFeeder One',
      description: 'AI-powered feeder that learns feeding habits.',
      price: 129.99,
      sku: 'CAT-FEED-001',
      unit: 'piece',
      imgName: 'feeder.png',
      discount: 0.25,
      supplierName: 'PurrTech Innovations',
      supplierActive: true,
      supplierVerified: true,
      score: 0.91,
      sourceId: 'product-1',
    },
  ],
};

test.describe('Catalog assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatResponse),
      });
    });
    await page.goto('/assistant');
  });

  test('submits a natural-language request and renders grounded products', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Find the right product' })).toBeVisible();
    await page.getByLabel('Ask about the catalog').fill('What helps monitor overeating?');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText('SmartFeeder One monitors eating habits')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SmartFeeder One' })).toBeVisible();
    await expect(page.getByText('Verified supplier')).toBeVisible();
    await expect(page.getByText('Sources: SmartFeeder One')).toBeVisible();
  });

  test('previews, removes, and uploads an image', async ({ page }) => {
    const imageInput = page.locator('input[type="file"]');
    await imageInput.setInputFiles({
      name: 'feeder.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake png'),
    });
    await expect(page.getByAltText('Selected product')).toBeVisible();
    await page.getByRole('button', { name: 'Remove selected image' }).click();
    await expect(page.getByAltText('Selected product')).toHaveCount(0);

    await imageInput.setInputFiles({
      name: 'feeder.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake png'),
    });
    const chatRequest = page.waitForRequest('**/api/chat');
    await page.getByRole('button', { name: 'Send message' }).click();
    const request = await chatRequest;

    expect(await request.headerValue('content-type')).toContain('multipart/form-data');
    expect(request.postDataBuffer()?.toString()).toContain('feeder.png');
    await expect(page.getByText('Attached: feeder.png')).toBeVisible();
  });
});