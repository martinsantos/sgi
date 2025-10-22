const { test, expect } = require('@playwright/test');

test.describe('Login Flow', () => {
  test('debería cargar la página de login', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveTitle(/SGI|Login|Gestión/i);
  });

  test('debería mostrar formulario de login', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
  });

  test('debería validar campos requeridos', async ({ page }) => {
    await page.goto('/auth/login');
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    // Sistema debería mostrar error o no redirigir
    await expect(page).toHaveURL(/login/);
  });
});
