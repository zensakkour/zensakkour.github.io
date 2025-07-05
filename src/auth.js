import { supabaseClient, loadData, loadUserProfile } from './api.js';
import * as state from './state.js';
import * as dom from './domElements.js';
import { showFeedback } from './ui/renderUtils.js';
import * as viewManager from './ui/viewManager.js'; // Import the actual viewManager
import { renderSessions } from './ui/sessionView.js'; // Import actual renderSessions
import {
    renderExercisesForSession,
    renderDetailedExerciseView,
    renderSetsForExercise
} from './ui/exerciseView.js'; // Import actual exercise/set render functions
import { renderBodyWeightHistory } from './ui/bodyWeightView.js'; // Import actual
import { populateExerciseSelect, handleAnalysisTypeChange } from './ui/analysisView.js'; // Import actual
import { updateUsernameAPI } from '../api.js'; // Import for profile username update

// placeholderRenderer is no longer needed as all its functions are directly imported and used.


async function initializeAppData() {
    console.log("initializeAppData called. appInitializedOnce:", state.appInitializedOnce, "currentUser:", state.currentUser);

    if (state.appInitializedOnce && state.currentUser) {
        console.log("App already initialized for current user. Re-validating view might be needed.");
    }

    viewManager.setupNavEventListeners(); // Use actual viewManager function


    if (state.currentUser) {
        try {
            await loadData(); // From api.js
            await loadUserProfile(); // From api.js
        } catch (error) {
            showFeedback(`Error initializing app data: ${error.message}`, true);
            // UI should reflect that data loading failed.
        }
    } else {
        state.clearAllStateForLogout(); // Clears gymData, currentUser, etc.
        renderSessions(); // Use actual renderSessions
        renderBodyWeightHistory(); // Use actual
        state.setAppInitializedOnce(false);
        return;
    }

    const restoredState = viewManager.loadAndRestoreViewState(); // Use actual viewManager function
    if (restoredState && state.currentUser && state.gymData.sessions) {
        state.setCurrentSessionId(restoredState.currentSessionId);
        state.setCurrentExerciseId(restoredState.currentExerciseId);
        state.setCurrentViewingExerciseName(restoredState.currentViewingExerciseName);
        state.setCurrentView(restoredState.currentView);

        console.log("Attempting to restore view to:", state.currentView, "with state:", restoredState);

        dom.appSections.forEach(section => section.style.display = 'none');
        // This logic for showing parent sections might need adjustment based on final HTML structure
        // For now, assuming 'sessions', 'analysis', 'body-weight', 'profile' are top-level section IDs.
        if (state.currentView === 'sessionList' || state.currentView === 'exerciseView' || state.currentView === 'detailedExerciseView' || state.currentView === 'setTracker') {
            const sessionsSection = document.getElementById('sessions');
            if (sessionsSection) sessionsSection.style.display = 'block';
        } else if (state.currentView === 'analysisView') {
            if(dom.analysisSection) dom.analysisSection.style.display = 'block';
        } else if (state.currentView === 'bodyWeightView') {
             const bwSection = document.getElementById('body-weight');
             if(bwSection) bwSection.style.display = 'block';
        } else if (state.currentView === 'profileView') {
             if(dom.profileSection) dom.profileSection.style.display = 'block';
        }


        if (state.currentView === 'sessionList') {
            viewManager.showSessionListView(true);  // Use actual viewManager function
        } else if (state.currentView === 'exerciseView' && state.currentSessionId) {
            const sessionExists = state.gymData.sessions.some(s => s.id === state.currentSessionId);
            if (sessionExists) {
                renderExercisesForSession(state.currentSessionId); // Use actual function
                viewManager.showExerciseView(true);
            } else {
                viewManager.showSessionListView();
            }
        } else if (state.currentView === 'detailedExerciseView' && state.currentSessionId && state.currentViewingExerciseName) {
            const session = state.gymData.sessions.find(s => s.id === state.currentSessionId);
            const exercise = session ? session.exercises.find(ex => ex.name === state.currentViewingExerciseName) : null;
            if (exercise) {
                state.setCurrentExerciseId(exercise.id);
                renderDetailedExerciseView(state.currentViewingExerciseName); // Use actual function
                viewManager.showDetailedExerciseView();
            } else { viewManager.showSessionListView(); }
        } else if (state.currentView === 'setTracker' && state.currentSessionId && state.currentExerciseId) {
            const session = state.gymData.sessions.find(s => s.id === state.currentSessionId);
            const exercise = session ? session.exercises.find(ex => ex.id === state.currentExerciseId) : null;
            if (exercise) {
                renderSetsForExercise(state.currentSessionId, state.currentExerciseId); // Use actual function
                viewManager.showSetTracker();
            } else { viewManager.showSessionListView(); }
        } else {
            viewManager.showSessionListView(); // Use actual viewManager function
        }
    } else {
        // Default view if no saved state or no data
        const sessionsSection = document.getElementById('sessions');
        if (sessionsSection) sessionsSection.style.display = 'block';
        if(dom.analysisSection) dom.analysisSection.style.display = 'none';
        const bodyWeightSection = document.getElementById('body-weight');
        if(bodyWeightSection) bodyWeightSection.style.display = 'none';
        if(dom.profileSection) dom.profileSection.style.display = 'none';
        viewManager.showSessionListView(); // Use actual viewManager function
    }

    renderBodyWeightHistory(); // Already using actual
    if (dom.bodyWeightDateInput) dom.bodyWeightDateInput.valueAsDate = new Date();
    populateExerciseSelect(); // Use actual
    handleAnalysisTypeChange(); // Use actual

    // Update active nav link (will be part of viewManager)
    document.querySelectorAll('nav ul li a').forEach(nl => nl.classList.remove('active'));
    let activeNavLinkSelector = 'nav ul li a[href="#sessions"]';
    if (dom.analysisSection && dom.analysisSection.style.display === 'block') {
        activeNavLinkSelector = 'nav ul li a[href="#analysis"]';
    } else if (dom.bodyWeightDateInput && dom.bodyWeightDateInput.closest('section').style.display === 'block') {
        activeNavLinkSelector = 'nav ul li a[href="#body-weight"]';
    } else if (dom.profileSection && dom.profileSection.style.display === 'block') {
        activeNavLinkSelector = 'nav ul li a[href="#profile"]';
    }
    const activeNavLink = document.querySelector(activeNavLinkSelector);
    if (activeNavLink) activeNavLink.classList.add('active');

    state.setAppInitializedOnce(true);
}

