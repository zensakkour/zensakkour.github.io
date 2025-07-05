import { supabaseClient, loadData, loadUserProfile } from './api.js';
import * as state from './state.js';
import * as dom from './domElements.js';
import { showFeedback } from './ui/renderUtils.js';
import * as viewManager from './ui/viewManager.js'; // Import the actual viewManager
// import { renderSessions, renderBodyWeightHistory } from './ui/sessionView.js'; // Future imports
// import { populateExerciseSelect, handleAnalysisTypeChange } from './ui/analysisView.js'; // Future imports


// Placeholder for render functions until they are in their own modules
// These will be replaced by imports from specific UI modules (sessionView.js, exerciseView.js, etc.)
const placeholderRenderer = {
    renderSessions: () => {
        console.warn("renderSessions not yet implemented");
        if(dom.sessionListDiv) dom.sessionListDiv.innerHTML = '<p>Session rendering pending...</p>';
    },
    renderBodyWeightHistory: () => {
        console.warn("renderBodyWeightHistory not yet implemented");
        if(dom.bodyWeightHistoryDiv) dom.bodyWeightHistoryDiv.innerHTML = '<p>Body weight history rendering pending...</p>';
    },
    renderExercisesForSession: (sessionId) => console.warn(`renderExercisesForSession(${sessionId}) not yet implemented`),
    renderDetailedExerciseView: (exerciseName) => console.warn(`renderDetailedExerciseView(${exerciseName}) not yet implemented`),
    renderSetsForExercise: (sessionId, exerciseId) => console.warn(`renderSetsForExercise(${sessionId}, ${exerciseId}) not yet implemented`),
    populateExerciseSelect: () => console.warn("populateExerciseSelect not yet implemented"),
    handleAnalysisTypeChange: () => console.warn("handleAnalysisTypeChange not yet implemented"),
};


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
        placeholderRenderer.renderSessions();
        placeholderRenderer.renderBodyWeightHistory();
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
                placeholderRenderer.renderExercisesForSession(state.currentSessionId);
                viewManager.showExerciseView(true); // Use actual viewManager function
            } else {
                viewManager.showSessionListView(); // Use actual viewManager function
            }
        } else if (state.currentView === 'detailedExerciseView' && state.currentSessionId && state.currentViewingExerciseName) {
            const session = state.gymData.sessions.find(s => s.id === state.currentSessionId);
            const exercise = session ? session.exercises.find(ex => ex.name === state.currentViewingExerciseName) : null;
            if (exercise) {
                state.setCurrentExerciseId(exercise.id);
                placeholderRenderer.renderDetailedExerciseView(state.currentViewingExerciseName);
                viewManager.showDetailedExerciseView(); // Use actual viewManager function
            } else { viewManager.showSessionListView(); } // Use actual viewManager function
        } else if (state.currentView === 'setTracker' && state.currentSessionId && state.currentExerciseId) {
            const session = state.gymData.sessions.find(s => s.id === state.currentSessionId);
            const exercise = session ? session.exercises.find(ex => ex.id === state.currentExerciseId) : null;
            if (exercise) {
                placeholderRenderer.renderSetsForExercise(state.currentSessionId, state.currentExerciseId);
                viewManager.showSetTracker(); // Use actual viewManager function
            } else { viewManager.showSessionListView(); } // Use actual viewManager function
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

    placeholderRenderer.renderBodyWeightHistory();
    if (dom.bodyWeightDateInput) dom.bodyWeightDateInput.valueAsDate = new Date();
    placeholderRenderer.populateExerciseSelect();
    placeholderRenderer.handleAnalysisTypeChange();

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

function updateUIForAuthState(user) {
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
        placeholderRenderer.renderSessions();
        placeholderRenderer.renderBodyWeightHistory();
        // Active nav link update would also happen here if needed
    }
}


export function initializeAuth() {
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
