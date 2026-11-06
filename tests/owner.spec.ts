import { expect, test } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:43130' })

test('owner audition keeps, undoes, and does not treat a rejection as approved', async ({ page }) => {
  await page.goto('/owner.html')
  await expect(page.getByText('Owner audition')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Keep' })).toBeVisible()
  const name = await page.locator('.review-name').innerText()
  await page.getByRole('button', { name: 'Keep' }).click()
  await expect(page.getByText(/1 kept/)).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText(/0 kept/)).toBeVisible()
  await page.getByRole('button', { name: 'Reject', exact: true }).click()
  await page.getByRole('button', { name: 'Try my companion' }).click()
  await expect(page.getByText('Nothing is kept yet')).toBeVisible()
  await expect(page.getByText(name, { exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByText(/1 rejected/)).toBeVisible()
})

test('simulated movement on a motion candidate is labelled and not claimed as a phone sensor', async ({ page }) => {
  await page.goto('/owner.html')
  await page.getByRole('button', { name: 'Overview' }).click()
  await page.getByRole('button', { name: /Look left/ }).click()
  await expect(page.getByText('Simulated movement', { exact: true })).toBeVisible()
  await expect(page.getByText(/does not grant motion sensors/)).toBeVisible()
})
