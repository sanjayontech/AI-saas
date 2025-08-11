import React, { useState } from 'react';
import { Trash2, AlertTriangle, Shield, X } from 'lucide-react';
import { Card, Button, Input } from '../UI';
import { userAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const AccountDeletion = () => {
  const { user, logout } = useAuth();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteAccount = async () => {
    if (confirmEmail !== user?.email) {
      setError('Email confirmation does not match your account email');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await userAPI.deleteAccount(confirmEmail);
      
      // Account deleted successfully, logout and redirect
      logout();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setConfirmEmail('');
    setError('');
  };

  if (showConfirmation) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Confirm Account Deletion
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            {/* Final warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-red-900 mb-2">
                    This action cannot be undone!
                  </h4>
                  <p className="text-sm text-red-800 mb-3">
                    Deleting your account will permanently remove:
                  </p>
                  <ul className="text-sm text-red-800 space-y-1 ml-4">
                    <li>• Your profile and account information</li>
                    <li>• All chatbots and their configurations</li>
                    <li>• Conversation history and analytics data</li>
                    <li>• Usage statistics and preferences</li>
                    <li>• Any embedded chatbots will stop working</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Email confirmation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To confirm deletion, please type your email address:
              </label>
              <Input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={user?.email}
                error={error}
                className="mb-2"
              />
              <p className="text-xs text-gray-500">
                Expected: {user?.email}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleDeleteAccount}
                disabled={loading || confirmEmail !== user?.email}
                variant="danger"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {loading ? 'Deleting Account...' : 'Delete My Account'}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title className="flex items-center text-red-600">
          <Trash2 className="h-5 w-5 mr-2" />
          Delete Account
        </Card.Title>
        <p className="text-sm text-gray-500 mt-1">
          Permanently delete your account and all associated data
        </p>
      </Card.Header>
      <Card.Content>
        <div className="space-y-4">
          {/* Warning information */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-yellow-900 mb-2">
                  Before you delete your account
                </h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Consider exporting your data first</li>
                  <li>• Remove chatbot embeds from your websites</li>
                  <li>• This action is permanent and cannot be reversed</li>
                  <li>• All your chatbots will immediately stop working</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Account info */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Account to be deleted:
            </h4>
            <p className="text-sm text-gray-600">
              <strong>Email:</strong> {user?.email}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Name:</strong> {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Member since:</strong> {user?.createdAt ? 
                new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
            </p>
          </div>

          {/* Delete button */}
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={() => setShowConfirmation(true)}
              variant="danger"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              You will be asked to confirm this action.
            </p>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

export default AccountDeletion;