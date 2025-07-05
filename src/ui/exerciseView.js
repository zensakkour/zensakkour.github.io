import * as state from '../state.js';
import * as dom from '../domElements.js';
import {
    addExerciseAPI,
    deleteExerciseAPI,
    updateExerciseNameAPI,
    updateExerciseOrderAPI,
    addSetAPI,
    deleteSetAPI
} from '../api.js';
import { showFeedback } from './renderUtils.js';
import * as viewManager from './viewManager.js';
// import { renderSessions } from './sessionView.js'; // For back button to sessions

// No more placeholderSetApi


// Placeholder for sessionView.renderSessions (for back button)
const placeholderSessionView = {
    renderSessions: () => console.warn("exerciseView calling placeholderSessionView.renderSessions")
};


export function renderExercisesForSession(sessionId) {
    console.log(`renderExercisesForSession called for session ID: ${sessionId}`);
    if (!dom.exerciseListDiv || !dom.currentSessionTitle) return;

    const session = state.gymData.sessions.find(s => s.id === sessionId);
    if (!session) {
        console.error("Session not found for ID (renderExercises):", sessionId);
        viewManager.showSessionListView();
        return;
    }
    dom.currentSessionTitle.textContent = `Exercises for: ${session.name}`;
    dom.exerciseListDiv.innerHTML = ''; // Clear previous content

    if (!session.exercises || session.exercises.length === 0) {
        dom.exerciseListDiv.innerHTML = '<p class="empty-state-message">No exercises added. Add one below.</p>';
        return;
    }

    const sortedExercises = [...session.exercises].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    sortedExercises.forEach(exercise => {
        const exerciseItemContainer = document.createElement('div');
        exerciseItemContainer.className = 'list-item-container exercise-drag-item'; // Matching original classes
        exerciseItemContainer.draggable = true;
        exerciseItemContainer.dataset.exerciseIdForDrag = exercise.id;
        exerciseItemContainer.dataset.parentSessionId = sessionId; // Store parent session ID

        const button = document.createElement('button');
        button.className = 'exercise-item button';
        button.textContent = exercise.name;
        button.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn') || e.target.closest('.rename-btn')) return;
            state.setCurrentViewingExerciseName(exercise.name);
            state.setCurrentExerciseId(exercise.id); // Set current exercise ID
            renderDetailedExerciseView(exercise.name); // Call detailed view render
            viewManager.showDetailedExerciseView();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.className = 'delete-btn button-danger';
        deleteBtn.title = `Delete exercise: ${exercise.name}`;
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm("Are you sure you want to delete this exercise and its sets? This action cannot be undone.")) {
                showFeedback("Deleting exercise...", false);
                try {
                    await deleteExerciseAPI(exercise.id); // Use actual API function

                    const currentSession = state.gymData.sessions.find(s => s.id === sessionId);
                    if (currentSession) {
                        currentSession.exercises = currentSession.exercises.filter(ex => ex.id !== exercise.id);
                    }
                    renderExercisesForSession(sessionId); // Re-render
                    if (state.currentExerciseId === exercise.id) {
                        viewManager.showExerciseView();
                    }
                    showFeedback("Exercise deleted successfully.", false);
                    // placeholderRenderer.populateExerciseSelect(); // For analysis tab (future)
                    // placeholderRenderer.handleAnalysisTypeChange(); // For analysis tab (future)
                } catch (error) {
                    console.error("Error deleting exercise:", error);
                    showFeedback(`Error deleting exercise: ${error.message}`, true);
                }
            }
        });

        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'Rename';
        renameBtn.className = 'rename-btn button-secondary';
        renameBtn.style.marginLeft = '5px';
        renameBtn.title = `Rename exercise: ${exercise.name}`;
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (exerciseItemContainer.draggable) {
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
        dom.exerciseListDiv.appendChild(exerciseItemContainer);
    });
}


