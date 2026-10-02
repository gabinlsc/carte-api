import { test, expect } from '@playwright/test';
test('account, point, polygon, request inspector, search, mobile and logout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 982 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/explorer');
  await expect(page.locator('#auth-dialog')).toBeVisible();
  await page.fill('#username', 'reviewer');
  await page.fill('#password', 'e2e-test-password');
  await page.locator('#auth-form button[type=submit]').click();
  await expect(page.locator('#auth-dialog')).not.toBeVisible();
  await page.click('#tool-point');
  await page.locator('#map').click({ position: { x: 400, y: 300 } });
  await page.fill('#point-name', 'Lorient centre');
  await page.click('#send-payload');
  await expect(page.locator('#create-status')).toContainText(
    'Créé avec succès',
  );
  await page.click('#composer-close');
  await page.click('#console-toggle');
  await expect(page.locator('#response-json')).toContainText('Lorient centre');
  await expect(page.locator('#requests')).not.toContainText(
    'e2e-test-password',
  );
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/explorer-desktop.png' });
  await page.click('#selection-close');
  await page.click('#console-toggle');
  await page.click('#tool-zone');
  for (const position of [
    { x: 200, y: 230 },
    { x: 300, y: 230 },
    { x: 300, y: 330 },
  ])
    await page.locator('#map').click({ position });
  await page.click('#finish-zone');
  await page.fill('#point-name', 'Zone Lorient');
  await page.click('#send-payload');
  await expect(page.locator('#create-status')).toContainText(
    'Créé avec succès',
  );
  await page.click('#composer-close');
  await page.fill('#search', 'no-result-match');
  await expect(page.locator('.result')).toHaveCount(0);
  await page.fill('#search', '');
  await expect(page.locator('.result')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('#connection-state')).toContainText(
    'API connectée',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({ path: 'test-results/explorer-mobile.png' });
  await page.click('#sidebar-open');
  await expect(page.locator('#sidebar')).toBeVisible();
  await page.click('#sidebar-close');
  await page.click('#auth-open');
  await page.click('#logout');
  await expect(page.locator('#connection-state')).toContainText('Déconnecté');
  expect(errors).toEqual([]);
});
