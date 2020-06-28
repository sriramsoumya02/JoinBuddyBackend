const isEmpty = (string) => string.trim() === '';
const isEmail = (email) => {
  const regx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return email.match(regx);
};
exports.validateSignupData = (userData) => {
  let errors = {};
  const keys = ['email', 'password', 'confirmPassword', 'handle'];
  for (i = 0; i < keys.length; i++) {
    if (userData.hasOwnProperty(keys[i]) && isEmpty(userData[keys[i]]))
      errors[keys[i]] = 'must not be empty';
  }
  if (!isEmpty(userData.email) && !isEmail(userData.email)) {
    errors.email = 'must be valid email address';
  }

  if (
    !isEmpty(userData.confirmPassword) &&
    userData.password !== userData.confirmPassword
  ) {
    errors.confirmPassword = 'passwords must match';
  }
  return {
    errors,
    valid: Object.keys(errors).length === 0,
  };
};

exports.validationLogin = (userData, keys = []) => {
  let errors = {};
  for (i = 0; i < keys.length; i++) {
    if (userData.hasOwnProperty(keys[i]) && isEmpty(userData[keys[i]]))
      errors[keys[i]] = 'must not be empty';
  }
  if (!isEmpty(userData.email) && !isEmail(userData.email)) {
    errors.email = 'must be valid email address';
  }
  return {
    errors,
    valid: Object.keys(errors).length === 0,
  };
};

exports.reducedToObject = (data) => {
  let newData = {};
  for (const property in data) {
    if (!isEmpty(data[property].trim()))
      newData[property] = data[property].trim();
  }
  return newData;
};
