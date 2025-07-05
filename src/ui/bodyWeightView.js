import * as state from '../state.js';
import * as dom from '../domElements.js';
import { showFeedback } from './renderUtils.js';
import { addBodyWeightLogAPI, deleteBodyWeightEntryAPI, updateBodyWeightLogDateAPI } from '../api.js';

// No more placeholderApi for body weight functions

// --- Edit Body Weight Date Logic (Moved from script.js) ---
// This will be called from within renderBodyWeightHistory
function showBodyWeightDateEditUI(entryItemContainer, entry) {
    const detailsSpan = entryItemContainer.querySelector('.bw-details-span');
    const actionsDiv = entryItemContainer.querySelector('.bw-item-actions');
    if (detailsSpan) detailsSpan.style.display = 'none';
    if (actionsDiv) actionsDiv.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'date';
    input.value = entry.date;
    input.className = 'edit-bw-date-input';
    input.style.marginRight = '5px';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.className = 'button-primary button-small';
    saveBtn.onclick = async () => {
        if (!state.currentUser) { showFeedback("You must be logged in.", true); return; }
        if (!input.value) {
            showFeedback("Date cannot be empty.", true);
            renderBodyWeightHistory();
            return;
        }
        showFeedback("Updating body weight entry date...", false);
        try {
            await updateBodyWeightLogDateAPI(entry.id, input.value); // Use actual API
            const localEntry = state.gymData.bodyWeightLog.find(e => e.id === entry.id);
            if (localEntry) {
                localEntry.date = input.value;
            }
            showFeedback("Body weight entry date updated!", false);
        } catch (error) {
            console.error("Error updating body weight entry date:", error);
            showFeedback(`Error: ${error.message}`, true);
        } finally {
            renderBodyWeightHistory(); // Refresh the list
        }
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

    // Insert before the first child if detailsSpan/actionsDiv were removed,
    // or append if they were hidden and still part of the flow.
    // Simpler to just append for now if those elements are hidden not removed.
    entryItemContainer.appendChild(input);
    entryItemContainer.appendChild(saveBtn);
    entryItemContainer.appendChild(cancelBtn);
    input.focus();
}


export function renderBodyWeightHistory() {
    if (!dom.bodyWeightHistoryDiv) {
        console.warn("bodyWeightHistoryDiv not found, skipping renderBodyWeightHistory.");
        return;
    }
    dom.bodyWeightHistoryDiv.innerHTML = '';
    if (!state.gymData.bodyWeightLog || state.gymData.bodyWeightLog.length === 0) {
        dom.bodyWeightHistoryDiv.innerHTML = '<p class="empty-state-message">No body weight entries yet. Add one above.</p>';
        return;
    }
    // Sort by date descending for display (most recent first)
    const sortedLog = [...state.gymData.bodyWeightLog].sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'));

    const list = document.createElement('ul');
    list.className = 'styled-list'; // Assuming this class exists or will be added to style.css

    sortedLog.forEach(entry => {
        const listItem = document.createElement('li');
        listItem.className = 'list-item-container body-weight-item'; // Using list-item-container for consistency

        const textSpan = document.createElement('span');
        textSpan.className = 'bw-details-span';
        // Ensure date is displayed correctly, entry.date is YYYY-MM-DD
        const displayDateStr = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
        textSpan.textContent = `${displayDateStr} - ${entry.weight} kg`;
        listItem.appendChild(textSpan);

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'bw-item-actions'; // For styling if needed

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '&#9998;'; // Pencil icon
        editBtn.className = 'edit-bw-date-btn button-secondary button-small';
        editBtn.title = `Edit date for entry on ${displayDateStr}`;
        editBtn.style.marginLeft = '5px';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            showBodyWeightDateEditUI(listItem, entry);
        };
        buttonGroup.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.className = 'delete-btn button-danger';
        deleteBtn.title = `Delete entry: ${displayDateStr}`;
        deleteBtn.onclick = async () => {
            if (!state.currentUser) { showFeedback("You must be logged in.", true); return; }
            if (confirm("Are you sure you want to delete this body weight entry?")) {
                showFeedback("Deleting body weight entry...", false);
                try {
                    await deleteBodyWeightEntryAPI(entry.id); // Use actual API
                    state.setGymData({
                        ...state.gymData,
                        bodyWeightLog: state.gymData.bodyWeightLog.filter(item => item.id !== entry.id)
                    });
                    renderBodyWeightHistory();
                    showFeedback("Body weight entry deleted successfully.", false);
                    // if (dom.analysisDataTypeSelect.value === 'bodyweight' && dom.analysisSection.style.display === 'block') {
                        // placeholderAnalysisView.displayBodyWeightProgress(); // Future integration
                    // }
                } catch (error) {
                    console.error("Error deleting body weight entry:", error);
                    showFeedback(`Error deleting body weight entry: ${error.message}`, true);
                }
            }
        };
        buttonGroup.appendChild(deleteBtn);
        listItem.appendChild(buttonGroup);
        list.appendChild(listItem);
    });
    dom.bodyWeightHistoryDiv.appendChild(list);
}

export function setupBodyWeightEventListeners() {
    if (dom.addBodyWeightBtn) {
        dom.addBodyWeightBtn.addEventListener('click', async () => {
            if (!state.currentUser) {
                showFeedback("You must be logged in.", true);
                return;
            }
            const date = dom.bodyWeightDateInput.value;
            const weight = parseFloat(dom.bodyWeightInput.value);

            if (!date) {
                alert("Please select a date.");
                return;
            }
            if (isNaN(weight) || weight <= 0) {
                alert("Please enter a valid positive weight.");
                return;
            }

            const newLogEntryData = {
                // user_id will be added by API function
                date: date,
                weight: weight
            };
            showFeedback("Logging body weight...", false);
            try {
                const newEntry = await addBodyWeightLogAPI(newLogEntryData); // Use actual API
                // Add to local state
                state.gymData.bodyWeightLog.push(newEntry);
                // Sort is handled by render, or sort here:
                // state.gymData.bodyWeightLog.sort((a, b) => new Date(b.date) - new Date(a.date));
                renderBodyWeightHistory();
                showFeedback("Body weight logged!", false);
                dom.bodyWeightDateInput.value = '';
                dom.bodyWeightInput.value = '';
            } catch (error) {
                console.error("Error logging body weight:", error);
                showFeedback(`Error logging body weight: ${error.message}`, true);
            }
        });
    }
}
