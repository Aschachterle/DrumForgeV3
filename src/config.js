import dotenv from 'dotenv';

dotenv.config();

export const config = {
  clientId: process.env.AUTODESK_CLIENT_ID,
  clientSecret: process.env.AUTODESK_CLIENT_SECRET,
  personalAccessToken: process.env.AUTODESK_PERSONAL_ACCESS_TOKEN,
  baseUrl: process.env.AUTODESK_BASE_URL || 'https://developer.api.autodesk.com',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info'
};

export const validateConfig = () => {
  const required = ['clientId', 'clientSecret', 'personalAccessToken'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return true;
};
