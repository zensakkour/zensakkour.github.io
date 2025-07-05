import * as state from '../state.js';
import * as dom from '../domElements.js';
import { loadData, addSessionAPI, deleteSessionAPI, updateSessionNameAPI, updateSessionOrderAPI } from '../api.js';
import { showFeedback } from './renderUtils.js';
import * as viewManager from './viewManager.js'; // For navigation like showExerciseView
import { renderExercisesForSession } from './exerciseView.js'; // Import actual function

// No more placeholderApi for session functions
// No more placeholderExerciseView


// --- Rename Session Logic ---
function handleRenameSession(sessionId, sessionItemContainer, sessionButtonElement) {
    const session = state.gymData.sessions.find(s => s.id === sessionId);
    if (!session) return;

    const wasDraggable = sessionItemContainer.draggable;
    sessionItemContainer.draggable = false;

    const originalName = session.name;
    sessionButtonElement.style.display = 'none';
    sessionItemContainer.querySelectorAll('.rename-btn, .delete-btn').forEach(btn => btn.style.display = 'none');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalName;
    input.className = 'rename-input';
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

    sessionItemContainer.insertBefore(cancelBtn, sessionButtonElement);
    sessionItemContainer.insertBefore(saveBtn, cancelBtn);
    sessionItemContainer.insertBefore(input, saveBtn);

    input.focus();
    input.select();
}

async function saveSessionName(sessionId, inputElement, sessionItemContainer, sessionButtonElement, wasDraggable) {
    const newName = inputElement.value.trim();
    const session = state.gymData.sessions.find(s => s.id === sessionId);

    if (!session) {
        showFeedback("Error: Session not found.", true);
        renderSessions();
        return;
    }
    const originalName = session.name;

    if (!newName) {
        showFeedback("Session name cannot be empty.", true);
        inputElement.value = originalName;
        inputElement.focus();
        return;
    }

    if (newName === originalName) {
        cancelRenameSession(originalName, sessionItemContainer, sessionButtonElement, wasDraggable);
        return;
    }

    showFeedback("Saving new session name...", false);
    try {
        await updateSessionNameAPI(sessionId, newName); // Use actual API function

        session.name = newName; // Update local data
        showFeedback("Session name updated!", false);
    } catch (error) {
        console.error("Error updating session name:", error);
        showFeedback(`Error: ${error.message}`, true);
    } finally {
        renderSessions();
    }
}

function cancelRenameSession(originalName, sessionItemContainer, sessionButtonElement, wasDraggable) {
    renderSessions(); // Simplest way to restore
}


// --- Drag and Drop Logic for Sessions ---
function handleDragStartSession(e) {
    state.setDraggedSessionId(this.dataset.sessionIdForDrag);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', state.draggedSessionId);
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
    if (state.draggedSessionId === targetSessionId) return;

    const draggedDbId = parseInt(state.draggedSessionId);
    const targetDbId = parseInt(targetSessionId);

    const draggedIndex = state.gymData.sessions.findIndex(s => s.id === draggedDbId);
    let targetIndex = state.gymData.sessions.findIndex(s => s.id === targetDbId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedItem] = state.gymData.sessions.splice(draggedIndex, 1);

    // Re-calculate targetIndex after splice, as array is modified
    targetIndex = state.gymData.sessions.findIndex(s => s.id === targetDbId);

    if (targetIndex === -1) { // Target was the last item and got removed or list is empty
        state.gymData.sessions.push(draggedItem);
    } else {
        const rect = this.getBoundingClientRect();
        const verticalMidpoint = rect.top + rect.height / 2;
        if (e.clientY < verticalMidpoint) {
            state.gymData.sessions.splice(targetIndex, 0, draggedItem);
        } else {
            state.gymData.sessions.splice(targetIndex + 1, 0, draggedItem);
        }
    }

    state.gymData.sessions.forEach((session, index) => {
        session.sort_order = index;
    });

    const updates = state.gymData.sessions.map(session => ({
        id: session.id,
        user_id: state.currentUser.id,
        sort_order: session.sort_order
    }));

    try {
        await updateSessionOrderAPI(updates); // Use actual API function
        console.log("Sessions reordered and saved.");
        renderSessions();
    } catch (error) {
        console.error("Failed to save reordered sessions:", error);
        showFeedback("Error saving new session order.", true);
        await loadData(); // Reload to ensure consistency
    }
    state.setDraggedSessionId(null);
}

