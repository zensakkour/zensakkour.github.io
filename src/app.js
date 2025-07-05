// Main application entry point
import { supabaseClient } from './api.js'; // Import the initialized Supabase client
import { initializeAuth } from './auth.js'; // Placeholder for auth.js
// import { setupNavEventListeners } from './ui/viewManager.js'; // Example, will be added later
// import { loadInitialData } from './someDataModule.js'; // Example

console.log("app.js loaded");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing app...");

    // Initialize authentication. This will set up onAuthStateChange listener.
    initializeAuth(supabaseClient); // Pass the client if auth.js needs it directly

    // Example: Setup main navigation event listeners (will be moved to viewManager later)
    // setupNavEventListeners();

    // Other initializations can go here
    // e.g., if not handled by onAuthStateChange, might try to load some initial view or data
    // For this app, most UI setup is dependent on auth state.
});

// Global error handling (optional, but good for unhandled promise rejections)
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    // Optionally, show a generic error message to the user
    // import { showFeedback } from './ui/renderUtils.js'; // Be careful with circular dependencies if not structured well
    // showFeedback("An unexpected error occurred. Please try again.", true);
});

window.addEventListener('error', event => {
    console.error('Global error:', event.error, event.message);
    // import { showFeedback } from './ui/renderUtils.js';
    // showFeedback(`A critical error occurred: ${event.message}`, true);
});