// --- Rename Exercise Logic (Moved from script.js) ---
function handleRenameExercise(sessionId, exerciseId, exerciseItemContainer, exerciseButtonElement) {
    const session = state.gymData.sessions.find(s => s.id === sessionId);
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
    const session = state.gymData.sessions.find(s => s.id === sessionId);
    if (!session) { showFeedback("Error: Session not found.", true); renderExercisesForSession(state.currentSessionId); return; }
    const exercise = session.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) { showFeedback("Error: Exercise not found.", true); renderExercisesForSession(state.currentSessionId); return; }

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
        await updateExerciseNameAPI(exerciseId, newName); // Use actual API function
        exercise.name = newName;
        showFeedback("Exercise name updated!", false);
        if (dom.detailedExerciseViewContainer.style.display === 'block' && state.currentExerciseId === exerciseId) {
            dom.detailedExerciseNameEl.textContent = newName;
            state.setCurrentViewingExerciseName(newName);
            viewManager.saveViewState();
        }
        // placeholderRenderer.populateExerciseSelect(); // Future
    } catch (error) {
        console.error("Error updating exercise name:", error);
        showFeedback(`Error: ${error.message}`, true);
    } finally {
        renderExercisesForSession(sessionId);
    }
}

function cancelRenameExercise(originalName, exerciseItemContainer, exerciseButtonElement, wasDraggable) {
    renderExercisesForSession(state.currentSessionId);
}

// --- Drag and Drop Logic for Exercises (Moved from script.js) ---
let draggedExerciseInternalId = null; // Using module-scoped variable instead of state.js for this transient UI state
let sourceSessionIdForDragInternal = null;

function handleDragStartExercise(e) {
    draggedExerciseInternalId = this.dataset.exerciseIdForDrag;
    sourceSessionIdForDragInternal = this.dataset.parentSessionId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedExerciseInternalId);
    this.classList.add('dragging-exercise');
}

function handleDragOverExercise(e) {
    e.preventDefault();
    if (this.dataset.parentSessionId === sourceSessionIdForDragInternal) { // Only allow drop within the same session
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
    const parentSessionId = this.dataset.parentSessionId;
    this.classList.remove('drag-over-exercise');

    if (draggedExerciseInternalId === targetExerciseId || parentSessionId !== sourceSessionIdForDragInternal) return;

    const sessionDbId = parseInt(parentSessionId);
    const session = state.gymData.sessions.find(s => s.id === sessionDbId);
    if (!session || !session.exercises) {
        console.error("Parent session or its exercises not found for exercise drop.");
        return;
    }

    const draggedDbId = parseInt(draggedExerciseInternalId);
    const targetDbId = parseInt(targetExerciseId);

    const draggedIndex = session.exercises.findIndex(ex => ex.id === draggedDbId);
    let targetIndexOriginal = session.exercises.findIndex(ex => ex.id === targetDbId);
    if (draggedIndex === -1 || targetIndexOriginal === -1) return;

    const [draggedItem] = session.exercises.splice(draggedIndex, 1);

    // Recalculate targetIndex after splice
    let targetIndexNew = session.exercises.findIndex(ex => ex.id === targetDbId);

    if (targetIndexNew === -1) { // Target was the only other item or list is now empty after splice
        session.exercises.push(draggedItem);
    } else {
        const rect = this.getBoundingClientRect();
        const verticalMidpoint = rect.top + rect.height / 2;
        if (e.clientY < verticalMidpoint) {
            session.exercises.splice(targetIndexNew, 0, draggedItem);
        } else {
            session.exercises.splice(targetIndexNew + 1, 0, draggedItem);
        }
    }

    session.exercises.forEach((ex, index) => {
        ex.sort_order = index;
    });

    const updates = session.exercises.map(ex => ({
        id: ex.id,
        user_id: state.currentUser.id,
        session_id: session.id,
        sort_order: ex.sort_order
    }));

    try {
        await updateExerciseOrderAPI(updates); // Use actual API function
        console.log("Exercises reordered within session and saved.");
        renderExercisesForSession(sessionDbId);
    } catch (error) {
        console.error("Failed to save reordered exercises:", error);
        showFeedback("Error saving new exercise order.", true);
        // await loadData(); // Consider if full reload is needed from api.js
    }
    draggedExerciseInternalId = null;
    sourceSessionIdForDragInternal = null;
}

function handleDragEndExercise() {
    this.classList.remove('dragging-exercise');
    document.querySelectorAll('.exercise-drag-item.drag-over-exercise').forEach(item => item.classList.remove('drag-over-exercise'));
    draggedExerciseInternalId = null;
    sourceSessionIdForDragInternal = null;
}

// Helper to find the absolute last performed set details for an exercise name
// Moved from script.js
function findLastPerformedSetDetails(exerciseName) {
    let allSetsForThisExerciseName = [];
    state.gymData.sessions.forEach(session => {
        session.exercises.forEach(ex => {
            if (ex.name === exerciseName && ex.sets && ex.sets.length > 0) {
                ex.sets.forEach(s => allSetsForThisExerciseName.push({
                    ...s,
                    timestamp: typeof s.timestamp === 'string' ? new Date(s.timestamp) : s.timestamp
                }));
            }
        });
    });

    if (allSetsForThisExerciseName.length === 0) {
        return null;
    }
    allSetsForThisExerciseName.sort((a, b) => b.timestamp - a.timestamp);
    return allSetsForThisExerciseName[0];
}

// --- Helper for Chart Data Aggregation (Moved from script.js) ---
// Might move to a utils.js later if used elsewhere
function calculateDailyVolume(setsArray) {
    if (!setsArray || setsArray.length === 0) {
        return [];
    }
    const dailyData = {};
    setsArray.forEach(set => {
        const setTimestamp = set.timestamp instanceof Date ? set.timestamp : new Date(set.timestamp);
        if (isNaN(setTimestamp.getTime())) return;

        const dateKey = `${setTimestamp.getFullYear()}-${(setTimestamp.getMonth() + 1).toString().padStart(2, '0')}-${setTimestamp.getDate().toString().padStart(2, '0')}`;
        const volume = (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);

        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                date: dateKey,
                displayDate: setTimestamp.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }),
                totalVolume: 0,
            };
        }
        dailyData[dateKey].totalVolume += volume;
    });
    const aggregatedArray = Object.values(dailyData);
    aggregatedArray.sort((a, b) => new Date(a.date) - new Date(b.date));
    return aggregatedArray;
}


