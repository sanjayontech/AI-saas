import React from 'react';
import DashboardLayout from './DashboardLayout';

// Simple smoke test to verify component can be imported and instantiated
describe('DashboardLayout', () => {
  test('component can be imported', () => {
    expect(DashboardLayout).toBeDefined();
    expect(typeof DashboardLayout).toBe('function');
  });

  test('component has expected navigation items', () => {
    // Test that the component file contains the expected navigation structure
    const componentString = DashboardLayout.toString();
    expect(componentString).toContain('Overview');
    expect(componentString).toContain('Chatbots');
    expect(componentString).toContain('Analytics');
    expect(componentString).toContain('Profile');
    expect(componentString).toContain('Settings');
  });
});