const { test, expect } = require('@playwright/test');

test.describe('Módulo de Clientes', () => {
  test.beforeEach(async ({ page }) => {
    // Asumiendo que hay una forma de autenticarse
    await page.goto('/');
  });

  test('debería cargar listado de clientes', async ({ page }) => {
    await page.goto('/clientes');
    await expect(page.locator('h1, h2')).toContainText(/clientes/i);
  });

  test('debería tener botón de crear cliente', async ({ page }) => {
    await page.goto('/clientes');
    const crearBtn = page.locator('a[href*="nuevo"], button:has-text("Crear"), button:has-text("Nuevo")');
    await expect(crearBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('debería mostrar tabla de clientes', async ({ page }) => {
    await page.goto('/clientes');
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
  });
});
