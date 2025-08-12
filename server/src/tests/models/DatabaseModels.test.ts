import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { Conversation } from '../../models/Conversation';
import { Message } from '../../models/Message';
import { UserProfile } from '../../models/UserProfile';
import { UsageStats } from '../../models/UsageStats';
import { TestCleanup, TestAssertions } from '../utils/testHelpers';
import { ValidationError } from '../../utils/errors';

describe('Database Models - Comprehensive Unit Tests', () => {
  afterEach(async () => {
    await TestCleanup.cleanupAll();
  });

  describe('User Model', () => {
    describe('User Creation', () => {
      it('should create a new user with valid data', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User'
        };

        const user = await User.create(userData);

        TestAssertions.expectValidUser(user);
        expect(user.email).toBe(userData.email);
        expect(user.firstName).toBe(userData.firstName);
        expect(user.lastName).toBe(userData.lastName);
        expect(user.role).toBe('user');
        expect(user.emailVerified).toBe(false);
        expect(user.passwordHash).toBeDefined();
        expect(user.passwordHash).not.toBe(userData.password);
      });

      it('should hash password during creation', async () => {
        const userData = {
          email: 'hash@example.com',
          password: 'TestPassword123!',
          firstName: 'Hash',
          lastName: 'Test'
        };

        const user = await User.create(userData);

        expect(user.passwordHash).toBeDefined();
        expect(user.passwordHash).not.toBe(userData.password);
        expect(user.passwordHash.length).toBeGreaterThan(50); // bcrypt hashes are long
      });

      it('should set default role to user', async () => {
        const userData = {
          email: 'role@example.com',
          password: 'TestPassword123!',
          firstName: 'Role',
          lastName: 'Test'
        };

        const user = await User.create(userData);

        expect(user.role).toBe('user');
        expect(user.isAdmin()).toBe(false);
      });

      it('should allow admin role when specified', async () => {
        const userData = {
          email: 'admin@example.com',
          password: 'TestPassword123!',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin' as const
        };

        const user = await User.create(userData);

        expect(user.role).toBe('admin');
        expect(user.isAdmin()).toBe(true);
      });

      it('should throw ValidationError for invalid email', async () => {
        const userData = {
          email: 'invalid-email',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User'
        };

        await expect(User.create(userData))
          .rejects
          .toThrow(ValidationError);
      });

      it('should throw ValidationError for weak password', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User'
        };

        await expect(User.create(userData))
          .rejects
          .toThrow(ValidationError);
      });

      it('should throw ValidationError for missing required fields', async () => {
        const userData = {
          email: 'test@example.com',
          // missing password, firstName, lastName
        };

        await expect(User.create(userData as any))
          .rejects
          .toThrow(ValidationError);
      });
    });

    describe('User Lookup', () => {
      it('should find user by email', async () => {
        const userData = {
          email: 'findme@example.com',
          password: 'TestPassword123!',
          firstName: 'Find',
          lastName: 'Me'
        };

        const createdUser = await User.create(userData);
        const foundUser = await User.findByEmail(userData.email);

        expect(foundUser).toBeDefined();
        expect(foundUser!.id).toBe(createdUser.id);
        expect(foundUser!.email).toBe(userData.email);
      });

      it('should return null for non-existent email', async () => {
        const user = await User.findByEmail('nonexistent@example.com');
        expect(user).toBeNull();
      });

      it('should find user by ID', async () => {
        const userData = {
          email: 'findbyid@example.com',
          password: 'TestPassword123!',
          firstName: 'Find',
          lastName: 'ById'
        };

        const createdUser = await User.create(userData);
        const foundUser = await User.findById(createdUser.id!);

        expect(foundUser).toBeDefined();
        expect(foundUser!.id).toBe(createdUser.id);
        expect(foundUser!.email).toBe(userData.email);
      });

      it('should return null for non-existent ID', async () => {
        const user = await User.findById('non-existent-id');
        expect(user).toBeNull();
      });

      it('should be case-insensitive for email lookup', async () => {
        const userData = {
          email: 'CaseTest@Example.Com',
          password: 'TestPassword123!',
          firstName: 'Case',
          lastName: 'Test'
        };

        await User.create(userData);
        
        const foundUser1 = await User.findByEmail('casetest@example.com');
        const foundUser2 = await User.findByEmail('CASETEST@EXAMPLE.COM');
        
        expect(foundUser1).toBeDefined();
        expect(foundUser2).toBeDefined();
        expect(foundUser1!.id).toBe(foundUser2!.id);
      });
    });

    describe('Password Verification', () => {
      it('should verify correct password', async () => {
        const userData = {
          email: 'password@example.com',
          password: 'TestPassword123!',
          firstName: 'Password',
          lastName: 'Test'
        };

        const user = await User.create(userData);
        const isValid = await user.verifyPassword('TestPassword123!');

        expect(isValid).toBe(true);
      });

      it('should reject incorrect password', async () => {
        const userData = {
          email: 'wrongpass@example.com',
          password: 'TestPassword123!',
          firstName: 'Wrong',
          lastName: 'Pass'
        };

        const user = await User.create(userData);
        const isValid = await user.verifyPassword('WrongPassword123!');

        expect(isValid).toBe(false);
      });

      it('should handle empty password verification', async () => {
        const userData = {
          email: 'empty@example.com',
          password: 'TestPassword123!',
          firstName: 'Empty',
          lastName: 'Test'
        };

        const user = await User.create(userData);
        const isValid = await user.verifyPassword('');

        expect(isValid).toBe(false);
      });
    });

    describe('User Update', () => {
      it('should update user data', async () => {
        const userData = {
          email: 'update@example.com',
          password: 'TestPassword123!',
          firstName: 'Update',
          lastName: 'Test'
        };

        const user = await User.create(userData);
        user.firstName = 'Updated';
        user.lastName = 'Name';

        const updatedUser = await user.save();

        expect(updatedUser.firstName).toBe('Updated');
        expect(updatedUser.lastName).toBe('Name');
        expect(updatedUser.email).toBe(userData.email); // Should remain unchanged
      });

      it('should update last login time', async () => {
        const userData = {
          email: 'login@example.com',
          password: 'TestPassword123!',
          firstName: 'Login',
          lastName: 'Test'
        };

        const user = await User.create(userData);
        expect(user.lastLoginAt).toBeNull();

        await user.updateLastLogin();

        const updatedUser = await User.findById(user.id!);
        expect(updatedUser!.lastLoginAt).toBeDefined();
        expect(updatedUser!.lastLoginAt).toBeInstanceOf(Date);
      });

      it('should update email verification status', async () => {
        const userData = {
          email: 'verify@example.com',
          password: 'TestPassword123!',
          firstName: 'Verify',
          lastName: 'Test'
        };

        const user = await User.create(userData);
        expect(user.emailVerified).toBe(false);

        user.emailVerified = true;
        user.emailVerificationToken = null;
        await user.save();

        const updatedUser = await User.findById(user.id!);
        expect(updatedUser!.emailVerified).toBe(true);
        expect(updatedUser!.emailVerificationToken).toBeNull();
      });
    });

    describe('Token Generation', () => {
      it('should generate JWT tokens', async () => {
        const userData = {
          email: 'tokens@example.com',
          password: 'TestPassword123!',
          firstName: 'Token',
          lastName: 'Test',
          emailVerified: true
        };

        const user = await User.create(userData);
        const tokens = user.generateTokens();

        TestAssertions.expectValidTokens(tokens);
      });

      it('should generate different tokens each time', async () => {
        const userData = {
          email: 'tokens2@example.com',
          password: 'TestPassword123!',
          firstName: 'Token',
          lastName: 'Test',
          emailVerified: true
        };

        const user = await User.create(userData);
        const tokens1 = user.generateTokens();
        const tokens2 = user.generateTokens();

        expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
        expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
      });
    });

    describe('Admin Methods', () => {
      it('should get user count', async () => {
        // Create some test users
        await User.create({
          email: 'count1@example.com',
          password: 'TestPassword123!',
          firstName: 'Count',
          lastName: 'One'
        });

        await User.create({
          email: 'count2@example.com',
          password: 'TestPassword123!',
          firstName: 'Count',
          lastName: 'Two'
        });

        const count = await User.getUserCount();
        expect(count).toBeGreaterThanOrEqual(2);
      });

      it('should get admin count', async () => {
        await User.create({
          email: 'admin1@example.com',
          password: 'TestPassword123!',
          firstName: 'Admin',
          lastName: 'One',
          role: 'admin'
        });

        const adminCount = await User.getAdminCount();
        expect(adminCount).toBeGreaterThanOrEqual(1);
      });

      it('should find all users with pagination', async () => {
        // Create test users
        await User.create({
          email: 'paginate1@example.com',
          password: 'TestPassword123!',
          firstName: 'Page',
          lastName: 'One'
        });

        await User.create({
          email: 'paginate2@example.com',
          password: 'TestPassword123!',
          firstName: 'Page',
          lastName: 'Two'
        });

        const users = await User.findAllUsers(10, 0);
        expect(Array.isArray(users)).toBe(true);
        expect(users.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Chatbot Model', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'chatbot@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });
    });

    describe('Chatbot Creation', () => {
      it('should create a new chatbot with valid data', async () => {
        const chatbotData = {
          userId: testUser.id!,
          name: 'Test Bot',
          description: 'A test chatbot',
          personality: 'Helpful and friendly',
          knowledgeBase: ['Test knowledge'],
          appearance: {
            primaryColor: '#3B82F6',
            secondaryColor: '#F3F4F6',
            fontFamily: 'Arial',
            borderRadius: 12,
            position: 'bottom-right'
          },
          settings: {
            maxTokens: 150,
            temperature: 0.7,
            responseDelay: 1000,
            fallbackMessage: 'I apologize, but I cannot help with that.',
            collectUserInfo: false
          },
          isActive: true
        };

        const chatbot = await Chatbot.create(chatbotData);

        TestAssertions.expectValidChatbot(chatbot);
        expect(chatbot.userId).toBe(testUser.id);
        expect(chatbot.name).toBe(chatbotData.name);
        expect(chatbot.description).toBe(chatbotData.description);
        expect(chatbot.personality).toBe(chatbotData.personality);
        expect(chatbot.isActive).toBe(true);
      });

      it('should throw ValidationError for missing required fields', async () => {
        const invalidData = {
          userId: testUser.id!,
          // missing name, description, etc.
        };

        await expect(Chatbot.create(invalidData as any))
          .rejects
          .toThrow(ValidationError);
      });

      it('should throw ValidationError for invalid user ID', async () => {
        const chatbotData = {
          userId: 'non-existent-user-id',
          name: 'Test Bot',
          description: 'A test chatbot',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        };

        await expect(Chatbot.create(chatbotData))
          .rejects
          .toThrow();
      });

      it('should set default values correctly', async () => {
        const chatbotData = {
          userId: testUser.id!,
          name: 'Default Bot',
          description: 'A bot with defaults',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {}
          // isActive not specified, should default to true
        };

        const chatbot = await Chatbot.create(chatbotData);

        expect(chatbot.isActive).toBe(true);
        expect(chatbot.appearance).toBeDefined();
        expect(chatbot.settings).toBeDefined();
      });
    });

    describe('Chatbot Lookup', () => {
      it('should find chatbot by ID', async () => {
        const chatbot = await Chatbot.create({
          userId: testUser.id!,
          name: 'Find Bot',
          description: 'A findable bot',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        const foundChatbot = await Chatbot.findById(chatbot.id!);

        expect(foundChatbot).toBeDefined();
        expect(foundChatbot!.id).toBe(chatbot.id);
        expect(foundChatbot!.name).toBe(chatbot.name);
      });

      it('should return null for non-existent ID', async () => {
        const chatbot = await Chatbot.findById('non-existent-id');
        expect(chatbot).toBeNull();
      });

      it('should find chatbots by user ID', async () => {
        await Chatbot.create({
          userId: testUser.id!,
          name: 'User Bot 1',
          description: 'First user bot',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        await Chatbot.create({
          userId: testUser.id!,
          name: 'User Bot 2',
          description: 'Second user bot',
          personality: 'Friendly',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        const userChatbots = await Chatbot.findByUserId(testUser.id!);

        expect(userChatbots).toHaveLength(2);
        expect(userChatbots.map(c => c.name)).toContain('User Bot 1');
        expect(userChatbots.map(c => c.name)).toContain('User Bot 2');
      });

      it('should return empty array for user with no chatbots', async () => {
        const otherUser = await User.create({
          email: 'other@example.com',
          password: 'TestPassword123!',
          firstName: 'Other',
          lastName: 'User',
          emailVerified: true
        });

        const userChatbots = await Chatbot.findByUserId(otherUser.id!);
        expect(userChatbots).toHaveLength(0);
      });
    });

    describe('Chatbot Update', () => {
      it('should update chatbot data', async () => {
        const chatbot = await Chatbot.create({
          userId: testUser.id!,
          name: 'Update Bot',
          description: 'A bot to update',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        chatbot.name = 'Updated Bot';
        chatbot.description = 'An updated bot';
        chatbot.isActive = false;

        const updatedChatbot = await chatbot.save();

        expect(updatedChatbot.name).toBe('Updated Bot');
        expect(updatedChatbot.description).toBe('An updated bot');
        expect(updatedChatbot.isActive).toBe(false);
        expect(updatedChatbot.userId).toBe(testUser.id); // Should remain unchanged
      });

      it('should update knowledge base', async () => {
        const chatbot = await Chatbot.create({
          userId: testUser.id!,
          name: 'Knowledge Bot',
          description: 'A bot with knowledge',
          personality: 'Helpful',
          knowledgeBase: ['Initial knowledge'],
          appearance: {},
          settings: {},
          isActive: true
        });

        chatbot.knowledgeBase = ['Updated knowledge', 'More knowledge'];
        await chatbot.save();

        const updatedChatbot = await Chatbot.findById(chatbot.id!);
        expect(updatedChatbot!.knowledgeBase).toHaveLength(2);
        expect(updatedChatbot!.knowledgeBase).toContain('Updated knowledge');
        expect(updatedChatbot!.knowledgeBase).toContain('More knowledge');
      });

      it('should update appearance settings', async () => {
        const chatbot = await Chatbot.create({
          userId: testUser.id!,
          name: 'Style Bot',
          description: 'A stylish bot',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {
            primaryColor: '#FF0000',
            position: 'bottom-right'
          },
          settings: {},
          isActive: true
        });

        chatbot.appearance = {
          primaryColor: '#00FF00',
          secondaryColor: '#0000FF',
          position: 'bottom-left'
        };
        await chatbot.save();

        const updatedChatbot = await Chatbot.findById(chatbot.id!);
        expect(updatedChatbot!.appearance.primaryColor).toBe('#00FF00');
        expect(updatedChatbot!.appearance.secondaryColor).toBe('#0000FF');
        expect(updatedChatbot!.appearance.position).toBe('bottom-left');
      });
    });

    describe('Chatbot Deletion', () => {
      it('should delete chatbot', async () => {
        const chatbot = await Chatbot.create({
          userId: testUser.id!,
          name: 'Delete Bot',
          description: 'A bot to delete',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        const result = await chatbot.delete();
        expect(result).toBe(true);

        const deletedChatbot = await Chatbot.findById(chatbot.id!);
        expect(deletedChatbot).toBeNull();
      });

      it('should cascade delete related conversations and messages', async () => {
        const chatbot = await Chatbot.create({
          userId: testUser.id!,
          name: 'Cascade Bot',
          description: 'A bot with conversations',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        const conversation = await Conversation.create({
          chatbotId: chatbot.id!,
          sessionId: 'test-session',
          userInfo: {},
          startedAt: new Date()
        });

        await Message.create({
          conversationId: conversation.id!,
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        });

        await chatbot.delete();

        const deletedConversation = await Conversation.findById(conversation.id!);
        expect(deletedConversation).toBeNull();
      });
    });
  });

  describe('Conversation Model', () => {
    let testUser: User;
    let testChatbot: Chatbot;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'conversation@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });

      testChatbot = await Chatbot.create({
        userId: testUser.id!,
        name: 'Conversation Bot',
        description: 'A bot for conversations',
        personality: 'Helpful',
        knowledgeBase: ['Test'],
        appearance: {},
        settings: {},
        isActive: true
      });
    });

    describe('Conversation Creation', () => {
      it('should create a new conversation with valid data', async () => {
        const conversationData = {
          chatbotId: testChatbot.id!,
          sessionId: 'test-session-123',
          userInfo: { name: 'Test User', email: 'test@example.com' },
          startedAt: new Date()
        };

        const conversation = await Conversation.create(conversationData);

        TestAssertions.expectValidConversation(conversation);
        expect(conversation.chatbotId).toBe(testChatbot.id);
        expect(conversation.sessionId).toBe(conversationData.sessionId);
        expect(conversation.userInfo).toEqual(conversationData.userInfo);
        expect(conversation.endedAt).toBeNull();
      });

      it('should throw ValidationError for missing required fields', async () => {
        const invalidData = {
          chatbotId: testChatbot.id!,
          // missing sessionId, startedAt
        };

        await expect(Conversation.create(invalidData as any))
          .rejects
          .toThrow(ValidationError);
      });

      it('should throw ValidationError for invalid chatbot ID', async () => {
        const conversationData = {
          chatbotId: 'non-existent-chatbot-id',
          sessionId: 'test-session',
          userInfo: {},
          startedAt: new Date()
        };

        await expect(Conversation.create(conversationData))
          .rejects
          .toThrow();
      });
    });

    describe('Conversation Lookup', () => {
      it('should find conversation by ID', async () => {
        const conversation = await Conversation.create({
          chatbotId: testChatbot.id!,
          sessionId: 'find-session',
          userInfo: {},
          startedAt: new Date()
        });

        const foundConversation = await Conversation.findById(conversation.id!);

        expect(foundConversation).toBeDefined();
        expect(foundConversation!.id).toBe(conversation.id);
        expect(foundConversation!.sessionId).toBe(conversation.sessionId);
      });

      it('should return null for non-existent ID', async () => {
        const conversation = await Conversation.findById('non-existent-id');
        expect(conversation).toBeNull();
      });

      it('should find conversations by chatbot ID', async () => {
        await Conversation.create({
          chatbotId: testChatbot.id!,
          sessionId: 'session-1',
          userInfo: {},
          startedAt: new Date()
        });

        await Conversation.create({
          chatbotId: testChatbot.id!,
          sessionId: 'session-2',
          userInfo: {},
          startedAt: new Date()
        });

        const conversations = await Conversation.findByChatbotId(testChatbot.id!);

        expect(conversations).toHaveLength(2);
        expect(conversations.map(c => c.sessionId)).toContain('session-1');
        expect(conversations.map(c => c.sessionId)).toContain('session-2');
      });

      it('should find conversation by session ID', async () => {
        const conversation = await Conversation.create({
          chatbotId: testChatbot.id!,
          sessionId: 'unique-session',
          userInfo: {},
          startedAt: new Date()
        });

        const foundConversation = await Conversation.findBySessionId('unique-session');

        expect(foundConversation).toBeDefined();
        expect(foundConversation!.id).toBe(conversation.id);
        expect(foundConversation!.sessionId).toBe('unique-session');
      });
    });

    describe('Conversation Update', () => {
      it('should update conversation data', async () => {
        const conversation = await Conversation.create({
          chatbotId: testChatbot.id!,
          sessionId: 'update-session',
          userInfo: { name: 'Initial Name' },
          startedAt: new Date()
        });

        conversation.userInfo = { name: 'Updated Name', email: 'updated@example.com' };
        conversation.endedAt = new Date();

        const updatedConversation = await conversation.save();

        expect(updatedConversation.userInfo.name).toBe('Updated Name');
        expect(updatedConversation.userInfo.email).toBe('updated@example.com');
        expect(updatedConversation.endedAt).toBeDefined();
      });

      it('should end conversation', async () => {
        const conversation = await Conversation.create({
          chatbotId: testChatbot.id!,
          sessionId: 'end-session',
          userInfo: {},
          startedAt: new Date()
        });

        expect(conversation.endedAt).toBeNull();

        await conversation.endConversation();

        const endedConversation = await Conversation.findById(conversation.id!);
        expect(endedConversation!.endedAt).toBeDefined();
        expect(endedConversation!.endedAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Message Model', () => {
    let testUser: User;
    let testChatbot: Chatbot;
    let testConversation: Conversation;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'message@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });

      testChatbot = await Chatbot.create({
        userId: testUser.id!,
        name: 'Message Bot',
        description: 'A bot for messages',
        personality: 'Helpful',
        knowledgeBase: ['Test'],
        appearance: {},
        settings: {},
        isActive: true
      });

      testConversation = await Conversation.create({
        chatbotId: testChatbot.id!,
        sessionId: 'message-session',
        userInfo: {},
        startedAt: new Date()
      });
    });

    describe('Message Creation', () => {
      it('should create a new message with valid data', async () => {
        const messageData = {
          conversationId: testConversation.id!,
          role: 'user' as const,
          content: 'Hello, how are you?',
          timestamp: new Date(),
          metadata: { source: 'web' }
        };

        const message = await Message.create(messageData);

        TestAssertions.expectValidMessage(message);
        expect(message.conversationId).toBe(testConversation.id);
        expect(message.role).toBe('user');
        expect(message.content).toBe(messageData.content);
        expect(message.metadata).toEqual(messageData.metadata);
      });

      it('should create assistant message', async () => {
        const messageData = {
          conversationId: testConversation.id!,
          role: 'assistant' as const,
          content: 'I am doing well, thank you!',
          timestamp: new Date()
        };

        const message = await Message.create(messageData);

        expect(message.role).toBe('assistant');
        expect(message.content).toBe(messageData.content);
      });

      it('should throw ValidationError for missing required fields', async () => {
        const invalidData = {
          conversationId: testConversation.id!,
          // missing role, content, timestamp
        };

        await expect(Message.create(invalidData as any))
          .rejects
          .toThrow(ValidationError);
      });

      it('should throw ValidationError for invalid role', async () => {
        const messageData = {
          conversationId: testConversation.id!,
          role: 'invalid-role' as any,
          content: 'Test message',
          timestamp: new Date()
        };

        await expect(Message.create(messageData))
          .rejects
          .toThrow(ValidationError);
      });

      it('should throw ValidationError for invalid conversation ID', async () => {
        const messageData = {
          conversationId: 'non-existent-conversation-id',
          role: 'user' as const,
          content: 'Test message',
          timestamp: new Date()
        };

        await expect(Message.create(messageData))
          .rejects
          .toThrow();
      });
    });

    describe('Message Lookup', () => {
      it('should find message by ID', async () => {
        const message = await Message.create({
          conversationId: testConversation.id!,
          role: 'user',
          content: 'Find this message',
          timestamp: new Date()
        });

        const foundMessage = await Message.findById(message.id!);

        expect(foundMessage).toBeDefined();
        expect(foundMessage!.id).toBe(message.id);
        expect(foundMessage!.content).toBe(message.content);
      });

      it('should return null for non-existent ID', async () => {
        const message = await Message.findById('non-existent-id');
        expect(message).toBeNull();
      });

      it('should find messages by conversation ID', async () => {
        await Message.create({
          conversationId: testConversation.id!,
          role: 'user',
          content: 'First message',
          timestamp: new Date(Date.now() - 2000)
        });

        await Message.create({
          conversationId: testConversation.id!,
          role: 'assistant',
          content: 'Second message',
          timestamp: new Date(Date.now() - 1000)
        });

        await Message.create({
          conversationId: testConversation.id!,
          role: 'user',
          content: 'Third message',
          timestamp: new Date()
        });

        const messages = await Message.findByConversationId(testConversation.id!);

        expect(messages).toHaveLength(3);
        expect(messages[0].content).toBe('First message');
        expect(messages[1].content).toBe('Second message');
        expect(messages[2].content).toBe('Third message');
      });

      it('should return messages in chronological order', async () => {
        const now = new Date();
        
        await Message.create({
          conversationId: testConversation.id!,
          role: 'user',
          content: 'Latest message',
          timestamp: new Date(now.getTime() + 2000)
        });

        await Message.create({
          conversationId: testConversation.id!,
          role: 'user',
          content: 'Earliest message',
          timestamp: new Date(now.getTime() - 2000)
        });

        await Message.create({
          conversationId: testConversation.id!,
          role: 'user',
          content: 'Middle message',
          timestamp: now
        });

        const messages = await Message.findByConversationId(testConversation.id!);

        expect(messages).toHaveLength(3);
        expect(messages[0].content).toBe('Earliest message');
        expect(messages[1].content).toBe('Middle message');
        expect(messages[2].content).toBe('Latest message');
      });
    });

    describe('Message Update', () => {
      it('should update message content', async () => {
        const message = await Message.create({
          conversationId: testConversation.id!,
          role: 'user',
          content: 'Original content',
          timestamp: new Date()
        });

        message.content = 'Updated content';
        message.metadata = { edited: true };

        const updatedMessage = await message.save();

        expect(updatedMessage.content).toBe('Updated content');
        expect(updatedMessage.metadata.edited).toBe(true);
      });
    });
  });

  describe('UserProfile Model', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'profile@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });
    });

    describe('UserProfile Creation', () => {
      it('should create a new user profile with valid data', async () => {
        const profileData = {
          userId: testUser.id!,
          preferences: {
            theme: 'dark' as const,
            notifications: false,
            language: 'es',
            timezone: 'America/New_York'
          }
        };

        const profile = await UserProfile.create(profileData);

        expect(profile).toBeDefined();
        expect(profile.userId).toBe(testUser.id);
        expect(profile.preferences.theme).toBe('dark');
        expect(profile.preferences.notifications).toBe(false);
        expect(profile.preferences.language).toBe('es');
        expect(profile.preferences.timezone).toBe('America/New_York');
      });

      it('should create profile with default preferences', async () => {
        const profileData = {
          userId: testUser.id!,
          preferences: {
            theme: 'light' as const,
            notifications: true,
            language: 'en',
            timezone: 'UTC'
          }
        };

        const profile = await UserProfile.create(profileData);

        expect(profile.preferences.theme).toBe('light');
        expect(profile.preferences.notifications).toBe(true);
        expect(profile.preferences.language).toBe('en');
        expect(profile.preferences.timezone).toBe('UTC');
      });

      it('should throw ValidationError for invalid user ID', async () => {
        const profileData = {
          userId: 'non-existent-user-id',
          preferences: {
            theme: 'light' as const,
            notifications: true,
            language: 'en',
            timezone: 'UTC'
          }
        };

        await expect(UserProfile.create(profileData))
          .rejects
          .toThrow();
      });
    });

    describe('UserProfile Lookup', () => {
      it('should find profile by user ID', async () => {
        const profile = await UserProfile.create({
          userId: testUser.id!,
          preferences: {
            theme: 'light',
            notifications: true,
            language: 'en',
            timezone: 'UTC'
          }
        });

        const foundProfile = await UserProfile.findByUserId(testUser.id!);

        expect(foundProfile).toBeDefined();
        expect(foundProfile!.userId).toBe(testUser.id);
        expect(foundProfile!.preferences).toEqual(profile.preferences);
      });

      it('should return null for non-existent user', async () => {
        const profile = await UserProfile.findByUserId('non-existent-user-id');
        expect(profile).toBeNull();
      });
    });

    describe('UserProfile Update', () => {
      it('should update preferences', async () => {
        const profile = await UserProfile.create({
          userId: testUser.id!,
          preferences: {
            theme: 'light',
            notifications: true,
            language: 'en',
            timezone: 'UTC'
          }
        });

        profile.preferences = {
          theme: 'dark',
          notifications: false,
          language: 'fr',
          timezone: 'Europe/Paris'
        };

        const updatedProfile = await profile.save();

        expect(updatedProfile.preferences.theme).toBe('dark');
        expect(updatedProfile.preferences.notifications).toBe(false);
        expect(updatedProfile.preferences.language).toBe('fr');
        expect(updatedProfile.preferences.timezone).toBe('Europe/Paris');
      });
    });
  });

  describe('UsageStats Model', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'usage@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });
    });

    describe('UsageStats Creation', () => {
      it('should create new usage stats with valid data', async () => {
        const statsData = {
          userId: testUser.id!,
          messagesThisMonth: 100,
          totalMessages: 500,
          chatbotsCreated: 3,
          storageUsed: 1024,
          lastActive: new Date()
        };

        const stats = await UsageStats.create(statsData);

        TestAssertions.expectValidUsageStats(stats);
        expect(stats.userId).toBe(testUser.id);
        expect(stats.messagesThisMonth).toBe(100);
        expect(stats.totalMessages).toBe(500);
        expect(stats.chatbotsCreated).toBe(3);
        expect(stats.storageUsed).toBe(1024);
      });

      it('should create stats with default values', async () => {
        const statsData = {
          userId: testUser.id!,
          messagesThisMonth: 0,
          totalMessages: 0,
          chatbotsCreated: 0,
          storageUsed: 0,
          lastActive: new Date()
        };

        const stats = await UsageStats.create(statsData);

        expect(stats.messagesThisMonth).toBe(0);
        expect(stats.totalMessages).toBe(0);
        expect(stats.chatbotsCreated).toBe(0);
        expect(stats.storageUsed).toBe(0);
      });

      it('should throw ValidationError for invalid user ID', async () => {
        const statsData = {
          userId: 'non-existent-user-id',
          messagesThisMonth: 0,
          totalMessages: 0,
          chatbotsCreated: 0,
          storageUsed: 0,
          lastActive: new Date()
        };

        await expect(UsageStats.create(statsData))
          .rejects
          .toThrow();
      });
    });

    describe('UsageStats Lookup', () => {
      it('should find stats by user ID', async () => {
        const stats = await UsageStats.create({
          userId: testUser.id!,
          messagesThisMonth: 50,
          totalMessages: 200,
          chatbotsCreated: 2,
          storageUsed: 512,
          lastActive: new Date()
        });

        const foundStats = await UsageStats.findByUserId(testUser.id!);

        expect(foundStats).toBeDefined();
        expect(foundStats!.userId).toBe(testUser.id);
        expect(foundStats!.messagesThisMonth).toBe(50);
        expect(foundStats!.totalMessages).toBe(200);
        expect(foundStats!.chatbotsCreated).toBe(2);
        expect(foundStats!.storageUsed).toBe(512);
      });

      it('should return null for non-existent user', async () => {
        const stats = await UsageStats.findByUserId('non-existent-user-id');
        expect(stats).toBeNull();
      });
    });

    describe('UsageStats Update', () => {
      it('should update usage statistics', async () => {
        const stats = await UsageStats.create({
          userId: testUser.id!,
          messagesThisMonth: 10,
          totalMessages: 50,
          chatbotsCreated: 1,
          storageUsed: 256,
          lastActive: new Date(Date.now() - 86400000) // 1 day ago
        });

        stats.messagesThisMonth = 20;
        stats.totalMessages = 60;
        stats.chatbotsCreated = 2;
        stats.storageUsed = 512;
        stats.lastActive = new Date();

        const updatedStats = await stats.save();

        expect(updatedStats.messagesThisMonth).toBe(20);
        expect(updatedStats.totalMessages).toBe(60);
        expect(updatedStats.chatbotsCreated).toBe(2);
        expect(updatedStats.storageUsed).toBe(512);
        expect(updatedStats.lastActive.getTime()).toBeGreaterThan(Date.now() - 1000);
      });

      it('should increment message counts', async () => {
        const stats = await UsageStats.create({
          userId: testUser.id!,
          messagesThisMonth: 10,
          totalMessages: 50,
          chatbotsCreated: 1,
          storageUsed: 256,
          lastActive: new Date()
        });

        await stats.incrementMessageCount();

        const updatedStats = await UsageStats.findByUserId(testUser.id!);
        expect(updatedStats!.messagesThisMonth).toBe(11);
        expect(updatedStats!.totalMessages).toBe(51);
      });

      it('should increment chatbot count', async () => {
        const stats = await UsageStats.create({
          userId: testUser.id!,
          messagesThisMonth: 10,
          totalMessages: 50,
          chatbotsCreated: 1,
          storageUsed: 256,
          lastActive: new Date()
        });

        await stats.incrementChatbotCount();

        const updatedStats = await UsageStats.findByUserId(testUser.id!);
        expect(updatedStats!.chatbotsCreated).toBe(2);
      });
    });
  });
});