export function renderDetailedExerciseView(exerciseName) {
    if (!dom.detailedExerciseNameEl || !dom.detailedExerciseHistoryListEl || !dom.setFor1RMSelect || !dom.calculated1RMResultEl || !dom.detailedExerciseChartCanvas || !dom.detailedExerciseChartContainer || !dom.toggleHistoryViewBtn) {
        console.error("One or more DOM elements required for renderDetailedExerciseView are missing.");
        return;
    }

    state.setCurrentViewingExerciseName(exerciseName);
    dom.detailedExerciseNameEl.textContent = exerciseName;
    dom.detailedExerciseHistoryListEl.innerHTML = '';
    dom.setFor1RMSelect.innerHTML = '<option value="">-- Choose a Set --</option>';
    dom.calculated1RMResultEl.textContent = 'Estimated 1RM: -- kg';

    let allSetsForExerciseName = [];
    state.gymData.sessions.forEach(session => {
        session.exercises.forEach(ex => {
            if (ex.name === exerciseName) {
                ex.sets.forEach(s => {
                    allSetsForExerciseName.push({
                        ...s,
                        timestamp: typeof s.timestamp === 'string' ? new Date(s.timestamp) : s.timestamp,
                        sessionName: session.name,
                        sessionDate: session.date
                    });
                });
            }
        });
    });

    allSetsForExerciseName.sort((a, b) => b.timestamp - a.timestamp); // Most recent first

    if (allSetsForExerciseName.length === 0) {
        dom.detailedExerciseHistoryListEl.innerHTML = '<p class="empty-state-message">No history found for this exercise.</p>';
        dom.detailedExerciseChartContainer.style.display = 'none';
        if (state.detailedExerciseChart) {
            state.setDetailedExerciseChart(null); // Destroys old chart via setter
        }
        dom.toggleHistoryViewBtn.textContent = 'Show All History'; // Reset button
        state.setDetailedHistoryViewMode('lastDay'); // Reset mode
        return;
    }

    let setsToDisplay = [];
    if (state.detailedHistoryViewMode === 'lastDay') {
        dom.toggleHistoryViewBtn.textContent = 'Show All History';
        const mostRecentSetTimestamp = allSetsForExerciseName[0].timestamp;
        const lastSessionDayDate = new Date(
            mostRecentSetTimestamp.getFullYear(),
            mostRecentSetTimestamp.getMonth(),
            mostRecentSetTimestamp.getDate()
        );
        setsToDisplay = allSetsForExerciseName.filter(s => {
            const setDayDate = new Date(s.timestamp.getFullYear(), s.timestamp.getMonth(), s.timestamp.getDate());
            return setDayDate.getTime() === lastSessionDayDate.getTime();
        });
        setsToDisplay.sort((a,b) => a.timestamp - b.timestamp); // oldest first for display
    } else { // 'allHistory'
        dom.toggleHistoryViewBtn.textContent = "Show Last Day's Sets";
        setsToDisplay = [...allSetsForExerciseName].sort((a,b) => a.timestamp - b.timestamp); // oldest first
    }

    if (setsToDisplay.length === 0) {
        dom.detailedExerciseHistoryListEl.innerHTML = `<p class="empty-state-message">No sets found for this view (${state.detailedHistoryViewMode}).</p>`;
    } else {
        let lastDisplayedDateStr = null;
        setsToDisplay.forEach(set => {
            const setActualTime = set.timestamp; // Already a Date object
            const currentDateStr = setActualTime.toDateString();

            if (state.detailedHistoryViewMode === 'allHistory' && lastDisplayedDateStr && currentDateStr !== lastDisplayedDateStr) {
                const separator = document.createElement('hr');
                separator.className = 'day-separator';
                dom.detailedExerciseHistoryListEl.appendChild(separator);
            }

            const item = document.createElement('div');
            item.className = 'set-item-historical';
            const datePrefix = document.createElement('span');
            datePrefix.className = 'date-prefix';
            const displayDate = setActualTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const displayTime = setActualTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            datePrefix.textContent = `${displayDate} (${set.sessionName}) Set @ ${displayTime}: `;
            item.appendChild(datePrefix);
            item.append(`${set.weight} kg x ${set.reps} reps`);
            if (set.notes) item.append(` (${set.notes})`);
            dom.detailedExerciseHistoryListEl.appendChild(item);

            if (state.detailedHistoryViewMode === 'allHistory') {
                lastDisplayedDateStr = currentDateStr;
            }

            if (set.reps > 0 && set.weight > 0) {
                const option = document.createElement('option');
                option.value = JSON.stringify({ weight: set.weight, reps: set.reps });
                const optionDateStr = set.timestamp.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
                option.textContent = `${optionDateStr} ${set.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${set.weight}kg x ${set.reps}reps`;
                dom.setFor1RMSelect.appendChild(option);
            }
        });
    }

    // Chart will now show Total Daily Volume for all sets of this exercise name
    state.setDetailedExerciseChart(null); // Destroy previous chart instance via setter

    const dailyVolumeData = calculateDailyVolume(allSetsForExerciseName);

    if (dailyVolumeData.length > 0 && dom.detailedExerciseChartCanvas) {
        const labels = dailyVolumeData.map(dayData => dayData.displayDate);
        const totalVolumes = dailyVolumeData.map(dayData => dayData.totalVolume);

        const newChart = new Chart(dom.detailedExerciseChartCanvas, { // Ensure Chart is globally available or imported
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
                    x: { ticks: { color: '#ccc' }, grid: { color: 'rgba(204,204,204,0.1)'}, title: { display: true, text: 'Date', color: '#ccc' } },
                    y: { ticks: { color: '#ccc' }, grid: { color: 'rgba(204,204,204,0.1)'}, title: { display: true, text: 'Total Daily Volume (kg)', color: '#ccc'}, beginAtZero: true }
                },
                plugins: {
                    legend: { labels: { color: '#ccc'} },
                    title: { display: true, text: `${exerciseName} - Daily Volume`, color: '#ccc' }
                }
            }
        });
        state.setDetailedExerciseChart(newChart);
        dom.detailedExerciseChartContainer.style.display = 'block';
    } else {
        dom.detailedExerciseChartContainer.style.display = 'none';
    }
}


