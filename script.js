document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const configScreen = document.getElementById('config-screen');
    const timerScreen = document.getElementById('timer-screen');
    const durationCards = document.querySelectorAll('.duration-card');
    const notesInput = document.getElementById('notes-input');
    const chips = document.querySelectorAll('.chip');
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const timerDisplay = document.getElementById('timer-display');
    const timerNotes = document.getElementById('timer-notes');
    const themeToggle = document.getElementById('theme-toggle');

    // State
    let selectedDuration = 0;
    let timerInterval;
    let endTime;
    let wakeLock = null;

    // Theme Logic
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Event Listeners

    // Duration Selection
    durationCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove selected class from all
            durationCards.forEach(c => c.classList.remove('selected'));
            // Add to clicked
            card.classList.add('selected');
            // Update state
            selectedDuration = parseInt(card.dataset.duration, 10);
        });
    });

    // Predefined Notes (Chips)
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.dataset.text;

            // Check if already selected
            if (chip.classList.contains('selected')) {
                chip.classList.remove('selected');
                notesInput.value = '';
            } else {
                // Deselect others
                chips.forEach(c => c.classList.remove('selected'));
                // Select clicked
                chip.classList.add('selected');
                // Set input value
                notesInput.value = text;
            }
        });
    });

    // Start Timer
    startButton.addEventListener('click', () => {
        if (selectedDuration === 0) {
            // Simple shake animation or alert could go here
            alert('Please select a duration first.');
            return;
        }

        const notes = notesInput.value.trim();

        if (!notes) {
            alert('Please enter a message or select a quick note.');
            return;
        }

        startTimer(selectedDuration, notes);
    });

    // Stop Timer
    stopButton.addEventListener('click', stopTimer);

    // Handle visibility change to re-acquire lock if tab becomes visible again
    document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
            await requestWakeLock();
        }
    });

    // Functions
    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => {
                    console.log('Wake Lock was released');
                });
                console.log('Wake Lock is active');
            }
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    }

    async function releaseWakeLock() {
        if (wakeLock !== null) {
            await wakeLock.release();
            wakeLock = null;
            console.log('Wake Lock released manually');
        }
    }

    function startTimer(minutes, notes) {
        // Switch screens
        configScreen.classList.remove('active');
        setTimeout(() => {
            timerScreen.classList.add('active');
        }, 300); // Wait for fade out

        // Setup Display
        timerNotes.textContent = notes || '';

        // Request Wake Lock
        requestWakeLock();

        // Calculate End Time
        const now = Date.now();
        endTime = now + (minutes * 60 * 1000);

        updateTimerDisplay(minutes * 60); // Initial show

        // Start Interval
        timerInterval = setInterval(() => {
            const remainingMs = endTime - Date.now();
            const remainingSeconds = Math.ceil(remainingMs / 1000);

            if (remainingSeconds <= 0) {
                clearInterval(timerInterval);
                timerDisplay.textContent = "00:00";
                releaseWakeLock();
                // Optional: Play sound
                return;
            }

            updateTimerDisplay(remainingSeconds);
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        releaseWakeLock();

        // Switch screens
        timerScreen.classList.remove('active');
        setTimeout(() => {
            configScreen.classList.add('active');
        }, 300);

        // Reset State (optional, maybe keep last used settings?)
        // selectedDuration = 0;
        // durationCards.forEach(c => c.classList.remove('selected'));
        // notesInput.value = '';
        // chips.forEach(c => c.classList.remove('selected'));
    }

    function updateTimerDisplay(totalSeconds) {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        const mStr = m < 10 ? '0' + m : m;
        const sStr = s < 10 ? '0' + s : s;
        timerDisplay.textContent = `${mStr}:${sStr}`;
    }
    // Konami Code Easter Egg
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                activatePartyMode();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });

    function activatePartyMode() {
        document.body.classList.toggle('party-mode');
    }
});
