// Application-wide state

export let gymData = {
    sessions: [],
    bodyWeightLog: []
};

export let currentUser = null; // Holds user object from Supabase, including profile data after load

export let currentSessionId = null;
export let currentExerciseId = null;
export let currentViewingExerciseName = null; // Used for detailed exercise view context

export let currentView = 'sessionList'; // To track the current active view for session storage restoration

export let detailedHistoryViewMode = 'lastDay'; // 'lastDay' or 'allHistory'

export let appInitializedOnce = false; // Flag to prevent re-initialization issues

// Chart instances - initialized to null, will be assigned by charting functions
export let progressChart = null;
export let detailedExerciseChart = null;

// Drag and Drop state (if kept global, otherwise scoped to their respective UI modules)
export let draggedSessionId = null;
export let draggedExerciseId = null;
export let sourceSessionIdForExerciseDrag = null;

// --- State Modifiers ---
// It can be good practice to have explicit setter functions for state
// if mutations become complex or need side effects (like re-rendering).
// For now, modules can import and modify these directly, but this is an area for future refinement.

export function setGymData(newData) {
    gymData = newData;
}

export function setCurrentUser(user) {
    currentUser = user;
}

export function setCurrentSessionId(id) {
    currentSessionId = id;
}

export function setCurrentExerciseId(id) {
    currentExerciseId = id;
}

export function setCurrentViewingExerciseName(name) {
    currentViewingExerciseName = name;
}

export function setCurrentView(view) {
    currentView = view;
}

export function setDetailedHistoryViewMode(mode) {
    detailedHistoryViewMode = mode;
}

export function setAppInitializedOnce(value) {
    appInitializedOnce = value;
}

export function setProgressChart(chartInstance) {
    if (progressChart) {
        progressChart.destroy();
    }
    progressChart = chartInstance;
}

export function setDetailedExerciseChart(chartInstance) {
    if (detailedExerciseChart) {
        detailedExerciseChart.destroy();
    }
    detailedExerciseChart = chartInstance;
}

export function setDraggedSessionId(id) {
    draggedSessionId = id;
}

export function setDraggedExerciseId(id) {
    draggedExerciseId = id;
}

export function setSourceSessionIdForExerciseDrag(id) {
    sourceSessionIdForExerciseDrag = id;
}

export function resetDragState() {
    draggedSessionId = null;
    draggedExerciseId = null;
    sourceSessionIdForExerciseDrag = null;
}

export function resetAppContext() {
    // Resets state variables that define user context, typically on logout or view change to main list
    currentSessionId = null;
    currentExerciseId = null;
    currentViewingExerciseName = null;
    // currentView might be intentionally preserved or reset by calling function
}

export function clearAllStateForLogout() {
    gymData = { sessions: [], bodyWeightLog: [] };
    currentUser = null;
    currentSessionId = null;
    currentExerciseId = null;
    currentViewingExerciseName = null;
    currentView = 'sessionList'; // Default view after logout
    appInitializedOnce = false; // Reset initialization flag
    // Charts are reset via their setters when new data (or no data) is loaded
}