function handleDragEndSession() {
    this.classList.remove('dragging-session');
    document.querySelectorAll('.list-item-container.drag-over-session').forEach(item => item.classList.remove('drag-over-session'));
    state.setDraggedSessionId(null); // Ensure reset
}


// --- Main Rendering Function for Sessions ---
export function renderSessions() {
    if (!dom.sessionListDiv) return;
    dom.sessionListDiv.innerHTML = '';
    if (!state.gymData.sessions || state.gymData.sessions.length === 0) {
        dom.sessionListDiv.innerHTML = '<p class="empty-state-message">No sessions created yet. Add one below!</p>';
        return;
    }
    const sortedSessions = [...state.gymData.sessions].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    sortedSessions.forEach(session => {
        const sessionItemContainer = document.createElement('div');
        sessionItemContainer.className = 'list-item-container'; // General class for styling container
        sessionItemContainer.draggable = true;
        sessionItemContainer.dataset.sessionIdForDrag = session.id;

        const button = document.createElement('button');
        button.className = 'session-item button'; // 'button' for general button styles
        button.textContent = session.name;
        button.dataset.sessionId = session.id;
        button.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn') || e.target.closest('.rename-btn')) return;
            state.setCurrentSessionId(session.id);
            renderExercisesForSession(session.id); // Call imported function
            viewManager.showExerciseView();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.className = 'delete-btn button-danger';
        deleteBtn.title = `Delete session: ${session.name}`;
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm("Are you sure you want to delete this session and all its data? This action cannot be undone.")) {
                showFeedback("Deleting session...", false);
                try {
                    await deleteSessionAPI(session.id); // Use actual API function
                    state.gymData.sessions = state.gymData.sessions.filter(s => s.id !== session.id);
                    renderSessions();
                    if (state.currentSessionId === session.id) {
                        viewManager.showSessionListView();
                    }
                    showFeedback("Session deleted successfully.", false);
                    // If analysis tab is active, refresh it (will be in analysisView.js)
                    // populateExerciseSelect();
                    // handleAnalysisTypeChange();
                } catch (error) {
                    console.error("Error deleting session:", error);
                    showFeedback(`Error deleting session: ${error.message}`, true);
                }
            }
        });

        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'Rename';
        renameBtn.className = 'rename-btn button-secondary';
        renameBtn.style.marginLeft = '5px';
        renameBtn.title = `Rename session: ${session.name}`;
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (sessionItemContainer.draggable) {
                sessionItemContainer.draggable = false;
                setTimeout(() => sessionItemContainer.draggable = true, 100);
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
        dom.sessionListDiv.appendChild(sessionItemContainer);
    });
}


// --- Event Listeners Setup ---
export function setupSessionEventListeners() {
    if (dom.addSessionBtn) {
        dom.addSessionBtn.addEventListener('click', async () => {
            if (!state.currentUser) {
                showFeedback("You must be logged in to add a session.", true);
                return;
            }
            const sessionName = dom.newSessionNameInput.value.trim();
            if (sessionName) {
                const newSessionData = {
                    user_id: state.currentUser.id,
                    name: sessionName,
                    date: new Date().toISOString().split('T')[0], // Default date
                    sort_order: state.gymData.sessions.length
                };
                showFeedback("Adding session...", false);
                try {
                    const newSession = await addSessionAPI(newSessionData); // Use actual API function
                    const newSessionWithExercises = {...newSession, exercises: []};
                    state.gymData.sessions.push(newSessionWithExercises);
                    dom.newSessionNameInput.value = '';
                    renderSessions();
                    showFeedback("Session added!", false);
                } catch (error) {
                    console.error("Error adding session:", error);
                    showFeedback(`Error adding session: ${error.message}`, true);
                }
            } else {
                alert("Please enter a session name.");
            }
        });
    }

    // Back to sessions button (if one exists that's specific to this view, otherwise handled by main nav)
    // Example: if there's a global "home" or "back to all sessions" button not part of main nav.
}

// Initial render if needed, or called by viewManager/auth
// renderSessions(); // Typically called when the sessions view is shown
// setupSessionEventListeners(); // Call to attach event listeners
