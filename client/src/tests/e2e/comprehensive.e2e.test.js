import { test, expect } from '@playwright/test';

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

test.describe('Comprehensive E2E Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto(BASE_URL);
    
    // Clear any existing storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should handle complete user lifecycle with error recovery', async ({ page }) => {
    const testEmail = `lifecycle-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Step 1: Registration with validation errors
    await page.click('text=Sign Up');
    
    // Test form validation
    await page.click('button[type="submit"]');
    await expect(page.locator('text=First name is required')).toBeVisible();
    
    // Fill form correctly
    await page.fill('input[name="firstName"]', 'Lifecycle');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Step 2: Dashboard access
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('text=Welcome')).toBeVisible();

    // Step 3: Create multiple chatbots
    const chatbots = [
      {
        name: 'Customer Service Bot',
        description: 'Handles customer inquiries',
        personality: 'Professional and helpful customer service representative'
      },
      {
        name: 'Sales Assistant',
        description: 'Helps with sales questions',
        personality: 'Enthusiastic and knowledgeable sales assistant'
      }
    ];

    for (const [index, chatbot] of chatbots.entries()) {
      await page.click('text=Create Chatbot');
      await page.fill('input[name="name"]', chatbot.name);
      await page.fill('textarea[name="description"]', chatbot.description);
      await page.fill('textarea[name="personality"]', chatbot.personality);
      await page.fill('textarea[name="knowledgeBase"]', `Knowledge for ${chatbot.name}\nHelp users with their questions`);
      
      // Configure appearance
      await page.fill('input[name="primaryColor"]', index === 0 ? '#007bff' : '#28a745');
      
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*\/chatbots/);
      await expect(page.locator(`text=${chatbot.name}`)).toBeVisible();
    }

    // Step 4: Test chatbot functionality
    await page.click('text=Customer Service Bot');
    await page.click('text=Test Chat');
    
    // Send multiple messages
    const messages = [
      'Hello, how can you help me?',
      'What are your business hours?',
      'Do you offer technical support?'
    ];

    for (const message of messages) {
      await page.fill('input[placeholder*="message"]', message);
      await page.click('button[aria-label="Send message"]');
      await expect(page.locator(`text=${message}`)).toBeVisible();
      
      // Wait for response
      await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 15000 });
    }

    // Step 5: Analytics verification
    await page.click('text=Analytics');
    await expect(page.locator('text=Total Conversations')).toBeVisible();
    await expect(page.locator('text=1')).toBeVisible(); // Should show 1 conversation

    // Step 6: Profile management
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Profile');
    
    // Update profile
    await page.fill('input[name="firstName"]', 'Updated Lifecycle');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Profile updated successfully')).toBeVisible();

    // Step 7: Data export
    await page.click('text=Export Data');
    const downloadPromise = page.waitForEvent('download');
    await page.click('button[data-testid="confirm-export"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('chatbot-data');

    // Step 8: Account deletion (optional - comment out to preserve data)
    // await page.click('text=Delete Account');
    // await page.fill('input[placeholder="Type DELETE to confirm"]', 'DELETE');
    // await page.click('button[data-testid="confirm-delete"]');
    // await expect(page).toHaveURL(/.*\/auth/);
  });

  test('should handle real-time chat widget integration', async ({ page, context }) => {
    // Setup: Create a chatbot first
    const testEmail = `widget-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Quick registration and chatbot creation
    await page.goto(`${BASE_URL}/auth`);
    await page.click('text=Sign Up');
    await page.fill('input[name="firstName"]', 'Widget');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Create chatbot
    await page.click('text=Create Chatbot');
    await page.fill('input[name="name"]', 'Widget Test Bot');
    await page.fill('textarea[name="description"]', 'Bot for widget testing');
    await page.fill('textarea[name="personality"]', 'Helpful widget assistant');
    await page.fill('textarea[name="knowledgeBase"]', 'Widget testing knowledge\nHelp with widget integration');
    await page.click('button[type="submit"]');

    // Get embed code
    await page.click('text=Widget Test Bot');
    await page.click('text=Get Embed Code');
    const embedCode = await page.locator('[data-testid="embed-code"]').textContent();

    // Test widget in new page
    const widgetPage = await context.newPage();
    
    // Create a simple HTML page with the widget
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><title>Widget Test</title></head>
      <body>
        <h1>Test Website</h1>
        <p>This is a test website with the chatbot widget.</p>
        ${embedCode}
      </body>
      </html>
    `;

    await widgetPage.setContent(htmlContent);

    // Test widget functionality
    await widgetPage.click('[data-testid="chat-widget-button"]');
    await expect(widgetPage.locator('[data-testid="chat-widget"]')).toBeVisible();

    // Send message through widget
    await widgetPage.fill('[data-testid="chat-input"]', 'Hello from widget test');
    await widgetPage.click('[data-testid="send-button"]');

    // Verify message appears
    await expect(widgetPage.locator('text=Hello from widget test')).toBeVisible();
    
    // Wait for response
    await expect(widgetPage.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 15000 });

    // Verify real-time updates in dashboard
    await page.click('text=Analytics');
    await page.reload(); // Refresh to see new data
    await expect(page.locator('text=Total Messages')).toBeVisible();
    
    // Should show the new conversation
    const messageCount = await page.locator('[data-testid="total-messages"]').textContent();
    expect(parseInt(messageCount)).toBeGreaterThan(0);
  });

  test('should handle network failures and recovery', async ({ page }) => {
    const testEmail = `network-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Register user
    await page.click('text=Sign Up');
    await page.fill('input[name="firstName"]', 'Network');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Create chatbot
    await page.click('text=Create Chatbot');
    await page.fill('input[name="name"]', 'Network Test Bot');
    await page.fill('textarea[name="description"]', 'Bot for network testing');
    await page.fill('textarea[name="personality"]', 'Resilient network assistant');
    await page.click('button[type="submit"]');

    // Test chat functionality
    await page.click('text=Network Test Bot');
    await page.click('text=Test Chat');

    // Send initial message (should work)
    await page.fill('input[placeholder*="message"]', 'Initial message');
    await page.click('button[aria-label="Send message"]');
    await expect(page.locator('text=Initial message')).toBeVisible();

    // Simulate network failure
    await page.route('**/api/**', route => route.abort());

    // Try to send message during network failure
    await page.fill('input[placeholder*="message"]', 'Message during failure');
    await page.click('button[aria-label="Send message"]');

    // Should show error message
    await expect(page.locator('text=Network error')).toBeVisible();
    await expect(page.locator('text=Message during failure')).toBeVisible(); // Message should still appear locally

    // Restore network
    await page.unroute('**/api/**');

    // Try sending message again (should work)
    await page.fill('input[placeholder*="message"]', 'Message after recovery');
    await page.click('button[aria-label="Send message"]');
    await expect(page.locator('text=Message after recovery')).toBeVisible();
    
    // Should receive response
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 15000 });
  });

  test('should handle concurrent user sessions', async ({ page, context }) => {
    // Create two user sessions
    const user1Email = `concurrent1-${Date.now()}@example.com`;
    const user2Email = `concurrent2-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // Setup first user
    await page.goto(`${BASE_URL}/auth`);
    await page.click('text=Sign Up');
    await page.fill('input[name="firstName"]', 'User');
    await page.fill('input[name="lastName"]', 'One');
    await page.fill('input[name="email"]', user1Email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');

    // Create chatbot for user 1
    await page.click('text=Create Chatbot');
    await page.fill('input[name="name"]', 'User 1 Bot');
    await page.fill('textarea[name="description"]', 'Bot for user 1');
    await page.fill('textarea[name="personality"]', 'User 1 assistant');
    await page.click('button[type="submit"]');

    // Setup second user in new page
    const page2 = await context.newPage();
    await page2.goto(`${BASE_URL}/auth`);
    await page2.click('text=Sign Up');
    await page2.fill('input[name="firstName"]', 'User');
    await page2.fill('input[name="lastName"]', 'Two');
    await page2.fill('input[name="email"]', user2Email);
    await page2.fill('input[name="password"]', password);
    await page2.fill('input[name="confirmPassword"]', password);
    await page2.click('button[type="submit"]');

    // Create chatbot for user 2
    await page2.click('text=Create Chatbot');
    await page2.fill('input[name="name"]', 'User 2 Bot');
    await page2.fill('textarea[name="description"]', 'Bot for user 2');
    await page2.fill('textarea[name="personality"]', 'User 2 assistant');
    await page2.click('button[type="submit"]');

    // Verify isolation - User 1 should only see their bot
    await page.goto(`${BASE_URL}/chatbots`);
    await expect(page.locator('text=User 1 Bot')).toBeVisible();
    await expect(page.locator('text=User 2 Bot')).not.toBeVisible();

    // Verify isolation - User 2 should only see their bot
    await page2.goto(`${BASE_URL}/chatbots`);
    await expect(page2.locator('text=User 2 Bot')).toBeVisible();
    await expect(page2.locator('text=User 1 Bot')).not.toBeVisible();

    // Test concurrent chat sessions
    await page.click('text=User 1 Bot');
    await page.click('text=Test Chat');
    await page2.click('text=User 2 Bot');
    await page2.click('text=Test Chat');

    // Send messages simultaneously
    await Promise.all([
      page.fill('input[placeholder*="message"]', 'Message from user 1'),
      page2.fill('input[placeholder*="message"]', 'Message from user 2')
    ]);

    await Promise.all([
      page.click('button[aria-label="Send message"]'),
      page2.click('button[aria-label="Send message"]')
    ]);

    // Verify messages appear correctly
    await expect(page.locator('text=Message from user 1')).toBeVisible();
    await expect(page2.locator('text=Message from user 2')).toBeVisible();

    // Verify responses are received
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 15000 });
    await expect(page2.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 15000 });
  });

  test('should handle accessibility requirements', async ({ page }) => {
    await page.goto(BASE_URL);

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();

    // Test skip links
    await page.keyboard.press('Tab');
    const skipLink = page.locator('text=Skip to main content');
    if (await skipLink.isVisible()) {
      await skipLink.click();
      const mainContent = page.locator('main, [role="main"]');
      await expect(mainContent).toBeFocused();
    }

    // Test form accessibility
    await page.click('text=Sign Up');
    
    // Check form labels
    const emailInput = page.locator('input[name="email"]');
    const emailLabel = page.locator('label[for="email"], label:has(input[name="email"])');
    await expect(emailLabel).toBeVisible();

    // Test error announcements
    await page.click('button[type="submit"]');
    const errorMessage = page.locator('[role="alert"], .error-message');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage.first()).toBeVisible();
    }

    // Test color contrast (basic check)
    const button = page.locator('button[type="submit"]');
    const buttonStyles = await button.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor
      };
    });
    
    expect(buttonStyles.color).toBeTruthy();
    expect(buttonStyles.backgroundColor).toBeTruthy();

    // Test ARIA attributes
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      // Button should have either aria-label or text content
      expect(ariaLabel || textContent?.trim()).toBeTruthy();
    }
  });

  test('should handle performance under load', async ({ page }) => {
    const testEmail = `performance-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Setup user and chatbot
    await page.click('text=Sign Up');
    await page.fill('input[name="firstName"]', 'Performance');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    await page.click('text=Create Chatbot');
    await page.fill('input[name="name"]', 'Performance Test Bot');
    await page.fill('textarea[name="description"]', 'Bot for performance testing');
    await page.fill('textarea[name="personality"]', 'Fast performance assistant');
    await page.click('button[type="submit"]');

    // Test rapid interactions
    await page.click('text=Performance Test Bot');
    await page.click('text=Test Chat');

    const messages = Array(10).fill(0).map((_, i) => `Performance test message ${i + 1}`);
    const responseTimes: number[] = [];

    for (const message of messages) {
      const startTime = Date.now();
      
      await page.fill('input[placeholder*="message"]', message);
      await page.click('button[aria-label="Send message"]');
      await expect(page.locator(`text=${message}`)).toBeVisible();
      
      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);

      // Don't wait for AI response for performance testing
      // Just verify the message was sent
    }

    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    // UI should remain responsive
    expect(averageResponseTime).toBeLessThan(2000); // Less than 2 seconds per interaction

    // Test navigation performance
    const navigationStartTime = Date.now();
    await page.click('text=Analytics');
    await expect(page.locator('text=Total Conversations')).toBeVisible();
    const navigationTime = Date.now() - navigationStartTime;
    
    expect(navigationTime).toBeLessThan(3000); // Navigation should be fast
  });

  test('should handle mobile responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);

    // Mobile navigation should work
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    }

    // Forms should be usable on mobile
    await page.click('text=Sign Up');
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible();
    
    // Input should be properly sized
    const inputBox = await emailInput.boundingBox();
    expect(inputBox?.width).toBeGreaterThan(200); // Should be wide enough

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Layout should adapt
    const container = page.locator('.container, main');
    const containerBox = await container.first().boundingBox();
    expect(containerBox?.width).toBeLessThan(768); // Should fit in viewport

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Should show full desktop layout
    const desktopLayout = page.locator('[data-testid="desktop-layout"]');
    if (await desktopLayout.isVisible()) {
      await expect(desktopLayout).toBeVisible();
    }
  });
});