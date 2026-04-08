/**
 * Shared helpers for E2E tests.
 * Generates unique credentials per test run to avoid DB collisions.
 */

export const uniqueUser = () => {
  const id = Date.now();
  return {
    name: `Player ${id}`,
    email: `player${id}@test.com`,
    password: 'password123',
  };
};

export const validTournament = {
  name: 'City Open 2024',
  categories: [
    {
      categoryName: "Men's Singles",
      medal: 'Gold',
      prizeAmount: '5000',
      entryFee: '500',
    },
  ],
  date: '2024-06-15',
};

/**
 * Sign up a new user and return their credentials.
 */
export async function signupUser(page, user) {
  await page.goto('/signup');
  await page.getByLabel('Name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: /sign up/i }).click();
  // Wait for redirect to login after success
  await page.waitForURL('**/login');
}

/**
 * Log in an existing user and land on dashboard.
 */
export async function loginUser(page, user) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL('**/dashboard');
}

/**
 * Sign up then log in — full onboarding flow.
 */
export async function signupAndLogin(page, user) {
  await signupUser(page, user);
  await loginUser(page, user);
}

/**
 * Fill and submit the tournament form (now with categories array).
 */
export async function fillTournamentForm(page, t) {
  await page.getByLabel('Tournament Name').fill(t.name);
  await page.getByLabel(/^Date$/).fill(t.date);

  // Fill first category
  const cat = t.categories[0];
  await page.getByLabel('Category Name').selectOption(cat.categoryName);
  await page.getByRole('radio', { name: cat.medal }).check();
  await page.getByLabel(/Entry Fees Paid/).fill(cat.entryFee);

  if (cat.medal !== 'None') {
    await page.getByLabel(/Winning Prize Received/).fill(cat.prizeAmount);
  }

  await page.getByRole('button', { name: /add tournament/i }).click();
}
