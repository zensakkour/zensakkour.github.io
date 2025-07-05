// Utility Functions

/**
 * Calculates total daily volume from an array of sets.
 * Each set object must have a `timestamp`, `weight`, and `reps` property.
 * @param {Array<Object>} setsArray Array of set objects.
 * @returns {Array<Object>} Array of objects, each representing a day with properties:
 *                          `date` (YYYY-MM-DD), `displayDate` (DD/MM/YY), `totalVolume`.
 *                          Sorted by date ascending.
 */
export function calculateDailyVolume(setsArray) {
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

// Add other general utility functions here as they are identified.
// Example:
// export function formatDate(date) { ... }
// export function debounce(func, delay) { ... }
