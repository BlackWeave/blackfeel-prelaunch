// Runtime configuration for API base URL
// This file is loaded before app.js and sets window.API_BASE_URL

// Default to /api for local development
// For Vercel deployment, set API_BASE_URL via environment variable replacement
window.API_BASE_URL = window.API_BASE_URL || '/api';
