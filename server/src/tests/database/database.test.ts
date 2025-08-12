import { db } from '../../database/connection';
import { DatabaseFixtures } from '../fixtures/database';
import { TestDataFactory, TestCleanup } from '../utils/testHelpers';

describe('Database Tests', () => {
  beforeAll(async () => {
    await DatabaseFixtures.createTestTables();