document.addEventListener('DOMContentLoaded', () => {
    console.log("JavaScript file loaded and DOM fully parsed.");

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

    let currentSessionId = null;
    let currentExerciseId = null;
    let currentViewingExerciseName = null;
    let currentUser = null;

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
        const sortedLog = [...gymData.bodyWeightLog].sort((a, b) => new Date(b.date) - new Date(a.date));
        const list = document.createElement('ul');
        list.className = 'styled-list';
        sortedLog.forEach(entry => {
            const listItem = document.createElement('li');
            listItem.className = 'list-item body-weight-item';
            const textSpan = document.createElement('span');
            textSpan.textContent = `${new Date(entry.date).toLocaleDateString()} - ${entry.weight} kg`;
            listItem.appendChild(textSpan);
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'delete-btn button-danger';
            deleteBtn.title = `Delete entry: ${new Date(entry.date).toLocaleDateString()}`;
            deleteBtn.onclick = () => deleteBodyWeightEntry(entry.id); // Will be updated for Supabase
            listItem.appendChild(deleteBtn);
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
        const sortedLog = [...gymData.bodyWeightLog].sort((a, b) => new Date(a.date) - new Date(b.date));
        const labels = sortedLog.map(entry => new Date(entry.date).toLocaleDateString());
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
                renderExercisesForSession(session.id);
                showExerciseView();
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'delete-btn button-danger';
            deleteBtn.title = `Delete session: ${session.name}`;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSession(session.id); // Will be updated for Supabase
            });

            sessionItemContainer.appendChild(button);
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
                showDetailedExerciseView();
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'delete-btn button-danger';
            deleteBtn.title = `Delete exercise: ${exercise.name}`;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteExercise(sessionId, exercise.id); // Will be updated for Supabase
            });

            exerciseItemContainer.appendChild(button);
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

    function renderSetsForExercise(sessionId, exerciseId) {
        const session = gymData.sessions.find(s => s.id === sessionId);
        if (!session) return;
        const exercise = session.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return;

        currentExerciseTitleSet.textContent = `Tracking: ${exercise.name}`;
        setsListDiv.innerHTML = '';
        if (!exercise.sets || exercise.sets.length === 0) {
            setsListDiv.innerHTML = '<p class="empty-state-message">No sets recorded. Add one below.</p>';
            setWeightInput.placeholder = "Weight (kg)";
            setRepsInput.placeholder = "Reps";
            setWeightInput.value = '';
            setRepsInput.value = '';
            return;
        }
        // Sort sets by timestamp (creation time)
        const sortedSets = [...exercise.sets].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

        sortedSets.forEach((set, index) => {
            const setItemContainer = document.createElement('div');
            setItemContainer.className = 'set-item';
            const setDetails = document.createElement('span');
            setDetails.textContent = `Set ${index + 1}: ${set.weight} kg x ${set.reps} reps`;
            if(set.notes) setDetails.textContent += ` (${set.notes})`;

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'delete-btn button-danger';
            deleteBtn.title = `Delete Set ${index + 1}`;
            deleteBtn.addEventListener('click', () => {
                deleteSet(sessionId, exerciseId, set.id); // Will be updated for Supabase
            });
            setItemContainer.appendChild(setDetails);
            setItemContainer.appendChild(deleteBtn);
            setsListDiv.appendChild(setItemContainer);
        });
        const lastSet = sortedSets[sortedSets.length - 1];
        setWeightInput.placeholder = `Last: ${lastSet.weight} kg`;
        setRepsInput.placeholder = `Last: ${lastSet.reps} reps`;
        // setWeightInput.value = lastSet.weight; // Optionally prefill for editing
        // setRepsInput.value = lastSet.reps;
    }

    // --- UI Navigation Functions ---
    function showSessionListView() {
        sessionListDiv.style.display = 'block';
        sessionViewControls.style.display = 'flex';
        exerciseViewContainer.style.display = 'none';
        setTrackerContainer.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'none';
        currentSessionId = null; // Reset context when going back to session list
        currentExerciseId = null;
    }
    function showExerciseView() {
        sessionListDiv.style.display = 'none';
        sessionViewControls.style.display = 'none';
        exerciseViewContainer.style.display = 'block';
        setTrackerContainer.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'none';
        currentExerciseId = null; // Reset context
        currentViewingExerciseName = null;
    }
    function showDetailedExerciseView() {
        exerciseViewContainer.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'block';
        setTrackerContainer.style.display = 'none';
    }
    function showSetTracker() {
        exerciseViewContainer.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'none';
        setTrackerContainer.style.display = 'block';
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
        currentViewingExerciseName = exerciseName;
        detailedExerciseNameEl.textContent = exerciseName;
        detailedExerciseHistoryListEl.innerHTML = '';
        setFor1RMSelect.innerHTML = '<option value="">-- Choose a Set --</option>';
        calculated1RMResultEl.textContent = 'Estimated 1RM: -- kg';

        const allSetsForExercise = [];
        gymData.sessions.forEach(session => {
            session.exercises.forEach(ex => {
                if (ex.name === exerciseName) {
                    ex.sets.forEach(set => {
                        allSetsForExercise.push({
                            ...set, // set already contains weight, reps, timestamp (as Date obj)
                            sessionDate: session.date, // Use actual date from session
                            sessionName: session.name
                        });
                    });
                }
            });
        });
        allSetsForExercise.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (allSetsForExercise.length === 0) {
            detailedExerciseHistoryListEl.innerHTML = '<p class="empty-state-message">No history found.</p>';
        } else {
            allSetsForExercise.forEach(set => {
                const item = document.createElement('div');
                item.className = 'set-item-historical';
                const datePrefix = document.createElement('span');
                datePrefix.className = 'date-prefix';
                datePrefix.textContent = `${new Date(set.timestamp).toLocaleDateString()} (${set.sessionName}): `;
                item.appendChild(datePrefix);
                item.append(`${set.weight} kg x ${set.reps} reps`);
                if (set.notes) item.append(` (${set.notes})`);
                detailedExerciseHistoryListEl.appendChild(item);
                if (set.reps > 0 && set.weight > 0) {
                    const option = document.createElement('option');
                    option.value = JSON.stringify({ weight: set.weight, reps: set.reps });
                    option.textContent = `${new Date(set.timestamp).toLocaleDateString()} - ${set.weight}kg x ${set.reps}reps (${set.sessionName})`;
                    setFor1RMSelect.appendChild(option);
                }
            });
        }

        if (detailedExerciseChart) detailedExerciseChart.destroy();
        const chartDataPoints = allSetsForExercise.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
        if (chartDataPoints.length > 0) {
            const labels = chartDataPoints.map(s => new Date(s.timestamp).toLocaleDateString());
            const weightData = chartDataPoints.map(s => s.weight);
            detailedExerciseChart = new Chart(detailedExerciseChartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Weight Lifted (kg)', data: weightData, borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)', fill: true, tension: 0.1
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        x: { ticks: { color: '#ccc' }, grid: { color: 'rgba(204,204,204,0.1)'} },
                        y: { ticks: { color: '#ccc' }, grid: { color: 'rgba(204,204,204,0.1)'}, title: { display: true, text: 'Weight (kg)', color: '#ccc'} }
                    },
                    plugins: { legend: { labels: { color: '#ccc'} }, title: { display: false } }
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
            alert("Error: Session or exercise context missing."); showExerciseView(); return;
        }
        renderSetsForExercise(currentSessionId, currentExerciseId);
        showSetTracker();
    });

    backToExerciseListFromDetailBtn.addEventListener('click', () => {
        if (currentSessionId) {
            renderExercisesForSession(currentSessionId); showExerciseView();
        } else {
            showSessionListView();
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
            timestamp: new Date().toISOString() // Record when the set was added
        };
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
            });
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
        rawDataOutput.textContent = JSON.stringify(exerciseDataPoints.map(dp => ({
            date: dp.timestamp.toLocaleDateString(), time: dp.timestamp.toLocaleTimeString(),
            weight: dp.weight, reps: dp.reps, volume: dp.volume
        })), null, 2);

        const labels = exerciseDataPoints.map(dp => dp.timestamp.toLocaleDateString() + ' ' + dp.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        progressChart = new Chart(progressChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Weight (kg)', data: exerciseDataPoints.map(dp => dp.weight), borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.5)', yAxisID: 'yWeight' },
                    { label: 'Reps', data: exerciseDataPoints.map(dp => dp.reps), borderColor: 'rgb(54, 162, 235)', backgroundColor: 'rgba(54, 162, 235, 0.5)', yAxisID: 'yReps' },
                    { label: 'Volume (W x R)', data: exerciseDataPoints.map(dp => dp.volume), borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.5)', yAxisID: 'yVolume', hidden: true }
                ]
            },
            options: { /* scales and plugins options as before */
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { display: true, title: { display: true, text: 'Date & Time', color: '#f4f4f4' }, ticks: { color: '#ccc' } },
                    yWeight: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Weight (kg)', color: 'rgb(255, 99, 132)' }, ticks: { color: 'rgb(255, 99, 132)' } },
                    yReps: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Reps', color: 'rgb(54, 162, 235)' }, ticks: { color: 'rgb(54, 162, 235)' }, grid: { drawOnChartArea: false } },
                    yVolume: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Volume', color: 'rgb(75, 192, 192)' }, ticks: { color: 'rgb(75, 192, 192)' }, grid: { drawOnChartArea: false } }
                },
                plugins: { legend: { labels: { color: '#f4f4f4' } }, tooltip: { titleColor: '#fff', bodyColor: '#ddd', backgroundColor: 'rgba(0,0,0,0.8)' } }
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

        const sortedUniqueTimestamps = Array.from(allTimestamps).sort((a,b) => a - b).map(ts => new Date(ts).toLocaleDateString());
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
    function showFeedback(message, isError = false) { // Added isError flag
        const feedbackToast = document.createElement('div');
        feedbackToast.textContent = message;
        feedbackToast.className = 'feedback-toast';
        if (isError) feedbackToast.style.backgroundColor = 'var(--button-danger-bg)';
        document.body.appendChild(feedbackToast);
        setTimeout(() => { feedbackToast.classList.add('show'); }, 10);
        setTimeout(() => {
            feedbackToast.classList.remove('show');
            setTimeout(() => { document.body.removeChild(feedbackToast); }, 500);
        }, isError ? 4000 : 2500); // Longer display for errors
    }

    // --- Authentication Logic & Initial UI Setup ---
    function updateUIForAuthState(user) {
        currentUser = user;
        if (user) {
            userEmailSpan.textContent = user.email;
            userStatusDiv.style.display = 'flex';
            loginForm.style.display = 'none';
            signupForm.style.display = 'none';
            authContainer.style.display = 'none';
            mainNav.style.display = 'block';
            mainContent.style.display = 'block';
            initializeAppData();
        } else {
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

    async function initializeAppData() {
        setupNavEventListeners(); // Ensure nav links work correctly
        // Default to sessions view
        document.getElementById('sessions').style.display = 'block';
        document.getElementById('body-weight').style.display = 'none';
        analysisSection.style.display = 'none';
        document.querySelectorAll('nav ul li a').forEach(nl => nl.classList.remove('active'));
        const sessionsNavLink = document.querySelector('nav ul li a[href="#sessions"]');
        if (sessionsNavLink) sessionsNavLink.classList.add('active');

        await loadData(); // Load data from Supabase

        // Initial rendering after data load
        showSessionListView(); // Sets currentSessionId to null, renders sessions
        renderBodyWeightHistory(); // Renders body weight
        bodyWeightDateInput.valueAsDate = new Date(); // Default date
        populateExerciseSelect(); // For analysis tab
        handleAnalysisTypeChange(); // For analysis tab
        // displayProgressForExercise(""); // Clear analysis chart initially
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth event:', event, 'Session:', session);
        updateUIForAuthState(session ? session.user : null);
    });

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
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            // onAuthStateChange will handle UI update
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
