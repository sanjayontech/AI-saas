export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateName = (name) => {
  return name && name.trim().length >= 2;
};

export const validateForm = (formData, isLogin = false) => {
  const errors = {};

  // Email validation
  if (!formData.email) {
    errors.email = 'Email is required';
  } else if (!validateEmail(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Password validation
  if (!formData.password) {
    errors.password = 'Password is required';
  } else if (!isLogin && !validatePassword(formData.password)) {
    errors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
  }

  // Name validation for registration
  if (!isLogin) {
    if (!formData.firstName) {
      errors.firstName = 'First name is required';
    } else if (!validateName(formData.firstName)) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName) {
      errors.lastName = 'Last name is required';
    } else if (!validateName(formData.lastName)) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    // Confirm password validation
    if (formData.confirmPassword !== formData.password) {
      errors.confirmPassword = 'Passwords do not match';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};