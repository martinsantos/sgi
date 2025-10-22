const { test, expect } = require('@playwright/test');

test.describe('Navegación General', () => {
  test('debería cargar la página principal', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(dashboard|auth|login)?/);
  });

  test('debería tener navegación', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav, .navbar, header');
    await expect(nav.first()).toBeVisible({ timeout: 10000 });
  });

  test('debería responder en menos de 3 segundos', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(3000);
  });
});
