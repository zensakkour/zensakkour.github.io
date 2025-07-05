import * as state from '../state.js';
import * as dom from '../domElements.js';
import { renderSessions } from './sessionView.js'; // Import actual renderSessions
// import { renderExercisesForSession, renderDetailedExerciseView, renderSetsForExercise } from './exerciseView.js'; // Future imports
import { renderBodyWeightHistory } from './bodyWeightView.js'; // Import actual
import { populateExerciseSelect, handleAnalysisTypeChange } from './analysisView.js'; // Import actual

// placeholderRenderer is no longer needed.
// Functions like renderExercisesForSession are called by other modules (e.g., auth.js for view restoration, or sessionView.js for navigation)
// which import them directly from exerciseView.js.
// viewManager is responsible for showing/hiding views and main navigation, not for invoking detailed content rendering of other views.


export function saveViewState() {
    if (!state.currentUser) return;
    try {
        const viewStateToSave = {
            currentSessionId: state.currentSessionId,
            currentExerciseId: state.currentExerciseId,
            currentViewingExerciseName: state.currentViewingExerciseName,
            currentView: state.currentView
        };
        sessionStorage.setItem('gymTrackerViewState', JSON.stringify(viewStateToSave));
        console.log("View state saved:", viewStateToSave);
    } catch (e) {
        console.error("Error saving view state to sessionStorage:", e);
    }
}

export function loadAndRestoreViewState() {
    if (!state.currentUser) return null;
    try {
        const savedStateJSON = sessionStorage.getItem('gymTrackerViewState');
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            console.log("View state loaded from sessionStorage:", savedState);
            return savedState;
        }
    } catch (e) {
        console.error("Error loading view state from sessionStorage:", e);
        sessionStorage.removeItem('gymTrackerViewState'); // Clear corrupted state
    }
    return null;
}

export function clearViewState() {
    sessionStorage.removeItem('gymTrackerViewState');
    console.log("View state cleared from sessionStorage.");
    state.resetAppContext(); // Resets currentSessionId, currentExerciseId, etc.
    state.setCurrentView('sessionList'); // Default to sessionList view
}


export function showSessionListView(isRestoring = false) {
    if (dom.sessionListDiv) dom.sessionListDiv.style.display = 'block';
    if (dom.sessionViewControls) dom.sessionViewControls.style.display = 'flex';
    if (dom.exerciseViewContainer) dom.exerciseViewContainer.style.display = 'none';
    if (dom.setTrackerContainer) dom.setTrackerContainer.style.display = 'none';
    if (dom.detailedExerciseViewContainer) dom.detailedExerciseViewContainer.style.display = 'none';

    if (!isRestoring) {
        state.resetAppContext(); // Clear session/exercise context
        clearViewState(); // Clear stored state when explicitly going to session list
    }
    state.setCurrentView('sessionList');
    saveViewState();
}

export function showExerciseView(isRestoring = false) {
    if (dom.sessionListDiv) dom.sessionListDiv.style.display = 'none';
    if (dom.sessionViewControls) dom.sessionViewControls.style.display = 'none';
    if (dom.exerciseViewContainer) dom.exerciseViewContainer.style.display = 'block';
    if (dom.setTrackerContainer) dom.setTrackerContainer.style.display = 'none';
    if (dom.detailedExerciseViewContainer) dom.detailedExerciseViewContainer.style.display = 'none';

    if (!isRestoring) {
        // Only reset exercise context if not restoring a specific exercise view
        state.setCurrentExerciseId(null);
        state.setCurrentViewingExerciseName(null);
    }
    state.setCurrentView('exerciseView');
    saveViewState();
}

export function showDetailedExerciseView() {
    if (dom.exerciseViewContainer) dom.exerciseViewContainer.style.display = 'none';
    if (dom.detailedExerciseViewContainer) dom.detailedExerciseViewContainer.style.display = 'block';
    if (dom.setTrackerContainer) dom.setTrackerContainer.style.display = 'none';
    // currentSessionId and currentViewingExerciseName (leading to currentExerciseId) should be set by caller
    state.setCurrentView('detailedExerciseView');
    saveViewState();
}

