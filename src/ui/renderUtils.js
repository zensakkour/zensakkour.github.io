// UI Utility Functions

/**
 * Displays a toast feedback message or updates a target div.
 * @param {string} message The message to display.
 * @param {boolean} [isError=false] True if the message is an error, false for success/info.
 * @param {HTMLElement|null} [targetDiv=null] Optional specific div to show feedback in.
 */
export function showFeedback(message, isError = false, targetDiv = null) {
    if (targetDiv) {
        targetDiv.textContent = message;
        targetDiv.className = 'feedback-display'; // Use a generic class for styling
        if (isError) {
            targetDiv.classList.add('error');
            targetDiv.style.backgroundColor = 'var(--button-danger-bg)'; // Keep direct style for now
        } else {
            targetDiv.classList.add('success');
            targetDiv.style.backgroundColor = 'var(--button-success-bg)'; // Keep direct style
        }
        targetDiv.style.color = 'white';
        targetDiv.style.padding = '10px';
        targetDiv.style.borderRadius = '5px';
        targetDiv.style.marginTop = '1em';
        targetDiv.style.display = 'block';
        // No automatic hide for targeted feedback
    } else {
        const feedbackToast = document.createElement('div');
        feedbackToast.textContent = message;
        feedbackToast.className = 'feedback-toast'; // Existing class from style.css
        if (isError) {
            // Assuming .feedback-toast styles might need an error variant
            // or we adjust its background color directly.
            // For now, let's rely on existing CSS or add a modifier class if needed.
            feedbackToast.style.backgroundColor = 'var(--button-danger-bg)';
        } else {
            feedbackToast.style.backgroundColor = 'var(--button-success-bg)'; // Default or success
        }
        document.body.appendChild(feedbackToast);

        // Force reflow to enable transition
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        feedbackToast.offsetHeight;

        feedbackToast.classList.add('show');

        setTimeout(() => {
            feedbackToast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(feedbackToast)) {
                    document.body.removeChild(feedbackToast);
                }
            }, 500); // Corresponds to transition time
        }, isError ? 4000 : 2500);
    }
}

// Other potential UI utilities:
// - Function to create and append elements with classes/attributes
// - Debounce/throttle utilities for event handlers
// - Formatting functions for dates or numbers if not handled by Intl directly everywhere
// - etc.
