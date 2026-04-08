import { test, expect } from '@playwright/test';
import { uniqueUser, signupUser, loginUser, signupAndLogin } from './helpers.js';

test.describe('Auth — Signup', () => {
  test('successful signup redirects to login with success message', async ({ page }) => {
    const user = uniqueUser();
    await page.goto('/signup');

    await page.getByLabel('Name').fill(user.name);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should show success message then navigate to login
    await expect(page.getByText(/account created/i)).toBeVisible();
    await page.waitForURL('**/login');
  });

  test('signup with duplicate email shows error', async ({ page }) => {
    const user = uniqueUser();
    await signupUser(page, user);

    // Try signing up again with same email, different name
    await page.goto('/signup');
    await page.getByLabel('Name').fill(`Other ${user.name}`);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: /sign up/i }).click();

    await expect(page.getByText(/email already in use/i)).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('signup with short password shows validation error', async ({ page }) => {
    const user = uniqueUser();
    await page.goto('/signup');

    await page.getByLabel('Name').fill(user.name);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill('123');
    await page.getByRole('button', { name: /sign up/i }).click();

    // Either browser native validation or app validation
    await expect(
      page.getByText(/6 characters|too short|password/i).first()
    ).toBeVisible();
  });

  test('login link on signup page navigates to login', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('link', { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Auth — Login', () => {
  test('successful login lands on dashboard', async ({ page }) => {
    const user = uniqueUser();
    await signupUser(page, user);
    await loginUser(page, user);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();
  });

  test('wrong password shows invalid credentials error', async ({ page }) => {
    const user = uniqueUser();
    await signupUser(page, user);

    await page.goto('/login');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('unknown email shows invalid credentials error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@nowhere.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('signup link on login page navigates to signup', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/signup/);
  });
});

test.describe('Auth — Protected Routes', () => {
  test('unauthenticated user is redirected to login when accessing dashboard', async ({ page }) => {
    // Clear any stored session
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user is redirected to login when accessing tournaments', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());

    await page.goto('/tournaments');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Auth — Logout', () => {
  test('logout clears session and redirects to login', async ({ page }) => {
    const user = uniqueUser();
    await signupAndLogin(page, user);

    await expect(page).toHaveURL(/\/dashboard/);

    // Click logout in navbar
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // Trying to go back to dashboard should redirect to login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('navbar shows the logged-in user name', async ({ page }) => {
    const user = uniqueUser();
    await signupAndLogin(page, user);

    await expect(page.getByRole('navigation').getByText(user.name)).toBeVisible();
  });
});
