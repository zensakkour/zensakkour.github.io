// Main application entry point
import { supabaseClient } from './api.js'; // Import the initialized Supabase client
import { initializeAuth } from './auth.js';
import { setupSessionEventListeners } from './ui/sessionView.js';
import { setupExerciseEventListeners } from './ui/exerciseView.js';
import { setupBodyWeightEventListeners } from './ui/bodyWeightView.js';
import { setupAnalysisEventListeners } from './ui/analysisView.js';
import { setupProfileEventListeners } from './auth.js'; // Profile listeners are in auth.js


console.log("app.js loaded");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing app...");

    // Initialize authentication. This will set up onAuthStateChange listener.
    initializeAuth(); // supabaseClient is imported directly in auth.js now

    // Setup global event listeners for different views/components
    // Note: viewManager.setupNavEventListeners() is called from within initializeAppData in auth.js
    setupSessionEventListeners();
    setupExerciseEventListeners();
    setupBodyWeightEventListeners();
    setupAnalysisEventListeners();
    setupProfileEventListeners(); // Call actual

    // Ensure body weight nav link is present (moved from original script.js)
    // This is an idempotent check.
    if (document.querySelector('nav ul') && !document.querySelector('nav ul li a[href="#body-weight"]')) {
        const bodyWeightNavLinkItem = document.createElement('li');
        bodyWeightNavLinkItem.innerHTML = '<a href="#body-weight">Body Weight</a>';

        // Attempt to insert it before "Analysis" or "Profile", or append if they don't exist.
        const analysisLi = document.querySelector('nav ul li a[href="#analysis"]');
        const profileLi = document.querySelector('nav ul li a[href="#profile"]');
        const referenceNode = analysisLi ? analysisLi.parentElement : (profileLi ? profileLi.parentElement : null);

        if (referenceNode) {
            referenceNode.parentElement.insertBefore(bodyWeightNavLinkItem, referenceNode);
        } else {
            document.querySelector('nav ul').appendChild(bodyWeightNavLinkItem);
        }
        // Re-run nav setup if viewManager is already initialized and needs to pick up new link
        // This is usually handled if setupNavEventListeners is robust to re-calls or called after DOM mod.
        // For now, assuming it's fine or viewManager's setupNavEventListeners will handle new links if called again.
        // If viewManager.setupNavEventListeners() was already called by auth.initializeAppData(),
        // and it doesn't re-query navLinks dynamically, this new link might not get listeners.
        // This piece might be better in viewManager.js or ensure nav setup is deferred/re-run.
        // For simplicity of this step, just adding it here.
    }

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
