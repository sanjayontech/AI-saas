import React from 'react';
import Button from './Button';

describe('Button', () => {
  test('component can be imported', () => {
    expect(Button).toBeDefined();
    expect(typeof Button).toBe('function');
  });

  test('component has expected variants', () => {
    const componentString = Button.toString();
    expect(componentString).toContain('primary');
    expect(componentString).toContain('secondary');
    expect(componentString).toContain('danger');
    expect(componentString).toContain('success');
    expect(componentString).toContain('outline');
  });
});