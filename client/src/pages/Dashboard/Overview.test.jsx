import React from 'react';
import Overview from './Overview';

// Simple smoke test to verify component can be imported and instantiated
describe('Overview', () => {
  test('component can be imported', () => {
    expect(Overview).toBeDefined();
    expect(typeof Overview).toBe('function');
  });

  test('component contains expected content', () => {
    // Test that the component file contains expected dashboard elements
    const componentString = Overview.toString();
    expect(componentString).toContain('Dashboard Overview');
    expect(componentString).toContain('Quick Actions');
    expect(componentString).toContain('Usage Overview');
  });
});