// Main application entry point
import { supabaseClient } from './api.js'; // Import the initialized Supabase client
import { initializeAuth } from './auth.js';
import { setupSessionEventListeners } from './ui/sessionView.js';
import { setupExerciseEventListeners } from './ui/exerciseView.js';
import { setupBodyWeightEventListeners } from './ui/bodyWeightView.js'; // Import actual
// import { setupAnalysisEventListeners } from './ui/analysisView.js'; // Future
// import { setupProfileEventListeners } from './ui/profileView.js'; // Future


console.log("app.js loaded");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing app...");

    // Initialize authentication. This will set up onAuthStateChange listener.
    initializeAuth(); // supabaseClient is imported directly in auth.js now

    // Setup global event listeners for different views/components
    // Note: viewManager.setupNavEventListeners() is called from within initializeAppData in auth.js
    setupSessionEventListeners();
    setupExerciseEventListeners();
    setupBodyWeightEventListeners(); // Call actual
    // setupAnalysisEventListeners(); // Future
    // setupProfileEventListeners(); // Future

    // Other initializations can go here if needed
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
