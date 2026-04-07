import { test, expect } from '@playwright/test';
import { uniqueUser, signupAndLogin, fillTournamentForm, validTournament } from './helpers.js';

test.describe('Tournaments — Add', () => {
  test.beforeEach(async ({ page }) => {
    await signupAndLogin(page, uniqueUser());
    await page.goto('/tournaments');
  });

  test('clicking Add Tournament shows the form', async ({ page }) => {
    await page.getByRole('button', { name: /\+ add tournament/i }).click();
    await expect(page.getByLabel('Tournament Name')).toBeVisible();
  });

  test('adds a tournament and shows it in the list', async ({ page }) => {
    await page.getByRole('button', { name: /\+ add tournament/i }).click();
    await fillTournamentForm(page, validTournament);

    await expect(page.getByText(validTournament.name)).toBeVisible();
    await expect(page.getByText(/men's singles/i)).toBeVisible();
  });

  test('shows live profit preview while filling the form', async ({ page }) => {
    await page.getByRole('button', { name: /\+ add tournament/i }).click();

    await page.getByRole('radio', { name: 'Gold' }).check();
    await page.getByLabel(/Entry Fees Paid/).first().fill('500');
    await page.getByLabel(/Winning Prize Received/).fill('5000');

    // Profit = 5000 - 500 = 4500
    await expect(page.getByText(/₹4,500|4,500/)).toBeVisible();
  });

  test('winning prize field is disabled when medal is None', async ({ page }) => {
    await page.getByRole('button', { name: /\+ add tournament/i }).click();
    await page.getByRole('radio', { name: 'None' }).check();

    const winningInput = page.getByLabel(/Winning Prize Received/);
    await expect(winningInput).toBeDisabled();
  });

  test('winning prize field enables when a medal is selected', async ({ page }) => {
    await page.getByRole('button', { name: /\+ add tournament/i }).click();
    await page.getByRole('radio', { name: 'Silver' }).check();

    const winningInput = page.getByLabel(/Winning Prize Received/);
    await expect(winningInput).toBeEnabled();
  });

  test('shows validation error when name is missing', async ({ page }) => {
    await page.getByRole('button', { name: /\+ add tournament/i }).click();
    // Submit without filling name
    await page.getByRole('button', { name: /add tournament/i }).click();
    await expect(page.getByText(/tournament name is required/i)).toBeVisible();
  });

  test('shows validation error when medal is Gold but winning prize is 0', async ({ page }) => {
    await page.getByRole('button', { name: /\+ add tournament/i }).click();

    await page.getByLabel('Tournament Name').fill('Test');
    await page.getByLabel('Category Name').selectOption("Men's Singles");
    await page.getByLabel(/^Date$/).fill('2024-06-15');
    await page.getByRole('radio', { name: 'Gold' }).check();
    await page.getByLabel(/Entry Fees Paid/).first().fill('500');
    await page.getByLabel(/Winning Prize Received/).fill('0');

    await page.getByRole('button', { name: /add tournament/i }).click();
    await expect(page.getByText(/greater than 0/i)).toBeVisible();
  });

  test('shows empty state message when no tournaments exist', async ({ page }) => {
    await expect(page.getByText(/no tournaments yet/i)).toBeVisible();
  });

  test('cancel button hides the form', async ({ page }) => {
    await page.getByRole('button', { name: /\+ add tournament/i }).click();
    await expect(page.getByLabel('Tournament Name')).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByLabel('Tournament Name')).not.toBeVisible();
  });
});

test.describe('Tournaments — Edit', () => {
  let user;

  test.beforeEach(async ({ page }) => {
    user = uniqueUser();
    await signupAndLogin(page, user);
    await page.goto('/tournaments');

    // Add one tournament
    await page.getByRole('button', { name: /\+ add tournament/i }).click();
    await fillTournamentForm(page, validTournament);
    await expect(page.getByText(validTournament.name)).toBeVisible();
  });

  test('clicking Edit populates the edit form with existing data', async ({ page }) => {
    await page.getByRole('button', { name: /edit/i }).first().click();
    await expect(page.getByLabel('Tournament Name')).toHaveValue(validTournament.name);
    await expect(page.getByLabel('Category')).toHaveValue(validTournament.category);
  });

  test('editing a tournament updates the name in the list', async ({ page }) => {
    await page.getByRole('button', { name: /edit/i }).first().click();

    await page.getByLabel('Tournament Name').fill('Updated Championship');
    await page.getByRole('button', { name: /update tournament/i }).click();

    await expect(page.getByText('Updated Championship')).toBeVisible();
    await expect(page.getByText(validTournament.name)).not.toBeVisible();
  });

  test('editing winning amount recalculates profit in the list', async ({ page }) => {
    await page.getByRole('button', { name: /edit/i }).first().click();

    await page.getByLabel('Winning Amount (₹)').fill('10000');
    await page.getByRole('button', { name: /update tournament/i }).click();

    // Profit should be (10000 - 500) - 200 = 9300
    await expect(page.getByText(/9,300|₹9,300/)).toBeVisible();
  });

  test('cancel edit restores the list without changes', async ({ page }) => {
    await page.getByRole('button', { name: /edit/i }).first().click();
    await page.getByLabel('Tournament Name').fill('Should Not Save');
    await page.getByRole('button', { name: /cancel/i }).click();

    await expect(page.getByText('Should Not Save')).not.toBeVisible();
    await expect(page.getByText(validTournament.name)).toBeVisible();
  });
});

test.describe('Tournaments — Delete', () => {
  test.beforeEach(async ({ page }) => {
    await signupAndLogin(page, uniqueUser());
    await page.goto('/tournaments');

    await page.getByRole('button', { name: /\+ add tournament/i }).click();
    await fillTournamentForm(page, validTournament);
    await expect(page.getByText(validTournament.name)).toBeVisible();
  });

  test('first Delete click shows Confirm/Cancel (two-step pattern)', async ({ page }) => {
    await page.getByRole('button', { name: /^delete$/i }).first().click();
    await expect(page.getByRole('button', { name: /confirm/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('cancelling delete leaves tournament in the list', async ({ page }) => {
    await page.getByRole('button', { name: /^delete$/i }).first().click();
    await page.getByRole('button', { name: /cancel/i }).click();

    await expect(page.getByText(validTournament.name)).toBeVisible();
  });

  test('confirming delete removes the tournament from the list', async ({ page }) => {
    await page.getByRole('button', { name: /^delete$/i }).first().click();
    await page.getByRole('button', { name: /confirm/i }).click();

    await expect(page.getByText(validTournament.name)).not.toBeVisible();
    await expect(page.getByText(/no tournaments yet/i)).toBeVisible();
  });
});

test.describe('Tournaments — Profit Calculation', () => {
  test.beforeEach(async ({ page }) => {
    await signupAndLogin(page, uniqueUser());
    await page.goto('/tournaments');
  });

  test('profit = winningAmount - entryFee (positive)', async ({ page }) => {
    await page.getByRole('button', { name: /\+ add tournament/i }).click();
    await fillTournamentForm(page, {
      name: 'Profit Test',
      categories: [
        {
          categoryName: "Women's Doubles",
          medal: 'Gold',
          prizeAmount: '8000',
          entryFee: '1000',
        },
      ],
      date: '2024-08-10',
    });

    // Profit = 8000 - 1000 = 7000
    await expect(page.getByText(/7,000|₹7,000/)).toBeVisible();
  });

  test('negative profit is shown in red', async ({ page }) => {
    await page.getByRole('button', { name: /\+ add tournament/i }).click();
    await fillTournamentForm(page, {
      name: 'Loss Test',
      categories: [
        {
          categoryName: 'Mixed Doubles',
          medal: 'None',
          prizeAmount: '0',
          entryFee: '2000',
        },
      ],
      date: '2024-09-05',
    });

    // Profit = 0 - 2000 = -2000, displayed in red
    const profitEl = page.getByText(/-2,000|-₹2,000/);
    await expect(profitEl).toBeVisible();
    await expect(profitEl).toHaveClass(/text-red/);
  });

  test('medal None with zero winning amount is accepted', async ({ page }) => {
    await page.getByRole('button', { name: /\+ add tournament/i }).click();
    await fillTournamentForm(page, {
      name: 'No Medal Tournament',
      categories: [
        {
          categoryName: 'Beginner Singles',
          medal: 'None',
          prizeAmount: '0',
          entryFee: '300',
        },
      ],
      date: '2024-07-01',
    });

    await expect(page.getByText('No Medal Tournament')).toBeVisible();
  });
});
