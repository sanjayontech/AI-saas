import React from 'react';

const Select = ({ 
  label, 
  error, 
  helperText,
  options = [],
  className = '',
  ...props 
}) => {
  const selectClasses = `block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
    error 
      ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
  } ${className}`;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select className={selectClasses} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export { Select };
export default Select;