export function updateUIForAuthState(user) { // Made exportable for potential direct use if needed, though primarily internal to auth flow
    console.log("updateUIForAuthState called with user:", user, "currentUser:", state.currentUser, "appInitializedOnce:", state.appInitializedOnce);
    const previousUser = state.currentUser;
    state.setCurrentUser(user);

    if (user) {
        if (previousUser && user.id === previousUser.id && state.appInitializedOnce) {
            console.log("User unchanged and app initialized. Skipping full re-initialization potentially.");
            if (state.currentUser.username) dom.userEmailSpan.textContent = state.currentUser.username;
            else dom.userEmailSpan.textContent = state.currentUser.email;
            dom.mainNav.style.display = 'block';
            dom.mainContent.style.display = 'block';
            dom.authContainer.style.display = 'none';
            dom.userStatusDiv.style.display = 'flex';
            // initializeAppData(); // Call to ensure view restoration if needed
        } else {
            console.log("New user or first initialization for this user. Running initializeAppData.");
            dom.userEmailSpan.textContent = user.email;
            dom.userStatusDiv.style.display = 'flex';
            dom.loginForm.style.display = 'none';
            dom.signupForm.style.display = 'none';
            dom.authContainer.style.display = 'none';
            dom.mainNav.style.display = 'block';
            dom.mainContent.style.display = 'block';
            state.setAppInitializedOnce(false); // Force re-initialization
            initializeAppData();
        }
    } else { // No user
        console.log("No user session. Clearing UI and state.");
        dom.userStatusDiv.style.display = 'none';
        dom.authContainer.style.display = 'block';
        dom.loginForm.style.display = 'block';
        dom.signupForm.style.display = 'none';
        dom.mainNav.style.display = 'none';
        dom.mainContent.style.display = 'none';

        state.clearAllStateForLogout();
        renderSessions(); // Use actual renderSessions
        renderBodyWeightHistory(); // Use actual
        // Active nav link update would also happen here if needed
    }
}


