import { test, expect } from '@playwright/test'

/**
 * End-to-end flow (master prompt section 33): start → symptoms → questions
 * → assessment → result. Runs against the real edge runtime and real
 * MedPsy model — no network mocking. Requires `npm run dev` to be running.
 */
test('completes a full assessment from the landing page through to a result', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Orientación temprana/i })).toBeVisible()

  await page.getByRole('link', { name: 'Comenzar evaluación' }).click()
  await expect(page).toHaveURL(/\/disclaimer/)

  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click()
  await expect(page).toHaveURL(/\/assessment\/new/)

  // Select "Dificultad respiratoria" and "Fiebre"
  await page.getByRole('button', { name: 'Dificultad respiratoria' }).click()
  await page.getByRole('button', { name: 'Fiebre' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Adaptive questions should now render — answer them all "No" except
  // the severe-breathing one, to trigger a clear, testable EMERGENCY path.
  await expect(page.getByText('Algunas preguntas más')).toBeVisible({ timeout: 15000 })
  const cards = page.locator('.card')
  const count = await cards.count()
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i)
    const heading = await card.locator('h3').first().textContent()
    const answer = heading?.includes('dificultad respiratoria severa') ? 'Sí' : 'No'
    await card.getByRole('button', { name: answer }).click()
  }

  await page.getByRole('button', { name: 'Ver evaluación' }).click()

  // MedPsy runs locally here — allow generous time for real inference.
  await expect(page).toHaveURL(/\/assessment\/[a-f0-9-]+/, { timeout: 30000 })
  await expect(page.getByRole('heading', { name: 'Emergencia' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Próximos pasos recomendados')).toBeVisible()
  await expect(page.getByText('Fuentes')).toBeVisible()
})
