import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Palette, Key } from 'lucide-react';
import { Card, Button, Select } from '../../components/UI';
import { useAuth } from '../../contexts/AuthContext';
import ChangePasswordForm from '../../components/Auth/ChangePasswordForm';

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    emailNotifications: true,
    usageAlerts: true,
    weeklyReports: false,
    dataCollection: true
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Load user preferences if available
    if (user?.preferences) {
      setPreferences(prev => ({ ...prev, ...user.preferences }));
    }
  }, [user]);

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

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setSuccess('');

    const result = await updateProfile({ preferences });
    
    if (result.success) {
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }
    
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Customize your experience and manage your preferences
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

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
                value={preferences.theme}
                onChange={(value) => handlePreferenceChange('theme', value)}
              />
              <Select
                label="Language"
                options={languageOptions}
                value={preferences.language}
                onChange={(value) => handlePreferenceChange('language', value)}
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
                  checked={preferences.emailNotifications}
                  onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
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
                  checked={preferences.usageAlerts}
                  onChange={(e) => handlePreferenceChange('usageAlerts', e.target.checked)}
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
                  checked={preferences.weeklyReports}
                  onChange={(e) => handlePreferenceChange('weeklyReports', e.target.checked)}
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
                value={preferences.timezone}
                onChange={(value) => handlePreferenceChange('timezone', value)}
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Data Collection</p>
                  <p className="text-sm text-gray-500">Allow anonymous usage analytics</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={preferences.dataCollection}
                  onChange={(e) => handlePreferenceChange('dataCollection', e.target.checked)}
                />
              </div>
              <div className="pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPasswordForm(true)}
                  className="flex items-center gap-2"
                >
                  <Key className="h-4 w-4" />
                  Change Password
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Password Change Modal */}
        {showPasswordForm && (
          <Card>
            <Card.Header>
              <div className="flex items-center">
                <Key className="h-5 w-5 text-gray-400 mr-2" />
                <Card.Title>Change Password</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <ChangePasswordForm onClose={() => setShowPasswordForm(false)} />
            </Card.Content>
          </Card>
        )}

        {/* Save Changes */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;