export function renderSetsForExercise(sessionId, exerciseId) {
    if (!dom.currentExerciseTitleSet || !dom.setsListDiv || !dom.setWeightInput || !dom.setRepsInput) {
        console.error("Required DOM elements for renderSetsForExercise are missing.");
        return;
    }

    const session = state.gymData.sessions.find(s => s.id === sessionId);
    if (!session) {
        console.error(`Session with ID ${sessionId} not found.`);
        viewManager.showSessionListView(); // Or appropriate error handling
        return;
    }
    const exercise = session.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) {
        console.error(`Exercise with ID ${exerciseId} in session ${sessionId} not found.`);
        viewManager.showExerciseView(); // Go back to exercise list for current session
        return;
    }

    dom.currentExerciseTitleSet.textContent = `Tracking: ${exercise.name}`;
    dom.setsListDiv.innerHTML = ''; // Clear previous sets

    const lastOverallSetDetails = findLastPerformedSetDetails(exercise.name);
    if (lastOverallSetDetails) {
        dom.setWeightInput.placeholder = `Last overall: ${lastOverallSetDetails.weight} kg`;
        dom.setRepsInput.placeholder = `Last overall: ${lastOverallSetDetails.reps} reps`;
    } else {
        dom.setWeightInput.placeholder = "Weight (kg)";
        dom.setRepsInput.placeholder = "Reps";
    }
    dom.setWeightInput.value = '';
    dom.setRepsInput.value = '';

    if (!exercise.sets || exercise.sets.length === 0) {
        dom.setsListDiv.innerHTML = '<p class="empty-state-message">No sets recorded for this instance. Add one below.</p>';
        return;
    }

    const sortedSetsCurrentInstance = [...exercise.sets].sort((a,b) => {
        const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp) : a.timestamp;
        const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp) : b.timestamp;
        return timeA - timeB; // Sort oldest first for display
    });

    sortedSetsCurrentInstance.forEach((set, index) => {
        const setItemContainer = document.createElement('div');
        setItemContainer.className = 'set-item';
        const setDetails = document.createElement('span');
        const setTime = set.timestamp instanceof Date ? set.timestamp : new Date(set.timestamp);
        // Ensure correct date formatting as in original script
        const formattedTimestamp = `${setTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} ${setTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        setDetails.textContent = `Set ${index + 1} (${formattedTimestamp}): ${set.weight} kg x ${set.reps} reps`;
        if(set.notes) setDetails.textContent += ` (${set.notes})`;

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.className = 'delete-btn button-danger';
        deleteBtn.title = `Delete Set ${index + 1}`;
        deleteBtn.addEventListener('click', async () => {
            showFeedback("Deleting set...", false);
            try {
                await deleteSetAPI(set.id); // Use actual API function
                // Remove from local data
                exercise.sets = exercise.sets.filter(s => s.id !== set.id);
                renderSetsForExercise(sessionId, exerciseId); // Re-render
                showFeedback("Set deleted successfully.", false);
                // If detailed view is open for this exercise, refresh it
                if (dom.detailedExerciseViewContainer.style.display === 'block' && state.currentViewingExerciseName === exercise.name) {
                    renderDetailedExerciseView(exercise.name);
                }
                // If analysis tab is active, refresh it (future)
            } catch (error) {
                console.error("Error deleting set:", error);
                showFeedback(`Error deleting set: ${error.message}`, true);
            }
        });

        setItemContainer.appendChild(setDetails);
        setItemContainer.appendChild(deleteBtn);
        dom.setsListDiv.appendChild(setItemContainer);
    });
}


export function setupExerciseEventListeners() {
    if (dom.addExerciseBtn) {
        dom.addExerciseBtn.addEventListener('click', async () => {
            if (!state.currentUser) {
                showFeedback("You must be logged in.", true);
                return;
            }
            if (state.currentSessionId === null) {
                alert("Please select a session first (currentSessionId is null).");
                return;
            }

            const exerciseName = dom.newExerciseNameInput.value.trim();
            if (exerciseName) {
                const session = state.gymData.sessions.find(s => s.id === state.currentSessionId);
                if (!session) {
                    alert("Error: Current session not found in gymData.");
                    return;
                }

                const newExerciseData = {
                    // user_id will be added by API function based on currentUser
                    session_id: state.currentSessionId,
                    name: exerciseName,
                    sort_order: session.exercises ? session.exercises.length : 0
                };
                showFeedback("Adding exercise...", false);
                try {
                    const newExercise = await addExerciseAPI(newExerciseData); // Use actual API function

                    if (!session.exercises) session.exercises = [];
                    const newExerciseWithSets = {...newExercise, sets: []}; // Ensure sets array for local data
                    session.exercises.push(newExerciseWithSets);

                    dom.newExerciseNameInput.value = '';
                    renderExercisesForSession(state.currentSessionId); // Re-render
                    showFeedback("Exercise added!", false);
                } catch (error) {
                    console.error("Error adding exercise:", error);
                    showFeedback(`Error adding exercise: ${error.message}`, true);
                }
            } else {
                alert("Please enter an exercise name.");
            }
        });
    }

    if (dom.addSetBtn) {
        dom.addSetBtn.addEventListener('click', async () => {
            if (!state.currentUser) { showFeedback("You must be logged in.", true); return; }
            if (state.currentSessionId === null || state.currentExerciseId === null) {
                alert("Error: Session or exercise not selected for adding a set."); return;
            }
            const weight = parseFloat(dom.setWeightInput.value);
            const reps = parseInt(dom.setRepsInput.value);
            // const notes = ""; // Add a notes field if desired later

            if (isNaN(weight) || isNaN(reps) || weight < 0 || reps < 0) {
                alert("Please enter valid weight and reps (non-negative)."); return;
            }

            const selectedDateStr = dom.newSetDateInput.value; // YYYY-MM-DD
            if (!selectedDateStr) {
                showFeedback("Please select a date for the set.", true);
                return;
            }
            // Construct Date object by appending a fixed local time (midday) to the date string.
            const combinedDateTime = new Date(selectedDateStr + 'T12:00:00');
            if (isNaN(combinedDateTime.getTime())) {
                showFeedback("Invalid date selected for the set.", true);
                return;
            }

            const newSetData = {
                // user_id will be added by API
                exercise_id: state.currentExerciseId,
                weight: weight,
                reps: reps,
                // notes: notes,
                timestamp: combinedDateTime.toISOString()
            };

            showFeedback("Adding set...", false);
            try {
                const newSet = await addSetAPI(newSetData); // Use actual API function

                const session = state.gymData.sessions.find(s => s.id === state.currentSessionId);
                if (session) {
                    const exercise = session.exercises.find(ex => ex.id === state.currentExerciseId);
                    if (exercise) {
                        if (!exercise.sets) exercise.sets = [];
                        // Convert timestamp back to Date object for local consistency
                        const newSetWithDateObj = {...newSet, timestamp: new Date(newSet.timestamp)};
                        exercise.sets.push(newSetWithDateObj);
                    }
                }
                dom.setWeightInput.value = ''; // Clear inputs after adding
                dom.setRepsInput.value = '';
                // dom.newSetDateInput.valueAsDate = new Date(); // Keep date or reset as preferred
                renderSetsForExercise(state.currentSessionId, state.currentExerciseId); // Re-render sets list
                showFeedback("Set added!", false);
            } catch (error) {
                console.error("Error adding set:", error);
                showFeedback(`Error adding set: ${error.message}`, true);
            }
        });
    }

    // Back buttons
    if (dom.backToSessionsBtn) {
        dom.backToSessionsBtn.addEventListener('click', () => {
            viewManager.showSessionListView();
            // renderSessions(); // This should be called by showSessionListView or a nav handler
            placeholderSessionView.renderSessions(); // Call placeholder for now
        });
    }
    if (dom.backToExercisesBtn) {
        dom.backToExercisesBtn.addEventListener('click', () => {
            if (state.currentSessionId) {
                renderExercisesForSession(state.currentSessionId); // Re-render current session's exercises
                viewManager.showExerciseView();
            } else {
                viewManager.showSessionListView(); // Fallback
            }
        });
    }
    if (dom.backToExerciseListFromDetailBtn) {
        dom.backToExerciseListFromDetailBtn.addEventListener('click', () => {
             if (state.currentSessionId) {
                renderExercisesForSession(state.currentSessionId);
                viewManager.showExerciseView();
            } else {
                viewManager.showSessionListView();
            }
        });
    }

    if (dom.goToSetTrackerBtn) {
        dom.goToSetTrackerBtn.addEventListener('click', () => {
            if (!state.currentSessionId || !state.currentExerciseId) {
                alert("Error: Session or exercise context missing for set tracker.");
                viewManager.showExerciseView();
                return;
            }
            renderSetsForExercise(state.currentSessionId, state.currentExerciseId);
            viewManager.showSetTracker();
        });
    }

    if (dom.toggleHistoryViewBtn) {
        // Check if listener already exists to prevent duplicates if setup is called multiple times
        // A more robust way is to use a flag or ensure setup is called only once.
        // For now, assuming it's called once or clonedNode trick is used elsewhere for buttons.
        // If this function is called multiple times, this will add multiple listeners.
        // A common pattern is to remove old listener before adding new one, or use a controller object.
        // For simplicity here, we'll add it. If issues arise, this is a point to check.

        // A simple guard (less robust than full listener management):
        if (!dom.toggleHistoryViewBtn.dataset.listenerAttached) {
            dom.toggleHistoryViewBtn.addEventListener('click', () => {
                if (state.detailedHistoryViewMode === 'lastDay') {
                    state.setDetailedHistoryViewMode('allHistory');
                } else {
                    state.setDetailedHistoryViewMode('lastDay');
                }
                if (state.currentViewingExerciseName) {
                    renderDetailedExerciseView(state.currentViewingExerciseName);
                }
            });
            dom.toggleHistoryViewBtn.dataset.listenerAttached = 'true';
        }
    }

    if (dom.calculate1RMBtn) {
        if (!dom.calculate1RMBtn.dataset.listenerAttached) {
            dom.calculate1RMBtn.addEventListener('click', () => {
                if (!dom.setFor1RMSelect.value) { alert("Please select a set."); return; }
                try {
                    const { weight, reps } = JSON.parse(dom.setFor1RMSelect.value);
                    if (isNaN(parseFloat(weight)) || isNaN(parseInt(reps)) || weight <= 0 || reps <= 0) {
                        alert("Invalid set data.");
                        dom.calculated1RMResultEl.textContent = 'Estimated 1RM: Error'; return;
                    }
                    if (reps === 1) {
                        dom.calculated1RMResultEl.textContent = `Estimated 1RM: ${parseFloat(weight).toFixed(2)} kg (Actual)`;
                    } else {
                        const oneRepMax = parseFloat(weight) * (1 + parseInt(reps) / 30); // Epley formula
                        dom.calculated1RMResultEl.textContent = `Estimated 1RM: ${oneRepMax.toFixed(2)} kg`;
                    }
                } catch (e) {
                    console.error("1RM calc error:", e);
                    alert("Could not calculate 1RM.");
                    dom.calculated1RMResultEl.textContent = 'Estimated 1RM: Error';
                }
            });
            dom.calculate1RMBtn.dataset.listenerAttached = 'true';
        }
    }

    // Event listeners for exercise item clicks (to show detailed view),
    // exercise rename, exercise delete, exercise drag/drop, set delete
    // will be added when the respective rendering logic is moved.
}
