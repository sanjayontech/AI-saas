import React, { useState } from 'react';
import { Download, FileText, Shield, AlertCircle } from 'lucide-react';
import { Card, Button } from '../UI';
import { userAPI } from '../../utils/api';

const DataExport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleExportData = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await userAPI.exportData();
      
      // Create and download the JSON file
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `chatbot-saas-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      setSuccess('Your data has been exported successfully!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title className="flex items-center">
          <Download className="h-5 w-5 mr-2" />
          Data Export
        </Card.Title>
        <p className="text-sm text-gray-500 mt-1">
          Download all your account data in JSON format
        </p>
      </Card.Header>
      <Card.Content>
        <div className="space-y-4">
          {/* Information about what's included */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Your export will include:
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Personal profile information</li>
                  <li>• Account preferences and settings</li>
                  <li>• All chatbot configurations and settings</li>
                  <li>• Conversation history and analytics data</li>
                  <li>• Usage statistics and activity logs</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Privacy notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-yellow-900 mb-1">
                  Privacy Notice
                </h4>
                <p className="text-sm text-yellow-800">
                  This export contains all your personal data. Please store it securely 
                  and only share it with trusted parties. The export is limited to 3 
                  requests per day for security reasons.
                </p>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-red-900 mb-1">
                    Export Failed
                  </h4>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <Download className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-green-900 mb-1">
                    Export Successful
                  </h4>
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Export button */}
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={handleExportData}
              disabled={loading}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {loading ? 'Exporting Data...' : 'Export My Data'}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              The export will be downloaded as a JSON file to your device.
            </p>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

export default DataExport;