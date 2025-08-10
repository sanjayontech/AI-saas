import React from 'react';
import { Settings as SettingsIcon, Bell, Shield, Palette } from 'lucide-react';
import { Card, Button, Select } from '../../components/UI';

const Settings = () => {
  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
  ];

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Customize your experience and manage your preferences
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Appearance */}
        <Card>
          <Card.Header>
            <div className="flex items-center">
              <Palette className="h-5 w-5 text-gray-400 mr-2" />
              <Card.Title>Appearance</Card.Title>
            </div>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Theme"
                options={themeOptions}
                defaultValue="light"
              />
              <Select
                label="Language"
                options={languageOptions}
                defaultValue="en"
              />
            </div>
          </Card.Content>
        </Card>

        {/* Notifications */}
        <Card>
          <Card.Header>
            <div className="flex items-center">
              <Bell className="h-5 w-5 text-gray-400 mr-2" />
              <Card.Title>Notifications</Card.Title>
            </div>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive email updates about your chatbots</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  defaultChecked
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Usage Alerts</p>
                  <p className="text-sm text-gray-500">Get notified when approaching usage limits</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  defaultChecked
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Weekly Reports</p>
                  <p className="text-sm text-gray-500">Receive weekly performance summaries</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <Card.Header>
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-gray-400 mr-2" />
              <Card.Title>Privacy & Security</Card.Title>
            </div>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <Select
                label="Timezone"
                options={timezoneOptions}
                defaultValue="UTC"
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Data Collection</p>
                  <p className="text-sm text-gray-500">Allow anonymous usage analytics</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  defaultChecked
                />
              </div>
              <div className="pt-4 border-t border-gray-200">
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Save Changes */}
        <div className="flex justify-end">
          <Button>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;