export function initializeAuth() {
    console.log("[auth.js] initializeAuth called"); // Step 1 Logging
    // Set up the listener for authentication state changes
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log(`onAuthStateChange event: ${event}`, session);
        const user = session ? session.user : null;

        if (event === 'SIGNED_OUT') {
            placeholderViewManager.clearViewState(); // From viewManager
            state.setAppInitializedOnce(false);
        }

        // updateUIForAuthState will call initializeAppData if it's a login or initial session.
        updateUIForAuthState(user);
    });

    // Initial check, though onAuthStateChange usually covers it with INITIAL_SESSION
    // supabaseClient.auth.getSession().then(({ data: { session } }) => {
    //    updateUIForAuthState(session ? session.user : null);
    // });

    // Setup event listeners for auth forms
    console.log("[auth.js] Checking dom.loginForm before adding listener:", dom.loginForm); // Step 2 Logging
    if (dom.loginForm) {
        dom.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("[auth.js] Login form submitted."); // Step 3 Logging (will move this log later)
            const email = dom.loginForm.querySelector('#login-email').value;
            const password = dom.loginForm.querySelector('#login-password').value;
            showFeedback("Logging in...", false);
            try {
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                showFeedback(`Login successful! Welcome back.`, false);
                dom.loginForm.querySelector('#login-email').value = '';
                dom.loginForm.querySelector('#login-password').value = '';
            } catch (error) {
                console.error('Login error:', error);
                showFeedback(`Login failed: ${error.message}`, true);
            }
        });
    } else {
        console.error("[auth.js] dom.loginForm is null or undefined. Cannot attach submit listener.");
    }

    if (dom.signupForm) {
        // Dynamically create and append "Back to Login" link for signup form
        // This ensures it's only added once and handled within this module
        if (!document.getElementById('show-login-dynamic')) { // Check if already added
            const backToLoginLinkElement = document.createElement('p');
            backToLoginLinkElement.innerHTML = 'Already have an account? <a href="#" id="show-login-dynamic">Login here</a>';
            dom.signupForm.appendChild(backToLoginLinkElement);
            document.getElementById('show-login-dynamic').addEventListener('click', (e) => {
                e.preventDefault();
                dom.signupForm.style.display = 'none';
                dom.loginForm.style.display = 'block';
            });
        }

        dom.signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = dom.signupForm.querySelector('#signup-email').value;
            const password = dom.signupForm.querySelector('#signup-password').value;
            showFeedback("Signing up...", false);
            try {
                const { data, error } = await supabaseClient.auth.signUp({ email, password });
                if (error) throw error;
                showFeedback(`Signup successful! Welcome ${data.user.email}. Please check your email to confirm.`, false);
                dom.signupForm.querySelector('#signup-email').value = '';
                dom.signupForm.querySelector('#signup-password').value = '';
                // UI update will be handled by onAuthStateChange if auto-confirm is off
                // If auto-confirm is on (or for local dev), new user might be signed in.
                // Forcing a view switch might be too presumptive here, let onAuthStateChange handle it.
                dom.signupForm.style.display = 'none';
                dom.loginForm.style.display = 'block';
            } catch (error) {
                console.error('Signup error:', error);
                showFeedback(`Signup failed: ${error.message}`, true);
            }
        });
    }

    if (dom.loginForm) {
        dom.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = dom.loginForm.querySelector('#login-email').value;
            const password = dom.loginForm.querySelector('#login-password').value;
            showFeedback("Logging in...", false);
            try {
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // onAuthStateChange will handle UI update via initializeAppData
                showFeedback(`Login successful! Welcome back.`, false); // This might show before UI fully updates
                dom.loginForm.querySelector('#login-email').value = '';
                dom.loginForm.querySelector('#login-password').value = '';
            } catch (error) {
                console.error('Login error:', error);
                showFeedback(`Login failed: ${error.message}`, true);
            }
        });
    }

    if (dom.logoutBtn) {
        dom.logoutBtn.addEventListener('click', async () => {
            showFeedback("Logging out...", false);
            try {
                const { error } = await supabaseClient.auth.signOut();
                if (error) throw error;
                // onAuthStateChange will handle UI update & call clearViewState
                // showFeedback("Logout successful.", false); // This might show before UI fully updates
            } catch (error) {
                console.error('Logout error:', error);
                showFeedback(`Logout failed: ${error.message}`, true);
            }
        });
    }

    if (dom.showSignupLink) {
        dom.showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            dom.loginForm.style.display = 'none';
            dom.signupForm.style.display = 'block';
        });
    }

    // Initial UI state for auth forms (no user)
    updateUIForAuthState(null); // Ensures correct initial display of login/signup forms
}


