import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight, Check, Bot, Palette, Settings, Code } from 'lucide-react';
import { Card, Button, Input, Select } from '../UI';
import { useChatbot } from '../../contexts/ChatbotContext';

const WIZARD_STEPS = [
  { id: 'basic', title: 'Basic Information', icon: Bot },
  { id: 'personality', title: 'Personality & Behavior', icon: Settings },
  { id: 'appearance', title: 'Appearance & Branding', icon: Palette },
  { id: 'preview', title: 'Preview & Deploy', icon: Code },
];

const ChatbotWizard = ({ isOpen, onClose, editingChatbot = null }) => {
  const { createChatbot, updateChatbot, loading } = useChatbot();
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: editingChatbot?.name || '',
    description: editingChatbot?.description || '',
    personality: editingChatbot?.personality || 'helpful',
    knowledgeBase: editingChatbot?.knowledgeBase?.join('\n') || '',
    appearance: {
      primaryColor: editingChatbot?.appearance?.primaryColor || '#4F46E5',
      secondaryColor: editingChatbot?.appearance?.secondaryColor || '#F3F4F6',
      fontFamily: editingChatbot?.appearance?.fontFamily || 'Inter',
      borderRadius: editingChatbot?.appearance?.borderRadius || 8,
      position: editingChatbot?.appearance?.position || 'bottom-right',
      avatar: editingChatbot?.appearance?.avatar || '',
    },
    settings: {
      maxTokens: editingChatbot?.settings?.maxTokens || 150,
      temperature: editingChatbot?.settings?.temperature || 0.7,
      responseDelay: editingChatbot?.settings?.responseDelay || 1000,
      fallbackMessage: editingChatbot?.settings?.fallbackMessage || "I'm sorry, I didn't understand that. Could you please rephrase your question?",
      collectUserInfo: editingChatbot?.settings?.collectUserInfo || false,
    },
  });

  const updateFormData = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (stepIndex) => {
    const newErrors = {};

    switch (stepIndex) {
      case 0: // Basic Information
        if (!formData.name.trim()) {
          newErrors.name = 'Chatbot name is required';
        }
        if (!formData.description.trim()) {
          newErrors.description = 'Description is required';
        }
        break;
      case 1: // Personality & Behavior
        if (!formData.personality) {
          newErrors.personality = 'Personality type is required';
        }
        break;
      case 2: // Appearance & Branding
        if (!formData.appearance.primaryColor) {
          newErrors['appearance.primaryColor'] = 'Primary color is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    const chatbotData = {
      ...formData,
      knowledgeBase: formData.knowledgeBase.split('\n').filter(line => line.trim()),
    };

    const result = editingChatbot 
      ? await updateChatbot(editingChatbot.id, chatbotData)
      : await createChatbot(chatbotData);

    if (result.success) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentStepData = WIZARD_STEPS[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <StepIcon className="h-6 w-6 text-indigo-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingChatbot ? 'Edit Chatbot' : 'Create New Chatbot'}
              </h2>
              <p className="text-sm text-gray-500">{currentStepData.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isActive 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-indigo-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {currentStep === 0 && (
            <BasicInformationStep 
              formData={formData}
              errors={errors}
              updateFormData={updateFormData}
            />
          )}
          {currentStep === 1 && (
            <PersonalityStep 
              formData={formData}
              errors={errors}
              updateFormData={updateFormData}
            />
          )}
          {currentStep === 2 && (
            <AppearanceStep 
              formData={formData}
              errors={errors}
              updateFormData={updateFormData}
            />
          )}
          {currentStep === 3 && (
            <PreviewStep 
              formData={formData}
              editingChatbot={editingChatbot}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {currentStep === WIZARD_STEPS.length - 1 ? (
              <Button
                onClick={handleSubmit}
                loading={loading}
              >
                {editingChatbot ? 'Update Chatbot' : 'Create Chatbot'}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Step Components
const BasicInformationStep = ({ formData, errors, updateFormData }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
      <p className="text-sm text-gray-600 mb-6">
        Let's start with the basic details about your chatbot.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-6">
      <Input
        label="Chatbot Name"
        value={formData.name}
        onChange={(e) => updateFormData('name', e.target.value)}
        error={errors.name}
        placeholder="e.g., Customer Support Bot"
        helperText="Choose a descriptive name for your chatbot"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
            errors.description 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
          }`}
          rows={3}
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          placeholder="Describe what your chatbot does and how it helps users..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          This description helps users understand your chatbot's purpose
        </p>
      </div>
    </div>
  </div>
);

const PersonalityStep = ({ formData, errors, updateFormData }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Personality & Behavior</h3>
      <p className="text-sm text-gray-600 mb-6">
        Configure how your chatbot behaves and responds to users.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-6">
      <Select
        label="Personality Type"
        value={formData.personality}
        onChange={(e) => updateFormData('personality', e.target.value)}
        error={errors.personality}
        options={[
          { value: 'helpful', label: 'Helpful & Professional' },
          { value: 'friendly', label: 'Friendly & Casual' },
          { value: 'formal', label: 'Formal & Business-like' },
          { value: 'creative', label: 'Creative & Engaging' },
          { value: 'technical', label: 'Technical & Precise' },
        ]}
        helperText="Choose the tone and style for your chatbot's responses"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Knowledge Base
        </label>
        <textarea
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          rows={6}
          value={formData.knowledgeBase}
          onChange={(e) => updateFormData('knowledgeBase', e.target.value)}
          placeholder="Enter information your chatbot should know about (one topic per line)..."
        />
        <p className="mt-1 text-sm text-gray-500">
          Add key information, FAQs, or knowledge that your chatbot should reference
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Response Delay (ms)"
          type="number"
          value={formData.settings.responseDelay}
          onChange={(e) => updateFormData('settings.responseDelay', parseInt(e.target.value))}
          min="0"
          max="5000"
          helperText="Delay before showing response"
        />

        <Input
          label="Max Response Length"
          type="number"
          value={formData.settings.maxTokens}
          onChange={(e) => updateFormData('settings.maxTokens', parseInt(e.target.value))}
          min="50"
          max="500"
          helperText="Maximum words in response"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fallback Message
        </label>
        <textarea
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          rows={2}
          value={formData.settings.fallbackMessage}
          onChange={(e) => updateFormData('settings.fallbackMessage', e.target.value)}
          placeholder="Message shown when chatbot can't understand the user"
        />
        <p className="mt-1 text-sm text-gray-500">
          This message is shown when the chatbot doesn't understand the user's input
        </p>
      </div>
    </div>
  </div>
);

const AppearanceStep = ({ formData, errors, updateFormData }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance & Branding</h3>
      <p className="text-sm text-gray-600 mb-6">
        Customize how your chatbot looks and feels to match your brand.
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={formData.appearance.primaryColor}
                onChange={(e) => updateFormData('appearance.primaryColor', e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <Input
                value={formData.appearance.primaryColor}
                onChange={(e) => updateFormData('appearance.primaryColor', e.target.value)}
                error={errors['appearance.primaryColor']}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={formData.appearance.secondaryColor}
                onChange={(e) => updateFormData('appearance.secondaryColor', e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <Input
                value={formData.appearance.secondaryColor}
                onChange={(e) => updateFormData('appearance.secondaryColor', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <Select
          label="Font Family"
          value={formData.appearance.fontFamily}
          onChange={(e) => updateFormData('appearance.fontFamily', e.target.value)}
          options={[
            { value: 'Inter', label: 'Inter' },
            { value: 'Roboto', label: 'Roboto' },
            { value: 'Open Sans', label: 'Open Sans' },
            { value: 'Lato', label: 'Lato' },
            { value: 'Poppins', label: 'Poppins' },
          ]}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Border Radius (px)"
            type="number"
            value={formData.appearance.borderRadius}
            onChange={(e) => updateFormData('appearance.borderRadius', parseInt(e.target.value))}
            min="0"
            max="20"
          />

          <Select
            label="Position"
            value={formData.appearance.position}
            onChange={(e) => updateFormData('appearance.position', e.target.value)}
            options={[
              { value: 'bottom-right', label: 'Bottom Right' },
              { value: 'bottom-left', label: 'Bottom Left' },
              { value: 'center', label: 'Center' },
            ]}
          />
        </div>

        <Input
          label="Avatar URL (optional)"
          value={formData.appearance.avatar}
          onChange={(e) => updateFormData('appearance.avatar', e.target.value)}
          placeholder="https://example.com/avatar.png"
          helperText="URL to an image for your chatbot's avatar"
        />
      </div>

      {/* Preview */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Preview</h4>
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div 
            className="w-full h-32 rounded-lg flex items-center justify-center text-white font-medium"
            style={{ 
              backgroundColor: formData.appearance.primaryColor,
              borderRadius: `${formData.appearance.borderRadius}px`,
              fontFamily: formData.appearance.fontFamily,
            }}
          >
            <div className="text-center">
              <Bot className="h-8 w-8 mx-auto mb-2" />
              <div className="text-sm">{formData.name || 'Your Chatbot'}</div>
            </div>
          </div>
          <div 
            className="mt-3 p-3 rounded text-sm"
            style={{ 
              backgroundColor: formData.appearance.secondaryColor,
              borderRadius: `${formData.appearance.borderRadius}px`,
              fontFamily: formData.appearance.fontFamily,
            }}
          >
            Hello! How can I help you today?
          </div>
        </div>
      </div>
    </div>
  </div>
);

const PreviewStep = ({ formData, editingChatbot }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Preview & Deploy</h3>
      <p className="text-sm text-gray-600 mb-6">
        Review your chatbot configuration before {editingChatbot ? 'updating' : 'creating'} it.
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Card>
          <Card.Header>
            <Card.Title>Configuration Summary</Card.Title>
          </Card.Header>
          <Card.Content>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{formData.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="text-sm text-gray-900">{formData.description}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Personality</dt>
                <dd className="text-sm text-gray-900 capitalize">{formData.personality}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Knowledge Base Items</dt>
                <dd className="text-sm text-gray-900">
                  {formData.knowledgeBase.split('\n').filter(line => line.trim()).length} items
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Primary Color</dt>
                <dd className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: formData.appearance.primaryColor }}
                  />
                  <span className="text-sm text-gray-900">{formData.appearance.primaryColor}</span>
                </dd>
              </div>
            </dl>
          </Card.Content>
        </Card>
      </div>

      <div>
        <Card>
          <Card.Header>
            <Card.Title>Chat Preview</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: formData.appearance.primaryColor }}
                  >
                    <Bot className="h-4 w-4" />
                  </div>
                  <div 
                    className="flex-1 p-3 rounded-lg text-sm"
                    style={{ 
                      backgroundColor: formData.appearance.secondaryColor,
                      borderRadius: `${formData.appearance.borderRadius}px`,
                      fontFamily: formData.appearance.fontFamily,
                    }}
                  >
                    Hello! I'm {formData.name}. {formData.description}
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <div 
                    className="max-w-xs p-3 rounded-lg text-sm text-white"
                    style={{ 
                      backgroundColor: formData.appearance.primaryColor,
                      borderRadius: `${formData.appearance.borderRadius}px`,
                      fontFamily: formData.appearance.fontFamily,
                    }}
                  >
                    Hi there! Can you help me?
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: formData.appearance.primaryColor }}
                  >
                    <Bot className="h-4 w-4" />
                  </div>
                  <div 
                    className="flex-1 p-3 rounded-lg text-sm"
                    style={{ 
                      backgroundColor: formData.appearance.secondaryColor,
                      borderRadius: `${formData.appearance.borderRadius}px`,
                      fontFamily: formData.appearance.fontFamily,
                    }}
                  >
                    Of course! I'd be happy to help you. What can I assist you with today?
                  </div>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  </div>
);

export default ChatbotWizard;