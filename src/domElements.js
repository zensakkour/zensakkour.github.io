// Centralized DOM Element References

// Body Weight Section
export const bodyWeightDateInput = document.getElementById('body-weight-date');
export const bodyWeightInput = document.getElementById('body-weight-input');
export const addBodyWeightBtn = document.getElementById('add-body-weight-btn');
export const bodyWeightHistoryDiv = document.getElementById('body-weight-history');

// Auth DOM Elements
export const authContainer = document.getElementById('auth-container');
export const signupForm = document.getElementById('signup-form');
export const loginForm = document.getElementById('login-form');
export const logoutBtn = document.getElementById('logout-btn');
export const userStatusDiv = document.getElementById('user-status');
export const userEmailSpan = document.getElementById('user-email');
export const showSignupLink = document.getElementById('show-signup');
// Note: backToLoginLink is created dynamically in original script, will handle that in auth.js or similar

// Main App Content Elements (to show/hide)
export const mainNav = document.querySelector('nav');
export const mainContent = document.querySelector('main');
export const appSections = document.querySelectorAll('main section'); // Used for tabbed navigation

// Sessions View Specific
export const sessionListDiv = document.getElementById('session-list');
export const newSessionNameInput = document.getElementById('new-session-name');
export const addSessionBtn = document.getElementById('add-session-btn');
export const sessionViewControls = document.querySelector('#sessions .controls-group'); // Assuming this targets the add session controls

// Exercise View Specific (within Sessions section)
export const exerciseViewContainer = document.getElementById('exercise-view-container');
export const currentSessionTitle = document.getElementById('current-session-title');
export const exerciseListDiv = document.getElementById('exercise-list');
export const newExerciseNameInput = document.getElementById('new-exercise-name');
export const addExerciseBtn = document.getElementById('add-exercise-btn');
export const backToSessionsBtn = document.getElementById('back-to-sessions-btn');

// Detailed Exercise View Specific (within Sessions section)
export const detailedExerciseViewContainer = document.getElementById('detailed-exercise-view-container');
export const detailedExerciseNameEl = document.getElementById('detailed-exercise-name');
export const goToSetTrackerBtn = document.getElementById('go-to-set-tracker-btn');
export const backToExerciseListFromDetailBtn = document.getElementById('back-to-exercise-list-from-detail-btn');
export const toggleHistoryViewBtn = document.getElementById('toggle-history-view-btn');
export const detailedExerciseHistoryListEl = document.getElementById('detailed-exercise-history-list');
export const detailedExerciseChartCanvas = document.getElementById('detailedExerciseChart') ? document.getElementById('detailedExerciseChart').getContext('2d') : null;
export const setFor1RMSelect = document.getElementById('set-for-1rm-select');
export const calculate1RMBtn = document.getElementById('calculate-1rm-btn');
export const calculated1RMResultEl = document.getElementById('calculated-1rm-result');
export const detailedExerciseChartContainer = document.getElementById('detailed-exercise-chart-container');


// Set Tracker View Specific (within Sessions section)
export const setTrackerContainer = document.getElementById('set-tracker-container');
export const currentExerciseTitleSet = document.getElementById('current-exercise-title-set');
export const setsListDiv = document.getElementById('sets-list');
export const setWeightInput = document.getElementById('set-weight');
export const setRepsInput = document.getElementById('set-reps');
export const newSetDateInput = document.getElementById('new-set-date');
export const addSetBtn = document.getElementById('add-set-btn');
export const backToExercisesBtn = document.getElementById('back-to-exercises-btn');

// Analysis Section
export const analysisSection = document.getElementById('analysis');
export const analysisDataTypeSelect = document.getElementById('analysis-data-type-select');
export const exerciseSelectAnalysis = document.getElementById('exercise-select-analysis');
// export const exerciseSelectLabelAnalysis = document.getElementById('exercise-select-label-analysis'); // Usually not needed directly
export const exerciseSelectGroupAnalysis = document.getElementById('exercise-select-group-analysis');
export const multiExerciseSelectAnalysis = document.getElementById('multi-exercise-select-analysis');
export const multiExerciseSelectGroupAnalysis = document.getElementById('multi-exercise-select-group-analysis');
export const generateVolumeComparisonBtn = document.getElementById('generate-volume-comparison-btn');
export const progressChartCanvas = document.getElementById('progressChart') ? document.getElementById('progressChart').getContext('2d') : null;
export const rawDataOutput = document.getElementById('raw-data-output');
export const progressChartContainer = document.getElementById('progress-chart-container'); // For analysis tab chart
export const rawDataContainer = document.getElementById('raw-data-container'); // For analysis tab raw data

// Profile Section
export const profileSection = document.getElementById('profile');
export const profileUsernameInput = document.getElementById('profile-username');
export const saveProfileBtn = document.getElementById('save-profile-btn');
export const profileFeedbackDiv = document.getElementById('profile-feedback');
export const newPasswordInput = document.getElementById('profile-new-password');
export const confirmPasswordInput = document.getElementById('profile-confirm-password');
export const changePasswordBtn = document.getElementById('change-password-btn');
export const passwordFeedbackDiv = document.getElementById('password-feedback');
export const newEmailInput = document.getElementById('profile-new-email');
export const changeEmailBtn = document.getElementById('change-email-btn');
export const emailFeedbackDiv = document.getElementById('email-feedback');

// General UI
// feedbackToast is created dynamically, so no static element here.

// Ensure canvas contexts are only fetched if the element exists (for robustness)
function getCanvasContext(id) {
    const canvas = document.getElementById(id);
    return canvas ? canvas.getContext('2d') : null;
}
// Re-assign canvas contexts using the helper for safety, in case DOM structure changes or elements are conditional
// export const detailedExerciseChartCanvas = getCanvasContext('detailedExerciseChart');
// export const progressChartCanvas = getCanvasContext('progressChart');
// The direct getContext in declarations is fine if elements are guaranteed. If not, this helper is safer.
// For now, keeping the direct ones as they are simpler and elements are expected.
// If `detailedExerciseChartCanvas` or `progressChartCanvas` is null, functions using them must check.
if (!detailedExerciseChartCanvas && document.getElementById('detailedExerciseChart')) {
    console.warn("Failed to get context for detailedExerciseChart, ensure canvas ID is correct and element exists at time of script execution if not defer/module.")
}
if (!progressChartCanvas && document.getElementById('progressChart')) {
    console.warn("Failed to get context for progressChart, ensure canvas ID is correct and element exists at time of script execution if not defer/module.")
}
