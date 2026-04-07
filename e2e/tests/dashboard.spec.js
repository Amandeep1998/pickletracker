import { test, expect } from '@playwright/test';
import { uniqueUser, signupAndLogin, fillTournamentForm } from './helpers.js';

const addTournament = async (page, t) => {
  await page.goto('/tournaments');
  await page.getByRole('button', { name: /\+ add tournament/i }).click();
  await fillTournamentForm(page, t);
  await expect(page.getByText(t.name)).toBeVisible();
};

test.describe('Dashboard — Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await signupAndLogin(page, uniqueUser());
  });

  test('shows zero stats when no tournaments exist', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(/₹0\.00|₹0/i).first()).toBeVisible();
  });

  test('shows empty chart message when no tournaments exist', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(/no tournament data yet/i)).toBeVisible();
  });

  test('dashboard is accessible from navbar', async ({ page }) => {
    await page.goto('/tournaments');
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('Dashboard — Stats Update After Adding Tournaments', () => {
  let user;

  test.beforeEach(async ({ page }) => {
    user = uniqueUser();
    await signupAndLogin(page, user);
  });

  test('total earnings reflects winning amounts', async ({ page }) => {
    await addTournament(page, {
      name: 'Summer Cup',
      categories: [
        {
          categoryName: "Men's Singles",
          medal: 'Gold',
          prizeAmount: '5000',
          entryFee: '500',
        },
      ],
      date: '2024-06-01',
    });

    await page.goto('/dashboard');
    // Total Earnings = 5000
    await expect(page.getByText(/5,000|₹5,000/)).toBeVisible();
  });

  test('total expenses reflects entry fees only', async ({ page }) => {
    await addTournament(page, {
      name: 'Winter Open',
      categories: [
        {
          categoryName: "Women's Singles",
          medal: 'Gold',
          prizeAmount: '3000',
          entryFee: '600',
        },
      ],
      date: '2024-03-15',
    });

    await page.goto('/dashboard');
    // Total Expenses = 600
    await expect(page.getByText(/600|₹600/)).toBeVisible();
  });

  test('net profit is correctly shown', async ({ page }) => {
    await addTournament(page, {
      name: 'Spring Tournament',
      categories: [
        {
          categoryName: 'Mixed Doubles',
          medal: 'Silver',
          prizeAmount: '4000',
          entryFee: '500',
        },
      ],
      date: '2024-04-20',
    });

    await page.goto('/dashboard');
    // Profit = 4000 - 500 = 3500
    await expect(page.getByText(/3,500|₹3,500/)).toBeVisible();
  });

  test('tournament count card shows correct count', async ({ page }) => {
    await addTournament(page, {
      name: 'Tournament 1',
      categories: [
        {
          categoryName: 'Beginner Singles',
          medal: 'None',
          prizeAmount: '0',
          entryFee: '200',
        },
      ],
      date: '2024-05-10',
    });

    await addTournament(page, {
      name: 'Tournament 2',
      categories: [
        {
          categoryName: 'Beginner Doubles',
          medal: 'Bronze',
          prizeAmount: '1000',
          entryFee: '300',
        },
      ],
      date: '2024-05-20',
    });

    await page.goto('/dashboard');
    // 2 tournaments in the current year
    const yearSelect = page.locator('select').first();
    await yearSelect.selectOption('2024');
    await expect(page.getByText(/^2$/).or(page.getByText('2 tournaments'))).toBeVisible();
  });
});

test.describe('Dashboard — Filters', () => {
  test.beforeEach(async ({ page }) => {
    await signupAndLogin(page, uniqueUser());

    // Add one tournament in June and one in August
    await addTournament(page, {
      name: 'June Tournament',
      categories: [
        {
          categoryName: "Men's Doubles",
          medal: 'Gold',
          prizeAmount: '5000',
          entryFee: '500',
        },
      ],
      date: '2024-06-10',
    });

    await addTournament(page, {
      name: 'August Tournament',
      categories: [
        {
          categoryName: "Women's Doubles",
          medal: 'None',
          prizeAmount: '0',
          entryFee: '400',
        },
      ],
      date: '2024-08-22',
    });
  });

  test('year filter shows correct data for selected year', async ({ page }) => {
    await page.goto('/dashboard');
    const yearSelect = page.locator('select').first();
    await yearSelect.selectOption('2024');

    // Both tournaments are in 2024 — earnings should show 5000
    await expect(page.getByText(/5,000|₹5,000/)).toBeVisible();
  });

  test('month filter narrows down stats to selected month', async ({ page }) => {
    await page.goto('/dashboard');

    const yearSelect = page.locator('select').first();
    await yearSelect.selectOption('2024');

    // Select June (month index 5)
    const monthSelect = page.locator('select').nth(1);
    await monthSelect.selectOption('5'); // June

    // Only June tournament profit should be shown: 5000 - 500 - 200 = 4300
    await expect(page.getByText(/4,300|₹4,300/)).toBeVisible();
  });

  test('clear month filter restores full year stats', async ({ page }) => {
    await page.goto('/dashboard');

    const yearSelect = page.locator('select').first();
    await yearSelect.selectOption('2024');

    const monthSelect = page.locator('select').nth(1);
    await monthSelect.selectOption('5'); // June

    // Clear month filter
    await page.getByRole('button', { name: /clear month/i }).click();

    // Should show combined expenses of both tournaments
    // June: 500+200=700, August: 400+150=550, total=1250
    await expect(page.getByText(/1,250|₹1,250/)).toBeVisible();
  });

  test('selecting a month with no tournaments shows zero stats', async ({ page }) => {
    await page.goto('/dashboard');

    const yearSelect = page.locator('select').first();
    await yearSelect.selectOption('2024');

    // Select January — no tournaments
    const monthSelect = page.locator('select').nth(1);
    await monthSelect.selectOption('0');

    await expect(page.getByText(/no tournaments found for the selected period/i)).toBeVisible();
  });
});

test.describe('Dashboard — Chart', () => {
  test('bar chart renders after adding a tournament', async ({ page }) => {
    await signupAndLogin(page, uniqueUser());

    await addTournament(page, {
      name: 'Chart Test',
      category: 'Open Category',
      medal: 'Gold',
      prizeAmount: '3000',
      entryFee: '500',
      expenses: '200',
      date: new Date().toISOString().slice(0, 10),
    });

    await page.goto('/dashboard');
    // Recharts renders an SVG
    await expect(page.locator('svg').first()).toBeVisible();
  });
});

test.describe('Dashboard — Loss Scenarios', () => {
  test('net profit is negative when no prizes won', async ({ page }) => {
    await signupAndLogin(page, uniqueUser());

    await addTournament(page, {
      name: 'Tough Tournament',
      categories: [
        {
          categoryName: 'Intermediate Singles',
          medal: 'None',
          prizeAmount: '0',
          entryFee: '1000',
        },
      ],
      date: '2024-07-04',
    });

    await page.goto('/dashboard');
    const yearSelect = page.locator('select').first();
    await yearSelect.selectOption('2024');

    // Profit = 0 - 1000 = -1000
    await expect(page.getByText(/-1,000|-₹1,000/)).toBeVisible();
  });
});
