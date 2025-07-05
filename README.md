# Gym Progress Tracker

Gym Progress Tracker is a web application designed to help users log and track their gym workouts, body weight, and analyze their progress over time. It uses Supabase for backend services, including authentication and database storage.

## Features

*   **User Authentication**: Secure signup, login, and logout functionality.
*   **Session Management**: Create, rename, delete, and reorder workout sessions (e.g., "Chest Day", "Leg Day").
*   **Exercise Tracking**: Add exercises to sessions, rename, delete, and reorder them.
*   **Set Logging**: Record weight, reps, and date for each set performed.
*   **Body Weight Logging**: Track body weight entries with dates.
*   **Detailed Exercise History**: View all historical sets for a specific exercise, with options to filter by the last day the exercise was performed or view all history. Day separators improve readability in "All History" mode.
*   **Progress Analysis**:
    *   Visualize body weight progress over time with a line chart.
    *   Visualize total daily volume for individual exercises.
    *   Compare total daily volume across multiple selected exercises.
*   **1RM Estimation**: Calculate estimated 1 Rep Max based on a selected set.
*   **Profile Management**: Users can update their username, password, and email address.
*   **Data Persistence**: All data is saved to a Supabase backend, ensuring it's available across sessions and devices.
*   **Responsive Design**: Basic responsiveness for use on different screen sizes.

## Tech Stack

*   **Frontend**: HTML, CSS, Vanilla JavaScript (ES6 Modules)
*   **Backend**: [Supabase](https://supabase.io/)
    *   Authentication
    *   PostgreSQL Database
    *   Storage (not currently used but available)
    *   Realtime (not currently used but available)
*   **Charting**: [Chart.js](https://www.chartjs.org/)
*   **Styling**: Custom CSS (dark theme).

## Project Structure

The project is organized with client-side code primarily in JavaScript, HTML for structure, and CSS for styling. JavaScript code has been modularized for better organization and maintainability.

```
.
├── index.html              # Main HTML file
├── src/                    # Directory for all source assets
│   ├── css/                # CSS files
│   │   └── style.css       # All CSS styles
│   ├── ui/                 # UI-related JavaScript modules
│   │   ├── renderUtils.js  # Utility functions for UI rendering (e.g., feedback messages)
│   │   ├── viewManager.js  # Manages view switching and main navigation
│   │   ├── sessionView.js  # Renders and manages session list and interactions
│   │   ├── exerciseView.js # Renders and manages exercise lists, set tracking, detailed history
│   │   ├── bodyWeightView.js # Renders and manages body weight logging and display
│   │   └── analysisView.js # Renders and manages the analysis tab, charts
│   ├── app.js              # Main application JavaScript entry point, initializes the app
│   ├── config.js           # Supabase URL and Key, other configurations
│   ├── state.js            # Global application state management
│   ├── domElements.js      # Centralized DOM element selections
│   ├── api.js              # Handles all communication with the Supabase backend (data CRUD)
│   ├── auth.js             # Authentication logic (signup, login, logout, session management, profile updates)
│   └── utils.js            # General utility functions (e.g., calculations)
└── README.md               # This file
```
*(Note: The root `script.js` has been removed as its functionality is now migrated to modules within `src/`.)*

## Setup and Running the Project

1.  **Clone the Repository** (or download the files).
2.  **Supabase Setup**:
    *   Create a project on [Supabase](https://supabase.io/).
    *   In your Supabase project, you'll need to set up the database schema. The application expects tables like `sessions`, `exercises`, `sets`, `body_weight_log`, and `profiles`. Refer to the database queries within the JavaScript files (primarily in `src/api.js` or the original `script.js`) to understand the required columns and relationships.
    *   Navigate to "Project Settings" > "API" in your Supabase dashboard.
    *   Find your Project URL and `anon` public key.
3.  **Configure Supabase Credentials**:
    *   Open `src/config.js`.
    *   Replace the placeholder `SUPABASE_URL` and `SUPABASE_ANON_KEY` values with your own from the Supabase dashboard.
    ```javascript
    export const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
    ```
4.  **Serve `index.html`**:
    *   Since the project uses ES6 modules (`type="module"` in the script tag), you need to serve `index.html` through a local web server. Opening the `index.html` file directly in the browser via `file://` protocol will likely cause CORS errors or issues with module loading.
    *   You can use tools like:
        *   **Live Server extension** in VS Code.
        *   Python's built-in HTTP server: `python -m http.server` (Python 3) or `python -m SimpleHTTPServer` (Python 2) in the project's root directory.
        *   Node.js `http-server` package: `npm install -g http-server` then `http-server .` in the root directory.
    *   Access the application through the local server address (e.g., `http://localhost:8000` or `http://127.0.0.1:5500` if using Live Server).

## Development Notes

*   The application was initially a single `script.js` file and is being refactored into ES6 modules located in the `src/` directory for better maintainability.
*   Ensure any new Supabase queries respect Row Level Security (RLS) policies if they are enabled on your Supabase tables (e.g., ensuring `user_id` matches the authenticated user for data operations).

## Future Enhancements (Ideas)

*   More advanced charting and analysis options.
*   Ability to add notes to sessions or exercises.
*   Exercise type categorization (e.g., strength, cardio).
*   Workout planning features.
*   Export/import data functionality.
*   More comprehensive testing (unit, integration).
*   Deployment instructions.