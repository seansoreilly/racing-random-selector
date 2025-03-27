document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const nameInput = document.getElementById("nameInput");
  const startRaceBtn = document.getElementById("startRace");
  const resetRaceBtn = document.getElementById("resetRace");
  const tryDemoBtn = document.getElementById("tryDemo");
  const speedControl = document.getElementById("speedControl");
  const speedValue = document.getElementById("speedValue");
  const winnerDisplay = document.getElementById("winner");
  const resultsContainer = document.getElementById("resultsContainer");
  const raceTrackContainer = document.getElementById("raceTrackContainer");
  const raceLanes = document.getElementById("raceLanes");
  const countdownOverlay = document.getElementById("countdownOverlay");

  // Race variables
  let participants = [];
  let raceInProgress = false;
  let raceCount = 0;
  let selectedWinner = 0;
  let countdown = 3;
  let animationId = null;
  let raceInterval = null;

  // Constants
  const FINISH_LINE = raceTrackContainer.clientWidth - 80; // 80px from right edge
  const MAX_PARTICIPANTS = 20;
  const RACE_DURATION_BASE = 5000; // Base duration in ms

  // Sample names
  const sampleNames = [
    "Lightning",
    "Thunder",
    "Blaze",
    "Zoom",
    "Flash",
    "Bolt",
    "Dash",
    "Rocket",
    "Speedy",
    "Swift",
  ];

  // Character set with emojis
  const characterSet = [
    { name: "kangaroo", emoji: "🦘" },
    { name: "kangaroo2", emoji: "🦘" },
    { name: "kangaroo3", emoji: "🦘" },
    { name: "kangaroo4", emoji: "🦘" },
    { name: "kangaroo5", emoji: "🦘" },
    { name: "kangaroo6", emoji: "🦘" },
    { name: "kangaroo7", emoji: "🦘" },
    { name: "kangaroo8", emoji: "🦘" },
    { name: "kangaroo9", emoji: "🦘" },
    { name: "kangaroo10", emoji: "🦘" },
  ];

  // Color palette for participants
  const colorPalette = [
    "#FF5733",
    "#33FF57",
    "#3357FF",
    "#FF33A8",
    "#33FFF5",
    "#F5FF33",
    "#FF5733",
    "#C233FF",
    "#33FF57",
    "#FF8C33",
  ];

  // Speed control event listener
  function initSpeedControl() {
    speedControl.addEventListener("input", () => {
      const speedValue = document.getElementById("speedValue");
      const value = speedControl.value;

      if (value < 25) {
        speedValue.textContent = "Slow";
      } else if (value < 50) {
        speedValue.textContent = "Medium";
      } else if (value < 75) {
        speedValue.textContent = "Fast";
      } else {
        speedValue.textContent = "Super Fast";
      }
    });
  }

  // Parse names from input
  function parseNames() {
    const rawInput = nameInput.value.trim();
    if (!rawInput) {
      throw new Error("No names entered");
    }

    // Split by new line and filter out empty lines
    return rawInput
      .split("\n")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
  }

  // Initialize participants
  function initializeParticipants(names) {
    participants = [];

    // Clear race lanes
    raceLanes.innerHTML = "";

    // Randomly select a winner
    selectedWinner = Math.floor(Math.random() * names.length);

    // Set up lanes and participants
    const laneHeight = calculateLaneHeight(names.length);

    names.forEach((name, index) => {
      // Random color and character for each participant
      const color = colorPalette[index % colorPalette.length];
      const character =
        characterSet[Math.floor(Math.random() * characterSet.length)];

      // Create participant data
      const participant = {
        name,
        color,
        character: character.name,
        emoji: character.emoji,
        x: 20,
        y: index * laneHeight + laneHeight / 2,
        speed: 0,
        baseSpeed: 1 + Math.random() * 0.5,
        finished: false,
        winning: index === selectedWinner,
        showPhrase: false,
        laneIndex: index,
      };

      participants.push(participant);

      // Create lane element
      const lane = document.createElement("div");
      lane.className = "race-lane";
      lane.style.height = `${laneHeight}px`;

      // Create racer element
      const racer = document.createElement("div");
      racer.className = "racer";
      racer.id = `racer-${index}`;
      racer.style.top = `${laneHeight / 2 - 20}px`; // Center vertically

      // Create avatar
      const avatar = document.createElement("div");
      avatar.className = "racer-avatar";
      avatar.style.backgroundColor = color;
      avatar.textContent = character.emoji;

      // Create name label
      const nameLabel = document.createElement("div");
      nameLabel.className = "racer-name";
      nameLabel.textContent = name;

      // Assemble racer
      racer.appendChild(avatar);
      racer.appendChild(nameLabel);

      // Add to lane
      lane.appendChild(racer);
      raceLanes.appendChild(lane);
    });

    // Add some clouds
    createClouds();
  }

  // Calculate lane height based on participant count
  function calculateLaneHeight(participantCount) {
    const containerHeight = raceTrackContainer.clientHeight;
    const groundHeight = 15; // Height of the ground element
    const usableHeight = containerHeight - groundHeight;
    return usableHeight / participantCount;
  }

  // Create cloud elements
  function createClouds() {
    // Remove existing clouds
    document.querySelectorAll(".race-cloud").forEach((cloud) => cloud.remove());

    // Create new clouds
    for (let i = 0; i < 5; i++) {
      const cloud = document.createElement("div");
      cloud.className = "race-cloud";

      // Random positioning
      cloud.style.top = `${
        Math.random() * (raceTrackContainer.clientHeight - 60)
      }px`;
      cloud.style.left = `${
        Math.random() * (raceTrackContainer.clientWidth - 120)
      }px`;

      // Add some size variation
      const scale = 0.5 + Math.random() * 1;
      cloud.style.transform = `scale(${scale})`;

      // Add to container
      raceTrackContainer.appendChild(cloud);
    }
  }

  // Create running dust effect
  function createDust(racerId) {
    const racer = document.getElementById(`racer-${racerId}`);
    if (!racer) return;

    const dust = document.createElement("div");
    dust.className = "running-dust";

    // Position behind the racer
    const racerRect = racer.getBoundingClientRect();
    const containerRect = raceTrackContainer.getBoundingClientRect();

    dust.style.left = `${
      racerRect.left - containerRect.left - 10 + Math.random() * 8
    }px`;
    dust.style.top = `${
      racerRect.top -
      containerRect.top +
      racerRect.height / 2 +
      Math.random() * 10 -
      5
    }px`;

    // Add size variation
    const size = 2 + Math.random() * 5;
    dust.style.width = `${size}px`;
    dust.style.height = `${size}px`;

    // Add to container
    raceTrackContainer.appendChild(dust);

    // Remove after animation
    setTimeout(() => {
      dust.remove();
    }, 500);
  }

  // Animate the race
  function animateRace() {
    // Check if all participants have finished
    const allFinished = participants.every((p) => p.finished);
    if (allFinished) {
      endRace();
      clearInterval(raceInterval);
      return;
    }

    // Calculate race progress factor based on speed control
    // Inverted so lower values = slower race
    const raceFactor = 1 - speedControl.value / 100;

    // Update all racer positions
    participants.forEach((participant, index) => {
      if (participant.finished) return;

      const racer = document.getElementById(`racer-${index}`);
      if (!racer) return;

      // Add running class for animation
      racer.classList.add("running");

      // Calculate speed and acceleration
      let maxSpeed = 5; // Max speed in pixels per frame

      // Apply global slowdown factor (3 times slower)
      maxSpeed = maxSpeed / 3;

      // Adjust speed for the predetermined winner
      if (participant.winning) {
        // Ensure the winner makes progress but doesn't always lead
        // This creates race drama
        const winningFactor = 1.05 + Math.random() * 0.1;
        maxSpeed *= winningFactor;

        // Ensure winner accelerates towards the end
        const raceProgress = participant.x / FINISH_LINE;
        if (raceProgress > 0.7) {
          maxSpeed *= 1.1;
        }
      } else {
        // Non-winners have varied speeds
        maxSpeed *= participant.baseSpeed;

        // Add random bursts of speed to create excitement
        if (Math.random() < 0.05) {
          maxSpeed *= 1.5;
        }

        // Apply catch-up mechanics for racers falling behind
        const leader = participants.reduce((prev, curr) =>
          prev.x > curr.x ? prev : curr
        );

        if (leader.x - participant.x > FINISH_LINE * 0.3) {
          maxSpeed *= 1.2; // Boost trailing racers
        }
      }

      // Apply race factor (from speed control)
      maxSpeed *= 1 - raceFactor * 0.8;

      // Apply some randomness
      const randomFactor = 0.8 + Math.random() * 0.4;
      const speed = maxSpeed * randomFactor;

      // Update position
      participant.x += speed;

      // Update racer element position
      racer.style.left = `${participant.x}px`;

      // Create dust effect occasionally
      if (Math.random() < 0.1) {
        createDust(index);
      }

      // Check if finished
      if (participant.x >= FINISH_LINE) {
        participant.finished = true;
        participant.x = FINISH_LINE;
        racer.style.left = `${FINISH_LINE}px`;
        racer.classList.remove("running");

        // Check if this is the winner
        if (participant.winning) {
          racer.classList.add("winner");
        }
      }
    });
  }

  // Start race with countdown
  function startRace() {
    try {
      const names = parseNames();

      if (names.length < 2) {
        alert("Please enter at least 2 names to start the race.");
        return;
      }

      if (names.length > MAX_PARTICIPANTS) {
        alert(
          `Maximum ${MAX_PARTICIPANTS} participants allowed. Only the first ${MAX_PARTICIPANTS} names will be used.`
        );
        names.splice(MAX_PARTICIPANTS);
      }

      // Initialize race
      raceInProgress = true;
      raceCount++;
      startRaceBtn.disabled = true;
      resetRaceBtn.disabled = true;
      tryDemoBtn.disabled = true;
      speedControl.disabled = true;
      nameInput.disabled = true;
      winnerDisplay.style.display = "none";
      winnerDisplay.classList.remove("show");

      // Save names to localStorage
      saveNames();

      // Setup the race
      initializeParticipants(names);

      // Start countdown
      countdown = 3;
      countdownDisplay();
    } catch (error) {
      console.error("Error starting race:", error);
      alert("An error occurred while starting the race. Please try again.");
      resetRace();
    }
  }

  // Display countdown
  function countdownDisplay() {
    countdownOverlay.style.display = "flex";

    if (countdown > 0) {
      countdownOverlay.textContent = countdown;
      countdown--;
      setTimeout(countdownDisplay, 1000);
    } else {
      countdownOverlay.textContent = "GO!";
      setTimeout(() => {
        countdownOverlay.style.display = "none";

        // Start the race animation interval
        raceInterval = setInterval(animateRace, 48); // Change from 16ms (~60fps) to 48ms (~20fps)
      }, 1000);
    }
  }

  // Calculate color brightness
  function getColorBrightness(hex) {
    // Remove # if present
    hex = hex.replace("#", "");

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate brightness
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  // Create confetti for celebration
  function playCelebrationEffect() {
    // Add 50 confetti particles
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        createConfetti();
      }, i * 50); // Stagger creation
    }
  }

  // Create a single confetti particle
  function createConfetti() {
    const confetti = document.createElement("div");
    confetti.style.position = "absolute";
    confetti.style.width = `${Math.random() * 10 + 5}px`;
    confetti.style.height = `${Math.random() * 10 + 5}px`;
    confetti.style.backgroundColor =
      colorPalette[Math.floor(Math.random() * colorPalette.length)];
    confetti.style.borderRadius = "50%";
    confetti.style.zIndex = "10";

    // Position randomly around the winner display
    const rect = winnerDisplay.getBoundingClientRect();
    const winX = rect.left + rect.width / 2;
    const winY = rect.top + rect.height / 2;

    const startX = winX + (Math.random() * 200 - 100);
    const startY = winY - 100;

    confetti.style.left = `${startX}px`;
    confetti.style.top = `${startY}px`;

    // Add to document
    document.body.appendChild(confetti);

    // Animate falling
    const fallDuration = 1000 + Math.random() * 3000;
    const fallDelay = Math.random() * 500;

    confetti.style.transition = `top ${fallDuration}ms ease-in ${fallDelay}ms, 
                               left ${fallDuration}ms ease-out ${fallDelay}ms,
                               opacity ${fallDuration * 0.5}ms ease-in ${
      fallDuration * 0.5 + fallDelay
    }ms`;

    setTimeout(() => {
      // Random final position
      confetti.style.top = `${winY + 300 + Math.random() * 100}px`;
      confetti.style.left = `${startX + (Math.random() * 200 - 100)}px`;
      confetti.style.opacity = "0";

      // Remove after animation
      setTimeout(() => {
        confetti.remove();
      }, fallDuration + fallDelay);
    }, 10);
  }

  // End race and display winner
  function endRace() {
    raceInProgress = false;
    startRaceBtn.disabled = false;
    resetRaceBtn.disabled = false;
    tryDemoBtn.disabled = false;
    speedControl.disabled = false;
    nameInput.disabled = false;

    // Display winner
    const winner = participants[selectedWinner];
    winnerDisplay.textContent = `Winner: ${winner.name}! 🏆`;
    winnerDisplay.style.backgroundColor = winner.color;

    // Ensure text has good contrast with background
    const brightness = getColorBrightness(winner.color);
    winnerDisplay.style.color = brightness > 128 ? "#000" : "#fff";
    winnerDisplay.style.display = "block";

    // Add to results history
    const timestamp = new Date().toLocaleString();
    addResultToHistory(winner.name, winner.color, winner.character, timestamp);

    // Add celebration animation
    setTimeout(() => {
      winnerDisplay.classList.add("show");
      playCelebrationEffect();
    }, 100);
  }

  // Add result to history display
  function addResultToHistory(
    winnerName,
    color,
    character,
    timestamp,
    save = true
  ) {
    const resultElement = document.createElement("div");
    resultElement.className = "result-item";

    // Get emoji for the character type
    const characterObj = characterSet.find((c) => c.name === character);
    const emoji = characterObj?.emoji || "🏃";

    resultElement.innerHTML = `
      <div class="result-color" style="background-color: ${color}">${emoji}</div>
      <div class="result-info">
        <div class="result-winner">${winnerName}</div>
        <div class="result-time">${timestamp}</div>
      </div>
    `;

    // Add to results list
    resultsContainer.insertBefore(resultElement, resultsContainer.firstChild);

    // Save to localStorage if this is a new result
    if (save) {
      saveRaceResult(winnerName, color, character);
    }

    // Add fade-in animation
    setTimeout(() => {
      resultElement.classList.add("visible");
    }, 50);
  }

  // Reset race
  function resetRace() {
    if (raceInterval) {
      clearInterval(raceInterval);
    }

    raceInProgress = false;
    startRaceBtn.disabled = false;
    resetRaceBtn.disabled = false;
    tryDemoBtn.disabled = false;
    speedControl.disabled = false;
    nameInput.disabled = false;
    winnerDisplay.style.display = "none";
    winnerDisplay.classList.remove("show");
    countdownOverlay.style.display = "none";

    // Reset racers
    participants.forEach((participant, index) => {
      const racer = document.getElementById(`racer-${index}`);
      if (racer) {
        racer.style.left = "20px";
        racer.classList.remove("running", "winner");
      }
    });

    // Remove dust particles
    document.querySelectorAll(".running-dust").forEach((dust) => dust.remove());
  }

  // Load saved names if available
  function loadSavedNames() {
    const savedNames = localStorage.getItem("raceNames");
    if (savedNames) {
      nameInput.value = savedNames;
    }
  }

  // Load race history if available
  function loadRaceHistory() {
    const savedResults = localStorage.getItem("raceResults");
    if (savedResults) {
      const results = JSON.parse(savedResults);
      results.forEach((result) => {
        addResultToHistory(
          result.winner,
          result.color,
          result.character,
          result.timestamp,
          false
        );
      });
    }
  }

  // Save names to localStorage
  function saveNames() {
    localStorage.setItem("raceNames", nameInput.value);
  }

  // Save race result to localStorage
  function saveRaceResult(winner, color, character) {
    const result = {
      winner,
      color,
      character,
      timestamp: new Date().toLocaleString(),
    };

    let results = [];
    const savedResults = localStorage.getItem("raceResults");
    if (savedResults) {
      results = JSON.parse(savedResults);
    }

    results.push(result);
    localStorage.setItem("raceResults", JSON.stringify(results));

    return result;
  }

  // Clear race history
  function clearHistory() {
    if (confirm("Are you sure you want to clear all race history?")) {
      resultsContainer.innerHTML = "";
      localStorage.removeItem("raceResults");
    }
  }

  // Load demo names
  function loadDemoNames() {
    nameInput.value = sampleNames.join("\n");
  }

  // Event listeners
  startRaceBtn.addEventListener("click", startRace);
  resetRaceBtn.addEventListener("click", resetRace);
  tryDemoBtn.addEventListener("click", loadDemoNames);

  // Add clear history button event listener if it exists
  const clearHistoryBtn = document.getElementById("clearHistory");
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", clearHistory);
  }

  // Add error handling for animations
  window.addEventListener("error", function (e) {
    console.error("Runtime error:", e.message);
    if (raceInProgress) {
      alert("An error occurred. The race has been reset.");
      resetRace();
    }
  });

  // Adjust racetrack container on window resize
  window.addEventListener("resize", () => {
    if (participants.length > 0) {
      const laneHeight = calculateLaneHeight(participants.length);
      document.querySelectorAll(".race-lane").forEach((lane, index) => {
        lane.style.height = `${laneHeight}px`;

        const racer = document.getElementById(`racer-${index}`);
        if (racer) {
          racer.style.top = `${laneHeight / 2 - 20}px`;
        }
      });
    }
  });

  // Initialize when page loads
  loadSavedNames();
  loadRaceHistory();
  initSpeedControl();
});
