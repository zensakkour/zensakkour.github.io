document.addEventListener('DOMContentLoaded', () => {
    console.log("JavaScript file loaded and DOM fully parsed.");

    const LOCAL_STORAGE_KEY = 'gymAppTrackerData';

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

    // DOM Elements
    const sessionListDiv = document.getElementById('session-list');
    const newSessionNameInput = document.getElementById('new-session-name');
    const addSessionBtn = document.getElementById('add-session-btn');

    // Containers for different views
    const sessionViewControls = document.querySelector('#sessions .controls-group');
    const exerciseViewContainer = document.getElementById('exercise-view-container');
    const detailedExerciseViewContainer = document.getElementById('detailed-exercise-view-container');
    const setTrackerContainer = document.getElementById('set-tracker-container');

    // Elements within Exercise View
    const currentSessionTitle = document.getElementById('current-session-title');
    const exerciseListDiv = document.getElementById('exercise-list');
    const newExerciseNameInput = document.getElementById('new-exercise-name');
    const addExerciseBtn = document.getElementById('add-exercise-btn');
    const backToSessionsBtn = document.getElementById('back-to-sessions-btn');

    // Elements within Set Tracker View
    const currentExerciseTitleSet = document.getElementById('current-exercise-title-set');
    const setsListDiv = document.getElementById('sets-list');
    const setWeightInput = document.getElementById('set-weight');
    const setRepsInput = document.getElementById('set-reps');
    const addSetBtn = document.getElementById('add-set-btn');
    const backToExercisesBtn = document.getElementById('back-to-exercises-btn');

    // Analysis Section Elements
    const analysisSection = document.getElementById('analysis');
    const analysisDataTypeSelect = document.getElementById('analysis-data-type-select');
    const exerciseSelectAnalysis = document.getElementById('exercise-select-analysis');
    const exerciseSelectLabelAnalysis = document.getElementById('exercise-select-label-analysis');
    const exerciseSelectGroupAnalysis = document.getElementById('exercise-select-group-analysis');
    const multiExerciseSelectAnalysis = document.getElementById('multi-exercise-select-analysis');
    const multiExerciseSelectGroupAnalysis = document.getElementById('multi-exercise-select-group-analysis');
    const generateVolumeComparisonBtn = document.getElementById('generate-volume-comparison-btn');
    const progressChartCanvas = document.getElementById('progressChart').getContext('2d');
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
    let currentExerciseId = null;
    let currentViewingExerciseName = null;

    // --- localStorage Persistence Functions ---

    function saveDataToLocalStorage() {
        try {
            const dataToSave = JSON.parse(JSON.stringify(gymData));
            dataToSave.sessions.forEach(session => {
                session.exercises.forEach(exercise => {
                    exercise.sets.forEach(set => {
                        if (set.timestamp instanceof Date) {
                            set.timestamp = set.timestamp.toISOString();
                        }
                    });
                });
            });
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
            console.log("Data saved to localStorage.");
        } catch (e) {
            console.error("Error saving data to localStorage:", e);
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                alert("Could not save data: Storage quota exceeded. Please free up some space or contact support if this issue persists.");
            } else {
                alert("An error occurred while saving your data. Please try again.");
            }
            // Re-throw the error if we want the main init chain to also catch it.
            // For now, alerts are shown directly.
            // throw e;
        }
    }

    function loadDataFromLocalStorage() {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData && typeof parsedData === 'object' && 'sessions' in parsedData && 'bodyWeightLog' in parsedData) {
                    parsedData.sessions.forEach(session => {
                        session.exercises.forEach(exercise => {
                            exercise.sets.forEach(set => {
                                if (set.timestamp && typeof set.timestamp === 'string') {
                                    const dateObj = new Date(set.timestamp);
                                    if (!isNaN(dateObj.getTime())) {
                                        set.timestamp = dateObj;
                                    } else {
                                        console.warn(`Invalid date string encountered for set timestamp: ${set.timestamp}. Leaving as string.`);
                                    }
                                }
                            });
                        });
                    });
                    gymData = parsedData;
                    console.log("Data loaded from localStorage:", gymData);
                } else {
                    console.warn("Data retrieved from localStorage is not in the expected format. Initializing with empty data.");
                    gymData = { sessions: [], bodyWeightLog: [] };
                }
            } catch (e) {
                console.error("Error parsing data from localStorage:", e);
                alert("Could not load saved data due to a parsing error. Starting with a fresh session. If you have a backup, please consider using it. Previous data might be corrupted.");
                gymData = { sessions: [], bodyWeightLog: [] };
                // throw e; // Re-throw if the main init chain should also catch this.
            }
        } else {
            console.log("No data found in localStorage. Initializing with empty data.");
            gymData = { sessions: [], bodyWeightLog: [] };
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
        if (!gymData.bodyWeightLog || gymData.bodyWeightLog.length === 0) {
            progressChart = new Chart(progressChartCanvas, {
                type: 'line', data: { labels: [], datasets: []},
                options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Body Weight Progress - No Data', color: '#f4f4f4'}}}
            });
            return;
        }
        const sortedLog = [...gymData.bodyWeightLog].sort((a, b) => new Date(a.date) - new Date(b.date));
        const labels = sortedLog.map(entry => new Date(entry.date).toLocaleDateString());
        const weightData = sortedLog.map(entry => entry.weight);
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

    // --- Render Functions ---
    function renderSessions() {
        sessionListDiv.innerHTML = '';
        if (!gymData.sessions || gymData.sessions.length === 0) {
            sessionListDiv.innerHTML = '<p class="empty-state-message">No sessions created yet. Add one below!</p>';
        } else {
            const sortedSessions = [...gymData.sessions].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            sortedSessions.forEach(session => {
                const button = document.createElement('button');
                button.className = 'session-item button';
                button.textContent = session.name;
                button.dataset.sessionId = session.id;
                const sessionItemContainer = document.createElement('div');
                sessionItemContainer.className = 'list-item-container';
                button.addEventListener('click', (e) => {
                    if (e.target.closest('.delete-btn')) return;
                    currentSessionId = session.id;
                    renderExercisesForSession(session.id);
                    showExerciseView();
                });
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '&times;';
                deleteBtn.className = 'delete-btn button-danger';
                deleteBtn.title = `Delete session: ${session.name}`;
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                });
                sessionItemContainer.appendChild(button);
                sessionItemContainer.appendChild(deleteBtn);
                sessionItemContainer.draggable = true;
                sessionItemContainer.dataset.sessionIdForDrag = session.id;
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

    function handleDropSession(e) {
        e.preventDefault();
        e.stopPropagation();
        const targetSessionId = this.dataset.sessionIdForDrag;
        this.classList.remove('drag-over-session');
        if (draggedSessionId === targetSessionId) return;

        const draggedIndex = gymData.sessions.findIndex(s => s.id.toString() === draggedSessionId);
        let targetIndex = gymData.sessions.findIndex(s => s.id.toString() === targetSessionId);

        if (draggedIndex === -1 || targetIndex === -1) {
            console.error("Dragged or target session not found in gymData.");
            draggedSessionId = null;
            return;
        }
        const [draggedItem] = gymData.sessions.splice(draggedIndex, 1);
        const targetSessionAfterSplice = gymData.sessions.find(s => s.id.toString() === targetSessionId);

        if (!targetSessionAfterSplice) {
            gymData.sessions.push(draggedItem);
        } else {
            const newTargetIndex = gymData.sessions.indexOf(targetSessionAfterSplice);
            const rect = this.getBoundingClientRect();
            const verticalMidpoint = rect.top + rect.height / 2;
            if (e.clientY < verticalMidpoint) {
                gymData.sessions.splice(newTargetIndex, 0, draggedItem);
            } else {
                gymData.sessions.splice(newTargetIndex + 1, 0, draggedItem);
            }
        }
        gymData.sessions.forEach((session, index) => {
            session.sortOrder = index;
        });
        saveDataToLocalStorage();
        console.log("Sessions reordered and saved to localStorage.");
        renderSessions();
        draggedSessionId = null;
    }

    function handleDragEndSession() {
        this.classList.remove('dragging-session');
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
            const sortedExercises = [...session.exercises].sort((a, b) => (a.order || 0) - (b.order || 0));
            sortedExercises.forEach(exercise => {
                const exerciseItemContainer = document.createElement('div');
                exerciseItemContainer.className = 'list-item-container exercise-drag-item';
                exerciseItemContainer.draggable = true;
                exerciseItemContainer.dataset.exerciseIdForDrag = exercise.id;
                exerciseItemContainer.dataset.parentSessionId = sessionId;
                exerciseItemContainer.addEventListener('dragstart', handleDragStartExercise);
                exerciseItemContainer.addEventListener('dragover', handleDragOverSession);
                exerciseItemContainer.addEventListener('dragleave', handleDragLeaveExercise);
                exerciseItemContainer.addEventListener('drop', handleDropExercise);
                exerciseItemContainer.addEventListener('dragend', handleDragEndExercise);
                const button = document.createElement('button');
                button.className = 'exercise-item button';
                button.textContent = exercise.name;
                button.addEventListener('click', (e) => {
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
                    e.stopPropagation();
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

    function handleDropExercise(e) {
        e.preventDefault();
        e.stopPropagation();
        const targetExerciseId = this.dataset.exerciseIdForDrag;
        const parentSessionId = this.dataset.parentSessionId;
        this.classList.remove('drag-over-exercise');
        if (draggedExerciseId === targetExerciseId || parentSessionId !== sourceSessionIdForExerciseDrag) return;

        const session = gymData.sessions.find(s => s.id.toString() === parentSessionId);
        if (!session) {
            console.error("Parent session not found for exercise drop.");
            draggedExerciseId = null; sourceSessionIdForExerciseDrag = null;
            return;
        }
        const draggedIndex = session.exercises.findIndex(ex => ex.id.toString() === draggedExerciseId);
        if (draggedIndex === -1) {
            console.error("Dragged exercise not found in session.");
            draggedExerciseId = null; sourceSessionIdForExerciseDrag = null;
            return;
        }
        const [draggedItem] = session.exercises.splice(draggedIndex, 1);
        const newTargetIndex = session.exercises.findIndex(ex => ex.id.toString() === targetExerciseId);

        if (newTargetIndex !== -1) {
            const rect = this.getBoundingClientRect();
            const verticalMidpoint = rect.top + rect.height / 2;
            if (e.clientY < verticalMidpoint) {
                session.exercises.splice(newTargetIndex, 0, draggedItem);
            } else {
                session.exercises.splice(newTargetIndex + 1, 0, draggedItem);
            }
        } else {
            session.exercises.push(draggedItem);
        }
        session.exercises.forEach((ex, index) => {
            ex.order = index;
        });
        saveDataToLocalStorage();
        console.log("Exercises reordered within session and saved to localStorage.");
        renderExercisesForSession(parentSessionId);
        draggedExerciseId = null;
        sourceSessionIdForExerciseDrag = null;
    }

    function handleDragEndExercise() {
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
                setItemContainer.className = 'set-item';
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
            const lastSet = exercise.sets[exercise.sets.length - 1];
            setWeightInput.placeholder = `Last: ${lastSet.weight} kg`;
            setRepsInput.placeholder = `Last: ${lastSet.reps} reps`;
        }
    }

    // --- UI Navigation Functions ---

    // --- Deletion Functions ---
    function deleteSession(sessionId) {
        if (confirm("Are you sure you want to delete this session and all its exercises and sets? This action cannot be undone.")) {
            gymData.sessions = gymData.sessions.filter(session => session.id !== sessionId);
            saveDataToLocalStorage();
            renderSessions();
            if (currentSessionId === sessionId) {
                currentSessionId = null;
                showSessionListView();
            }
            showFeedback("Session deleted.");
            populateExerciseSelect();
            handleAnalysisTypeChange();
        }
    }

    function deleteExercise(sessionId, exerciseId) {
        if (confirm("Are you sure you want to delete this exercise and all its sets? This action cannot be undone.")) {
            const sessionIndex = gymData.sessions.findIndex(s => s.id === sessionId);
            if (sessionIndex === -1) {
                console.error("Session not found for exercise deletion.");
                return;
            }
            const session = gymData.sessions[sessionIndex];
            session.exercises = session.exercises.filter(ex => ex.id !== exerciseId);
            saveDataToLocalStorage();
            renderExercisesForSession(sessionId);
            if (currentExerciseId === exerciseId) {
                currentExerciseId = null;
                showExerciseView();
            }
            showFeedback("Exercise deleted.");
            populateExerciseSelect();
            handleAnalysisTypeChange();
        }
    }

    function deleteSet(sessionId, exerciseId, setId) {
        const sessionIndex = gymData.sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) return;
        const session = gymData.sessions[sessionIndex];
        const exerciseIndex = session.exercises.findIndex(ex => ex.id === exerciseId);
        if (exerciseIndex === -1) return;
        const exercise = session.exercises[exerciseIndex];
        exercise.sets = exercise.sets.filter(set => set.id !== setId);
        saveDataToLocalStorage();
        renderSetsForExercise(sessionId, exerciseId);
        showFeedback("Set deleted.");
        populateExerciseSelect();
        handleAnalysisTypeChange();
    }

    function deleteBodyWeightEntry(entryId) {
        if (confirm("Are you sure you want to delete this body weight entry?")) {
            gymData.bodyWeightLog = gymData.bodyWeightLog.filter(entry => entry.id !== entryId);
            saveDataToLocalStorage();
            renderBodyWeightHistory();
            showFeedback("Body weight entry deleted.");
            if (analysisDataTypeSelect.value === 'bodyweight' && analysisSection.style.display === 'block') {
                displayBodyWeightProgress();
            }
        }
    }

    function showSessionListView() {
        sessionListDiv.style.display = 'block';
        sessionViewControls.style.display = 'flex';
        exerciseViewContainer.style.display = 'none';
        setTrackerContainer.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'none';
        currentSessionId = null;
        currentExerciseId = null;
    }

    function showExerciseView() {
        sessionListDiv.style.display = 'none';
        sessionViewControls.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'none';
        setTrackerContainer.style.display = 'none';
        exerciseViewContainer.style.display = 'block';
        currentExerciseId = null;
        currentViewingExerciseName = null;
    }

    function showDetailedExerciseView() {
        exerciseViewContainer.style.display = 'none';
        setTrackerContainer.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'block';
    }

    function showSetTracker() {
        exerciseViewContainer.style.display = 'none';
        detailedExerciseViewContainer.style.display = 'none';
        setTrackerContainer.style.display = 'block';
    }

    // --- Render Detailed Exercise View ---
    function renderDetailedExerciseView(exerciseName) {
        currentViewingExerciseName = exerciseName;
        detailedExerciseNameEl.textContent = exerciseName;
        detailedExerciseHistoryListEl.innerHTML = '';
        setFor1RMSelect.innerHTML = '<option value="">-- Choose a Set --</option>';
        calculated1RMResultEl.textContent = 'Estimated 1RM: -- kg';

        const allPerformances = [];
        gymData.sessions.forEach(session => {
            const foundExercise = session.exercises.find(ex => ex.name === exerciseName);
            if (foundExercise && foundExercise.sets.length > 0) {
                foundExercise.sets.forEach(set => {
                    allPerformances.push({
                        ...set,
                        sessionDate: session.date,
                        sessionName: session.name,
                        sessionId: session.id,
                        exerciseIdInSession: foundExercise.id
                    });
                });
            }
        });

        allPerformances.sort((a, b) => {
            const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
            const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
            return dateB - dateA;
        });


        if (allPerformances.length > 0) {
            const mostRecentSet = allPerformances[0];
            const mostRecentSessionDateStr = mostRecentSet.sessionDate;
            const mostRecentSessionName = mostRecentSet.sessionName;

            const historyHeader = document.createElement('h5');
            const displayDate = mostRecentSessionDateStr ? new Date(mostRecentSessionDateStr).toLocaleDateString() : 'N/A';
            historyHeader.textContent = `Last Performed on: ${displayDate} (in session: ${mostRecentSessionName})`;
            detailedExerciseHistoryListEl.appendChild(historyHeader);

            allPerformances.filter(set => set.sessionId === mostRecentSet.sessionId && set.exerciseIdInSession === mostRecentSet.exerciseIdInSession)
                .sort((a,b) => {
                    const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
                    const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
                    return dateA - dateB;
                })
                .forEach((set, index) => {
                    const item = document.createElement('div');
                    item.className = 'set-item-historical';
                    item.textContent = `Set ${index + 1}: ${set.weight} kg x ${set.reps} reps`;
                    if (set.note) item.append(` (${set.note})`);
                    detailedExerciseHistoryListEl.appendChild(item);
                });
        } else {
            detailedExerciseHistoryListEl.innerHTML = '<p class="empty-state-message">No previous performance found for this exercise.</p>';
        }

        if (allPerformances.length > 0) {
            allPerformances.forEach(set => {
                if (set.reps > 0 && set.weight > 0) {
                    const option = document.createElement('option');
                    option.value = JSON.stringify({ weight: set.weight, reps: set.reps });
                    let displayTimestamp = set.timestamp;
                    if (set.timestamp instanceof Date) {
                        displayTimestamp = set.timestamp.toLocaleDateString();
                    } else if (typeof set.timestamp === 'string') {
                        const d = new Date(set.timestamp);
                        displayTimestamp = !isNaN(d.getTime()) ? d.toLocaleDateString() : 'Invalid Date';
                    }
                    option.textContent = `${displayTimestamp} - ${set.weight}kg x ${set.reps}reps (${set.sessionName})`;
                    setFor1RMSelect.appendChild(option);
                }
            });
        }

        if (detailedExerciseChart) {
            detailedExerciseChart.destroy();
        }
        const chartDataPoints = [...allPerformances].filter(s => s.weight > 0).sort((a,b) => {
            const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
            const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
            return dateA - dateB;
        });


        if (chartDataPoints.length > 0) {
            const labels = chartDataPoints.map(s => {
                if (s.timestamp instanceof Date) return s.timestamp.toLocaleDateString();
                const d = new Date(s.timestamp);
                return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'Invalid Date';
            });
            const weightData = chartDataPoints.map(s => s.weight);

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
            if (reps === 1) {
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
            alert("Error: Session or exercise context is missing to track sets.");
            showExerciseView();
            return;
        }
        renderSetsForExercise(currentSessionId, currentExerciseId);
        showSetTracker();
    });

    backToExerciseListFromDetailBtn.addEventListener('click', () => {
        if (currentSessionId) {
            renderExercisesForSession(currentSessionId);
            showExerciseView();
        } else {
            showSessionListView();
        }
    });

    addSessionBtn.addEventListener('click', () => {
        const sessionName = newSessionNameInput.value.trim();
        if (sessionName) {
            const newSession = {
                id: Date.now(),
                name: sessionName,
                date: new Date().toISOString().split('T')[0],
                exercises: [],
                sortOrder: gymData.sessions.length
            };
            gymData.sessions.push(newSession);
            saveDataToLocalStorage();
            newSessionNameInput.value = '';
            renderSessions();
            showFeedback("Session added!");
        } else {
            alert("Please enter a session name.");
        }
    });

    addExerciseBtn.addEventListener('click', () => {
        if (currentSessionId === null) {
            alert("Please select a session first. (currentSessionId is null)");
            return;
        }
        const exerciseName = newExerciseNameInput.value.trim();
        if (exerciseName) {
            const session = gymData.sessions.find(s => s.id === currentSessionId);
            if (session) {
                const newExercise = {
                    id: Date.now(),
                    name: exerciseName,
                    sets: [],
                    order: session.exercises.length
                };
                session.exercises.push(newExercise);
                saveDataToLocalStorage();
                newExerciseNameInput.value = '';
                renderExercisesForSession(currentSessionId);
                showFeedback("Exercise added!");
            } else {
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
            timestamp: new Date() // Store as Date object
        };
        exercise.sets.push(newSet);
        saveDataToLocalStorage();
        setWeightInput.value = '';
        setRepsInput.value = '';
        renderSetsForExercise(currentSessionId, currentExerciseId);
        showFeedback("Set added!");
    });

    backToSessionsBtn.addEventListener('click', () => {
        showSessionListView();
        renderSessions();
    });

    backToExercisesBtn.addEventListener('click', () => {
        showExerciseView();
        if (currentSessionId) {
            renderExercisesForSession(currentSessionId);
        } else {
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
        gymData.bodyWeightLog.push(newLogEntry);
        saveDataToLocalStorage();
        renderBodyWeightHistory();
        showFeedback("Body weight logged!");
        bodyWeightDateInput.value = '';
        bodyWeightInput.value = '';
    });

    // --- Navigation Links ---
    const navLinks = document.querySelectorAll('nav ul li a');
    const sections = document.querySelectorAll('main section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            sections.forEach(section => {
                section.style.display = (section.id === targetId) ? 'block' : 'none';
            });
            navLinks.forEach(navLink => navLink.classList.remove('active'));
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

    analysisDataTypeSelect.addEventListener('change', handleAnalysisTypeChange);

    function handleAnalysisTypeChange() {
        const selectedType = analysisDataTypeSelect.value;
        const progressChartContainer = document.getElementById('progress-chart-container');
        exerciseSelectGroupAnalysis.style.display = 'none';
        multiExerciseSelectGroupAnalysis.style.display = 'none';

        if (selectedType === 'exercise') {
            exerciseSelectGroupAnalysis.style.display = 'inline-block';
            if(exerciseSelectAnalysis.value) {
                progressChartContainer.style.display = 'block';
                displayProgressForExercise(exerciseSelectAnalysis.value);
            } else {
                progressChartContainer.style.display = 'none';
                if (progressChart) progressChart.destroy();
            }
        } else if (selectedType === 'bodyweight') {
            displayBodyWeightProgress();
        } else if (selectedType === 'volume_comparison_exercises') {
            multiExerciseSelectGroupAnalysis.style.display = 'block';
            populateMultiExerciseSelect();
            if (progressChart) progressChart.destroy();
            progressChartContainer.style.display = 'none';
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

    function populateExerciseSelect() {
        exerciseSelectAnalysis.innerHTML = '<option value="">--Select Exercise--</option>';
        const uniqueExerciseNames = getAllUniqueExerciseNames();
        uniqueExerciseNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            exerciseSelectAnalysis.appendChild(option);
        });
    }

    function populateMultiExerciseSelect() {
        multiExerciseSelectAnalysis.innerHTML = '';
        const uniqueExerciseNames = getAllUniqueExerciseNames();
        uniqueExerciseNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            multiExerciseSelectAnalysis.appendChild(option);
        });
    }

    function displayProgressForExercise(exerciseName) {
        if (progressChart) {
            progressChart.destroy();
        }
        if (!exerciseName) {
            document.getElementById('progress-chart-container').style.display = 'none';
            return;
        }
        document.getElementById('progress-chart-container').style.display = 'block';
        const exerciseDataPoints = [];
        gymData.sessions.forEach(session => {
            session.exercises.forEach(exercise => {
                if (exercise.name === exerciseName) {
                    exercise.sets.forEach(set => {
                        let timestamp = set.timestamp;
                        if (typeof timestamp === 'string') {
                            timestamp = new Date(timestamp);
                        }
                        if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
                             exerciseDataPoints.push({
                                timestamp: timestamp,
                                weight: set.weight,
                                reps: set.reps,
                                volume: set.weight * set.reps
                            });
                        } else {
                            console.warn("Invalid timestamp for set in displayProgressForExercise:", set);
                        }
                    });
                }
            });
        });
        exerciseDataPoints.sort((a, b) => a.timestamp - b.timestamp);
        if (exerciseDataPoints.length === 0) {
            if (progressChart) progressChart.destroy();
            document.getElementById('progress-chart-container').style.display = 'none';
            return;
        }
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
            document.getElementById('progress-chart-container').style.display = 'none';
            return;
        }
        document.getElementById('progress-chart-container').style.display = 'block';
        const datasets = [];
        const allTimestampsSet = new Set();
        const exerciseDataMap = new Map();
        selectedExerciseNames.forEach(exName => {
            const dailyVolumes = new Map();
            gymData.sessions.forEach(session => {
                session.exercises.forEach(exercise => {
                    if (exercise.name === exName) {
                        exercise.sets.forEach(set => {
                            let setTimestamp = set.timestamp;
                            if (typeof setTimestamp === 'string') {
                                setTimestamp = new Date(setTimestamp);
                            }
                            if (setTimestamp instanceof Date && !isNaN(setTimestamp.getTime())) {
                                const dateStr = setTimestamp.toLocaleDateString();
                                allTimestampsSet.add(setTimestamp.getTime());
                                const volume = (set.weight || 0) * (set.reps || 0);
                                dailyVolumes.set(dateStr, (dailyVolumes.get(dateStr) || 0) + volume);
                            }
                        });
                    }
                });
            });
            exerciseDataMap.set(exName, dailyVolumes);
        });
        const sortedUniqueDateStrings = Array.from(allTimestampsSet).sort((a,b) => a - b).map(ts => new Date(ts).toLocaleDateString());
        const finalLabels = [...new Set(sortedUniqueDateStrings)];
        const colorPalette = ['rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 206, 86)', 'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)'];
        selectedExerciseNames.forEach((exName, index) => {
            const dailyVolumes = exerciseDataMap.get(exName);
            const dataPoints = finalLabels.map(dateStr => dailyVolumes.get(dateStr) || 0);
            datasets.push({
                label: `${exName} Volume`,
                data: dataPoints,
                borderColor: colorPalette[index % colorPalette.length],
                backgroundColor: colorPalette[index % colorPalette.length].replace('rgb', 'rgba').replace(')', ', 0.2)'),
                fill: false,
                tension: 0.1,
            });
        });
        progressChart = new Chart(progressChartCanvas, {
            type: 'line',
            data: {
                labels: finalLabels,
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
        setTimeout(() => {
            feedbackToast.classList.add('show');
        }, 10);
        setTimeout(() => {
            feedbackToast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(feedbackToast)) {
                    document.body.removeChild(feedbackToast);
                }
            }, 500);
        }, 2500);
    }

    // --- Data Pre-fill for localStorage ---
    function populateWithProvidedDataLS() {
        console.log("Populating localStorage with initial sample data...");
        const providedSessionData = [
            {
                sessionName: "session 1",
                date: "2025-07-04",
                exercises: [
                    { name: "Bench Press", sets: [{ weight: 70, reps: 7 }, { weight: 60, reps: 10 }, { weight: 60, reps: 6 }, { weight: 60, reps: 4 }] },
                    { name: "Barbell Overhead Press", sets: [{ weight: 30, reps: 10 }, { weight: 30, reps: 8 }, { weight: 30, reps: 9 }] },
                    { name: "Overhead Triceps Extension (Cable)", sets: [{ weight: 27, reps: 10 }, { weight: 27, reps: 10 }, { weight: 27, reps: 10 }] },
                    { name: "Triceps Cable Push (Horizontal Bar)", sets: [{ weight: 50, reps: 9 }, { weight: 50, reps: 6 }, { weight: 45, reps: 0, note: "Drop Set to 36kg" }] },
                    { name: "Cable Chest Flies", sets: [{ weight: 14, reps: 16 }, { weight: 18, reps: 10 }, { weight: 14, reps: 16 }, { weight: 18, reps: 7, note: "Drop Set" }] }
                ]
            },
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
            {
                sessionName: "Pull Day (Back / Biceps / Core)",
                date: "2025-07-02",
                exercises: [
                    { name: "Deadlift", sets: [{ weight: 90, reps: 5 }, { weight: 90, reps: 8 }, { weight: 90, reps: 7 }, { weight: 80, reps: 6 }] },
                    { name: "Back-Middle Bar Row", sets: [{ weight: 50, reps: 12 }, { weight: 50, reps: 14 }, { weight: 50, reps: 8 }] },
                    { name: "Barbell Biceps Curl", sets: [{ weight: 30, reps: 5 }, { weight: 20, reps: 5 }, { weight: 20, reps: 11 }, { weight: 20, reps: 13 }, { weight: 20, reps: 6 }] },
                    { name: "Hammer Curl (Cable)", sets: [{ weight: 27, reps: 13 }, { weight: 27, reps: 8 }, { weight: 27, reps: 14 }], note: "Flexible Cable" },
                    { name: "Hammer Curl (Dumbells)", sets: [{ weight: 10, reps: 11 }, { weight: 10, reps: 9 }, { weight: 10, reps: 8 }], note: "Dumbells" },
                    { name: "Abs Cable Machine", sets: [{ weight: 41, reps: 20 }, { weight: 59, reps: 9 }, { weight: 59, reps: 19 }, { weight: 64, reps: 16 }] }
                ]
            },
            {
                sessionName: "Leg Day (Quads / Shoulders / Calves)",
                date: "2025-07-01",
                exercises: [
                    { name: "Squat", sets: [] },
                    { name: "Calf Raise", sets: [], note: "Standing/Seated" },
                    { name: "Barbell Overhead Press", sets: [{ weight: 30, reps: 10 }, { weight: 30, reps: 8 }, { weight: 30, reps: 9 }] },
                    { name: "Shoulder Lateral Raise", sets: [{ weight: 8, reps: 14 }, { weight: 8, reps: 12 }, { weight: 8, reps: 7 }, { weight: 6, reps: 8, note: "Drop Set" }], note: "Dumbells" }
                ]
            },
            {
                sessionName: "Strength Day",
                date: "2025-06-30",
                exercises: [
                    { name: "Russian Seesaw", sets: [{ weight: 20, reps: 0 }, { weight: 20, reps: 0 }, { weight: 20, reps: 0 }, { weight: 20, reps: 0 }] },
                    { name: "Deadlift", sets: [{ weight: 90, reps: 5 }, { weight: 90, reps: 8 }, { weight: 90, reps: 7 }, { weight: 80, reps: 6 }] },
                    { name: "Bench Press", sets: [{ weight: 70, reps: 7 }, { weight: 60, reps: 10 }, { weight: 60, reps: 6 }, { weight: 60, reps: 4 }] },
                    { name: "Barbell Biceps Curl", sets: [{ weight: 30, reps: 5 }, { weight: 20, reps: 5 }, { weight: 20, reps: 11 }, { weight: 20, reps: 13 }, { weight: 20, reps: 6 }] },
                    { name: "Forearm Curls (In)", sets: [{ weight: 30, reps: 0 }, { weight: 30, reps: 0 }, { weight: 30, reps: 0 }] },
                    { name: "Forearm Curls (Out)", sets: [{ weight: 30, reps: 0 }, { weight: 30, reps: 0 }, { weight: 30, reps: 0 }] }
                ]
            }
        ];

        let idCounter = Date.now();

        gymData.sessions = providedSessionData.map((sessionData, index) => {
            const sessionCreationTimestamp = new Date(sessionData.date);
            return {
                id: idCounter++,
                name: sessionData.sessionName,
                date: sessionData.date,
                sortOrder: index,
                exercises: sessionData.exercises.map((exData, exIndex) => ({
                    id: idCounter++,
                    name: exData.name,
                    note: exData.note || "",
                    order: exIndex,
                    sets: exData.sets.map((setData) => ({
                        id: idCounter++,
                        weight: setData.weight || 0,
                        reps: setData.reps || 0,
                        timestamp: new Date(sessionCreationTimestamp.getTime() + setData.weight + setData.reps + exIndex),
                        note: setData.note || ""
                    }))
                }))
            };
        });

        gymData.bodyWeightLog = [];
        saveDataToLocalStorage();
        showFeedback("Initial sample data loaded into localStorage!");
    }

    function prefillDataIfEmptyLS() {
        const existingData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!existingData) {
            console.log("No data found in localStorage, pre-filling with sample data.");
            populateWithProvidedDataLS();
            loadDataFromLocalStorage();
        } else {
            console.log("Data found in localStorage, skipping pre-fill.");
        }
    }

    // --- Initial Setup (Now for localStorage) ---
    try {
        loadDataFromLocalStorage();
        prefillDataIfEmptyLS(); // This will also call loadDataFromLocalStorage if it populates.

        // Initial UI Setup
        document.getElementById('sessions').style.display = 'block';
        document.getElementById('body-weight').style.display = 'none';
        analysisSection.style.display = 'none';
        const sessionsNavLink = document.querySelector('nav ul li a[href="#sessions"]');
        if (sessionsNavLink) { // Check if the element exists
            sessionsNavLink.classList.add('active');
        }


        // Add Body Weight to nav if not already present (idempotent)
        if (!document.querySelector('nav ul li a[href="#body-weight"]')) {
            const bodyWeightNavLinkItem = document.createElement('li');
            bodyWeightNavLinkItem.innerHTML = '<a href="#body-weight">Body Weight</a>';
            const analysisLinkItem = document.querySelector('nav ul li a[href="#analysis"]');
            if (analysisLinkItem && analysisLinkItem.parentElement) {
                analysisLinkItem.parentElement.parentElement.insertBefore(bodyWeightNavLinkItem, analysisLinkItem.parentElement);
            } else {
                 const navUl = document.querySelector('nav ul');
                 if (navUl) navUl.appendChild(bodyWeightNavLinkItem);
            }
            // Re-attach event listeners to all nav links including the new one
            const allNavLinksAgain = document.querySelectorAll('nav ul li a');
            const allSectionsAgain = document.querySelectorAll('main section'); // Re-query sections
            allNavLinksAgain.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href').substring(1);
                    allSectionsAgain.forEach(section => {
                        section.style.display = (section.id === targetId) ? 'block' : 'none';
                    });
                    allNavLinksAgain.forEach(navLink => navLink.classList.remove('active'));
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
        }

        showSessionListView();
        renderSessions();
        renderBodyWeightHistory();
        bodyWeightDateInput.valueAsDate = new Date();
        populateExerciseSelect();
        handleAnalysisTypeChange(); // This might call displayProgressForExercise
        if (!exerciseSelectAnalysis.value) { // Ensure chart is cleared if no exercise initially selected
             displayProgressForExercise("");
        }


    } catch (error) {
        console.error("Critical error during application initialization:", error);
        alert("Application could not start correctly due to an unexpected error. Please check the console for more details and try refreshing. If the problem persists, your data might be corrupted or browser in an unexpected state.");

        // Attempt to display an error message within the page
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.innerHTML = `
                <div style="color: red; padding: 20px; border: 1px solid red; text-align: center;">
                    <h2>Application Error</h2>
                    <p>A critical error occurred and the application cannot start.</p>
                    <p>Details: ${error.message || 'Unknown error'}</p>
                    <p>Please try refreshing the page. If the issue continues, consider clearing site data for this application or checking the browser console.</p>
                </div>`;
        }
    }
});

[end of script.js]
