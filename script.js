document.addEventListener('DOMContentLoaded', () => {
    console.log("JavaScript file loaded and DOM fully parsed.");

    // Data store
    let gymData = {
        sessions: [],
        bodyWeightLog: [] // { id: Date.now(), date: "YYYY-MM-DD", weight: 75.5 }
        // exercise: { id: Date.now(), name: "Bicep Curls", sets: [] }
        // set: { id: Date.now(), weight: 0, reps: 0, timestamp: new Date() }
    };

    // DOM Elements for Body Weight Section
    const bodyWeightDateInput = document.getElementById('body-weight-date');
    const bodyWeightInput = document.getElementById('body-weight-input');
    const addBodyWeightBtn = document.getElementById('add-body-weight-btn');
    const bodyWeightHistoryDiv = document.getElementById('body-weight-history');

    // DOM Elements
    const sessionListDiv = document.getElementById('session-list'); // Corrected: Removed duplicate declaration
    const newSessionNameInput = document.getElementById('new-session-name');
    const addSessionBtn = document.getElementById('add-session-btn');

    // Containers for different views
    const sessionViewControls = document.querySelector('#sessions .controls-group'); // Controls for adding new session
    const exerciseViewContainer = document.getElementById('exercise-view-container');
    const detailedExerciseViewContainer = document.getElementById('detailed-exercise-view-container');
    const setTrackerContainer = document.getElementById('set-tracker-container');

    // Elements within Exercise View
    const currentSessionTitle = document.getElementById('current-session-title'); // Shows "Exercises for [Session Name]"
    const exerciseListDiv = document.getElementById('exercise-list'); // This is where exercises OF a session are listed
    const newExerciseNameInput = document.getElementById('new-exercise-name');
    const addExerciseBtn = document.getElementById('add-exercise-btn');
    const backToSessionsBtn = document.getElementById('back-to-sessions-btn');

    // Elements within Set Tracker View
    const currentExerciseTitleSet = document.getElementById('current-exercise-title-set'); // Shows "Tracking: [Exercise Name]"
    const setsListDiv = document.getElementById('sets-list');
    const setWeightInput = document.getElementById('set-weight');
    const setRepsInput = document.getElementById('set-reps');
    const addSetBtn = document.getElementById('add-set-btn');
    const backToExercisesBtn = document.getElementById('back-to-exercises-btn');

    // Analysis Section Elements
    const analysisSection = document.getElementById('analysis');
    const analysisDataTypeSelect = document.getElementById('analysis-data-type-select');
    const exerciseSelectAnalysis = document.getElementById('exercise-select-analysis'); // Single exercise select
    const exerciseSelectLabelAnalysis = document.getElementById('exercise-select-label-analysis');
    const exerciseSelectGroupAnalysis = document.getElementById('exercise-select-group-analysis'); // Div for single select
    const multiExerciseSelectAnalysis = document.getElementById('multi-exercise-select-analysis'); // Multi-select for comparison
    const multiExerciseSelectGroupAnalysis = document.getElementById('multi-exercise-select-group-analysis'); // Div for multi-select
    const generateVolumeComparisonBtn = document.getElementById('generate-volume-comparison-btn');
    const progressChartCanvas = document.getElementById('progressChart').getContext('2d');
    const rawDataOutput = document.getElementById('raw-data-output');
    let progressChart = null;

    // Detailed Exercise View Elements
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
    let currentExerciseId = null; // ID of the exercise being interacted with (e.g., for set tracking)
    let currentViewingExerciseName = null; // Name of the exercise for the detailed view

    // --- IndexedDB Setup ---
    const DB_NAME = 'GymAppDB';
    const DB_VERSION = 1;
    let db;

    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                db = event.target.result;
                console.log("IndexedDB upgrade needed");

                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
                    sessionStore.createIndex('sortOrder', 'sortOrder', { unique: false });
                }
                if (!db.objectStoreNames.contains('exercises')) {
                    // Exercises will be stored as part of session objects initially for simplicity,
                    // or could be a separate store if exercises are frequently reused across sessions independently.
                    // For now, keeping them nested. If making a separate store:
                    // const exerciseStore = db.createObjectStore('exercises', { keyPath: 'id' });
                    // exerciseStore.createIndex('sessionId', 'sessionId', { unique: false });
                }
                if (!db.objectStoreNames.contains('bodyWeightLog')) {
                    const bodyWeightStore = db.createObjectStore('bodyWeightLog', { keyPath: 'id' });
                    bodyWeightStore.createIndex('date', 'date', { unique: false });
                }
                // Sets are also nested within exercises within sessions.
                console.log("Object stores created/updated.");
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log("IndexedDB initialized successfully.");
                resolve(db);
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    // --- Data Persistence Functions (Refactored for IndexedDB) ---
    // These will now mostly call specific DB interaction functions.
    // The global gymData object will be populated from DB on load.

    async function loadData() {
        if (!db) {
            console.error("DB not initialized. Call initDB first.");
            // Attempt to initialize if not already done, though init should be called at startup
            try {
                await initDB();
            } catch (error) {
                gymData = { sessions: [], bodyWeightLog: [] }; // Fallback
                return;
            }
        }

        const transaction = db.transaction(['sessions', 'bodyWeightLog'], 'readonly');
        const sessionStore = transaction.objectStore('sessions');
        const bodyWeightStore = transaction.objectStore('bodyWeightLog');

        const sessionsRequest = sessionStore.getAll();
        const bodyWeightRequest = bodyWeightStore.getAll();

        return new Promise((resolve, reject) => {
            let sessions = [];
            let bodyWeightLog = [];

            sessionsRequest.onsuccess = () => {
                sessions = sessionsRequest.result.map(session => {
                    // Ensure nested date objects are handled if necessary (e.g. set timestamps)
                    session.exercises.forEach(exercise => {
                        exercise.sets.forEach(set => {
                            if (typeof set.timestamp === 'string') {
                                set.timestamp = new Date(set.timestamp);
                            }
                        });
                    });
                    return session;
                });

                bodyWeightRequest.onsuccess = () => {
                    bodyWeightLog = bodyWeightRequest.result;
                    gymData = { sessions, bodyWeightLog };
                    console.log("Data loaded from IndexedDB:", gymData);
                    resolve();
                };
                bodyWeightRequest.onerror = (event) => {
                    console.error("Error loading body weight data:", event.target.error);
                    gymData = { sessions, bodyWeightLog: [] }; // Load sessions at least
                    reject(event.target.error);
                };
            };
            sessionsRequest.onerror = (event) => {
                console.error("Error loading sessions data:", event.target.error);
                gymData = { sessions: [], bodyWeightLog: [] }; // Fallback
                reject(event.target.error);
            };
        });
    }

    // Generic function to add/update an item in a store
    function dbPut(storeName, item) {
        return new Promise((resolve, reject) => {
            if (!db) { reject("DB not initialized"); return; }
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    // Generic function to delete an item from a store
    function dbDelete(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!db) { reject("DB not initialized"); return; }
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    // --- Render Body Weight Functions ---
    function renderBodyWeightHistory() {
        bodyWeightHistoryDiv.innerHTML = ''; // Clear existing entries
        if (!gymData.bodyWeightLog || gymData.bodyWeightLog.length === 0) {
            bodyWeightHistoryDiv.innerHTML = '<p class="empty-state-message">No body weight entries yet. Add one above.</p>';
            return;
        }

        // Sort by date, most recent first
        const sortedLog = [...gymData.bodyWeightLog].sort((a, b) => new Date(b.date) - new Date(a.date));

        const list = document.createElement('ul');
        list.className = 'styled-list'; // For potential specific styling
        sortedLog.forEach(entry => {
            const listItem = document.createElement('li');
            listItem.className = 'list-item body-weight-item'; // General list item styling

            const textSpan = document.createElement('span');
            textSpan.textContent = `${new Date(entry.date).toLocaleDateString()} - ${entry.weight} kg`;

            // TODO: Add delete button for body weight entry later if needed in deletion step
            // const deleteBtn = document.createElement('button');
            // deleteBtn.textContent = 'Delete';
            // deleteBtn.className = 'delete-btn button-danger';
            // deleteBtn.onclick = () => deleteBodyWeightEntry(entry.id);

            listItem.appendChild(textSpan);

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'delete-btn button-danger';
            deleteBtn.title = `Delete entry: ${new Date(entry.date).toLocaleDateString()}`;
            deleteBtn.onclick = () => deleteBodyWeightEntry(entry.id);

            listItem.appendChild(deleteBtn);
            list.appendChild(listItem);
        });
        bodyWeightHistoryDiv.appendChild(list);
    }

    function displayBodyWeightProgress() {
        if (progressChart) {
            progressChart.destroy();
        }
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
                    label: 'Body Weight (kg)',
                    data: weightData,
                    borderColor: 'rgb(153, 102, 255)',
                    backgroundColor: 'rgba(153, 102, 255, 0.5)',
                    fill: false,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Date', color: '#f4f4f4' },
                        ticks: { color: '#ccc' }
                    },
                    y: {
                        display: true,
                        title: { display: true, text: 'Weight (kg)', color: '#f4f4f4' },
                        ticks: { color: '#ccc' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#f4f4f4' } },
                    tooltip: { titleColor: '#fff', bodyColor: '#ddd', backgroundColor: 'rgba(0,0,0,0.8)' },
                    title: { display: true, text: 'Body Weight Over Time', color: '#f4f4f4', font: {size: 16}}
                }
            }
        });
    }


    // --- Render Functions ---
    function renderSessions() {
        sessionListDiv.innerHTML = '';
        if (!gymData.sessions || gymData.sessions.length === 0) {
            sessionListDiv.innerHTML = '<p class="empty-state-message">No sessions created yet. Add one below!</p>';
        } else {
            // Sort sessions by sortOrder before rendering
            const sortedSessions = [...gymData.sessions].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

            sortedSessions.forEach(session => {
                const button = document.createElement('button');
                button.className = 'session-item button';
                button.textContent = session.name;
                button.dataset.sessionId = session.id;

                const sessionItemContainer = document.createElement('div');
                sessionItemContainer.className = 'list-item-container'; // For layout

                button.addEventListener('click', (e) => {
                    // More robust check: if the click originated on or within an element with class 'delete-btn'
                    if (e.target.closest('.delete-btn')) {
                        console.log("Click target is part of a delete button, preventing session entry.");
                        return; // Do nothing, let the delete button's own handler manage it.
                    }

                    // If not a click on/in a delete button, proceed to enter the session
                    console.log("Entering session:", session.name, session.id);
                    currentSessionId = session.id;
                    renderExercisesForSession(session.id);
                    showExerciseView();
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '&times;'; // Use a multiplication sign for 'x'
                deleteBtn.className = 'delete-btn button-danger';
                deleteBtn.title = `Delete session: ${session.name}`;
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent session click event
                    deleteSession(session.id);
                });

                sessionItemContainer.appendChild(button);
                sessionItemContainer.appendChild(deleteBtn);

                // Drag and Drop for Sessions
                sessionItemContainer.draggable = true;
                sessionItemContainer.dataset.sessionIdForDrag = session.id; // Store ID for dnd
                sessionItemContainer.addEventListener('dragstart', handleDragStartSession);
                sessionItemContainer.addEventListener('dragover', handleDragOverSession);
                sessionItemContainer.addEventListener('dragleave', handleDragLeaveSession);
                sessionItemContainer.addEventListener('drop', handleDropSession);
                sessionItemContainer.addEventListener('dragend', handleDragEndSession);

                sessionListDiv.appendChild(sessionItemContainer);
            });
        }
    }

    // --- Drag and Drop Handlers for Sessions ---
    let draggedSessionId = null;

    function handleDragStartSession(e) {
        draggedSessionId = this.dataset.sessionIdForDrag;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedSessionId); // Required for Firefox
        this.classList.add('dragging-session');
        // console.log('Drag Start:', draggedSessionId);
    }

    function handleDragOverSession(e) {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
        this.classList.add('drag-over-session');
        // console.log('Drag Over:', this.dataset.sessionIdForDrag);
        return false;
    }

    function handleDragLeaveSession(e) {
        this.classList.remove('drag-over-session');
    }

    async function handleDropSession(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevents redirecting or other default behaviors

        const targetSessionId = this.dataset.sessionIdForDrag;
        this.classList.remove('drag-over-session');

        if (draggedSessionId === targetSessionId) {
            // console.log("Dropped on itself, no change.");
            return; // Dropped on itself
        }

        const draggedIndex = gymData.sessions.findIndex(s => s.id.toString() === draggedSessionId);
        let targetIndex = gymData.sessions.findIndex(s => s.id.toString() === targetSessionId);

        if (draggedIndex === -1 || targetIndex === -1) {
            console.error("Dragged or target session not found in gymData.");
            draggedSessionId = null; // Reset
            return;
        }

        // Remove dragged session and store it
        const [draggedItem] = gymData.sessions.splice(draggedIndex, 1);

        // Adjust targetIndex if dragged item was before target in the array
        if (draggedIndex < targetIndex) {
            // No adjustment needed if splicing from before and inserting after the original target's new position
             targetIndex = gymData.sessions.findIndex(s => s.id.toString() === targetSessionId);
        } else {
             targetIndex = gymData.sessions.findIndex(s => s.id.toString() === targetSessionId) +1;
        }
         // Re-calculate targetIndex after splice if dragged item was before it
        // targetIndex = gymData.sessions.findIndex(s => s.id.toString() === targetSessionId);
        // if (draggedIndex < targetIndexOriginal) targetIndex++;


        // Insert dragged session at the new position
        // Determine if dropping before or after the target based on mouse position (simplified)
        // For simplicity, let's always insert before the target element for now,
        // or adjust based on drop position relative to midpoint of target.
        // A common approach: if dropping on the top half of target, insert before, else after.
        // This simple version inserts based on array index logic.

        // Re-find targetIndex after splice
        const targetSessionAfterSplice = gymData.sessions.find(s => s.id.toString() === targetSessionId);
        if(!targetSessionAfterSplice) { // If target was the one dragged (should not happen if id check is done)
             gymData.sessions.push(draggedItem); // Add to end
        } else {
             const newTargetIndex = gymData.sessions.indexOf(targetSessionAfterSplice);
             // This logic needs refinement: determine if it's dropped above or below the target item.
             // For now, let's assume it's dropped *at* the target's position, effectively before it.
             // A more robust way:
             const rect = this.getBoundingClientRect();
             const verticalMidpoint = rect.top + rect.height / 2;
             if (e.clientY < verticalMidpoint) {
                 gymData.sessions.splice(newTargetIndex, 0, draggedItem);
             } else {
                 gymData.sessions.splice(newTargetIndex + 1, 0, draggedItem);
             }
        }


        // Update sortOrder for all sessions
        gymData.sessions.forEach((session, index) => {
            session.sortOrder = index;
        });

        // Save all updated sessions to IndexedDB
        try {
            const transaction = db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            for (const session of gymData.sessions) {
                store.put(session); // This will update if exists, add if new (should always exist here)
            }
            await new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = reject;
            });
            console.log("Sessions reordered and saved to DB.");
            renderSessions(); // Re-render the list with new order
        } catch (error) {
            console.error("Failed to save reordered sessions:", error);
            // TODO: Implement a revert mechanism if DB save fails (more complex)
            alert("Error saving new session order.");
        }

        draggedSessionId = null; // Reset
    }


    function handleDragEndSession(e) {
        this.classList.remove('dragging-session');
        // Clean up any other visual cues if necessary
        // console.log('Drag End');
        // Remove 'drag-over-session' from all items to be safe
        document.querySelectorAll('.session-item.button').forEach(item => item.parentElement.classList.remove('drag-over-session'));

    }


    function renderExercisesForSession(sessionId) {
        const session = gymData.sessions.find(s => s.id === sessionId);
        if (!session) {
            console.error("Session not found for ID:", sessionId);
            showSessionListView();
            return;
        }

        currentSessionTitle.textContent = `Exercises for: ${session.name}`;
        exerciseListDiv.innerHTML = '';

        if (!session.exercises || session.exercises.length === 0) {
            exerciseListDiv.innerHTML = '<p class="empty-state-message">No exercises added to this session yet. Add one below.</p>';
        } else {
            // Ensure exercises are sorted by their 'order' property if it exists
            const sortedExercises = [...session.exercises].sort((a, b) => (a.order || 0) - (b.order || 0));

            sortedExercises.forEach(exercise => {
                const exerciseItemContainer = document.createElement('div');
                exerciseItemContainer.className = 'list-item-container exercise-drag-item'; // Added class for styling/selection
                exerciseItemContainer.draggable = true;
                exerciseItemContainer.dataset.exerciseIdForDrag = exercise.id;
                exerciseItemContainer.dataset.parentSessionId = sessionId; // Store parent session ID

                exerciseItemContainer.addEventListener('dragstart', handleDragStartExercise);
                exerciseItemContainer.addEventListener('dragover', handleDragOverExercise);
                exerciseItemContainer.addEventListener('dragleave', handleDragLeaveExercise);
                exerciseItemContainer.addEventListener('drop', handleDropExercise);
                exerciseItemContainer.addEventListener('dragend', handleDragEndExercise);


                const button = document.createElement('button');
                button.className = 'exercise-item button'; // This button itself is not draggable, the container is
                button.textContent = exercise.name;
                // Removed exercise.id and exercise.name from button's dataset as it's on container

                button.addEventListener('click', (e) => {
                    // Prevent actions if the click was on the delete button within this container
                    if (e.target.closest('.delete-btn')) return;

                    currentViewingExerciseName = exercise.name;
                    currentExerciseId = exercise.id;
                    renderDetailedExerciseView(exercise.name);
                    showDetailedExerciseView();
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '&times;';
                deleteBtn.className = 'delete-btn button-danger';
                deleteBtn.title = `Delete exercise: ${exercise.name}`;
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent container's click event
                    deleteExercise(sessionId, exercise.id);
                });

                exerciseItemContainer.appendChild(button);
                exerciseItemContainer.appendChild(deleteBtn);
                exerciseListDiv.appendChild(exerciseItemContainer);
            });
        }
    }

    // --- Drag and Drop Handlers for Exercises ---
    let draggedExerciseId = null;
    let sourceSessionIdForExerciseDrag = null; // To ensure drag is within the same session context

    function handleDragStartExercise(e) {
        draggedExerciseId = this.dataset.exerciseIdForDrag;
        sourceSessionIdForExerciseDrag = this.dataset.parentSessionId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedExerciseId); // Required for Firefox
        this.classList.add('dragging-exercise');
    }

    function handleDragOverExercise(e) {
        e.preventDefault();
        // Ensure we are dragging over an item from the same session
        if (this.dataset.parentSessionId === sourceSessionIdForExerciseDrag) {
            e.dataTransfer.dropEffect = 'move';
            this.classList.add('drag-over-exercise');
        } else {
            e.dataTransfer.dropEffect = 'none'; // Prevent dropping if not same session
        }
        return false;
    }

    function handleDragLeaveExercise(e) {
        this.classList.remove('drag-over-exercise');
    }

    async function handleDropExercise(e) {
        e.preventDefault();
        e.stopPropagation();

        const targetExerciseId = this.dataset.exerciseIdForDrag;
        const parentSessionId = this.dataset.parentSessionId;
        this.classList.remove('drag-over-exercise');

        if (draggedExerciseId === targetExerciseId || parentSessionId !== sourceSessionIdForExerciseDrag) {
            return; // Dropped on itself or wrong session
        }

        const session = gymData.sessions.find(s => s.id.toString() === parentSessionId);
        if (!session) {
            console.error("Parent session not found for exercise drop.");
            draggedExerciseId = null; sourceSessionIdForExerciseDrag = null;
            return;
        }

        const draggedIndex = session.exercises.findIndex(ex => ex.id.toString() === draggedExerciseId);
        let targetIndex = session.exercises.findIndex(ex => ex.id.toString() === targetExerciseId);

        if (draggedIndex === -1 || targetIndex === -1) {
            console.error("Dragged or target exercise not found in session.");
            draggedExerciseId = null; sourceSessionIdForExerciseDrag = null;
            return;
        }

        const [draggedItem] = session.exercises.splice(draggedIndex, 1);

        // Re-calculate targetIndex after splice, as the array has changed
        const newTargetIndex = session.exercises.findIndex(ex => ex.id.toString() === targetExerciseId);

        if (newTargetIndex !== -1) { // If target still exists in the modified array
            const rect = this.getBoundingClientRect();
            const verticalMidpoint = rect.top + rect.height / 2;
            if (e.clientY < verticalMidpoint) {
                session.exercises.splice(newTargetIndex, 0, draggedItem);
            } else {
                session.exercises.splice(newTargetIndex + 1, 0, draggedItem);
            }
        } else { // Target was removed (e.g. it was the dragged item, or list became empty)
             // This case should ideally be handled by draggedExerciseId === targetExerciseId check earlier
             // or if the list becomes empty, just add it.
             // If targetIndex was the original index of the dragged item (which is now removed),
             // and we want to place it back "at its original spot relative to others"
             // this logic becomes more complex.
             // For simplicity: if it was the last item, or only item, add it back.
             // A robust way: if draggedIndex < originalTargetIndex, insert at originalTargetIndex.
             // else insert at originalTargetIndex + 1.
             // However, the current logic of finding newTargetIndex and then inserting should mostly cover it.
             // If newTargetIndex is -1, it implies the target element is no longer in the list (likely it was the one dragged).
             // The splice already removed the draggedItem. If we are here, it means we are dropping on a valid target.
             // The only edge case for newTargetIndex being -1 after splice is if the list had only one item (the target).
             // But this is prevented by "draggedExerciseId === targetExerciseId".
             // So, if newTargetIndex is -1 it's an unexpected state. For safety, add to end.
            session.exercises.push(draggedItem);
        }

        session.exercises.forEach((ex, index) => {
            ex.order = index; // Update order property for each exercise
        });

        try {
            await dbPut('sessions', session); // Save the entire updated session
            console.log("Exercises reordered within session and saved.");
            renderExercisesForSession(parentSessionId); // Re-render this session's exercises
        } catch (error) {
            console.error("Failed to save reordered exercises:", error);
            // Basic revert: would need to reload session from gymData or a backup
            // For simplicity, we'll alert and user might need to refresh if data becomes inconsistent.
            alert("Error saving new exercise order.");
        }
        draggedExerciseId = null;
        sourceSessionIdForExerciseDrag = null;
    }

    function handleDragEndExercise(e) {
        this.classList.remove('dragging-exercise');
        document.querySelectorAll('.exercise-drag-item').forEach(item => item.classList.remove('drag-over-exercise'));
    }


    function renderSetsForExercise(sessionId, exerciseId) {
        const session = gymData.sessions.find(s => s.id === sessionId);
        if (!session) return;
        const exercise = session.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return;

        currentExerciseTitleSet.textContent = `Tracking: ${exercise.name}`;
        setsListDiv.innerHTML = '';

        if (!exercise.sets || exercise.sets.length === 0) {
            setsListDiv.innerHTML = '<p class="empty-state-message">No sets recorded for this exercise yet. Add one below.</p>';
            setWeightInput.placeholder = "Weight (kg)";
            setRepsInput.placeholder = "Reps";
            setWeightInput.value = '';
            setRepsInput.value = '';
        } else {
            exercise.sets.forEach((set, index) => {
                const setItemContainer = document.createElement('div');
                setItemContainer.className = 'set-item'; // set-item already handles flex from previous step

                const setDetails = document.createElement('span');
                setDetails.textContent = `Set ${index + 1}: ${set.weight} kg x ${set.reps} reps`;

                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '&times;';
                deleteBtn.className = 'delete-btn button-danger';
                deleteBtn.title = `Delete Set ${index + 1}`;
                deleteBtn.addEventListener('click', () => {
                    deleteSet(sessionId, exerciseId, set.id);
                });

                setItemContainer.appendChild(setDetails);
                setItemContainer.appendChild(deleteBtn);
                setsListDiv.appendChild(setItemContainer);
            });

            // Pre-fill weight/reps inputs with last set data as placeholder
            const lastSet = exercise.sets[exercise.sets.length - 1];
            setWeightInput.placeholder = `Last: ${lastSet.weight} kg`;
            setRepsInput.placeholder = `Last: ${lastSet.reps} reps`;
            // Optionally, also set the actual value if you want it pre-filled for editing
            // setWeightInput.value = lastSet.weight;
            // setRepsInput.value = lastSet.reps;
            // For now, just placeholders as per requirement "grayed in the text to fill"
        }
    }


    // --- UI Navigation Functions ---

    // --- Deletion Functions ---
    async function deleteSession(sessionId) {
        if (confirm("Are you sure you want to delete this session and all its exercises and sets? This action cannot be undone.")) {
            try {
                await dbDelete('sessions', sessionId);
                gymData.sessions = gymData.sessions.filter(session => session.id !== sessionId);
                renderSessions();
                if (currentSessionId === sessionId) {
                    currentSessionId = null; // Clear current session if it's deleted
                    showSessionListView();
                }
                showFeedback("Session deleted.");
                // After deleting a session, analysis data might change
                populateExerciseSelect();
                handleAnalysisTypeChange();
            } catch (err) {
                console.error("Error deleting session from DB:", err);
                alert("Error deleting session. Please try again.");
            }
        }
    }

    async function deleteExercise(sessionId, exerciseId) {
        if (confirm("Are you sure you want to delete this exercise and all its sets? This action cannot be undone.")) {
            const sessionIndex = gymData.sessions.findIndex(s => s.id === sessionId);
            if (sessionIndex === -1) {
                console.error("Session not found for exercise deletion.");
                return;
            }
            const session = gymData.sessions[sessionIndex];
            const originalExercises = JSON.parse(JSON.stringify(session.exercises)); // Deep copy for revert

            session.exercises = session.exercises.filter(ex => ex.id !== exerciseId);

            try {
                await dbPut('sessions', session); // Update the session in DB
                renderExercisesForSession(sessionId);
                if (currentExerciseId === exerciseId) {
                    currentExerciseId = null; // Clear current exercise
                    showExerciseView(); // Will re-render with currentSessionId
                }
                showFeedback("Exercise deleted.");
                populateExerciseSelect();
                handleAnalysisTypeChange();
            } catch (err) {
                console.error("Error deleting exercise from DB:", err);
                gymData.sessions[sessionIndex].exercises = originalExercises; // Revert in-memory
                alert("Error deleting exercise. Please try again.");
            }
        }
    }

    async function deleteSet(sessionId, exerciseId, setId) {
        const sessionIndex = gymData.sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) return;
        const session = gymData.sessions[sessionIndex];

        const exerciseIndex = session.exercises.findIndex(ex => ex.id === exerciseId);
        if (exerciseIndex === -1) return;
        const exercise = session.exercises[exerciseIndex];

        const originalSets = JSON.parse(JSON.stringify(exercise.sets)); // Deep copy

        exercise.sets = exercise.sets.filter(set => set.id !== setId);

        try {
            await dbPut('sessions', session); // Update the session in DB
            renderSetsForExercise(sessionId, exerciseId);
            showFeedback("Set deleted.");
            populateExerciseSelect(); // Analysis data might change
            handleAnalysisTypeChange();
        } catch (err) {
            console.error("Error deleting set from DB:", err);
            gymData.sessions[sessionIndex].exercises[exerciseIndex].sets = originalSets; // Revert
            alert("Error deleting set. Please try again.");
        }
    }

    async function deleteBodyWeightEntry(entryId) {
        if (confirm("Are you sure you want to delete this body weight entry?")) {
            try {
                await dbDelete('bodyWeightLog', entryId);
                gymData.bodyWeightLog = gymData.bodyWeightLog.filter(entry => entry.id !== entryId);
                renderBodyWeightHistory();
                showFeedback("Body weight entry deleted.");
                // If analysis tab is showing bodyweight, refresh it
                if (analysisDataTypeSelect.value === 'bodyweight' && analysisSection.style.display === 'block') {
                    displayBodyWeightProgress();
                }
            } catch (err) {
                console.error("Error deleting body weight entry:", err);
                alert("Error deleting body weight entry. Please try again.");
            }
        }
    }

    function showSessionListView() { // Renamed for clarity
        sessionListDiv.style.display = 'block';
        sessionViewControls.style.display = 'flex'; // Show add session controls
        exerciseViewContainer.style.display = 'none';
        setTrackerContainer.style.display = 'none';
        currentSessionId = null;
        currentExerciseId = null;
    }

    function showExerciseView() {
        sessionListDiv.style.display = 'none';
        sessionViewControls.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'none'; // Explicitly hide detailed view
        setTrackerContainer.style.display = 'none';       // Explicitly hide set tracker
        exerciseViewContainer.style.display = 'block';    // Show this view

        // currentSessionId should already be set from when the session was clicked.
        // Do NOT reset currentSessionId here.
        currentExerciseId = null;
        currentViewingExerciseName = null;
    }

    function showDetailedExerciseView() {
        exerciseViewContainer.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'block';
        setTrackerContainer.style.display = 'none';
        // currentViewingExerciseName and currentExerciseId should be set before calling this
    }

    function showSetTracker() {
        exerciseViewContainer.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'none';
        setTrackerContainer.style.display = 'block';
        // currentSessionId, currentExerciseId, and currentViewingExerciseName should be set
    }

    // --- Render Detailed Exercise View ---
    function renderDetailedExerciseView(exerciseName) {
        currentViewingExerciseName = exerciseName; // Ensure this is set for 1RM context
        detailedExerciseNameEl.textContent = exerciseName;
        detailedExerciseHistoryListEl.innerHTML = '';
        setFor1RMSelect.innerHTML = '<option value="">-- Choose a Set --</option>'; // Clear and add default
        calculated1RMResultEl.textContent = 'Estimated 1RM: -- kg';


        const allSetsForExercise = [];
        gymData.sessions.forEach(session => {
            session.exercises.forEach(ex => {
                if (ex.name === exerciseName) {
                    ex.sets.forEach(set => {
                        allSetsForExercise.push({
                            ...set,
                            sessionDate: session.date || new Date(session.id).toLocaleDateString(), // Fallback for older data
                            sessionName: session.name
                        });
                    });
                }
            });
        });

        // Sort by date, most recent first for history list
        allSetsForExercise.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (allSetsForExercise.length === 0) {
            detailedExerciseHistoryListEl.innerHTML = '<p class="empty-state-message">No history found for this exercise.</p>';
        } else {
            allSetsForExercise.forEach(set => {
                const item = document.createElement('div');
                item.className = 'set-item-historical';
                const datePrefix = document.createElement('span');
                datePrefix.className = 'date-prefix';
                datePrefix.textContent = `${new Date(set.timestamp).toLocaleDateString()} (${set.sessionName}): `;
                item.appendChild(datePrefix);
                item.append(`${set.weight} kg x ${set.reps} reps`);
                if (set.note) item.append(` (${set.note})`);
                detailedExerciseHistoryListEl.appendChild(item);

                // Populate 1RM select dropdown
                if (set.reps > 0 && set.weight > 0) { // Only include valid sets for 1RM
                    const option = document.createElement('option');
                    // Store weight and reps in the option's value or dataset
                    option.value = JSON.stringify({ weight: set.weight, reps: set.reps });
                    option.textContent = `${new Date(set.timestamp).toLocaleDateString()} - ${set.weight}kg x ${set.reps}reps (${set.sessionName})`;
                    setFor1RMSelect.appendChild(option);
                }
            });
        }

        // Render mini-chart for this exercise (e.g., weight over time)
        if (detailedExerciseChart) {
            detailedExerciseChart.destroy();
        }

        // Sort by date, oldest first for chart
        const chartDataPoints = allSetsForExercise.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

        if (chartDataPoints.length > 0) {
            const labels = chartDataPoints.map(s => new Date(s.timestamp).toLocaleDateString());
            const weightData = chartDataPoints.map(s => s.weight);
            // Could add reps or volume data as well

            detailedExerciseChart = new Chart(detailedExerciseChartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Weight Lifted (kg)',
                        data: weightData,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { ticks: { color: '#ccc' }, grid: { color: 'rgba(204,204,204,0.1)'} },
                        y: { ticks: { color: '#ccc' }, grid: { color: 'rgba(204,204,204,0.1)'}, title: { display: true, text: 'Weight (kg)', color: '#ccc'} }
                    },
                    plugins: {
                        legend: { labels: { color: '#ccc'} },
                        title: { display: false } // Main title is already on the page
                    }
                }
            });
            document.getElementById('detailed-exercise-chart-container').style.display = 'block';
        } else {
            document.getElementById('detailed-exercise-chart-container').style.display = 'none';
        }
    }


    // --- Event Handlers ---

    calculate1RMBtn.addEventListener('click', () => {
        if (!setFor1RMSelect.value) {
            alert("Please select a set from the dropdown to calculate 1RM.");
            return;
        }
        try {
            const selectedSetData = JSON.parse(setFor1RMSelect.value);
            const weight = parseFloat(selectedSetData.weight);
            const reps = parseInt(selectedSetData.reps);

            if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) {
                alert("Invalid set data selected for 1RM calculation.");
                calculated1RMResultEl.textContent = 'Estimated 1RM: Error';
                return;
            }

            // Epley formula: 1RM = weight * (1 + reps / 30)
            // Can also use Brzycki: 1RM = weight / (1.0278 - (0.0278 * reps)) for reps > 1
            // For simplicity, using Epley.
            if (reps === 1) { // If reps is 1, that's the 1RM for that set
                calculated1RMResultEl.textContent = `Estimated 1RM: ${weight.toFixed(2)} kg (Actual 1RM for this set)`;
            } else {
                const oneRepMax = weight * (1 + reps / 30);
                calculated1RMResultEl.textContent = `Estimated 1RM: ${oneRepMax.toFixed(2)} kg`;
            }
        } catch (error) {
            console.error("Error parsing set data for 1RM:", error);
            alert("Could not calculate 1RM due to an error in selected set data.");
            calculated1RMResultEl.textContent = 'Estimated 1RM: Error';
        }
    });

    goToSetTrackerBtn.addEventListener('click', () => {
        if (!currentSessionId || !currentExerciseId || !currentViewingExerciseName) {
            // This case should ideally not be hit if state is managed well
            alert("Error: Session or exercise context is missing to track sets.");
            showExerciseView(); // Go back to a safe view
            return;
        }
        // currentExerciseId should be the ID of the exercise whose detailed view we are on.
        // currentViewingExerciseName is its name.
        // currentSessionId is the ID of the session we navigated from to get to the exercise list,
        // then to detailed view. This is important to maintain context.
        renderSetsForExercise(currentSessionId, currentExerciseId); // Prepare set tracker for this specific exercise instance
        showSetTracker();
    });

    backToExerciseListFromDetailBtn.addEventListener('click', () => {
        // We need currentSessionId to be correctly set to go back to the right exercise list
        if (currentSessionId) {
            renderExercisesForSession(currentSessionId); // Re-render the list for the current session
            showExerciseView();
        } else {
            // Fallback if session context was lost (shouldn't happen)
            showSessionListView();
        }
    });

    addSessionBtn.addEventListener('click', () => {
        const sessionName = newSessionNameInput.value.trim();
        if (sessionName) {
            const newSession = {
                id: Date.now(),
                name: sessionName,
                date: new Date().toISOString().split('T')[0], // Add current date by default
                exercises: [],
                sortOrder: gymData.sessions.length
            };
            dbPut('sessions', newSession)
                .then(() => {
                    gymData.sessions.push(newSession);
                    newSessionNameInput.value = '';
                    renderSessions(); // Will render based on new sort order
                    showFeedback("Session added!");
                })
                .catch(err => {
                    console.error("Error adding session to DB:", err);
                    alert("Error saving session. Please try again.");
                });
        } else {
            alert("Please enter a session name.");
        }
    });

    addExerciseBtn.addEventListener('click', () => {
        console.log("[Add Exercise Click] currentSessionId:", currentSessionId); // LOGGING
        if (currentSessionId === null) {
            alert("Please select a session first. (currentSessionId is null)");
            return;
        }
        const exerciseName = newExerciseNameInput.value.trim();
        if (exerciseName) {
            const session = gymData.sessions.find(s => s.id === currentSessionId);
            if (session) {
                console.log("[Add Exercise] Found session:", session.name); // LOGGING
                const newExercise = {
                    id: Date.now(),
                    name: exerciseName,
                    sets: [],
                    order: session.exercises.length
                };
                session.exercises.push(newExercise);
                dbPut('sessions', session)
                    .then(() => {
                        console.log("[Add Exercise] Successfully saved to DB. Rendering exercises for session:", currentSessionId); // LOGGING
                        newExerciseNameInput.value = '';
                        renderExercisesForSession(currentSessionId);
                        showFeedback("Exercise added!");
                    })
                    .catch(err => {
                        console.error("Error adding exercise to DB:", err);
                        session.exercises.pop();
                        alert("Error saving exercise. Please try again.");
                    });
            } else {
                console.error("[Add Exercise] Session not found in gymData for ID:", currentSessionId); // LOGGING
                 alert("Error: Could not find the current session data to add the exercise to.");
            }
        } else {
            alert("Please enter an exercise name.");
        }
    });

    addSetBtn.addEventListener('click', () => {
        if (currentSessionId === null || currentExerciseId === null) {
            alert("Error: Session or exercise not selected.");
            return;
        }
        const weight = parseFloat(setWeightInput.value);
        const reps = parseInt(setRepsInput.value);

        if (isNaN(weight) || isNaN(reps) || weight < 0 || reps <= 0) {
            alert("Please enter valid weight and reps.");
            return;
        }

        const session = gymData.sessions.find(s => s.id === currentSessionId);
        if (!session) return;
        const exercise = session.exercises.find(ex => ex.id === currentExerciseId);
        if (!exercise) return;

        const newSet = {
            id: Date.now(),
            weight: weight,
            reps: reps,
            timestamp: new Date().toISOString()
        };
        exercise.sets.push(newSet); // Modify in-memory object
        dbPut('sessions', session) // Save the whole updated session object
            .then(() => {
                setWeightInput.value = '';
                setRepsInput.value = '';
                renderSetsForExercise(currentSessionId, currentExerciseId);
                showFeedback("Set added!");
            })
            .catch(err => {
                console.error("Error adding set to DB:", err);
                exercise.sets.pop(); // Revert in-memory change
                alert("Error saving set. Please try again.");
            });
    });

    backToSessionsBtn.addEventListener('click', () => {
        showSessionListView();
        renderSessions(); // Re-render sessions in case of changes
    });

    backToExercisesBtn.addEventListener('click', () => {
        showExerciseView();
        // Re-render exercises for the current session to refresh the view
        if (currentSessionId) {
            renderExercisesForSession(currentSessionId);
        } else {
            // Should not happen if currentSessionId is managed correctly
            showSessionListView();
        }
    });

    addBodyWeightBtn.addEventListener('click', () => {
        const date = bodyWeightDateInput.value;
        const weight = parseFloat(bodyWeightInput.value);

        if (!date) {
            alert("Please select a date for the body weight entry.");
            return;
        }
        if (isNaN(weight) || weight <= 0) {
            alert("Please enter a valid positive number for body weight.");
            return;
        }

        const newLogEntry = {
            id: Date.now(),
            date: date,
            weight: weight
        };

        // gymData.bodyWeightLog.push(newLogEntry); // No longer directly modify
        dbPut('bodyWeightLog', newLogEntry)
            .then(() => {
                gymData.bodyWeightLog.push(newLogEntry); // Update in-memory after DB success
                renderBodyWeightHistory();
                showFeedback("Body weight logged!");
                bodyWeightDateInput.value = '';
                bodyWeightInput.value = '';
            })
            .catch(err => {
                console.error("Error logging body weight to DB:", err);
                alert("Error saving body weight. Please try again.");
            });
    });

    // --- Navigation Links ---
    const navLinks = document.querySelectorAll('nav ul li a');
    const sections = document.querySelectorAll('main section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);

            sections.forEach(section => {
                if (section.id === targetId) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });

            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');

            // If navigating to sessions tab, ensure the session list is visible
            if (targetId === 'sessions') {
                showSessionListView(); // Use new navigation function
                renderSessions();
            } else if (targetId === 'analysis') {
                populateExerciseSelect(); // Repopulate exercise list for analysis
                // Update visibility of exercise dropdown based on analysis type
                handleAnalysisTypeChange();
            } else if (targetId === 'body-weight') {
                renderBodyWeightHistory(); // Render history when tab is clicked
                bodyWeightDateInput.valueAsDate = new Date(); // Default date to today
            }
        });
    });

    analysisDataTypeSelect.addEventListener('change', handleAnalysisTypeChange);

    function handleAnalysisTypeChange() {
        const selectedType = analysisDataTypeSelect.value;
        const progressChartContainer = document.getElementById('progress-chart-container');
        const rawDataContainer = document.getElementById('raw-data-container');

        // Hide all specific controls by default, then show relevant ones
        exerciseSelectGroupAnalysis.style.display = 'none';
        multiExerciseSelectGroupAnalysis.style.display = 'none';

        if (selectedType === 'exercise') {
            exerciseSelectGroupAnalysis.style.display = 'inline-block';
            if(exerciseSelectAnalysis.value) {
                progressChartContainer.style.display = 'block';
                rawDataContainer.style.display = 'block';
                displayProgressForExercise(exerciseSelectAnalysis.value);
            } else {
                progressChartContainer.style.display = 'none';
                rawDataContainer.style.display = 'none';
                if (progressChart) progressChart.destroy();
                rawDataOutput.textContent = "Select an exercise to see its progress.";
            }
        } else if (selectedType === 'bodyweight') {
            exerciseSelectAnalysis.style.display = 'none';
            exerciseSelectAnalysis.style.display = 'none';
            exerciseSelectLabelAnalysis.style.display = 'none';
            displayBodyWeightProgress(); // Call the actual function to render chart
        }
    }

    // --- Analysis Functions ---
    function getAllUniqueExerciseNames() {
        const uniqueNames = new Set();
        gymData.sessions.forEach(session => {
            session.exercises.forEach(exercise => {
                uniqueNames.add(exercise.name);
            });
        });
        return Array.from(uniqueNames).sort();
    }

    function populateExerciseSelect() { // For single exercise progress
        exerciseSelectAnalysis.innerHTML = '<option value="">--Select Exercise--</option>';
        const uniqueExerciseNames = getAllUniqueExerciseNames();
        uniqueExerciseNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            exerciseSelectAnalysis.appendChild(option);
        });
    }

    function populateMultiExerciseSelect() { // For volume comparison
        multiExerciseSelectAnalysis.innerHTML = ''; // Clear existing options
        const uniqueExerciseNames = getAllUniqueExerciseNames();
        uniqueExerciseNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            multiExerciseSelectAnalysis.appendChild(option);
        });
    }


    function displayProgressForExercise(exerciseName) {
        rawDataOutput.textContent = '';
        if (progressChart) {
            progressChart.destroy();
        }

        if (!exerciseName) {
            document.getElementById('progress-chart-container').style.display = 'none';
            document.getElementById('raw-data-container').style.display = 'none';
            return;
        }

        document.getElementById('progress-chart-container').style.display = 'block';
        document.getElementById('raw-data-container').style.display = 'block';

        const exerciseDataPoints = [];
        gymData.sessions.forEach(session => {
            session.exercises.forEach(exercise => {
                if (!allExercises.has(exercise.name)) {
                    allExercises.set(exercise.name, []);
                }
                // Aggregate all sets for this exercise name across all sessions
                allExercises.get(exercise.name).push(...exercise.sets.map(set => ({...set, sessionDate: session.date || new Date(session.id).toLocaleDateString()})));
            });
        });

        allExercises.forEach((sets, name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            exerciseSelectAnalysis.appendChild(option);
        });
    }

    function displayProgressForExercise(exerciseName) {
        rawDataOutput.textContent = ''; // Clear previous raw data
        if (progressChart) {
            progressChart.destroy(); // Destroy previous chart instance
        }

        if (!exerciseName) {
            document.getElementById('progress-chart-container').style.display = 'none';
            document.getElementById('raw-data-container').style.display = 'none';
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
                            timestamp: new Date(set.timestamp),
                            weight: set.weight,
                            reps: set.reps,
                            volume: set.weight * set.reps
                        });
                    });
                }
            });
        });

        exerciseDataPoints.sort((a, b) => a.timestamp - b.timestamp);

        if (exerciseDataPoints.length === 0) {
            rawDataOutput.textContent = "No data recorded for this exercise yet.";
            if (progressChart) progressChart.destroy();
             document.getElementById('progress-chart-container').style.display = 'none';
            return;
        }

        rawDataOutput.textContent = JSON.stringify(exerciseDataPoints.map(dp => ({
            date: dp.timestamp.toLocaleDateString(),
            time: dp.timestamp.toLocaleTimeString(),
            weight: dp.weight,
            reps: dp.reps,
            volume: dp.volume
        })), null, 2);

        const labels = exerciseDataPoints.map(dp => dp.timestamp.toLocaleDateString() + ' ' + dp.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        const weightData = exerciseDataPoints.map(dp => dp.weight);
        const repsData = exerciseDataPoints.map(dp => dp.reps);
        const volumeData = exerciseDataPoints.map(dp => dp.volume);

        progressChart = new Chart(progressChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Weight (kg)', data: weightData, borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.5)', yAxisID: 'yWeight' },
                    { label: 'Reps', data: repsData, borderColor: 'rgb(54, 162, 235)', backgroundColor: 'rgba(54, 162, 235, 0.5)', yAxisID: 'yReps' },
                    { label: 'Volume (Weight x Reps)', data: volumeData, borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.5)', yAxisID: 'yVolume', hidden: true }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { display: true, title: { display: true, text: 'Date & Time of Set', color: '#f4f4f4' }, ticks: { color: '#ccc' } },
                    yWeight: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Weight (kg)', color: 'rgb(255, 99, 132)' }, ticks: { color: 'rgb(255, 99, 132)' } },
                    yReps: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Reps', color: 'rgb(54, 162, 235)' }, ticks: { color: 'rgb(54, 162, 235)' }, grid: { drawOnChartArea: false } },
                    yVolume: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Volume (kg*reps)', color: 'rgb(75, 192, 192)' }, ticks: { color: 'rgb(75, 192, 192)' }, grid: { drawOnChartArea: false } }
                },
                plugins: { legend: { labels: { color: '#f4f4f4' } }, tooltip: { titleColor: '#fff', bodyColor: '#ddd', backgroundColor: 'rgba(0,0,0,0.8)' } }
            }
        });
    }

    function displayVolumeComparisonChart(selectedExerciseNames) {
        if (progressChart) {
            progressChart.destroy();
        }
        if (!selectedExerciseNames || selectedExerciseNames.length === 0) {
            rawDataOutput.textContent = "Please select at least one exercise to compare volumes.";
            document.getElementById('progress-chart-container').style.display = 'none';
            return;
        }

        document.getElementById('progress-chart-container').style.display = 'block';
        rawDataOutput.textContent = ''; // Clear raw data or show relevant aggregated data

        const datasets = [];
        const allTimestamps = new Set(); // To create a common X-axis
        const exerciseDataMap = new Map(); // Store aggregated volume per exercise per day

        // Aggregate volume per day for each selected exercise
        selectedExerciseNames.forEach(exName => {
            const dailyVolumes = new Map(); // Date string -> total volume
            gymData.sessions.forEach(session => {
                session.exercises.forEach(exercise => {
                    if (exercise.name === exName) {
                        exercise.sets.forEach(set => {
                            const dateStr = new Date(set.timestamp).toLocaleDateString();
                            allTimestamps.add(new Date(set.timestamp).getTime()); // Collect all unique timestamps
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
            const dataPoints = sortedUniqueTimestamps.map(dateStr => dailyVolumes.get(dateStr) || 0); // Use 0 if no volume for that day

            datasets.push({
                label: `${exName} Volume`,
                data: dataPoints,
                borderColor: colorPalette[index % colorPalette.length],
                backgroundColor: colorPalette[index % colorPalette.length].replace('rgb', 'rgba').replace(')', ', 0.2)'), // Make it transparent
                fill: false,
                tension: 0.1,
            });
        });

        progressChart = new Chart(progressChartCanvas, {
            type: 'line',
            data: {
                labels: sortedUniqueTimestamps,
                datasets: datasets
            },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { display: true, title: { display: true, text: 'Date', color: '#f4f4f4' }, ticks: { color: '#ccc' } },
                    y: { display: true, title: { display: true, text: 'Total Volume (kg*reps)', color: '#f4f4f4' }, ticks: { color: '#ccc' }, beginAtZero: true }
                },
                plugins: { legend: { labels: { color: '#f4f4f4' } }, tooltip: { titleColor: '#fff', bodyColor: '#ddd', backgroundColor: 'rgba(0,0,0,0.8)' },
                    title: { display: true, text: 'Exercise Volume Comparison Over Time', color: '#f4f4f4', font: {size: 16}}
                }
            }
        });
         // Optional: Display aggregated raw data for comparison
        let rawComparisonData = "Daily Volume Data:\n";
        sortedUniqueTimestamps.forEach(dateStr => {
            rawComparisonData += `\nDate: ${dateStr}\n`;
            selectedExerciseNames.forEach(exName => {
                const dailyVolumes = exerciseDataMap.get(exName);
                rawComparisonData += `  ${exName}: ${dailyVolumes.get(dateStr) || 0} kg*reps\n`;
            });
        });
        rawDataOutput.textContent = rawComparisonData;
    }


    // --- Event Listener for Analysis Tab ---
    exerciseSelectAnalysis.addEventListener('change', (e) => {
        displayProgressForExercise(e.target.value);
    });

    generateVolumeComparisonBtn.addEventListener('click', () => {
        const selectedOptions = Array.from(multiExerciseSelectAnalysis.selectedOptions).map(option => option.value);
        if (selectedOptions.length === 0) {
            alert("Please select at least one exercise from the list to compare.");
            return;
        }
        displayVolumeComparisonChart(selectedOptions);
    });


    // --- Feedback Toast Function ---
    function showFeedback(message) {
        const feedbackToast = document.createElement('div');
        feedbackToast.textContent = message;
        feedbackToast.className = 'feedback-toast';
        document.body.appendChild(feedbackToast);

        // Animate in
        setTimeout(() => {
            feedbackToast.classList.add('show');
        }, 10); // Small delay to allow CSS transition to catch

        // Animate out and remove
        setTimeout(() => {
            feedbackToast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(feedbackToast);
            }, 500); // Match CSS transition duration
        }, 2500); // Display time
    }


    // --- Initial Setup ---
    // Initialize DB first, then load data, then set up UI
    initDB()
        .then(() => loadData()) // Step 1: Load any existing data (or initialize gymData if DB is new)
        .then(() => prefillDataIfEmpty()) // Step 2: Potentially clear DB and pre-fill new data
        .then(() => loadData()) // Step 3: Load data again to ensure gymData has pre-filled data if that ran
        .then(() => {
            // Step 4: NOW set up and render the UI with the definitive state of gymData
            console.log("Final gymData before initial render:", JSON.parse(JSON.stringify(gymData)));

            document.getElementById('sessions').style.display = 'block';
            document.getElementById('body-weight').style.display = 'none';
            analysisSection.style.display = 'none';
            document.querySelector('nav ul li a[href="#sessions"]').classList.add('active');

            if (!document.querySelector('nav ul li a[href="#body-weight"]')) {
                const bodyWeightNavLinkItem = document.createElement('li');
                bodyWeightNavLinkItem.innerHTML = '<a href="#body-weight">Body Weight</a>';
                const analysisLinkItem = document.querySelector('nav ul li a[href="#analysis"]').parentElement;
                if (analysisLinkItem) { // Ensure analysisLinkItem exists before inserting
                    document.querySelector('nav ul').insertBefore(bodyWeightNavLinkItem, analysisLinkItem);
                } else { // Fallback if analysis link isn't there for some reason
                    document.querySelector('nav ul').appendChild(bodyWeightNavLinkItem);
                }
            }

            const allNavLinks = document.querySelectorAll('nav ul li a');
            const sections = document.querySelectorAll('main section');
            allNavLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href').substring(1);
                    sections.forEach(section => {
                        section.style.display = (section.id === targetId) ? 'block' : 'none';
                    });
                    allNavLinks.forEach(navLink => navLink.classList.remove('active'));
                    link.classList.add('active');
                    if (targetId === 'sessions') {
                        showSessionListView();
                        renderSessions();
                    } else if (targetId === 'analysis') {
                        populateExerciseSelect();
                        handleAnalysisTypeChange();
                    } else if (targetId === 'body-weight') {
                        renderBodyWeightHistory();
                        bodyWeightDateInput.valueAsDate = new Date();
                    }
                });
            });

            showSessionListView();
            renderSessions();
            renderBodyWeightHistory();
            bodyWeightDateInput.valueAsDate = new Date();

            populateExerciseSelect();
            handleAnalysisTypeChange();
            displayProgressForExercise("");
        })
        .catch(error => {
            console.error("Failed to initialize DB or load/prefill data:", error);
            alert("Application could not start correctly. Please try refreshing. If the problem persists, your browser might not support IndexedDB or is in private mode.");
            gymData = { sessions: [], bodyWeightLog: [] }; // Fallback
            renderSessions(); // Attempt to render with empty data
        });

    // --- Data Pre-fill ---
    async function prefillDataIfEmpty() {
        if (!db) {
            console.warn("DB not ready for prefill check.");
            return Promise.resolve(); // Resolve if DB not ready, so main chain continues
        }

        return new Promise((resolve, reject) => {
            // For this specific request, we always clear and prefill.
            // For a production app, you'd check if prefill is needed (e.g., countRequest.result === 0)
            const transaction = db.transaction(['sessions'], 'readwrite');
            const sessionStore = transaction.objectStore('sessions');

            console.warn("DEVELOPMENT: Clearing all existing sessions before pre-fill as per current task requirement.");
            const clearRequest = sessionStore.clear();

            clearRequest.onsuccess = async () => {
                console.log("All sessions cleared from DB. Proceeding with pre-fill.");
                showFeedback("Setting up initial data (existing sessions cleared)...");
                try {
                    await populateWithProvidedData(); // This populates the DB
                    showFeedback("Initial data populated into DB!");
                    resolve(); // Resolve after populating DB
                } catch (populateError) {
                    console.error("Error during populateWithProvidedData:", populateError);
                    reject(populateError);
                }
            };
            clearRequest.onerror = (event) => {
                console.error("Error clearing sessions for pre-fill:", event.target.error);
                alert("Could not clear existing session data for pre-fill. Please check console.");
                reject(event.target.error);
            };
        });
    }

    async function populateWithProvidedData() {
        console.log("Populating with provided data...");
        const providedSessionData = [
            // NEW "session 1" (Push Day data) - Date: 2025-07-04
            {
                sessionName: "session 1", // As requested
                date: "2025-07-04",
                exercises: [
                    { name: "Bench Press", sets: [{ weight: 70, reps: 7 }, { weight: 60, reps: 10 }, { weight: 60, reps: 6 }, { weight: 60, reps: 4 }] },
                    { name: "Barbell Overhead Press", sets: [{ weight: 30, reps: 10 }, { weight: 30, reps: 8 }, { weight: 30, reps: 9 }] },
                    { name: "Overhead Triceps Extension (Cable)", sets: [{ weight: 27, reps: 10 }, { weight: 27, reps: 10 }, { weight: 27, reps: 10 }] },
                    { name: "Triceps Cable Push (Horizontal Bar)", sets: [{ weight: 50, reps: 9 }, { weight: 50, reps: 6 }, { weight: 45, reps: 0, note: "Drop Set to 36kg" }] }, // Assuming 0 reps for the start of drop set for now
                    { name: "Cable Chest Flies", sets: [{ weight: 14, reps: 16 }, { weight: 18, reps: 10 }, { weight: 14, reps: 16 }, { weight: 18, reps: 7, note: "Drop Set" }] }
                ]
            },
            // ORIGINAL PUSH DAY - Date: 03/07/2025 (YYYY-MM-DD: 2025-07-03)
            {
                sessionName: "Push Day (Chest / Forearms / Triceps)",
                date: "2025-07-03",
                exercises: [
                    { name: "Bench Press", sets: [{ weight: 70, reps: 7 }, { weight: 60, reps: 10 }, { weight: 60, reps: 6 }, { weight: 60, reps: 4 }] },
                    { name: "Barbell Overhead Press", sets: [{ weight: 30, reps: 10 }, { weight: 30, reps: 8 }, { weight: 30, reps: 9 }] },
                    { name: "Overhead Triceps Extension (Cable)", sets: [{ weight: 27, reps: 10 }, { weight: 27, reps: 10 }, { weight: 27, reps: 10 }] },
                    { name: "Triceps Cable Push (Horizontal Bar)", sets: [{ weight: 50, reps: 9 }, { weight: 50, reps: 6 }, { weight: 45, reps: 0, note: "Drop Set to 36kg" }] },
                    { name: "Cable Chest Flies", sets: [{ weight: 14, reps: 16 }, { weight: 18, reps: 10 }, { weight: 14, reps: 16 }, { weight: 18, reps: 7, note: "Drop Set" }] }
                ]
            },
            // PULL DAY - Assign a recent date (e.g., 2025-07-02)
            {
                sessionName: "Pull Day (Back / Biceps / Core)",
                date: "2025-07-02",
                exercises: [
                    { name: "Deadlift", sets: [{ weight: 90, reps: 5 }, { weight: 90, reps: 8 }, { weight: 90, reps: 7 }, { weight: 80, reps: 6 }] },
                    { name: "Back-Middle Bar Row", sets: [{ weight: 50, reps: 12 }, { weight: 50, reps: 14 }, { weight: 50, reps: 8 }] },
                    { name: "Barbell Biceps Curl", sets: [{ weight: 30, reps: 5 }, { weight: 20, reps: 5 }, { weight: 20, reps: 11 }, { weight: 20, reps: 13 }, { weight: 20, reps: 6 }] },
                    { name: "Hammer Curl (Cable)", sets: [{ weight: 27, reps: 13 }, { weight: 27, reps: 8 }, { weight: 27, reps: 14 }], note: "Flexible Cable" }, // Note at exercise level
                    { name: "Hammer Curl (Dumbells)", sets: [{ weight: 10, reps: 11 }, { weight: 10, reps: 9 }, { weight: 10, reps: 8 }], note: "Dumbells" }, // Note at exercise level
                    { name: "Abs Cable Machine", sets: [{ weight: 41, reps: 20 }, { weight: 59, reps: 9 }, { weight: 59, reps: 19 }, { weight: 64, reps: 16 }] }
                ]
            },
            // LEG DAY - Assign a recent date (e.g., 2025-07-01)
            {
                sessionName: "Leg Day (Quads / Shoulders / Calves)",
                date: "2025-07-01",
                exercises: [
                    { name: "Squat", sets: [] }, // kg x means 0 reps or no data yet
                    { name: "Calf Raise", sets: [], note: "Standing/Seated" },
                    { name: "Barbell Overhead Press", sets: [{ weight: 30, reps: 10 }, { weight: 30, reps: 8 }, { weight: 30, reps: 9 }] },
                    { name: "Shoulder Lateral Raise", sets: [{ weight: 8, reps: 14 }, { weight: 8, reps: 12 }, { weight: 8, reps: 7 }, { weight: 6, reps: 8, note: "Drop Set" }], note: "Dumbells" }
                ]
            },
            // STRENGTH DAY - Assign a recent date (e.g., 2025-06-30)
            {
                sessionName: "Strength Day",
                date: "2025-06-30",
                exercises: [
                    { name: "Russian Seesaw", sets: [{ weight: 20, reps: 0 }, { weight: 20, reps: 0 }, { weight: 20, reps: 0 }, { weight: 20, reps: 0 }] }, // kg x means 0 reps
                    { name: "Deadlift", sets: [{ weight: 90, reps: 5 }, { weight: 90, reps: 8 }, { weight: 90, reps: 7 }, { weight: 80, reps: 6 }] },
                    { name: "Bench Press", sets: [{ weight: 70, reps: 7 }, { weight: 60, reps: 10 }, { weight: 60, reps: 6 }, { weight: 60, reps: 4 }] },
                    { name: "Barbell Biceps Curl", sets: [{ weight: 30, reps: 5 }, { weight: 20, reps: 5 }, { weight: 20, reps: 11 }, { weight: 20, reps: 13 }, { weight: 20, reps: 6 }] },
                    { name: "Forearm Curls (In)", sets: [{ weight: 30, reps: 0 }, { weight: 30, reps: 0 }, { weight: 30, reps: 0 }] }, // kg x means 0 reps
                    { name: "Forearm Curls (Out)", sets: [{ weight: 30, reps: 0 }, { weight: 30, reps: 0 }, { weight: 30, reps: 0 }] } // kg x means 0 reps
                ]
            }
        ];

        for (const [index, sessionData] of providedSessionData.entries()) {
            const sessionTimestamp = new Date(sessionData.date).toISOString(); // Use provided date for timestamp

            const newSession = {
                id: Date.now() + index, // More robust unique ID generation
                name: sessionData.sessionName,
                date: sessionData.date, // YYYY-MM-DD format
                sortOrder: index, // Assign sort order based on array position
                exercises: sessionData.exercises.map((exData, exIndex) => ({
                    id: Date.now() + index + 1000 + exIndex, // More robust unique ID
                    name: exData.name,
                    note: exData.note || "",
                    order: exIndex, // Assign order for exercises within session
                    sets: exData.sets.map((setData, setIndex) => ({
                        id: Date.now() + index + 2000 + exIndex + setIndex, // More robust unique ID
                        weight: setData.weight || 0, // Default to 0 if not specified
                        reps: setData.reps || 0,     // Default to 0 if not specified
                        timestamp: sessionTimestamp, // Use session's date as timestamp for all its sets
                        note: setData.note || ""
                    }))
                }))
            };
            try {
                await dbPut('sessions', newSession);
                console.log(`Prefilled session: ${newSession.name} for date ${newSession.date}`);
            } catch (err) {
                console.error(`Error prefilling session ${newSession.name}:`, err);
            }
        }
    }

    // Start with the sessions section visible and others hidden
    // document.getElementById('sessions').style.display = 'block';
    document.getElementById('body-weight').style.display = 'none';
    analysisSection.style.display = 'none';
    document.querySelector('nav ul li a[href="#sessions"]').classList.add('active');
    // Add Body Weight to nav
    const bodyWeightNavLink = document.createElement('li');
    bodyWeightNavLink.innerHTML = '<a href="#body-weight">Body Weight</a>';
    document.querySelector('nav ul').insertBefore(bodyWeightNavLink, document.querySelector('nav ul li a[href="#analysis"]').parentElement);
    // Re-query navLinks to include the new one
    const allNavLinks = document.querySelectorAll('nav ul li a');
    allNavLinks.forEach(link => {
        link.addEventListener('click', (e) => { // Re-attach event listeners
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);

            sections.forEach(section => {
                section.style.display = (section.id === targetId) ? 'block' : 'none';
            });

            allNavLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');

            if (targetId === 'sessions') {
                showSessionListView();
                renderSessions();
            } else if (targetId === 'analysis') {
                populateExerciseSelect();
                handleAnalysisTypeChange();
            } else if (targetId === 'body-weight') {
                renderBodyWeightHistory();
                bodyWeightDateInput.valueAsDate = new Date();
            }
        });
    });


    showSessionListView();
    renderSessions();
    renderBodyWeightHistory(); // Initial render in case of existing data
    bodyWeightDateInput.valueAsDate = new Date(); // Set default date for new entries

    // Populate exercise dropdown when analysis tab is shown (or initially if it's the default view)
    // We'll also update it when the analysis tab is clicked in nav
    const analysisNavLink = document.querySelector('nav ul li a[href="#analysis"]');
    if (analysisNavLink) {
        analysisNavLink.addEventListener('click', () => {
            populateExerciseSelect();
            // Reset chart if no exercise is selected or if navigating away and back
            displayProgressForExercise(exerciseSelectAnalysis.value);
        });
    }
    // Initial population in case the Analysis tab is made visible by default at some point
    populateExerciseSelect();
    displayProgressForExercise(""); // Initially show no chart / empty state

});
