import { test, expect } from '@playwright/test';

// Note: This test requires Playwright to be installed and configured
// Run: npm install -D @playwright/test
// Run: npx playwright install

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

test.describe('Complete User Journey E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
  });

  test('should complete full user registration and chatbot creation flow', async ({ page }) => {
    const testEmail = `e2e-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Step 1: Navigate to registration
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*\/auth/);

    // Step 2: Fill registration form
    await page.fill('input[name="firstName"]', 'E2E');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);

    // Step 3: Submit registration
    await page.click('button[type="submit"]');

    // Step 4: Should redirect to dashboard after successful registration
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('text=Welcome')).toBeVisible();

    // Step 5: Navigate to chatbot creation
    await page.click('text=Create Chatbot');
    await expect(page).toHaveURL(/.*\/chatbots\/new/);

    // Step 6: Fill chatbot creation form
    await page.fill('input[name="name"]', 'E2E Test Bot');
    await page.fill('textarea[name="description"]', 'A chatbot created during E2E testing');
    await page.fill('textarea[name="personality"]', 'Friendly and helpful assistant for testing purposes');

    // Add knowledge base items
    await page.fill('textarea[name="knowledgeBase"]', 'This is a test chatbot\nIt helps with testing\nE2E testing is important');

    // Configure appearance
    await page.click('input[name="primaryColor"]');
    await page.fill('input[name="primaryColor"]', '#007bff');

    // Step 7: Submit chatbot creation
    await page.click('button[type="submit"]');

    // Step 8: Should redirect to chatbot management
    await expect(page).toHaveURL(/.*\/chatbots/);
    await expect(page.locator('text=E2E Test Bot')).toBeVisible();

    // Step 9: Test the chatbot
    await page.click('text=Test Chat');
    
    // Wait for chat interface to load
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    // Send a test message
    await page.fill('input[placeholder*="message"]', 'Hello, how are you?');
    await page.click('button[aria-label="Send message"]');

    // Wait for response
    await expect(page.locator('text=Hello, how are you?')).toBeVisible();
    
    // Should receive a response (wait up to 10 seconds)
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 10000 });

    // Step 10: View analytics
    await page.click('text=Analytics');
    await expect(page).toHaveURL(/.*\/analytics/);
    
    // Should show conversation data
    await expect(page.locator('text=Total Conversations')).toBeVisible();
    await expect(page.locator('text=1')).toBeVisible(); // Should show 1 conversation

    // Step 11: Check profile settings
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Profile');
    await expect(page).toHaveURL(/.*\/profile/);

    // Verify user information
    await expect(page.locator('input[value="E2E"]')).toBeVisible();
    await expect(page.locator('input[value="Test"]')).toBeVisible();
    await expect(page.locator(`input[value="${testEmail}"]`)).toBeVisible();

    // Step 12: Update profile
    await page.fill('input[name="firstName"]', 'Updated E2E');
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=Profile updated successfully')).toBeVisible();
  });

  test('should handle chatbot widget integration', async ({ page }) => {
    // This test assumes a user is already logged in and has a chatbot
    // In a real scenario, you might set up test data beforehand

    // Login first (simplified - in real test you'd go through full login flow)
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to chatbots
    await page.goto(`${BASE_URL}/chatbots`);

    // Create or select a chatbot
    if (await page.locator('text=Create Your First Chatbot').isVisible()) {
      // Create a new chatbot if none exists
      await page.click('text=Create Chatbot');
      await page.fill('input[name="name"]', 'Widget Test Bot');
      await page.fill('textarea[name="description"]', 'Bot for widget testing');
      await page.fill('textarea[name="personality"]', 'Helpful widget assistant');
      await page.click('button[type="submit"]');
    }

    // Get embed code
    await page.click('text=Get Embed Code');
    await expect(page.locator('[data-testid="embed-code"]')).toBeVisible();

    // Copy embed code
    const embedCode = await page.locator('[data-testid="embed-code"]').textContent();
    expect(embedCode).toContain('<script');
    expect(embedCode).toContain('chatbot-widget');

    // Test widget preview
    await page.click('text=Preview Widget');
    await expect(page.locator('[data-testid="widget-preview"]')).toBeVisible();

    // Test widget interaction
    const widgetFrame = page.frameLocator('[data-testid="widget-iframe"]');
    await widgetFrame.locator('button[aria-label="Open chat"]').click();
    
    await widgetFrame.locator('input[placeholder*="message"]').fill('Hello from widget test');
    await widgetFrame.locator('button[aria-label="Send"]').click();

    // Should receive response in widget
    await expect(widgetFrame.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Test 1: Invalid login
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();

    // Test 2: Network error handling
    // Simulate network failure
    await page.route('**/api/**', route => route.abort());

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should show network error
    await expect(page.locator('text=Network error')).toBeVisible();

    // Restore network
    await page.unroute('**/api/**');

    // Test 3: Form validation
    await page.goto(`${BASE_URL}/auth`);
    await page.click('text=Sign Up');

    // Submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();

    // Test weak password
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);

    // Mobile menu should be visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Click mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Should adapt to tablet layout
    await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Should show full desktop layout
    await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
  });

  test('should handle accessibility requirements', async ({ page }) => {
    await page.goto(BASE_URL);

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Test ARIA labels
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      // Button should have either aria-label or text content
      expect(ariaLabel || textContent?.trim()).toBeTruthy();
    }

    // Test form labels
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      
      if (id) {
        // Should have associated label
        const label = page.locator(`label[for="${id}"]`);
        const labelExists = await label.count() > 0;
        expect(labelExists || ariaLabel).toBeTruthy();
      }
    }

    // Test color contrast (basic check)
    const elements = page.locator('*:visible');
    const elementCount = await elements.count();
    
    // Sample a few elements for color contrast
    for (let i = 0; i < Math.min(elementCount, 10); i++) {
      const element = elements.nth(i);
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor
        };
      });
      
      // Basic check - should have color values
      expect(styles.color).toBeTruthy();
    }
  });

  test('should handle real-time features', async ({ page, context }) => {
    // Test real-time chat updates
    const page1 = page;
    const page2 = await context.newPage();

    // Setup: Login on both pages (simplified)
    await page1.goto(`${BASE_URL}/demo`); // Demo page with widget
    await page2.goto(`${BASE_URL}/dashboard/analytics`); // Analytics dashboard

    // Start conversation on page1 (customer side)
    await page1.click('[data-testid="chat-widget-button"]');
    await page1.fill('[data-testid="chat-input"]', 'Hello from customer');
    await page1.click('[data-testid="send-button"]');

    // Check if conversation appears in real-time on page2 (dashboard)
    await expect(page2.locator('text=Hello from customer')).toBeVisible({ timeout: 5000 });

    // Test real-time analytics updates
    const initialCount = await page2.locator('[data-testid="message-count"]').textContent();
    
    // Send another message
    await page1.fill('[data-testid="chat-input"]', 'Second message');
    await page1.click('[data-testid="send-button"]');

    // Analytics should update in real-time
    await expect(page2.locator('[data-testid="message-count"]')).not.toHaveText(initialCount, { timeout: 5000 });
  });
});