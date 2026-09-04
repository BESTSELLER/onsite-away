document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const configScreen = document.getElementById('config-screen');
    const timerScreen = document.getElementById('timer-screen');
    const durationCards = document.querySelectorAll('.duration-grid .duration-card');
    const customCard = document.getElementById('custom-duration-card');
    const customModal = document.getElementById('custom-timer-modal');
    const minutesPicker = document.getElementById('minutes-picker');
    const customCancelButton = document.getElementById('custom-cancel-button');
    const customConfirmButton = document.getElementById('custom-confirm-button');
    const notesInput = document.getElementById('notes-input');
    const chips = document.querySelectorAll('.chip');
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const timerDisplay = document.getElementById('timer-display');
    const timerNotes = document.getElementById('timer-notes');
    const themeToggle = document.getElementById('theme-toggle');

    // State
    let selectedDuration = 0;
    let pickerScrollTimeout;
    let pendingCustomMinutes = 20;
    let timerInterval;
    let endTime;
    let wakeLock = null;

    // Custom duration picker setup
    const PICKER_MIN = 1;
    const PICKER_MAX = 180;
    const ITEM_HEIGHT = 48;

    for (let m = PICKER_MIN; m <= PICKER_MAX; m++) {
        const item = document.createElement('div');
        item.classList.add('picker-item');
        item.dataset.value = m;
        item.textContent = m;
        minutesPicker.appendChild(item);
    }

    function scrollPickerToValue(value, smooth) {
        const index = value - PICKER_MIN;
        minutesPicker.scrollTo({ top: index * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' });
    }

    function highlightPickerValue(value) {
        minutesPicker.querySelectorAll('.picker-item').forEach(el => {
            el.classList.toggle('picker-item-selected', parseInt(el.dataset.value, 10) === value);
        });
    }

    minutesPicker.addEventListener('scroll', () => {
        clearTimeout(pickerScrollTimeout);
        pickerScrollTimeout = setTimeout(() => {
            const index = Math.round(minutesPicker.scrollTop / ITEM_HEIGHT);
            pendingCustomMinutes = Math.min(PICKER_MAX, Math.max(PICKER_MIN, index + PICKER_MIN));
            highlightPickerValue(pendingCustomMinutes);
        }, 100);
    });

    function openCustomModal() {
        customModal.classList.add('active');
        scrollPickerToValue(pendingCustomMinutes, false);
        highlightPickerValue(pendingCustomMinutes);
    }

    function closeCustomModal() {
        customModal.classList.remove('active');
    }

    function resetCustomCard() {
        customCard.classList.remove('selected');
        customCard.querySelector('.custom-card-label').textContent = 'Custom';
    }

    customCard.addEventListener('click', openCustomModal);
    customCancelButton.addEventListener('click', closeCustomModal);
    customConfirmButton.addEventListener('click', () => {
        selectedDuration = pendingCustomMinutes;
        durationCards.forEach(c => c.classList.remove('selected'));
        customCard.classList.add('selected');
        customCard.querySelector('.custom-card-label').textContent = `${pendingCustomMinutes}m`;
        closeCustomModal();
    });

    // Theme Logic
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Christmas Mode Check
    let isChristmas = new Date().getMonth() === 11; // 11 is December

    function updateThemeColor() {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        const metaAppleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');

        if (isChristmas) {
            if (metaThemeColor) metaThemeColor.setAttribute('content', '#165b33');
            if (metaAppleStatus) metaAppleStatus.setAttribute('content', 'black-translucent');
        } else {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (metaThemeColor) metaThemeColor.setAttribute('content', isDark ? '#111827' : '#f5f7fa');
            if (metaAppleStatus) metaAppleStatus.setAttribute('content', isDark ? 'black-translucent' : 'default');
        }
    }

    function updateChristmasState() {
        if (isChristmas) {
            document.body.classList.add('christmas-theme');
        } else {
            document.body.classList.remove('christmas-theme');
            // Remove any existing snowflakes
            document.querySelectorAll('.snowflake').forEach(el => el.remove());
        }
        updateThemeColor();
    }

    updateChristmasState();

    // Debug Toggle
    window.toggleChristmasTheme = () => {
        isChristmas = !isChristmas;
        updateChristmasState();
        console.log(`Christmas Theme: ${isChristmas ? 'ON' : 'OFF'}`);
    };

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeColor();
    });

    // Event Listeners

    // Duration Selection
    durationCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove selected class from all
            durationCards.forEach(c => c.classList.remove('selected'));
            resetCustomCard();
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
                resetCustomCard();
                // Optional: Play sound
                return;
            }

            updateTimerDisplay(remainingSeconds);
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        releaseWakeLock();
        resetCustomCard();

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

    // Snow Effect
    function createSnowflake() {
        const snowflake = document.createElement('div');
        snowflake.classList.add('snowflake');
        snowflake.innerHTML = ['❄', '❅', '❆'][Math.floor(Math.random() * 3)];
        snowflake.style.left = Math.random() * 100 + 'vw';
        snowflake.style.animationDuration = Math.random() * 3 + 2 + 's'; // 2-5s
        snowflake.style.opacity = Math.random();
        snowflake.style.fontSize = Math.random() * 15 + 10 + 'px';

        // Random horizontal movement
        const randomX = Math.random() * 20 - 10;
        snowflake.style.setProperty('--random-x', `${randomX}px`);

        document.body.appendChild(snowflake);

        setTimeout(() => {
            snowflake.remove();
        }, 5000);
    }

    setInterval(() => {
        if (isChristmas) {
            createSnowflake();
        }
    }, 50); // More frequent snow
});
