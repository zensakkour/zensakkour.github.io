document.addEventListener('DOMContentLoaded', () => {
    console.log("JavaScript file loaded and DOM fully parsed.");

    // Utility function for YYYY-MM-DD formatting (re-adding)
    function getYYYYMMDD(dateObj) {
        if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
            const d = new Date();
            console.warn("Invalid date passed to getYYYYMMDD, using current date as fallback:", dateObj);
            const year = d.getFullYear();
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        const year = dateObj.getFullYear();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Supabase Client Initialization
    const SUPABASE_URL = 'https://cdbbaurycauyhlymmaec.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkYmJhdXJ5Y2F1eWhseW1tYWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2Mzc3NTcsImV4cCI6MjA2NzIxMzc1N30.gSMNIDm41JT6Ze79qawcqjIAn8Y4QsnwoXXRgzpv62s';
    // Corrected: The global object from Supabase v2 CDN is 'supabase', not 'supabaseJs'
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log("Supabase client initialized:", supabaseClient);

    // Data store
    let gymData = {
        sessions: [],
        bodyWeightLog: []
    };

    // DOM Elements for Body Weight Section
    const bodyWeightDateInput = document.getElementById('body-weight-date');
    const bodyWeightInput = document.getElementById('body-weight-input');
    const addBodyWeightBtn = document.getElementById('add-body-weight-btn');
    const bodyWeightHistoryDiv = document.getElementById('body-weight-history');

    // Auth DOM Elements
    const authContainer = document.getElementById('auth-container');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const userStatusDiv = document.getElementById('user-status');
    const userEmailSpan = document.getElementById('user-email');
    const showSignupLink = document.getElementById('show-signup');

    // Main App Content Elements (to show/hide)
    const mainNav = document.querySelector('nav');
    const mainContent = document.querySelector('main');

    // DOM Elements (App Specific)
    const sessionListDiv = document.getElementById('session-list');
    const newSessionNameInput = document.getElementById('new-session-name');
    const addSessionBtn = document.getElementById('add-session-btn');
    const sessionViewControls = document.querySelector('#sessions .controls-group');
    const exerciseViewContainer = document.getElementById('exercise-view-container');
    const detailedExerciseViewContainer = document.getElementById('detailed-exercise-view-container');
    const setTrackerContainer = document.getElementById('set-tracker-container');
    const currentSessionTitle = document.getElementById('current-session-title');
    const exerciseListDiv = document.getElementById('exercise-list');
    const newExerciseNameInput = document.getElementById('new-exercise-name');
    const addExerciseBtn = document.getElementById('add-exercise-btn');
    const backToSessionsBtn = document.getElementById('back-to-sessions-btn');
    const currentExerciseTitleSet = document.getElementById('current-exercise-title-set');
    const setsListDiv = document.getElementById('sets-list');
    const setWeightInput = document.getElementById('set-weight');
    const setRepsInput = document.getElementById('set-reps');
    const newSetDateInput = document.getElementById('new-set-date'); // New date input
    const addSetBtn = document.getElementById('add-set-btn');
    const backToExercisesBtn = document.getElementById('back-to-exercises-btn');
    const analysisSection = document.getElementById('analysis');
    const analysisDataTypeSelect = document.getElementById('analysis-data-type-select');
    const exerciseSelectAnalysis = document.getElementById('exercise-select-analysis');
    const exerciseSelectLabelAnalysis = document.getElementById('exercise-select-label-analysis');
    const exerciseSelectGroupAnalysis = document.getElementById('exercise-select-group-analysis');
    const multiExerciseSelectAnalysis = document.getElementById('multi-exercise-select-analysis');
    const multiExerciseSelectGroupAnalysis = document.getElementById('multi-exercise-select-group-analysis');
    const generateVolumeComparisonBtn = document.getElementById('generate-volume-comparison-btn');
    const progressChartCanvas = document.getElementById('progressChart').getContext('2d');
    const rawDataOutput = document.getElementById('raw-data-output');
    let progressChart = null;
    const detailedExerciseNameEl = document.getElementById('detailed-exercise-name');
    const detailedExerciseHistoryListEl = document.getElementById('detailed-exercise-history-list');
    const detailedExerciseChartCanvas = document.getElementById('detailedExerciseChart').getContext('2d');
    let detailedExerciseChart = null;
    const goToSetTrackerBtn = document.getElementById('go-to-set-tracker-btn');
    const backToExerciseListFromDetailBtn = document.getElementById('back-to-exercise-list-from-detail-btn');
    const setFor1RMSelect = document.getElementById('set-for-1rm-select');
    const calculate1RMBtn = document.getElementById('calculate-1rm-btn');
    const calculated1RMResultEl = document.getElementById('calculated-1rm-result');
    const toggleHistoryViewBtn = document.getElementById('toggle-history-view-btn');

    // Profile section DOM elements
    const profileUsernameInput = document.getElementById('profile-username');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const profileFeedbackDiv = document.getElementById('profile-feedback');
    const newPasswordInput = document.getElementById('profile-new-password');
    const confirmPasswordInput = document.getElementById('profile-confirm-password');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const passwordFeedbackDiv = document.getElementById('password-feedback');
    const newEmailInput = document.getElementById('profile-new-email');
    const changeEmailBtn = document.getElementById('change-email-btn');
    const emailFeedbackDiv = document.getElementById('email-feedback');


    let currentSessionId = null;
    let currentExerciseId = null;
    let currentViewingExerciseName = null;
    let currentUser = null; // Holds user object from Supabase, including profile data after load
    let currentView = 'sessionList'; // To track the current active view for session storage
    let appInitializedOnce = false; // Flag to prevent re-initialization issues
    let detailedHistoryViewMode = 'lastDay'; // 'lastDay' or 'allHistory'

    // --- View State Persistence ---
    function saveViewState() {
        if (!currentUser) return; // Don't save view state if logged out
        try {
            const viewState = {
                currentSessionId,
                currentExerciseId,
                currentViewingExerciseName,
                currentView
            };
            sessionStorage.setItem('gymTrackerViewState', JSON.stringify(viewState));
            console.log("View state saved:", viewState);
        } catch (e) {
            console.error("Error saving view state to sessionStorage:", e);
        }
    }

    function loadAndRestoreViewState() {
        if (!currentUser) return null; // Don't load if no user
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

    function clearViewState() {
        sessionStorage.removeItem('gymTrackerViewState');
        console.log("View state cleared from sessionStorage.");
        // Reset global state variables to default when view state is cleared (e.g., on logout or explicit navigation to home)
        currentSessionId = null;
        currentExerciseId = null;
        currentViewingExerciseName = null;
        currentView = 'sessionList';
    }


    // --- Supabase Data Functions ---

    async function loadData() {
        if (!currentUser) {
            console.log("loadData: No current user, clearing gymData.");
            gymData = { sessions: [], bodyWeightLog: [] };
            renderSessions(); // Clear UI
            renderBodyWeightHistory(); // Clear UI
            return;
        }
        console.log("loadData: Loading data for user:", currentUser.id);
        showFeedback("Loading data...", false);

        try {
            // Fetch sessions with nested exercises and sets
            const { data: sessionsData, error: sessionsError } = await supabaseClient
                .from('sessions')
                .select(`
                    id,
                    name,
                    date,
                    sort_order,
                    exercises (
                        id,
                        session_id,
                        name,
                        notes,
                        sort_order,
                        sets (
                            id,
                            exercise_id,
                            weight,
                            reps,
                            timestamp,
                            notes
                        )
                    )
                `)
                .eq('user_id', currentUser.id)
                .order('sort_order', { ascending: true })
                .order('sort_order', { foreignTable: 'exercises', ascending: true })
                .order('timestamp', { foreignTable: 'exercises.sets', ascending: true });

            if (sessionsError) throw sessionsError;

            sessionsData.forEach(session => {
                if (!session.exercises) session.exercises = []; // Ensure exercises array exists
                session.exercises.forEach(exercise => {
                    if(!exercise.sets) exercise.sets = []; // Ensure sets array exists
                    exercise.sets.forEach(set => {
                        if (typeof set.timestamp === 'string') {
                            set.timestamp = new Date(set.timestamp); // Convert timestamp string to Date object
                        }
                    });
                });
            });

            gymData.sessions = sessionsData || [];

            // Fetch body weight logs
            const { data: bodyWeightData, error: bodyWeightError } = await supabaseClient
                .from('body_weight_log')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('date', { ascending: false });

            if (bodyWeightError) throw bodyWeightError;
            gymData.bodyWeightLog = bodyWeightData || [];

            console.log("Data loaded from Supabase:", JSON.parse(JSON.stringify(gymData)));
            showFeedback("Data loaded successfully!", false);
        } catch (error) {
            console.error("Error loading data from Supabase:", error);
            showFeedback(`Error loading data: ${error.message}`, true);
            gymData = { sessions: [], bodyWeightLog: [] }; // Fallback to empty
        }
        // After loading, refresh relevant parts of the UI
        renderSessions();
        renderBodyWeightHistory();
        // If analysis tab is active, refresh it
        if (analysisSection.style.display === 'block') {
            populateExerciseSelect();
            handleAnalysisTypeChange();
        }
    }

    // --- Render Body Weight Functions ---
    function renderBodyWeightHistory() {
        bodyWeightHistoryDiv.innerHTML = '';
        if (!gymData.bodyWeightLog || gymData.bodyWeightLog.length === 0) {
            bodyWeightHistoryDiv.innerHTML = '<p class="empty-state-message">No body weight entries yet. Add one above.</p>';
            return;
        }
        const sortedLog = [...gymData.bodyWeightLog].sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'));
        const list = document.createElement('ul');
        list.className = 'styled-list';
        sortedLog.forEach(entry => {
            const listItem = document.createElement('li');
            listItem.className = 'list-item body-weight-item';

            // Store original text content structure if needed, or just the parts
            const displayDateStr = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const originalWeight = entry.weight;

            const textSpan = document.createElement('span');
            textSpan.className = 'bw-details-span'; // Class to easily find it
            textSpan.textContent = `${displayDateStr} - ${originalWeight} kg`;
            listItem.appendChild(textSpan);

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'delete-btn button-danger';
            deleteBtn.title = `Delete entry: ${displayDateStr}`;
            deleteBtn.onclick = () => deleteBodyWeightEntry(entry.id);

            const editBtn = document.createElement('button');
            editBtn.innerHTML = '&#9998;'; // Pencil icon
            editBtn.className = 'edit-bw-date-btn button-secondary button-small';
            editBtn.title = `Edit date for entry on ${displayDateStr}`;
            editBtn.style.marginLeft = '5px';
            editBtn.onclick = (e) => {
                e.stopPropagation();
                showBodyWeightDateEditUI(listItem, entry);
            };

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'bw-item-actions';
            buttonGroup.appendChild(editBtn);
            buttonGroup.appendChild(deleteBtn);
            listItem.appendChild(buttonGroup);

            list.appendChild(listItem);
        });
        bodyWeightHistoryDiv.appendChild(list);
    }

    function displayBodyWeightProgress() {
        if (progressChart) progressChart.destroy();
        document.getElementById('progress-chart-container').style.display = 'block';
        document.getElementById('raw-data-container').style.display = 'block';

        if (!gymData.bodyWeightLog || gymData.bodyWeightLog.length === 0) {
            rawDataOutput.textContent = "No body weight data recorded yet.";
            progressChart = new Chart(progressChartCanvas, {
                type: 'line', data: { labels: [], datasets: []},
                options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Body Weight Progress - No Data', color: '#f4f4f4'}}}
            });
            return;
        }
        const sortedLog = [...gymData.bodyWeightLog].sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));
        const labels = sortedLog.map(entry => new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }));
        const weightData = sortedLog.map(entry => entry.weight);
        rawDataOutput.textContent = JSON.stringify(sortedLog.map(e => ({date: e.date, weight: e.weight})), null, 2);
        progressChart = new Chart(progressChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Body Weight (kg)', data: weightData, borderColor: 'rgb(153, 102, 255)',
                    backgroundColor: 'rgba(153, 102, 255, 0.5)', fill: false, tension: 0.1
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { display: true, title: { display: true, text: 'Date', color: '#f4f4f4' }, ticks: { color: '#ccc' } },
                    y: { display: true, title: { display: true, text: 'Weight (kg)', color: '#f4f4f4' }, ticks: { color: '#ccc' } }
                },
                plugins: {
                    legend: { labels: { color: '#f4f4f4' } },
                    tooltip: { titleColor: '#fff', bodyColor: '#ddd', backgroundColor: 'rgba(0,0,0,0.8)' },
                    title: { display: true, text: 'Body Weight Over Time', color: '#f4f4f4', font: {size: 16}}
                }
            }
        });
    }

    if (changeEmailBtn) {
        changeEmailBtn.addEventListener('click', async () => {
            const newEmail = newEmailInput.value.trim();
            emailFeedbackDiv.style.display = 'none'; // Clear previous feedback

            if (!newEmail) {
                showFeedback("Please enter the new email address.", true, emailFeedbackDiv);
                return;
            }
            // Basic email validation regex
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(newEmail)) {
                showFeedback("Please enter a valid email address.", true, emailFeedbackDiv);
                return;
            }
            if (currentUser && newEmail === currentUser.email) {
                showFeedback("The new email address is the same as your current one.", true, emailFeedbackDiv);
                return;
            }

            showFeedback("Requesting email change...", false, emailFeedbackDiv);
            try {
                const { data, error } = await supabaseClient.auth.updateUser({ email: newEmail });
                if (error) throw error;

                // data for updateUser when changing email is often null or just contains the user,
                // the important part is the side effect of sending emails.
                showFeedback(
                    "Email change request initiated. Please check your OLD email address to confirm this change, " +
                    "and then check your NEW email address to verify it. Your email will update after verification.",
                    false,
                    emailFeedbackDiv
                );
                newEmailInput.value = '';
            } catch (error) {
                console.error("Error requesting email change:", error);
                showFeedback(`Error: ${error.message}`, true, emailFeedbackDiv);
            }
        });
    }

    // --- Render Functions (Sessions, Exercises, Sets) ---
    // These functions will now primarily use the `gymData` object,
    // which is populated by `loadData` from Supabase.
    // The actual Supabase calls for ADD, UPDATE, DELETE will be in their respective handlers.

    function renderSessions() {
        sessionListDiv.innerHTML = '';
        if (!gymData.sessions || gymData.sessions.length === 0) {
            sessionListDiv.innerHTML = '<p class="empty-state-message">No sessions created yet. Add one below!</p>';
            return;
        }
        const sortedSessions = [...gymData.sessions].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        sortedSessions.forEach(session => {
            const sessionItemContainer = document.createElement('div');
            sessionItemContainer.className = 'list-item-container';
            sessionItemContainer.draggable = true;
            sessionItemContainer.dataset.sessionIdForDrag = session.id;

            const button = document.createElement('button');
            button.className = 'session-item button';
            button.textContent = session.name;
            button.dataset.sessionId = session.id;
            button.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) return;
                currentSessionId = session.id; // Supabase ID is BIGINT, JS handles large numbers
                // currentViewingExerciseName and currentExerciseId are reset in showExerciseView if not restoring
                renderExercisesForSession(session.id);
                showExerciseView(); // This will call saveViewState
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'delete-btn button-danger';
            deleteBtn.title = `Delete session: ${session.name}`;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSession(session.id); // Will be updated for Supabase
            });

            const renameBtn = document.createElement('button');
            renameBtn.textContent = 'Rename';
            renameBtn.className = 'rename-btn button-secondary'; // Add appropriate class
            renameBtn.style.marginLeft = '5px'; // Add some spacing
            renameBtn.title = `Rename session: ${session.name}`;
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Prevent drag from starting if clicking rename
                if (sessionItemContainer.draggable) {
                    sessionItemContainer.draggable = false;
                    setTimeout(() => sessionItemContainer.draggable = true, 100); // Re-enable after click processes
                }
                handleRenameSession(session.id, sessionItemContainer, button);
            });

            sessionItemContainer.appendChild(button);
            sessionItemContainer.appendChild(renameBtn);
            sessionItemContainer.appendChild(deleteBtn);
            sessionItemContainer.addEventListener('dragstart', handleDragStartSession);
            sessionItemContainer.addEventListener('dragover', handleDragOverSession);
            sessionItemContainer.addEventListener('dragleave', handleDragLeaveSession);
            sessionItemContainer.addEventListener('drop', handleDropSession);
            sessionItemContainer.addEventListener('dragend', handleDragEndSession);
            sessionListDiv.appendChild(sessionItemContainer);
        });
    }

    let draggedSessionId = null;
    function handleDragStartSession(e) {
        draggedSessionId = this.dataset.sessionIdForDrag;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedSessionId);
        this.classList.add('dragging-session');
    }
    function handleDragOverSession(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.classList.add('drag-over-session');
        return false;
    }
    function handleDragLeaveSession() {
        this.classList.remove('drag-over-session');
    }
    async function handleDropSession(e) {
        e.preventDefault();
        e.stopPropagation();
        const targetSessionId = this.dataset.sessionIdForDrag;
        this.classList.remove('drag-over-session');
        if (draggedSessionId === targetSessionId) return;

        const draggedDbId = parseInt(draggedSessionId);
        const targetDbId = parseInt(targetSessionId);

        const draggedIndex = gymData.sessions.findIndex(s => s.id === draggedDbId);
        let targetIndex = gymData.sessions.findIndex(s => s.id === targetDbId);
        if (draggedIndex === -1 || targetIndex === -1) return;

        const [draggedItem] = gymData.sessions.splice(draggedIndex, 1);
        const targetSessionAfterSplice = gymData.sessions.find(s => s.id === targetDbId);
        let newTargetIndex;
        if (!targetSessionAfterSplice) {
            gymData.sessions.push(draggedItem);
            newTargetIndex = gymData.sessions.length -1;
        } else {
            newTargetIndex = gymData.sessions.indexOf(targetSessionAfterSplice);
            const rect = this.getBoundingClientRect();
            const verticalMidpoint = rect.top + rect.height / 2;
            if (e.clientY < verticalMidpoint) {
                gymData.sessions.splice(newTargetIndex, 0, draggedItem);
            } else {
                gymData.sessions.splice(newTargetIndex + 1, 0, draggedItem);
                newTargetIndex++;
            }
        }

        // Update sort_order for all sessions in gymData
        gymData.sessions.forEach((session, index) => {
            session.sort_order = index;
        });

        // Batch update sort_order in Supabase
        const updates = gymData.sessions.map(session => ({
            id: session.id,
            user_id: currentUser.id, // RLS check
            sort_order: session.sort_order
        }));

        try {
            const { error } = await supabaseClient.from('sessions').upsert(updates, { onConflict: 'id' });
            if (error) throw error;
            console.log("Sessions reordered and saved to Supabase.");
            renderSessions(); // Re-render from updated gymData
        } catch (error) {
            console.error("Failed to save reordered sessions to Supabase:", error);
            showFeedback("Error saving new session order.", true);
            // Consider reverting gymData or reloading from Supabase on error
            await loadData(); // Reload to ensure consistency
        }
        draggedSessionId = null;
    }
    function handleDragEndSession() {
        this.classList.remove('dragging-session');
        document.querySelectorAll('.list-item-container.drag-over-session').forEach(item => item.classList.remove('drag-over-session'));
    }

    // --- Rename Session Logic ---
    function handleRenameSession(sessionId, sessionItemContainer, sessionButtonElement) {
        const session = gymData.sessions.find(s => s.id === sessionId);
        if (!session) return;

        // Temporarily disable drag if it's on the container
        const wasDraggable = sessionItemContainer.draggable;
        sessionItemContainer.draggable = false;

        const originalName = session.name;
        const originalButtonContent = sessionButtonElement.textContent; // Or however you store the name visually

        // Hide original session button and rename/delete buttons for this item
        sessionButtonElement.style.display = 'none';
        sessionItemContainer.querySelectorAll('.rename-btn, .delete-btn').forEach(btn => btn.style.display = 'none');

        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalName;
        input.className = 'rename-input'; // For styling
        input.style.flexGrow = '1';
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveSessionName(sessionId, input, sessionItemContainer, sessionButtonElement, wasDraggable);
            } else if (e.key === 'Escape') {
                cancelRenameSession(originalName, sessionItemContainer, sessionButtonElement, wasDraggable);
            }
        });

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'button-primary';
        saveBtn.style.marginLeft = '5px';
        saveBtn.onclick = () => saveSessionName(sessionId, input, sessionItemContainer, sessionButtonElement, wasDraggable);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'button-secondary';
        cancelBtn.style.marginLeft = '5px';
        cancelBtn.onclick = () => cancelRenameSession(originalName, sessionItemContainer, sessionButtonElement, wasDraggable);

        // Insert input and new buttons. Prepend to keep them before any drag handles or other fixed elements if structure is complex.
        // Assuming sessionButtonElement is the first significant child used for display.
        sessionItemContainer.insertBefore(cancelBtn, sessionButtonElement); // Insert cancel before input
        sessionItemContainer.insertBefore(saveBtn, cancelBtn);       // Insert save before cancel
        sessionItemContainer.insertBefore(input, saveBtn);           // Insert input before save

        input.focus();
        input.select();
    }

    async function saveSessionName(sessionId, inputElement, sessionItemContainer, sessionButtonElement, wasDraggable) {
        const newName = inputElement.value.trim();
        const session = gymData.sessions.find(s => s.id === sessionId);

        if (!session) {
            showFeedback("Error: Session not found.", true);
            renderSessions(); // Or a more targeted revert
            return;
        }
        const originalName = session.name;

        if (!newName) {
            showFeedback("Session name cannot be empty.", true);
            inputElement.value = originalName; // Revert input to original
            inputElement.focus();
            return;
        }

        if (newName === originalName) { // No change
            cancelRenameSession(originalName, sessionItemContainer, sessionButtonElement, wasDraggable); // Just revert UI
            return;
        }

        showFeedback("Saving new session name...", false);
        try {
            const { error } = await supabaseClient
                .from('sessions')
                .update({ name: newName, updated_at: new Date().toISOString() })
                .eq('id', sessionId)
                .eq('user_id', currentUser.id);

            if (error) throw error;

            session.name = newName; // Update local data
            showFeedback("Session name updated!", false);
        } catch (error) {
            console.error("Error updating session name:", error);
            showFeedback(`Error: ${error.message}`, true);
            // No need to revert inputElement.value, let cancelRenameSession handle UI full restoration
        } finally {
            // Always restore UI, even if save failed, to show original or reflect change
            renderSessions(); // Simplest way to restore everything correctly
            // Re-enable drag if it was originally enabled
            // This will be handled by renderSessions creating new elements.
            // If we were manipulating the existing sessionItemContainer directly:
            // if (wasDraggable) sessionItemContainer.draggable = true;
        }
    }

    function cancelRenameSession(originalName, sessionItemContainer, sessionButtonElement, wasDraggable) {
        // This function might be simplified if renderSessions() is called,
        // as it will rebuild the item. The main purpose here is to remove the input field.
        sessionItemContainer.querySelectorAll('.rename-input, .button-primary, .button-secondary').forEach(el => {
            if (el.classList.contains('rename-input') || el.textContent === 'Save' || el.textContent === 'Cancel') {
                el.remove();
            }
        });
        sessionButtonElement.style.display = ''; // Restore original button
        sessionButtonElement.textContent = originalName; // Ensure it has the correct name if save failed or was cancelled
        sessionItemContainer.querySelectorAll('.rename-btn, .delete-btn').forEach(btn => btn.style.display = ''); // Restore original buttons

        // Re-enable drag if it was originally enabled
        if (wasDraggable) {
            sessionItemContainer.draggable = true;
        }
        // Optionally, could call renderSessions() for a full refresh if easier
        renderSessions();
    }


    function renderExercisesForSession(sessionId) {
        const session = gymData.sessions.find(s => s.id === sessionId);
        if (!session) {
            console.error("Session not found for ID (renderExercises):", sessionId);
            showSessionListView(); return;
        }
        currentSessionTitle.textContent = `Exercises for: ${session.name}`;
        exerciseListDiv.innerHTML = '';
        if (!session.exercises || session.exercises.length === 0) {
            exerciseListDiv.innerHTML = '<p class="empty-state-message">No exercises added. Add one below.</p>';
            return;
        }
        const sortedExercises = [...session.exercises].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        sortedExercises.forEach(exercise => {
            const exerciseItemContainer = document.createElement('div');
            exerciseItemContainer.className = 'list-item-container exercise-drag-item';
            exerciseItemContainer.draggable = true;
            exerciseItemContainer.dataset.exerciseIdForDrag = exercise.id;
            exerciseItemContainer.dataset.parentSessionId = sessionId;

            const button = document.createElement('button');
            button.className = 'exercise-item button';
            button.textContent = exercise.name;
            button.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) return;
                currentViewingExerciseName = exercise.name;
                currentExerciseId = exercise.id; // Supabase ID
                renderDetailedExerciseView(exercise.name);
                showDetailedExerciseView(); // This will call saveViewState
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'delete-btn button-danger';
            deleteBtn.title = `Delete exercise: ${exercise.name}`;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteExercise(sessionId, exercise.id); // Will be updated for Supabase
            });

            const renameBtn = document.createElement('button');
            renameBtn.textContent = 'Rename';
            renameBtn.className = 'rename-btn button-secondary';
            renameBtn.style.marginLeft = '5px';
            renameBtn.title = `Rename exercise: ${exercise.name}`;
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (exerciseItemContainer.draggable) { // Prevent drag
                    exerciseItemContainer.draggable = false;
                    setTimeout(() => exerciseItemContainer.draggable = true, 100);
                }
                handleRenameExercise(sessionId, exercise.id, exerciseItemContainer, button);
            });

            exerciseItemContainer.appendChild(button);
            exerciseItemContainer.appendChild(renameBtn);
            exerciseItemContainer.appendChild(deleteBtn);
            exerciseItemContainer.addEventListener('dragstart', handleDragStartExercise);
            exerciseItemContainer.addEventListener('dragover', handleDragOverExercise);
            exerciseItemContainer.addEventListener('dragleave', handleDragLeaveExercise);
            exerciseItemContainer.addEventListener('drop', handleDropExercise);
            exerciseItemContainer.addEventListener('dragend', handleDragEndExercise);
            exerciseListDiv.appendChild(exerciseItemContainer);
        });
    }

    let draggedExerciseId = null;
    let sourceSessionIdForExerciseDrag = null;
    function handleDragStartExercise(e) {
        draggedExerciseId = this.dataset.exerciseIdForDrag;
        sourceSessionIdForExerciseDrag = this.dataset.parentSessionId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedExerciseId);
        this.classList.add('dragging-exercise');
    }
    function handleDragOverExercise(e) {
        e.preventDefault();
        if (this.dataset.parentSessionId === sourceSessionIdForExerciseDrag) {
            e.dataTransfer.dropEffect = 'move';
            this.classList.add('drag-over-exercise');
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
        return false;
    }
    function handleDragLeaveExercise() {
        this.classList.remove('drag-over-exercise');
    }
    async function handleDropExercise(e) {
        e.preventDefault();
        e.stopPropagation();
        const targetExerciseId = this.dataset.exerciseIdForDrag;
        const parentSessionId = this.dataset.parentSessionId; // This is the ID of the session the exercises belong to
        this.classList.remove('drag-over-exercise');

        if (draggedExerciseId === targetExerciseId || parentSessionId !== sourceSessionIdForExerciseDrag) return;

        const sessionDbId = parseInt(parentSessionId);
        const session = gymData.sessions.find(s => s.id === sessionDbId);
        if (!session || !session.exercises) {
            console.error("Parent session or its exercises not found for exercise drop.");
            return;
        }

        const draggedDbId = parseInt(draggedExerciseId);
        const targetDbId = parseInt(targetExerciseId);

        const draggedIndex = session.exercises.findIndex(ex => ex.id === draggedDbId);
        let targetIndex = session.exercises.findIndex(ex => ex.id === targetDbId);
        if (draggedIndex === -1 || targetIndex === -1) return;

        const [draggedItem] = session.exercises.splice(draggedIndex, 1);

        const targetExerciseAfterSplice = session.exercises.find(ex => ex.id === targetDbId);
        let newTargetIndex;

        if (!targetExerciseAfterSplice) { // Target was the only other item or list is now empty
             session.exercises.push(draggedItem);
             newTargetIndex = session.exercises.length -1;
        } else {
            newTargetIndex = session.exercises.indexOf(targetExerciseAfterSplice);
            const rect = this.getBoundingClientRect();
            const verticalMidpoint = rect.top + rect.height / 2;
            if (e.clientY < verticalMidpoint) {
                session.exercises.splice(newTargetIndex, 0, draggedItem);
            } else {
                session.exercises.splice(newTargetIndex + 1, 0, draggedItem);
                newTargetIndex++;
            }
        }

        session.exercises.forEach((ex, index) => {
            ex.sort_order = index;
        });

        const updates = session.exercises.map(ex => ({
            id: ex.id,
            user_id: currentUser.id, // RLS check
            session_id: session.id,  // RLS check
            sort_order: ex.sort_order
        }));

        try {
            const { error } = await supabaseClient.from('exercises').upsert(updates, { onConflict: 'id' });
            if (error) throw error;
            console.log("Exercises reordered within session and saved to Supabase.");
            renderExercisesForSession(sessionDbId);
        } catch (error) {
            console.error("Failed to save reordered exercises to Supabase:", error);
            showFeedback("Error saving new exercise order.", true);
            await loadData(); // Reload to ensure consistency
        }
        draggedExerciseId = null;
        sourceSessionIdForExerciseDrag = null;
    }
    function handleDragEndExercise() {
        this.classList.remove('dragging-exercise');
        document.querySelectorAll('.exercise-drag-item.drag-over-exercise').forEach(item => item.classList.remove('drag-over-exercise'));
    }

    // --- Rename Exercise Logic ---
    function handleRenameExercise(sessionId, exerciseId, exerciseItemContainer, exerciseButtonElement) {
        const session = gymData.sessions.find(s => s.id === sessionId);
        if (!session) return;
        const exercise = session.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return;

        const wasDraggable = exerciseItemContainer.draggable;
        exerciseItemContainer.draggable = false;

        const originalName = exercise.name;

        exerciseButtonElement.style.display = 'none';
        exerciseItemContainer.querySelectorAll('.rename-btn, .delete-btn').forEach(btn => btn.style.display = 'none');

        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalName;
        input.className = 'rename-input';
        input.style.flexGrow = '1';
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveExerciseName(sessionId, exerciseId, input, exerciseItemContainer, exerciseButtonElement, wasDraggable);
            } else if (e.key === 'Escape') {
                cancelRenameExercise(originalName, exerciseItemContainer, exerciseButtonElement, wasDraggable);
            }
        });

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'button-primary';
        saveBtn.style.marginLeft = '5px';
        saveBtn.onclick = () => saveExerciseName(sessionId, exerciseId, input, exerciseItemContainer, exerciseButtonElement, wasDraggable);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'button-secondary';
        cancelBtn.style.marginLeft = '5px';
        cancelBtn.onclick = () => cancelRenameExercise(originalName, exerciseItemContainer, exerciseButtonElement, wasDraggable);

        exerciseItemContainer.insertBefore(cancelBtn, exerciseButtonElement);
        exerciseItemContainer.insertBefore(saveBtn, cancelBtn);
        exerciseItemContainer.insertBefore(input, saveBtn);

        input.focus();
        input.select();
    }

    async function saveExerciseName(sessionId, exerciseId, inputElement, exerciseItemContainer, exerciseButtonElement, wasDraggable) {
        const newName = inputElement.value.trim();
        const session = gymData.sessions.find(s => s.id === sessionId);
        if (!session) { showFeedback("Error: Session not found.", true); renderExercisesForSession(currentSessionId); return; }
        const exercise = session.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) { showFeedback("Error: Exercise not found.", true); renderExercisesForSession(currentSessionId); return; }

        const originalName = exercise.name;

        if (!newName) {
            showFeedback("Exercise name cannot be empty.", true);
            inputElement.value = originalName;
            inputElement.focus();
            return;
        }

        if (newName === originalName) {
            cancelRenameExercise(originalName, exerciseItemContainer, exerciseButtonElement, wasDraggable);
            return;
        }

        showFeedback("Saving new exercise name...", false);
        try {
            const { error } = await supabaseClient
                .from('exercises')
                .update({ name: newName, updated_at: new Date().toISOString() })
                .eq('id', exerciseId)
                .eq('user_id', currentUser.id) // Ensure user owns the exercise's session
                .eq('session_id', sessionId);


            if (error) throw error;

            exercise.name = newName; // Update local data
            showFeedback("Exercise name updated!", false);
            // If this exercise was being viewed in detailed view, update title there
            if (detailedExerciseViewContainer.style.display === 'block' && currentExerciseId === exerciseId) {
                detailedExerciseNameEl.textContent = newName;
                currentViewingExerciseName = newName; // Update global state if it was this one
                saveViewState(); // Save updated name
            }
            // If this exercise name is present in analysis selection, update it there too
            populateExerciseSelect(); // This will refresh the list in analysis tab
            // Consider if the currently selected analysis exercise needs to be re-evaluated

        } catch (error) {
            console.error("Error updating exercise name:", error);
            showFeedback(`Error: ${error.message}`, true);
        } finally {
            renderExercisesForSession(sessionId); // Re-render the list for this session
            // Drag state will be reset by renderExercisesForSession
        }
    }

    function cancelRenameExercise(originalName, exerciseItemContainer, exerciseButtonElement, wasDraggable) {
        // Simplified: just re-render the exercises for the current session
        renderExercisesForSession(currentSessionId);
        // Drag state will be reset by renderExercisesForSession
    }

    // --- Helper to find the absolute last performed set details for an exercise name ---
    function findLastPerformedSetDetails(exerciseName) {
        let allSetsForThisExerciseName = [];
        gymData.sessions.forEach(session => {
            session.exercises.forEach(ex => {
                if (ex.name === exerciseName && ex.sets && ex.sets.length > 0) {
                    // Add session date to each set for sorting if timestamps are too close or missing
                    // However, set.timestamp should be preferred and reliable
                    ex.sets.forEach(s => allSetsForThisExerciseName.push({
                        ...s,
                        // Ensure timestamp is a Date object for reliable comparison
                        timestamp: typeof s.timestamp === 'string' ? new Date(s.timestamp) : s.timestamp
                    }));
                }
            });
        });

        if (allSetsForThisExerciseName.length === 0) {
            return null;
        }

        // Sort by timestamp, most recent first
        allSetsForThisExerciseName.sort((a, b) => b.timestamp - a.timestamp);
        return allSetsForThisExerciseName[0]; // Return the most recent set's details
    }

    function renderSetsForExercise(sessionId, exerciseId) {
        const session = gymData.sessions.find(s => s.id === sessionId);
        if (!session) return;
        const exercise = session.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return;

        currentExerciseTitleSet.textContent = `Tracking: ${exercise.name}`;
        setsListDiv.innerHTML = '';

        // Update placeholders based on the absolute last time this exercise name was performed
        const lastOverallSetDetails = findLastPerformedSetDetails(exercise.name);
        if (lastOverallSetDetails) {
            setWeightInput.placeholder = `Last overall: ${lastOverallSetDetails.weight} kg`;
            setRepsInput.placeholder = `Last overall: ${lastOverallSetDetails.reps} reps`;
        } else {
            setWeightInput.placeholder = "Weight (kg)";
            setRepsInput.placeholder = "Reps";
        }
        setWeightInput.value = ''; // Clear any previous input values
        setRepsInput.value = '';

        // Display sets for the CURRENT exercise instance
        if (!exercise.sets || exercise.sets.length === 0) {
            setsListDiv.innerHTML = '<p class="empty-state-message">No sets recorded for this instance. Add one below.</p>';
            // Placeholders are already set above
            return;
        }

        // Sort sets for the current instance by timestamp (creation time)
        const sortedSetsCurrentInstance = [...exercise.sets].sort((a,b) => {
            const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp) : a.timestamp;
            const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp) : b.timestamp;
            return timeA - timeB;
        });

        sortedSetsCurrentInstance.forEach((set, index) => {
            const setItemContainer = document.createElement('div');
            setItemContainer.className = 'set-item';
            const setDetails = document.createElement('span');
            const setTime = set.timestamp instanceof Date ? set.timestamp : new Date(set.timestamp);
            const formattedTimestamp = `${setTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} ${setTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            setDetails.textContent = `Set ${index + 1} (${formattedTimestamp}): ${set.weight} kg x ${set.reps} reps`;
            if(set.notes) setDetails.textContent += ` (${set.notes})`;

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'delete-btn button-danger';
            deleteBtn.title = `Delete Set ${index + 1}`;
            deleteBtn.addEventListener('click', () => {
                deleteSet(sessionId, exerciseId, set.id);
            });

            const editDateBtn = document.createElement('button');
            editDateBtn.innerHTML = '&#9998;'; // Pencil icon for edit
            editDateBtn.className = 'edit-set-date-btn button-secondary button-small';
            editDateBtn.title = `Edit Date/Time for Set ${index + 1}`;
            // editDateBtn.style.marginLeft = "5px";
            // editDateBtn.addEventListener('click', (e) => {
            //     e.stopPropagation(); // Prevent any parent handlers
            //     // Pass the container, the set object, and context IDs
            //     showSetTimestampEditUI(setItemContainer, set, sessionId, exerciseId);
            // });

            // const buttonGroup = document.createElement('div');
            // buttonGroup.className = 'set-item-actions'; // For styling if needed
            // buttonGroup.appendChild(editDateBtn);
            // buttonGroup.appendChild(deleteBtn);

            // setItemContainer.appendChild(setDetails);
            // setItemContainer.appendChild(buttonGroup);
            // setsListDiv.appendChild(setItemContainer);

            // Simplified: only delete button for now per rollback
            setItemContainer.appendChild(setDetails);
            setItemContainer.appendChild(deleteBtn); // Directly append deleteBtn
            setsListDiv.appendChild(setItemContainer);
        });
        // Placeholders are handled by findLastPerformedSetDetails earlier in the function
    }

    // --- Edit Body Weight Date Logic ---
    function showBodyWeightDateEditUI(entryItemContainer, entry) {
        const detailsSpan = entryItemContainer.querySelector('.bw-details-span');
        const actionsDiv = entryItemContainer.querySelector('.bw-item-actions');
        if (detailsSpan) detailsSpan.style.display = 'none';
        if (actionsDiv) actionsDiv.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'date';
        input.value = entry.date; // Supabase stores date as YYYY-MM-DD, compatible with input type="date"
        input.className = 'edit-bw-date-input';
        input.style.marginRight = '5px';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'button-primary button-small';
        saveBtn.onclick = async () => {
            await saveBodyWeightLogDate(entry.id, input.value);
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'button-secondary button-small';
        cancelBtn.style.marginLeft = '5px';
        cancelBtn.onclick = () => {
            if (detailsSpan) detailsSpan.style.display = '';
            if (actionsDiv) actionsDiv.style.display = '';
            input.remove();
            saveBtn.remove();
            cancelBtn.remove();
        };

        entryItemContainer.appendChild(input);
        entryItemContainer.appendChild(saveBtn);
        entryItemContainer.appendChild(cancelBtn);
        input.focus();
    }

    async function saveBodyWeightLogDate(entryId, newDateString) {
        if (!currentUser) { showFeedback("You must be logged in.", true); return; }
        if (!newDateString) {
            showFeedback("Date cannot be empty.", true);
            renderBodyWeightHistory(); // Refresh to clear bad state
            return;
        }
        // Optional: Further validation if newDateString is a valid date format, though input type="date" helps.

        showFeedback("Updating body weight entry date...", false);
        try {
            const { error } = await supabaseClient
                .from('body_weight_log')
                .update({ date: newDateString, updated_at: new Date().toISOString() })
                .eq('id', entryId)
                .eq('user_id', currentUser.id);

            if (error) throw error;

            // Update local gymData
            const entry = gymData.bodyWeightLog.find(e => e.id === entryId);
            if (entry) {
                entry.date = newDateString;
            }
            showFeedback("Body weight entry date updated!", false);
        } catch (error) {
            console.error("Error updating body weight entry date:", error);
            showFeedback(`Error: ${error.message}`, true);
        } finally {
            renderBodyWeightHistory(); // Refresh the list
        }
    }

    // formatDateTimeForInput might be useful later, so it's commented out instead of removed for now.
    /*
    function formatDateTimeForInput(date) {
        if (!(date instanceof Date)) {
            date = new Date(date); // Try to convert if it's a string
        }
        if (isNaN(date.getTime())) { // Invalid date
            console.error("Invalid date provided to formatDateTimeForInput:", date);
            const now = new Date();
            return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        }
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    */

    // Removing showSetTimestampEditUI and saveSetTimestamp as per rollback
    // function showSetTimestampEditUI(setItemContainer, set, sessionId, exerciseId) { ... }
    // async function saveSetTimestamp(sessionId, exerciseId, setId, newTimestampISO) { ... }

    // --- Chart Data Aggregation Helper ---
    function calculateDailyVolume(setsArray) {
        if (!setsArray || setsArray.length === 0) {
            return [];
        }

        const dailyData = {}; // Use an object for easy aggregation by date key

        setsArray.forEach(set => {
            const setTimestamp = set.timestamp instanceof Date ? set.timestamp : new Date(set.timestamp);
            if (isNaN(setTimestamp.getTime())) return; // Skip invalid timestamps

            // Create a YYYY-MM-DD key for grouping by day in local timezone
            const dateKey = `${setTimestamp.getFullYear()}-${(setTimestamp.getMonth() + 1).toString().padStart(2, '0')}-${setTimestamp.getDate().toString().padStart(2, '0')}`;

            const volume = (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    date: dateKey, // Store the original YYYY-MM-DD key for sorting
                    displayDate: setTimestamp.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }),
                    totalVolume: 0,
                    // Could also store count of sets or other daily aggregates here if needed later
                };
            }
            dailyData[dateKey].totalVolume += volume;
        });

        // Convert object to array and sort by date
        const aggregatedArray = Object.values(dailyData);
        aggregatedArray.sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by YYYY-MM-DD

        return aggregatedArray;
    }


    // --- UI Navigation Functions ---
    function showSessionListView(isRestoring = false) {
        sessionListDiv.style.display = 'block';
        sessionViewControls.style.display = 'flex';
        exerciseViewContainer.style.display = 'none';
        setTrackerContainer.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'none';

        if (!isRestoring) { // Only reset context if not restoring a specific state
            currentSessionId = null;
            currentExerciseId = null;
            currentViewingExerciseName = null;
            clearViewState(); // Clear stored state when explicitly going to session list
        }
        currentView = 'sessionList';
        saveViewState();
    }
    function showExerciseView(isRestoring = false) {
        sessionListDiv.style.display = 'none';
        sessionViewControls.style.display = 'none';
        exerciseViewContainer.style.display = 'block';
        setTrackerContainer.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'none';
        if (!isRestoring) {
            currentExerciseId = null;
            currentViewingExerciseName = null;
        }
        currentView = 'exerciseView';
        saveViewState();
    }
    function showDetailedExerciseView() {
        exerciseViewContainer.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'block';
        setTrackerContainer.style.display = 'none';
        currentView = 'detailedExerciseView';
        saveViewState();
    }
    function showSetTracker() {
        exerciseViewContainer.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'none';
        setTrackerContainer.style.display = 'block';

        // Default the new set date input to today
        if (newSetDateInput) {
            newSetDateInput.valueAsDate = new Date();
        }

        currentView = 'setTracker';
        saveViewState();
    }

    // --- Deletion Functions (to be updated for Supabase) ---
    async function deleteSession(sessionIdToDelete) {
        if (!currentUser) { showFeedback("You must be logged in.", true); return; }
        if (confirm("Are you sure you want to delete this session and all its data? This action cannot be undone.")) {
            showFeedback("Deleting session...", false);
            try {
                const { error } = await supabaseClient.from('sessions').delete().eq('id', sessionIdToDelete).eq('user_id', currentUser.id);
                if (error) throw error;
                gymData.sessions = gymData.sessions.filter(session => session.id !== sessionIdToDelete);
                renderSessions();
                if (currentSessionId === sessionIdToDelete) {
                    showSessionListView(); // Go back if current session was deleted
                }
                showFeedback("Session deleted successfully.", false);
                populateExerciseSelect(); // Update analysis options
                handleAnalysisTypeChange();
            } catch (error) {
                console.error("Error deleting session from Supabase:", error);
                showFeedback(`Error deleting session: ${error.message}`, true);
            }
        }
    }
    async function deleteExercise(sessionIdOfExercise, exerciseIdToDelete) {
        if (!currentUser) { showFeedback("You must be logged in.", true); return; }
        if (confirm("Are you sure you want to delete this exercise and its sets? This action cannot be undone.")) {
            showFeedback("Deleting exercise...", false);
            try {
                const { error } = await supabaseClient.from('exercises').delete().eq('id', exerciseIdToDelete).eq('user_id', currentUser.id);
                if (error) throw error;

                const session = gymData.sessions.find(s => s.id === sessionIdOfExercise);
                if (session) {
                    session.exercises = session.exercises.filter(ex => ex.id !== exerciseIdToDelete);
                }
                renderExercisesForSession(sessionIdOfExercise);
                if (currentExerciseId === exerciseIdToDelete) { // If detailed view was for this exercise
                    showExerciseView(); // Go back to exercise list
                }
                showFeedback("Exercise deleted successfully.", false);
                populateExerciseSelect();
                handleAnalysisTypeChange();
            } catch (error) {
                console.error("Error deleting exercise from Supabase:", error);
                showFeedback(`Error deleting exercise: ${error.message}`, true);
            }
        }
    }
    async function deleteSet(sessionIdForSet, exerciseIdForSet, setIdToDelete) {
        if (!currentUser) { showFeedback("You must be logged in.", true); return; }
        showFeedback("Deleting set...", false);
        try {
            const { error } = await supabaseClient.from('sets').delete().eq('id', setIdToDelete).eq('user_id', currentUser.id);
            if (error) throw error;

            const session = gymData.sessions.find(s => s.id === sessionIdForSet);
            if (session) {
                const exercise = session.exercises.find(ex => ex.id === exerciseIdForSet);
                if (exercise) {
                    exercise.sets = exercise.sets.filter(set => set.id !== setIdToDelete);
                }
            }
            renderSetsForExercise(sessionIdForSet, exerciseIdForSet);
            showFeedback("Set deleted successfully.", false);
            // If analysis or detailed view is open, it might need refresh
            if (detailedExerciseViewContainer.style.display === 'block' && currentViewingExerciseName) {
                renderDetailedExerciseView(currentViewingExerciseName);
            }
            if (analysisSection.style.display === 'block') {
                 populateExerciseSelect(); handleAnalysisTypeChange();
            }
        } catch (error) {
            console.error("Error deleting set from Supabase:", error);
            showFeedback(`Error deleting set: ${error.message}`, true);
        }
    }
    async function deleteBodyWeightEntry(entryIdToDelete) {
        if (!currentUser) { showFeedback("You must be logged in.", true); return; }
        if (confirm("Are you sure you want to delete this body weight entry?")) {
            showFeedback("Deleting body weight entry...", false);
            try {
                const { error } = await supabaseClient.from('body_weight_log').delete().eq('id', entryIdToDelete).eq('user_id', currentUser.id);
                if (error) throw error;
                gymData.bodyWeightLog = gymData.bodyWeightLog.filter(entry => entry.id !== entryIdToDelete);
                renderBodyWeightHistory();
                showFeedback("Body weight entry deleted successfully.", false);
                if (analysisDataTypeSelect.value === 'bodyweight' && analysisSection.style.display === 'block') {
                    displayBodyWeightProgress();
                }
            } catch (error) {
                console.error("Error deleting body weight entry from Supabase:", error);
                showFeedback(`Error deleting body weight entry: ${error.message}`, true);
            }
        }
    }

    // --- Render Detailed Exercise View ---
    function renderDetailedExerciseView(exerciseName) {
        console.log("[renderDetailedExerciseView] START - Exercise:", exerciseName, "Mode:", detailedHistoryViewMode); // INTENSIVE DEBUG
        currentViewingExerciseName = exerciseName; // This is exercise.name
        detailedExerciseNameEl.textContent = exerciseName;
        detailedExerciseHistoryListEl.innerHTML = '';
        setFor1RMSelect.innerHTML = '<option value="">-- Choose a Set --</option>'; // Clear previous options
        calculated1RMResultEl.textContent = 'Estimated 1RM: -- kg';

        let allSetsForExerciseName = [];
        gymData.sessions.forEach(session => {
            session.exercises.forEach(ex => {
                if (ex.name === exerciseName) {
                    ex.sets.forEach(s => {
                        allSetsForExerciseName.push({
                            ...s, // contains s.id (set_id), s.exercise_id (original exercise instance id), weight, reps, timestamp
                            timestamp: typeof s.timestamp === 'string' ? new Date(s.timestamp) : s.timestamp,
                            sessionName: session.name, // Add session name for context
                            sessionDate: session.date // Add session date for context
                        });
                    });
                }
            });
        });

        // Sort all sets for this exercise NAME by timestamp, most recent first, to find the last performance
        allSetsForExerciseName.sort((a, b) => b.timestamp - a.timestamp);

        // INTENSIVE DEBUG: Log sample of allSetsForExerciseName
        if (allSetsForExerciseName.length > 0) {
            console.log("[renderDetailedExerciseView] Sample of allSetsForExerciseName (up to 5, most recent first):");
            allSetsForExerciseName.slice(0, 5).forEach(s => {
                console.log(`  Set ID: ${s.id}, Timestamp: ${s.timestamp.toISOString()}, Exercise ID (FK): ${s.exercise_id}`);
            });
        } else {
            console.log("[renderDetailedExerciseView] allSetsForExerciseName is empty.");
        }

        if (allSetsForExerciseName.length === 0) {
            detailedExerciseHistoryListEl.innerHTML = '<p class="empty-state-message">No history found for this exercise.</p>';
            document.getElementById('detailed-exercise-chart-container').style.display = 'none';
            if (detailedExerciseChart) detailedExerciseChart.destroy();
            toggleHistoryViewBtn.textContent = 'Show All History'; // Reset button
            detailedHistoryViewMode = 'lastInstance'; // Reset mode
            return;
        }

        detailedExerciseHistoryListEl.innerHTML = ''; // Clear previous items

        let setsToDisplayInList = [];
        if (detailedHistoryViewMode === 'lastDay') {
            toggleHistoryViewBtn.textContent = 'Show All History';
            if (allSetsForExerciseName.length > 0) {
                // allSetsForExerciseName is already sorted with the most recent set at index 0
                const mostRecentSetTimestamp = allSetsForExerciseName[0].timestamp;
                const targetDateStr = getYYYYMMDD(mostRecentSetTimestamp); // Use utility
                console.log(`[renderDetailedExerciseView - lastDay] Target date for filtering: ${targetDateStr}`);

                setsToDisplayInList = allSetsForExerciseName.filter(s => getYYYYMMDD(s.timestamp) === targetDateStr);
                // Sort the sets for the target day chronologically (oldest first) for display
                setsToDisplayInList.sort((a, b) => a.timestamp - b.timestamp);
                console.log(`[renderDetailedExerciseView - lastDay] Found ${setsToDisplayInList.length} sets for date ${targetDateStr}`);
            }
        } else { // 'allHistory'
            toggleHistoryViewBtn.textContent = 'Show Last Day Only';
            console.log("[renderDetailedExerciseView] Displaying allHistory.");
            // Sort all sets chronologically (oldest first) for display
            setsToDisplayInList = [...allSetsForExerciseName].sort((a,b) => a.timestamp - b.timestamp);
        }

        if (setsToDisplayInList.length === 0) {
            detailedExerciseHistoryListEl.innerHTML = `<p class="empty-state-message">No sets found for this view (${detailedHistoryViewMode}).</p>`;
        } else {
            // Simple sequential numbering for this step (date grouping comes later)
            setsToDisplayInList.forEach((set, index) => {
                const item = document.createElement('div');
                item.className = 'set-item-historical';

                const setDetailsSpan = document.createElement('span');
                const setActualTime = set.timestamp instanceof Date ? set.timestamp : new Date(set.timestamp);
                const displayDate = setActualTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const displayTime = setActualTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                // For this step, set numbering is sequential for the displayed list.
                // Session name provides context.
                setDetailsSpan.textContent = `Set ${index + 1} (${displayDate} ${set.sessionName} @ ${displayTime}): ${set.weight} kg x ${set.reps} reps`;
                if (set.notes) setDetailsSpan.textContent += ` (${set.notes})`;

                item.appendChild(setDetailsSpan);
                detailedExerciseHistoryListEl.appendChild(item);
            });
        }

        // Populate 1RM calculator using ALL sets for the exercise name, not just the filtered list.
        // The setFor1RMSelect is cleared at the beginning of renderDetailedExerciseView.
        // This ensures 1RM always has all data.
        // (The existing code for 1RM select population after this block should be fine if it uses allSetsForExerciseName)
        // The original code for 1RM was inside the loop, it needs to be outside and use allSetsForExerciseName.
        // The current restored version already has the 1RM population logic correctly using allSetsForExerciseName *after* this block.
        // So, no change needed for 1RM population here, just ensuring 'setsToDisplay.forEach' doesn't repopulate it.

        // Chart will now show Total Daily Volume
        if (detailedExerciseChart) detailedExerciseChart.destroy();

        const dailyVolumeData = calculateDailyVolume(allSetsForExerciseName); // Use all sets for this exercise name

        if (dailyVolumeData.length > 0) {
            const labels = dailyVolumeData.map(dayData => dayData.displayDate); // Already DD/MM/YY
            const totalVolumes = dailyVolumeData.map(dayData => dayData.totalVolume);

            detailedExerciseChart = new Chart(detailedExerciseChartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Total Daily Volume (kg)',
                        data: totalVolumes,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        x: {
                            ticks: { color: '#ccc' },
                            grid: { color: 'rgba(204,204,204,0.1)'},
                            title: { display: true, text: 'Date', color: '#ccc' }
                        },
                        y: {
                            ticks: { color: '#ccc' },
                            grid: { color: 'rgba(204,204,204,0.1)'},
                            title: { display: true, text: 'Total Daily Volume (kg)', color: '#ccc'},
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: { labels: { color: '#ccc'} },
                        title: { display: true, text: `${exerciseName} - Daily Volume`, color: '#ccc' }
                    }
                }
            });
            document.getElementById('detailed-exercise-chart-container').style.display = 'block';
        } else {
            document.getElementById('detailed-exercise-chart-container').style.display = 'none';
        }
    }

    // --- Event Handlers (Add Buttons etc. to be updated for Supabase) ---
    calculate1RMBtn.addEventListener('click', () => {
        if (!setFor1RMSelect.value) { alert("Please select a set."); return; }
        try {
            const { weight, reps } = JSON.parse(setFor1RMSelect.value);
            if (isNaN(parseFloat(weight)) || isNaN(parseInt(reps)) || weight <= 0 || reps <= 0) {
                alert("Invalid set data."); calculated1RMResultEl.textContent = 'Estimated 1RM: Error'; return;
            }
            if (reps === 1) {
                calculated1RMResultEl.textContent = `Estimated 1RM: ${parseFloat(weight).toFixed(2)} kg (Actual)`;
            } else {
                const oneRepMax = parseFloat(weight) * (1 + parseInt(reps) / 30); // Epley formula
                calculated1RMResultEl.textContent = `Estimated 1RM: ${oneRepMax.toFixed(2)} kg`;
            }
        } catch (e) { console.error("1RM calc error:", e); alert("Could not calculate 1RM."); calculated1RMResultEl.textContent = 'Estimated 1RM: Error';}
    });

    goToSetTrackerBtn.addEventListener('click', () => {
        if (!currentSessionId || !currentExerciseId) {
            alert("Error: Session or exercise context missing.");
            showExerciseView(); // Will clear relevant state and save
            return;
        }
        renderSetsForExercise(currentSessionId, currentExerciseId);
        showSetTracker(); // Will call saveViewState
    });

    backToExerciseListFromDetailBtn.addEventListener('click', () => {
        if (currentSessionId) {
            // currentViewingExerciseName and currentExerciseId are reset in showExerciseView
            renderExercisesForSession(currentSessionId);
            showExerciseView(); // Will save state for exercise view
        } else {
            showSessionListView(); // Will clear all state and save
        }
    });

    addSessionBtn.addEventListener('click', async () => {
        if (!currentUser) { showFeedback("You must be logged in to add a session.", true); return; }
        const sessionName = newSessionNameInput.value.trim();
        if (sessionName) {
            const newSessionData = {
                user_id: currentUser.id,
                name: sessionName,
                date: new Date().toISOString().split('T')[0],
                sort_order: gymData.sessions.length // Simple initial sort order
            };
            showFeedback("Adding session...", false);
            try {
                const { data, error } = await supabaseClient.from('sessions').insert(newSessionData).select().single();
                if (error) throw error;
                const newSessionWithExercises = {...data, exercises: []}; // Add empty exercises array for local gymData consistency
                gymData.sessions.push(newSessionWithExercises);
                newSessionNameInput.value = '';
                renderSessions();
                showFeedback("Session added!", false);
            } catch (error) {
                console.error("Error adding session to Supabase:", error);
                showFeedback(`Error adding session: ${error.message}`, true);
            }
        } else {
            alert("Please enter a session name.");
        }
    });

    addExerciseBtn.addEventListener('click', async () => {
        if (!currentUser) { showFeedback("You must be logged in.", true); return; }
        if (currentSessionId === null) { alert("Please select a session first."); return; }
        const exerciseName = newExerciseNameInput.value.trim();
        if (exerciseName) {
            const session = gymData.sessions.find(s => s.id === currentSessionId);
            if (!session) { alert("Error: Current session not found."); return; }

            const newExerciseData = {
                user_id: currentUser.id,
                session_id: currentSessionId,
                name: exerciseName,
                sort_order: session.exercises ? session.exercises.length : 0
            };
            showFeedback("Adding exercise...", false);
            try {
                const { data, error } = await supabaseClient.from('exercises').insert(newExerciseData).select().single();
                if (error) throw error;

                if (!session.exercises) session.exercises = [];
                const newExerciseWithSets = {...data, sets: []}; // Add empty sets array
                session.exercises.push(newExerciseWithSets);
                newExerciseNameInput.value = '';
                renderExercisesForSession(currentSessionId);
                showFeedback("Exercise added!", false);
            } catch (error) {
                console.error("Error adding exercise to Supabase:", error);
                showFeedback(`Error adding exercise: ${error.message}`, true);
            }
        } else {
            alert("Please enter an exercise name.");
        }
    });

    addSetBtn.addEventListener('click', async () => {
        if (!currentUser) { showFeedback("You must be logged in.", true); return; }
        if (currentSessionId === null || currentExerciseId === null) {
            alert("Error: Session or exercise not selected."); return;
        }
        const weight = parseFloat(setWeightInput.value);
        const reps = parseInt(setRepsInput.value);
        const notes = ""; // Placeholder for set notes if we add an input for it

        if (isNaN(weight) || isNaN(reps) || weight < 0 || reps < 0) { // Allow 0 for weight/reps
            alert("Please enter valid weight and reps."); return;
        }

        const newSetData = {
            user_id: currentUser.id,
            exercise_id: currentExerciseId,
            weight: weight,
            reps: reps,
            notes: notes, // Add notes if available
            // timestamp: new Date().toISOString() // Old: Record when the set was added
        };

        // Construct timestamp from selected date and current time
        const selectedDateStr = newSetDateInput.value; // YYYY-MM-DD
        if (!selectedDateStr) {
            showFeedback("Please select a date for the set.", true);
            return;
        }

        // const now = new Date(); // Current time's hours/mins/secs are no longer used with midday approach
        // const year = parseInt(selectedDateStr.substring(0, 4));
        // const month = parseInt(selectedDateStr.substring(5, 7)) - 1; // Month is 0-indexed
        // const day = parseInt(selectedDateStr.substring(8, 10));

        console.log("Selected Date String from input:", selectedDateStr);
        // console.log("Parsed Y/M/D:", year, month, day); // No longer manually parsing

        // Construct Date object by appending a fixed local time (midday) to the date string.
        // This makes the browser's date parser handle the YYYY-MM-DD string correctly.
        // The resulting Date object will be in the local timezone.
        const combinedDateTime = new Date(selectedDateStr + 'T12:00:00');

        console.log("Combined Local DateTime (midday from string):", combinedDateTime.toString());

        newSetData.timestamp = combinedDateTime.toISOString();
        console.log("Timestamp for Supabase (ISO UTC):", newSetData.timestamp);

        showFeedback("Adding set...", false);
        try {
            const { data, error } = await supabaseClient.from('sets').insert(newSetData).select().single();
            if (error) throw error;

            const session = gymData.sessions.find(s => s.id === currentSessionId);
            if (session) {
                const exercise = session.exercises.find(ex => ex.id === currentExerciseId);
                if (exercise) {
                    if (!exercise.sets) exercise.sets = [];
                    // Convert timestamp back to Date object for consistency if needed by other parts of UI immediately
                    const newSetWithDate = {...data, timestamp: new Date(data.timestamp)};
                    exercise.sets.push(newSetWithDate);
                }
            }
            setWeightInput.value = '';
            setRepsInput.value = '';
            renderSetsForExercise(currentSessionId, currentExerciseId);
            showFeedback("Set added!", false);
        } catch (error) {
            console.error("Error adding set to Supabase:", error);
            showFeedback(`Error adding set: ${error.message}`, true);
        }
    });

    backToSessionsBtn.addEventListener('click', () => { showSessionListView(); renderSessions(); });
    backToExercisesBtn.addEventListener('click', () => {
        if (currentSessionId) { renderExercisesForSession(currentSessionId); showExerciseView(); }
        else { showSessionListView(); }
    });

    addBodyWeightBtn.addEventListener('click', async () => {
        if (!currentUser) { showFeedback("You must be logged in.", true); return; }
        const date = bodyWeightDateInput.value;
        const weight = parseFloat(bodyWeightInput.value);
        if (!date) { alert("Please select a date."); return; }
        if (isNaN(weight) || weight <= 0) { alert("Please enter a valid positive weight."); return; }

        const newLogEntryData = {
            user_id: currentUser.id,
            date: date,
            weight: weight
        };
        showFeedback("Logging body weight...", false);
        try {
            const { data, error } = await supabaseClient.from('body_weight_log').insert(newLogEntryData).select().single();
            if (error) throw error;
            gymData.bodyWeightLog.push(data);
            renderBodyWeightHistory(); // Re-render with new entry
            showFeedback("Body weight logged!", false);
            bodyWeightDateInput.value = ''; bodyWeightInput.value = '';
        } catch (error) {
            console.error("Error logging body weight to Supabase:", error);
            showFeedback(`Error logging body weight: ${error.message}`, true);
        }
    });

    // --- Navigation Links & Analysis --- (Mostly unchanged, but rely on gymData from Supabase)
    const appNavLinks = document.querySelectorAll('nav ul li a'); // Renamed to avoid conflict
    const appSections = document.querySelectorAll('main section'); // Renamed

    function setupNavEventListeners() {
        document.querySelectorAll('nav ul li a').forEach(link => {
            // Clone and replace to remove old listeners, then add new one
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);

            newLink.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = newLink.getAttribute('href').substring(1);
                appSections.forEach(section => {
                    section.style.display = (section.id === targetId) ? 'block' : 'none';
                });
                document.querySelectorAll('nav ul li a').forEach(navLnk => navLnk.classList.remove('active'));
                newLink.classList.add('active');

                if (targetId === 'sessions') { showSessionListView(); renderSessions(); }
                else if (targetId === 'analysis') { populateExerciseSelect(); handleAnalysisTypeChange(); }
                else if (targetId === 'body-weight') { renderBodyWeightHistory(); bodyWeightDateInput.valueAsDate = new Date(); }
                else if (targetId === 'profile') {
                    // Populate username when profile tab is clicked
                    if (currentUser && currentUser.username) {
                        profileUsernameInput.value = currentUser.username;
                    } else {
                        profileUsernameInput.value = ''; // Clear if no username yet
                    }
                    profileFeedbackDiv.style.display = 'none'; // Clear old feedback
                    profileFeedbackDiv.textContent = '';
                }
            });
        });
    }

    if (saveProfileBtn) { // Ensure button exists before adding listener
        saveProfileBtn.addEventListener('click', async () => {
            if (!currentUser) {
                showFeedback("You must be logged in to save your profile.", true, profileFeedbackDiv);
                return;
            }
            const newUsername = profileUsernameInput.value.trim();
            // Basic validation: not empty, maybe some character restrictions later
            if (!newUsername) {
                showFeedback("Username cannot be empty.", true, profileFeedbackDiv);
                return;
            }
            // Optional: Add more sophisticated validation for username (e.g., regex)
            // For example, to allow only alphanumeric and underscores, min 3 chars:
            // if (!/^[a-zA-Z0-9_]{3,}$/.test(newUsername)) {
            //     showFeedback("Username can only contain letters, numbers, underscores, and be at least 3 characters long.", true, profileFeedbackDiv);
            //     return;
            // }


            showFeedback("Saving username...", false, profileFeedbackDiv);
            try {
                const { data, error } = await supabaseClient
                    .from('profiles')
                    .update({ username: newUsername, updated_at: new Date().toISOString() })
                    .eq('id', currentUser.id)
                    .select()
                    .single();

                if (error) {
                    // Check for unique constraint violation (Supabase error code 23505 for PostgreSQL)
                    if (error.code === '23505') {
                        throw new Error("This username is already taken. Please choose another.");
                    }
                    throw error;
                }

                if (data) {
                    currentUser.username = data.username; // Update local currentUser object
                    if (currentUser.username) { // Update display in header
                        userEmailSpan.textContent = currentUser.username;
                    } else {
                        userEmailSpan.textContent = currentUser.email;
                    }
                    showFeedback("Username saved successfully!", false, profileFeedbackDiv);
                } else {
                     showFeedback("Profile not found or no changes made.", true, profileFeedbackDiv); // Should not happen if RLS is correct
                }
            } catch (error) {
                console.error("Error saving username:", error);
                showFeedback(`Error saving username: ${error.message}`, true, profileFeedbackDiv);
            }
        });
    }

    analysisDataTypeSelect.addEventListener('change', handleAnalysisTypeChange);
    function handleAnalysisTypeChange() {
        const selectedType = analysisDataTypeSelect.value;
        exerciseSelectGroupAnalysis.style.display = 'none';
        multiExerciseSelectGroupAnalysis.style.display = 'none';
        document.getElementById('progress-chart-container').style.display = 'none';
        document.getElementById('raw-data-container').style.display = 'none';

        if (selectedType === 'exercise') {
            exerciseSelectGroupAnalysis.style.display = 'inline-block';
            if (exerciseSelectAnalysis.value) {
                 document.getElementById('progress-chart-container').style.display = 'block';
                 document.getElementById('raw-data-container').style.display = 'block';
                displayProgressForExercise(exerciseSelectAnalysis.value);
            } else {
                if (progressChart) progressChart.destroy();
                rawDataOutput.textContent = "Select an exercise.";
            }
        } else if (selectedType === 'bodyweight') {
            displayBodyWeightProgress();
        } else if (selectedType === 'volume_comparison_exercises') {
            multiExerciseSelectGroupAnalysis.style.display = 'block';
            populateMultiExerciseSelect(); // Ensure it's populated
            // Chart generation is triggered by button
        }
    }

    function getAllUniqueExerciseNames() {
        const uniqueNames = new Set();
        gymData.sessions.forEach(session => {
            session.exercises.forEach(exercise => { uniqueNames.add(exercise.name); });
        });
        return Array.from(uniqueNames).sort();
    }
    function populateExerciseSelect() {
        exerciseSelectAnalysis.innerHTML = '<option value="">--Select Exercise--</option>';
        getAllUniqueExerciseNames().forEach(name => {
            const option = document.createElement('option');
            option.value = name; option.textContent = name;
            exerciseSelectAnalysis.appendChild(option);
        });
    }
    function populateMultiExerciseSelect() {
        multiExerciseSelectAnalysis.innerHTML = '';
        getAllUniqueExerciseNames().forEach(name => {
            const option = document.createElement('option');
            option.value = name; option.textContent = name;
            multiExerciseSelectAnalysis.appendChild(option);
        });
    }

    function displayProgressForExercise(exerciseName) {
        if (progressChart) progressChart.destroy();
        if (!exerciseName) {
            document.getElementById('progress-chart-container').style.display = 'none';
            document.getElementById('raw-data-container').style.display = 'none';
            rawDataOutput.textContent = "Select an exercise.";
            return;
        }
        document.getElementById('progress-chart-container').style.display = 'block';
        document.getElementById('raw-data-container').style.display = 'block';

        const exerciseDataPoints = [];
        gymData.sessions.forEach(session => {
            session.exercises.forEach(exercise => {
                if (exercise.name === exerciseName) {
                    exercise.sets.forEach(set => {
                        exerciseDataPoints.push({
                            timestamp: new Date(set.timestamp), weight: set.weight,
                            reps: set.reps, volume: set.weight * set.reps
                        });
                    });
                }
            });
        });
        exerciseDataPoints.sort((a, b) => a.timestamp - b.timestamp);

        if (exerciseDataPoints.length === 0) {
            rawDataOutput.textContent = "No data for this exercise."; return;
        }
        rawDataOutput.textContent = JSON.stringify(exerciseDataPoints.map(dp => ({ // This can still show raw sets
            date: dp.timestamp.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }),
            time: dp.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            weight: dp.weight, reps: dp.reps, volume: dp.volume
        })), null, 2);

        // Aggregate data for the chart
        const dailyVolumeData = calculateDailyVolume(exerciseDataPoints);

        if (dailyVolumeData.length === 0) {
            if (progressChart) progressChart.destroy();
            // Potentially show a "no data for chart" message or leave it blank
            document.getElementById('progress-chart-container').style.display = 'none'; // Hide if no data
            rawDataOutput.textContent = "No data for this exercise to plot daily volume."; // Update raw data message
            return;
        }
        document.getElementById('progress-chart-container').style.display = 'block'; // Ensure visible

        const labels = dailyVolumeData.map(dayData => dayData.displayDate); // DD/MM/YY
        const totalVolumes = dailyVolumeData.map(dayData => dayData.totalVolume);

        progressChart = new Chart(progressChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Daily Volume (kg)',
                        data: totalVolumes,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        fill: true,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Date', color: '#f4f4f4' },
                        ticks: { color: '#ccc' }
                    },
                    y: {
                        display: true,
                        title: { display: true, text: 'Total Daily Volume (kg)', color: '#f4f4f4' },
                        ticks: { color: '#ccc' },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: { labels: { color: '#f4f4f4' } },
                    tooltip: { titleColor: '#fff', bodyColor: '#ddd', backgroundColor: 'rgba(0,0,0,0.8)' },
                    title: { display: true, text: `${exerciseName} - Daily Volume Progress`, color: '#f4f4f4', font: {size: 16}}
                }
            }
        });
    }
    function displayVolumeComparisonChart(selectedExerciseNames) {
        if (progressChart) progressChart.destroy();
        if (!selectedExerciseNames || selectedExerciseNames.length === 0) {
            rawDataOutput.textContent = "Select exercises to compare.";
            document.getElementById('progress-chart-container').style.display = 'none'; return;
        }
        document.getElementById('progress-chart-container').style.display = 'block';
        rawDataOutput.textContent = '';

        const datasets = [];
        const allTimestamps = new Set();
        const exerciseDataMap = new Map();

        selectedExerciseNames.forEach(exName => {
            const dailyVolumes = new Map();
            gymData.sessions.forEach(session => {
                session.exercises.forEach(exercise => {
                    if (exercise.name === exName) {
                        exercise.sets.forEach(set => {
                            const dateStr = new Date(set.timestamp).toLocaleDateString();
                            allTimestamps.add(new Date(set.timestamp).getTime());
                            const volume = (set.weight || 0) * (set.reps || 0);
                            dailyVolumes.set(dateStr, (dailyVolumes.get(dateStr) || 0) + volume);
                        });
                    }
                });
            });
            exerciseDataMap.set(exName, dailyVolumes);
        });

        const sortedUniqueTimestamps = Array.from(allTimestamps).sort((a,b) => a - b).map(ts =>
            new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
        );
        const colorPalette = ['rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 206, 86)', 'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)'];

        selectedExerciseNames.forEach((exName, index) => {
            const dailyVolumes = exerciseDataMap.get(exName);
            datasets.push({
                label: `${exName} Volume`,
                data: sortedUniqueTimestamps.map(dateStr => dailyVolumes.get(dateStr) || 0),
                borderColor: colorPalette[index % colorPalette.length],
                backgroundColor: colorPalette[index % colorPalette.length].replace('rgb', 'rgba').replace(')', ', 0.2)'),
                fill: false, tension: 0.1,
            });
        });

        progressChart = new Chart(progressChartCanvas, {
            type: 'line', data: { labels: sortedUniqueTimestamps, datasets: datasets },
            options: { /* scales and plugins options as before */
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { display: true, title: { display: true, text: 'Date', color: '#f4f4f4' }, ticks: { color: '#ccc' } },
                    y: { display: true, title: { display: true, text: 'Total Volume (kg*reps)', color: '#f4f4f4' }, ticks: { color: '#ccc' }, beginAtZero: true }
                },
                plugins: { legend: { labels: { color: '#f4f4f4' } }, tooltip: { titleColor: '#fff', bodyColor: '#ddd', backgroundColor: 'rgba(0,0,0,0.8)' },
                    title: { display: true, text: 'Exercise Volume Comparison', color: '#f4f4f4', font: {size: 16}}
                }
            }
        });
        // Raw data output for comparison chart (optional)
        // ...
    }

    exerciseSelectAnalysis.addEventListener('change', (e) => displayProgressForExercise(e.target.value));
    generateVolumeComparisonBtn.addEventListener('click', () => {
        const selectedOptions = Array.from(multiExerciseSelectAnalysis.selectedOptions).map(option => option.value);
        if (selectedOptions.length === 0) { alert("Please select exercises to compare."); return; }
        displayVolumeComparisonChart(selectedOptions);
    });

    // --- Feedback Toast Function ---
    function showFeedback(message, isError = false, targetDiv = null) {
        if (targetDiv) {
            targetDiv.textContent = message;
            targetDiv.style.backgroundColor = isError ? 'var(--button-danger-bg)' : 'var(--button-success-bg)';
            targetDiv.style.color = 'white'; // Ensure text is visible
            targetDiv.style.display = 'block';
            // No automatic hide for targeted feedback, user can see it until next action clears it.
        } else {
            const feedbackToast = document.createElement('div');
            feedbackToast.textContent = message;
            feedbackToast.className = 'feedback-toast';
            if (isError) feedbackToast.style.backgroundColor = 'var(--button-danger-bg)';
            document.body.appendChild(feedbackToast);
            setTimeout(() => { feedbackToast.classList.add('show'); }, 10);
            setTimeout(() => {
                feedbackToast.classList.remove('show');
                setTimeout(() => { document.body.removeChild(feedbackToast); }, 500);
            }, isError ? 4000 : 2500);
        }
    }

    // --- Authentication Logic & Initial UI Setup ---
    function updateUIForAuthState(user) {
        console.log("updateUIForAuthState called with user:", user, "currentUser:", currentUser, "appInitializedOnce:", appInitializedOnce);
        const previousUser = currentUser;
        currentUser = user;

        if (user) {
            if (previousUser && user.id === previousUser.id && appInitializedOnce) {
                // User is the same, app already initialized.
                // This might be a token refresh or tab refocus.
                // We might not need to call initializeAppData() again,
                // as it could unnecessarily reload data and reset views.
                // The view restoration logic in initializeAppData should handle being re-entered,
                // but avoiding the call if possible is cleaner.
                console.log("User unchanged and app initialized. Skipping full re-initialization.");
                // Ensure UI elements like user email are up-to-date if profile changed, but avoid full app init.
                if (currentUser.username) userEmailSpan.textContent = currentUser.username;
                else userEmailSpan.textContent = currentUser.email;
                // Make sure nav and main content are visible if they were hidden
                mainNav.style.display = 'block';
                mainContent.style.display = 'block';
                authContainer.style.display = 'none'; // Ensure auth forms are hidden
                userStatusDiv.style.display = 'flex';

                // Crucially, if the view was somehow lost (e.g. if a full page reload happened despite SPA intentions)
                // and sessionStorage has the state, initializeAppData is the one that restores it.
                // So, the question is: under what conditions do we *not* call initializeAppData?
                // Perhaps only if the event that triggered onAuthStateChange was *not* 'SIGNED_IN' or 'INITIAL_SESSION'.
                // For now, let's assume if user is same and app initialized, the view state should persist
                // from interaction or prior restoration. The main concern is an unnecessary `loadData()`.
                // However, `initializeAppData` now has checks to be less disruptive.
                // Let's call it but rely on its internal logic to be less disruptive.
                initializeAppData(); // It will check appInitializedOnce and attempt to restore view.
            } else {
                // New user, or first load for this user, or user changed.
                console.log("New user or first initialization for this user. Running initializeAppData.");
                userEmailSpan.textContent = user.email; // Initial set before profile load
                userStatusDiv.style.display = 'flex';
                loginForm.style.display = 'none';
                signupForm.style.display = 'none';
                authContainer.style.display = 'none';
                mainNav.style.display = 'block';
                mainContent.style.display = 'block';
                appInitializedOnce = false; // Force re-initialization if user changed or first time
                initializeAppData();
            }
        } else { // No user
            console.log("No user session. Clearing UI and state.");
            userStatusDiv.style.display = 'none';
            authContainer.style.display = 'block';
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
            mainNav.style.display = 'none';
            mainContent.style.display = 'none';
            gymData = { sessions: [], bodyWeightLog: [] }; // Clear data
            renderSessions(); renderBodyWeightHistory(); // Clear UI
        }
    }

    async function loadUserProfile() {
        if (!currentUser) return;
        try {
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116: 'No rows found' which is fine for new users
                throw error;
            }
            if (profile) {
                currentUser.username = profile.username;
                currentUser.avatar_url = profile.avatar_url;
                console.log("User profile loaded:", currentUser);
            } else {
                console.log("No profile found for user, can be created.");
                currentUser.username = null; // Ensure it's explicitly null if no profile
            }
            // Update display after loading profile
            if (currentUser.username) {
                userEmailSpan.textContent = currentUser.username;
            } else {
                userEmailSpan.textContent = currentUser.email; // Fallback to email
            }
        } catch (error) {
            console.error("Error loading user profile:", error);
            showFeedback("Could not load user profile.", true);
            userEmailSpan.textContent = currentUser.email; // Fallback to email on error
        }
    }

    async function initializeAppData() {
        console.log("initializeAppData called. appInitializedOnce:", appInitializedOnce, "currentUser:", currentUser);

        // If already initialized and just switching tabs with the same user,
        // we might not need to do much beyond ensuring the view is correct.
        // However, data might have changed, so loadData() is often still needed.
        // The key is to prevent it from blowing away a restored view.
        if (appInitializedOnce && currentUser) {
            console.log("App already initialized. Re-validating view.");
            // Data might need to be reloaded if stale, but let's first focus on view persistence.
            // For now, we assume loadData() will be called if auth state truly changes or on first load.
            // The main problem is if loadData() + subsequent UI reset happens on simple tab focus.
        }

        setupNavEventListeners();

        // Only load data if we have a user and it's either the first init or data might be stale.
        // For now, let's always load data if there's a user, but be careful about UI reset.
        if (currentUser) {
            await loadData();
            await loadUserProfile();
        } else {
            // No user, ensure gymData is cleared
            gymData = { sessions: [], bodyWeightLog: [] };
            renderSessions();
            renderBodyWeightHistory();
            appInitializedOnce = false; // Reset flag if user logs out
            return; // Nothing more to do if no user
        }


        // Try to restore view state AFTER data is loaded
        const restoredState = loadAndRestoreViewState();
        if (restoredState && currentUser && gymData.sessions) {
            // Added currentUser check and ensured gymData.sessions exists
            // (gymData.sessions.length > 0 check was removed to allow restoration even if a session was just created and is empty)
            currentSessionId = restoredState.currentSessionId;
            currentExerciseId = restoredState.currentExerciseId;
            currentViewingExerciseName = restoredState.currentViewingExerciseName;
            currentView = restoredState.currentView; // Ensure currentView is also restored before logic below uses it

            console.log("Attempting to restore view to:", currentView, "with state:", restoredState);

            // Hide all main sections first
            appSections.forEach(section => section.style.display = 'none');
            // Show the correct main section based on currentView (sessions, analysis, etc.)
            // This logic might need to be more robust if views span multiple main sections
            if (currentView === 'sessionList' || currentView === 'exerciseView' || currentView === 'detailedExerciseView' || currentView === 'setTracker') {
                document.getElementById('sessions').style.display = 'block';
            } else if (currentView === 'analysisView') { // Assuming 'analysisView' for analysis tab
                analysisSection.style.display = 'block';
            } else if (currentView === 'bodyWeightView') { // Assuming 'bodyWeightView'
                 document.getElementById('body-weight').style.display = 'block';
            } else if (currentView === 'profileView') { // Assuming 'profileView'
                 document.getElementById('profile').style.display = 'block';
            }


            if (currentView === 'sessionList') {
                showSessionListView(true); // Pass true to indicate restoration
            } else if (currentView === 'exerciseView' && currentSessionId) {
                const sessionExists = gymData.sessions.some(s => s.id === currentSessionId);
                if (sessionExists) {
                    renderExercisesForSession(currentSessionId);
                    showExerciseView(true);
                } else { // Fallback if session ID is invalid
                    showSessionListView();
                }
            } else if (currentView === 'detailedExerciseView' && currentSessionId && currentViewingExerciseName) {
                 const session = gymData.sessions.find(s => s.id === currentSessionId);
                 const exercise = session ? session.exercises.find(ex => ex.name === currentViewingExerciseName) : null;
                 if (exercise) {
                    currentExerciseId = exercise.id; // Ensure currentExerciseId is set
                    renderDetailedExerciseView(currentViewingExerciseName);
                    showDetailedExerciseView();
                 } else { showSessionListView(); }
            } else if (currentView === 'setTracker' && currentSessionId && currentExerciseId) {
                const session = gymData.sessions.find(s => s.id === currentSessionId);
                const exercise = session ? session.exercises.find(ex => ex.id === currentExerciseId) : null;
                if (exercise) {
                    renderSetsForExercise(currentSessionId, currentExerciseId);
                    showSetTracker();
                } else { showSessionListView(); }
            } else {
                // Default to sessions view if no specific state or invalid state
                showSessionListView();
            }
        } else {
            // Default to sessions view if no saved state or no data
            document.getElementById('sessions').style.display = 'block';
            document.getElementById('body-weight').style.display = 'none';
            analysisSection.style.display = 'none';
            const profileSection = document.getElementById('profile');
            if(profileSection) profileSection.style.display = 'none';
            showSessionListView();
        }

        // Common UI updates after view restoration or default view set
        renderBodyWeightHistory(); // Always render this
        bodyWeightDateInput.valueAsDate = new Date();
        populateExerciseSelect(); // For analysis tab
        handleAnalysisTypeChange(); // For analysis tab

        // Update active nav link based on the finally determined view
        document.querySelectorAll('nav ul li a').forEach(nl => nl.classList.remove('active'));
        let activeNavLinkSelector = 'nav ul li a[href="#sessions"]'; // Default
        if (document.getElementById('analysis').style.display === 'block') {
            activeNavLinkSelector = 'nav ul li a[href="#analysis"]';
        } else if (document.getElementById('body-weight').style.display === 'block') {
            activeNavLinkSelector = 'nav ul li a[href="#body-weight"]';
        } else if (document.getElementById('profile').style.display === 'block') {
            activeNavLinkSelector = 'nav ul li a[href="#profile"]';
        }
        const activeNavLink = document.querySelector(activeNavLinkSelector);
        if (activeNavLink) activeNavLink.classList.add('active');
        appInitializedOnce = true; // Mark app as initialized
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log(`onAuthStateChange event: ${event}`, session);
        const user = session ? session.user : null;

        if (event === 'INITIAL_SESSION' && user && appInitializedOnce) {
            console.log("INITIAL_SESSION event, but app already initialized. May not need to re-run full UI update.");
            // If user is the same, perhaps only a light refresh or view validation is needed.
            // For now, let updateUIForAuthState handle it, but this is a point for future optimization.
            // Potentially, if currentUser is same as user, and appInitializedOnce is true,
            // we could skip parts of updateUIForAuthState or initializeAppData.
        }

        if (event === 'SIGNED_OUT') {
            clearViewState(); // Clear view state on logout
            appInitializedOnce = false; // Reset flag
        }

        // If user state changes OR if it's the initial load with a session, update UI.
        // updateUIForAuthState will call initializeAppData if it's a login or initial session.
        updateUIForAuthState(user);
    });

    if (toggleHistoryViewBtn) {
        toggleHistoryViewBtn.addEventListener('click', () => {
            if (detailedHistoryViewMode === 'lastDay') {
                detailedHistoryViewMode = 'allHistory';
            } else { // it was 'allHistory'
                detailedHistoryViewMode = 'lastDay';
            }
            console.log("[ToggleBtn] Toggled detailedHistoryViewMode to:", detailedHistoryViewMode); // INTENSIVE DEBUG
            if (currentViewingExerciseName) { // Ensure there's an exercise context
                renderDetailedExerciseView(currentViewingExerciseName);
            }
        });
    }

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', async () => {
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            passwordFeedbackDiv.style.display = 'none'; // Clear previous feedback

            if (!newPassword || !confirmPassword) {
                showFeedback("Please fill in both password fields.", true, passwordFeedbackDiv);
                return;
            }
            if (newPassword.length < 6) {
                showFeedback("New password must be at least 6 characters long.", true, passwordFeedbackDiv);
                return;
            }
            if (newPassword !== confirmPassword) {
                showFeedback("New passwords do not match.", true, passwordFeedbackDiv);
                return;
            }

            showFeedback("Changing password...", false, passwordFeedbackDiv);
            try {
                const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
                if (error) throw error;
                showFeedback("Password updated successfully!", false, passwordFeedbackDiv);
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';
            } catch (error) {
                console.error("Error changing password:", error);
                showFeedback(`Error changing password: ${error.message}`, true, passwordFeedbackDiv);
            }
        });
    }

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    });
    const backToLoginLink = document.createElement('p'); // Create "Back to Login" link for signup form
    backToLoginLink.innerHTML = 'Already have an account? <a href="#" id="show-login">Login here</a>';
    signupForm.appendChild(backToLoginLink);
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    });


    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        showFeedback("Signing up...", false);
        try {
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
            showFeedback(`Signup successful! Welcome ${data.user.email}.`, false);
            // onAuthStateChange will handle UI, or if email confirmation is on, they'll need to confirm.
            // For now, just switch to login form.
            document.getElementById('signup-email').value = '';
            document.getElementById('signup-password').value = '';
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
        } catch (error) {
            console.error('Signup error:', error);
            showFeedback(`Signup failed: ${error.message}`, true);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        showFeedback("Logging in...", false);
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // onAuthStateChange will handle UI update via initializeAppData
            showFeedback(`Login successful! Welcome back.`, false);
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
        } catch (error) {
            console.error('Login error:', error);
            showFeedback(`Login failed: ${error.message}`, true);
        }
    });

    logoutBtn.addEventListener('click', async () => {
        showFeedback("Logging out...", false);
        // clearViewState(); // Moved to onAuthStateChange SIGNED_OUT event
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            // onAuthStateChange will handle UI update & call clearViewState
            showFeedback("Logout successful.", false);
        } catch (error) {
            console.error('Logout error:', error);
            showFeedback(`Logout failed: ${error.message}`, true);
        }
    });

    // Ensure body weight nav link is present (idempotent check)
    if (!document.querySelector('nav ul li a[href="#body-weight"]')) {
        const bodyWeightNavLinkItem = document.createElement('li');
        bodyWeightNavLinkItem.innerHTML = '<a href="#body-weight">Body Weight</a>';
        const analysisLi = document.querySelector('nav ul li a[href="#analysis"]');
        if (analysisLi && analysisLi.parentElement && analysisLi.parentElement.parentElement) {
             analysisLi.parentElement.parentElement.insertBefore(bodyWeightNavLinkItem, analysisLi.parentElement);
        } else {
            const navUl = document.querySelector('nav ul');
            if (navUl) navUl.appendChild(bodyWeightNavLinkItem);
        }
    }
    // Initial state: Auth forms visible, app content hidden. onAuthStateChange will manage this.
    updateUIForAuthState(null);
    // Attempt to get initial session, in case user is already logged in from previous visit
    // This is implicitly handled by onAuthStateChange which fires on load.
    // supabase.auth.getSession().then(({ data: { session } }) => {
    //    updateUIForAuthState(session ? session.user : null);
    // });
});
