// Mock email service for testing
export const mockEmailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendNotificationEmail: jest.fn().mockResolvedValue(true),
  
  // Track sent emails for testing
  sentEmails: [] as Array<{
    to: string;
    subject: string;
    type: string;
    data?: any;
  }>,

  // Helper to clear sent emails
  clearSentEmails: () => {
    mockEmailService.sentEmails.length = 0;
  },

  // Helper to get sent emails
  getSentEmails: () => mockEmailService.sentEmails
};

// Mock implementation that tracks sent emails
mockEmailService.sendVerificationEmail.mockImplementation(async (email: string, token: string) => {
  mockEmailService.sentEmails.push({
    to: email,
    subject: 'Verify your email',
    type: 'verification',
    data: { token }
  });
  return true;
});

mockEmailService.sendPasswordResetEmail.mockImplementation(async (email: string, token: string) => {
  mockEmailService.sentEmails.push({
    to: email,
    subject: 'Reset your password',
    type: 'password-reset',
    data: { token }
  });
  return true;
});

mockEmailService.sendWelcomeEmail.mockImplementation(async (email: string, name: string) => {
  mockEmailService.sentEmails.push({
    to: email,
    subject: 'Welcome to AI Chatbot SaaS',
    type: 'welcome',
    data: { name }
  });
  return true;
});

// Mock the email service module if it exists
jest.mock('../../services/EmailService', () => ({
  EmailService: mockEmailService
}), { virtual: true });