export function setupProfileEventListeners() {
    if (dom.saveProfileBtn) {
        dom.saveProfileBtn.addEventListener('click', async () => {
            if (!state.currentUser) {
                showFeedback("You must be logged in to save your profile.", true, dom.profileFeedbackDiv);
                return;
            }
            const newUsername = dom.profileUsernameInput.value.trim();
            if (!newUsername) {
                showFeedback("Username cannot be empty.", true, dom.profileFeedbackDiv);
                return;
            }
            // Optional: Add more sophisticated validation for username (e.g., regex)
            // if (!/^[a-zA-Z0-9_]{3,}$/.test(newUsername)) { ... }

            showFeedback("Saving username...", false, dom.profileFeedbackDiv);
            try {
                // The updateUsernameAPI function was added to api.js
                const updatedProfile = await updateUsernameAPI(state.currentUser.id, newUsername);

                if (updatedProfile) {
                    // Update local currentUser state
                    state.setCurrentUser({ ...state.currentUser, username: updatedProfile.username });
                    if (state.currentUser.username) { // Update display in header
                        dom.userEmailSpan.textContent = state.currentUser.username;
                    } else {
                        dom.userEmailSpan.textContent = state.currentUser.email;
                    }
                    showFeedback("Username saved successfully!", false, dom.profileFeedbackDiv);
                } else {
                    showFeedback("Profile not found or no changes made.", true, dom.profileFeedbackDiv);
                }
            } catch (error) {
                console.error("Error saving username:", error);
                showFeedback(`Error saving username: ${error.message}`, true, dom.profileFeedbackDiv);
            }
        });
    }

    if (dom.changePasswordBtn) {
        dom.changePasswordBtn.addEventListener('click', async () => {
            const newPassword = dom.newPasswordInput.value;
            const confirmPassword = dom.confirmPasswordInput.value;
            if(dom.passwordFeedbackDiv) dom.passwordFeedbackDiv.style.display = 'none';

            if (!newPassword || !confirmPassword) {
                showFeedback("Please fill in both password fields.", true, dom.passwordFeedbackDiv);
                return;
            }
            if (newPassword.length < 6) { // Supabase default min length
                showFeedback("New password must be at least 6 characters long.", true, dom.passwordFeedbackDiv);
                return;
            }
            if (newPassword !== confirmPassword) {
                showFeedback("New passwords do not match.", true, dom.passwordFeedbackDiv);
                return;
            }

            showFeedback("Changing password...", false, dom.passwordFeedbackDiv);
            try {
                const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
                if (error) throw error;
                showFeedback("Password updated successfully!", false, dom.passwordFeedbackDiv);
                dom.newPasswordInput.value = '';
                dom.confirmPasswordInput.value = '';
            } catch (error) {
                console.error("Error changing password:", error);
                showFeedback(`Error changing password: ${error.message}`, true, dom.passwordFeedbackDiv);
            }
        });
    }

    if (dom.changeEmailBtn) {
        dom.changeEmailBtn.addEventListener('click', async () => {
            const newEmail = dom.newEmailInput.value.trim();
            if(dom.emailFeedbackDiv) dom.emailFeedbackDiv.style.display = 'none';

            if (!newEmail) {
                showFeedback("Please enter the new email address.", true, dom.emailFeedbackDiv);
                return;
            }
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(newEmail)) {
                showFeedback("Please enter a valid email address.", true, dom.emailFeedbackDiv);
                return;
            }
            if (state.currentUser && newEmail === state.currentUser.email) {
                showFeedback("The new email address is the same as your current one.", true, dom.emailFeedbackDiv);
                return;
            }

            showFeedback("Requesting email change...", false, dom.emailFeedbackDiv);
            try {
                // Note: Supabase sends confirmation emails for email changes.
                // The user needs to confirm via both old and new email addresses.
                const { data, error } = await supabaseClient.auth.updateUser({ email: newEmail });
                if (error) throw error;

                showFeedback(
                    "Email change request initiated. Please check your OLD email address to confirm this change, " +
                    "and then check your NEW email address to verify it. Your email will update after verification.",
                    false,
                    dom.emailFeedbackDiv
                );
                dom.newEmailInput.value = '';
            } catch (error) {
                console.error("Error requesting email change:", error);
                showFeedback(`Error: ${error.message}`, true, dom.emailFeedbackDiv);
            }
        });
    }

    // Populate username when profile tab is focused/shown (handled by viewManager's nav listener)
    // This function is primarily for button event listeners.
}