export function showSetTracker() {
    if (dom.exerciseViewContainer) dom.exerciseViewContainer.style.display = 'none';
    if (dom.detailedExerciseViewContainer) dom.detailedExerciseViewContainer.style.display = 'none';
    if (dom.setTrackerContainer) dom.setTrackerContainer.style.display = 'block';

    if (dom.newSetDateInput) { // Default the new set date input to today
        dom.newSetDateInput.valueAsDate = new Date();
    }
    // currentSessionId and currentExerciseId should be set by caller
    state.setCurrentView('setTracker');
    saveViewState();
}

export function setupNavEventListeners() {
    const navLinks = document.querySelectorAll('nav ul li a'); // Query within this module
    navLinks.forEach(link => {
        // Clone and replace to remove old listeners, then add new one
        // This is important if setupNavEventListeners can be called multiple times (e.g. after auth changes)
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);

        newLink.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = newLink.getAttribute('href').substring(1);

            dom.appSections.forEach(section => {
                section.style.display = (section.id === targetId) ? 'block' : 'none';
            });

            navLinks.forEach(navLnk => navLnk.classList.remove('active'));
            newLink.classList.add('active');

            // Call appropriate rendering/setup functions based on the target tab
            if (targetId === 'sessions') {
                // If currentView is not already part of sessions, reset to sessionList
                if (!['sessionList', 'exerciseView', 'detailedExerciseView', 'setTracker'].includes(state.currentView)) {
                    showSessionListView();
                }
                renderSessions(); // Use actual renderSessions
            } else if (targetId === 'analysis') {
                state.setCurrentView('analysisView'); // Or a more specific view name
                populateExerciseSelect(); // Use actual
                handleAnalysisTypeChange(); // Use actual
            } else if (targetId === 'body-weight') {
                state.setCurrentView('bodyWeightView');
                renderBodyWeightHistory(); // Use actual
                if (dom.bodyWeightDateInput) dom.bodyWeightDateInput.valueAsDate = new Date();
            } else if (targetId === 'profile') {
                state.setCurrentView('profileView');
                if (state.currentUser && dom.profileUsernameInput) {
                    dom.profileUsernameInput.value = state.currentUser.username || '';
                } else if (dom.profileUsernameInput) {
                    dom.profileUsernameInput.value = '';
                }
                if (dom.profileFeedbackDiv) { // Clear old feedback
                    dom.profileFeedbackDiv.style.display = 'none';
                    dom.profileFeedbackDiv.textContent = '';
                }
            }
            saveViewState(); // Save view state after tab switch
        });
    });
}

export function updateActiveNavLink(currentAppView) {
    // currentAppView could be 'sessions', 'analysis', 'body-weight', 'profile'
    // or more granular like 'sessionList', 'exerciseView' from state.currentView
    document.querySelectorAll('nav ul li a').forEach(nl => nl.classList.remove('active'));

    let activeHref = "#sessions"; // Default
    if (currentAppView === 'analysis' || currentAppView === 'analysisView') {
        activeHref = "#analysis";
    } else if (currentAppView === 'body-weight' || currentAppView === 'bodyWeightView') {
        activeHref = "#body-weight";
    } else if (currentAppView === 'profile' || currentAppView === 'profileView') {
        activeHref = "#profile";
    }
    // For views within #sessions section, the #sessions tab remains active.
    // This logic might need refinement based on how state.currentView maps to tab IDs.

    const activeNavLink = document.querySelector(`nav ul li a[href="${activeHref}"]`);
    if (activeNavLink) {
        activeNavLink.classList.add('active');
    }
}

export function setupMobileNavToggle() {
    const hamburgerBtn = document.getElementById('hamburger-menu-btn');
    const navUl = document.querySelector('nav ul');

    if (hamburgerBtn && navUl) {
        hamburgerBtn.addEventListener('click', () => {
            navUl.classList.toggle('nav-open');
            hamburgerBtn.classList.toggle('active'); // For 'X' icon state
            // Update aria-expanded attribute for accessibility
            const isExpanded = navUl.classList.contains('nav-open');
            hamburgerBtn.setAttribute('aria-expanded', isExpanded.toString());
        });

        // Optional: Close menu when a nav link is clicked
        navUl.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (navUl.classList.contains('nav-open')) {
                    navUl.classList.remove('nav-open');
                    hamburgerBtn.classList.remove('active');
                    hamburgerBtn.setAttribute('aria-expanded', 'false');
                }
            });
        });
    } else {
        console.warn("Hamburger button or nav ul not found for mobile nav setup.");
    }
}
