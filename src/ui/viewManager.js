import * as state from '../state.js';
import * as dom from '../domElements.js';
// import { renderSessions, renderExercisesForSession, renderDetailedExerciseView, renderSetsForExercise, renderBodyWeightHistory, populateExerciseSelect, handleAnalysisTypeChange } from './renderingService.js'; // Placeholder for specific render functions

// Placeholders for rendering functions until they are fully modularized
// These would ideally be imported from specific UI modules (sessionView.js, exerciseView.js, etc.)
const placeholderRenderer = {
    renderSessions: () => {
        console.warn("viewManager calling placeholderRenderer.renderSessions");
        if(dom.sessionListDiv) dom.sessionListDiv.innerHTML = '<p>Session rendering pending...</p>';
    },
    renderExercisesForSession: (sessionId) => console.warn(`viewManager calling placeholderRenderer.renderExercisesForSession(${sessionId})`),
    renderDetailedExerciseView: (exerciseName) => console.warn(`viewManager calling placeholderRenderer.renderDetailedExerciseView(${exerciseName})`),
    renderSetsForExercise: (sessionId, exerciseId) => console.warn(`viewManager calling placeholderRenderer.renderSetsForExercise(${sessionId}, ${exerciseId})`),
    renderBodyWeightHistory: () => {
        console.warn("viewManager calling placeholderRenderer.renderBodyWeightHistory");
         if(dom.bodyWeightHistoryDiv) dom.bodyWeightHistoryDiv.innerHTML = '<p>Body weight history rendering pending...</p>';
    },
    populateExerciseSelect: () => console.warn("viewManager calling placeholderRenderer.populateExerciseSelect"),
    handleAnalysisTypeChange: () => console.warn("viewManager calling placeholderRenderer.handleAnalysisTypeChange"),
};


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
                    showSessionListView(); // This also calls renderSessions via placeholders for now
                }
                placeholderRenderer.renderSessions(); // Explicitly re-render if needed
            } else if (targetId === 'analysis') {
                state.setCurrentView('analysisView'); // Or a more specific view name
                placeholderRenderer.populateExerciseSelect();
                placeholderRenderer.handleAnalysisTypeChange();
            } else if (targetId === 'body-weight') {
                state.setCurrentView('bodyWeightView');
                placeholderRenderer.renderBodyWeightHistory();
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
