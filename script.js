document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const canvas = document.getElementById("raceTrack");
  const ctx = canvas.getContext("2d");
  const nameInput = document.getElementById("nameInput");
  const startRaceBtn = document.getElementById("startRace");
  const resetRaceBtn = document.getElementById("resetRace");
  const tryDemoBtn = document.getElementById("tryDemo");
  const winnerDisplay = document.getElementById("winner");
  const speedControl = document.getElementById("speedControl");
  const speedValue = document.getElementById("speedValue");
  const resultsContainer = document.getElementById("resultsContainer");

  // Race variables
  let participants = [];
  let raceInProgress = false;
  let animationId = null;
  let selectedWinner = null;
  let countdown = 0;
  const MAX_PARTICIPANTS = 20; // Maximum number of participants
  let speedFactor = 1; // Default speed factor
  let raceCount = 0; // Track number of races

  // Sample names for demo
  const sampleNames = [
    "Akshatha",
    "Chris",
    "Brendan",
    "Therese",
    "Buddhi",
    "Bhuvana",
    "Gopal",
    "Sean",
    "Sunanda",
    "Fiona",
    "Navya",
    "Pradeep",
    "Patrick",
    "Ankur",
  ];

  // Initialize speed control
  function initSpeedControl() {
    speedControl.addEventListener("input", function () {
      const value = this.value;
      // Modify to make the race about 3x slower by default
      speedFactor = (2 - value / 100) * 3;
      speedValue.textContent = getSpeedLabel(value);
    });

    // Set initial value
    speedControl.value = 50;
    speedValue.textContent = getSpeedLabel(50);
    // Apply initial speedFactor
    speedFactor = 3;
  }

  // Convert slider value to speed label
  function getSpeedLabel(value) {
    if (value < 25) return "Fast";
    if (value < 50) return "Medium";
    if (value < 75) return "Slow";
    if (value < 90) return "Very Slow";
    return "Extremely Slow";
  }

  // Canvas setup
  function setupCanvas() {
    // Make canvas responsive by setting dimensions based on its display size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Draw initial track
    drawTrack();
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
  function saveRaceResult(winner, color) {
    const result = {
      winner,
      color,
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

  // Initialize when page loads
  setupCanvas();
  loadSavedNames();
  loadRaceHistory();
  initSpeedControl();
  window.addEventListener("resize", setupCanvas);

  // Draw the race track
  function drawTrack() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw track background
    ctx.fillStyle = "#e8e8e8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw finish line
    ctx.fillStyle = "#333";
    ctx.fillRect(canvas.width - 10, 0, 2, canvas.height);

    // Draw lane dividers
    if (participants.length > 0) {
      const laneHeight = canvas.height / participants.length;

      for (let i = 1; i < participants.length; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * laneHeight);
        ctx.lineTo(canvas.width, i * laneHeight);
        ctx.strokeStyle = "#ccc";
        ctx.stroke();
      }
    }
  }

  // Parse names from input
  function parseNames() {
    const names = nameInput.value
      .trim()
      .split("\n")
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .map((name) => name.substring(0, 20)); // Limit name length to 20 chars

    // Save names to localStorage when race starts
    saveNames();

    return names;
  }

  // Initialize participants
  function initializeParticipants(names) {
    participants = [];
    const laneHeight = canvas.height / names.length;

    names.forEach((name, index) => {
      // Assign random colors to each participant
      const hue = Math.floor(Math.random() * 360);
      // Ensure colors are not too light (better contrast with white text)
      const color = `hsl(${hue}, 70%, 50%)`;

      participants.push({
        name,
        x: 20, // Starting position
        y: index * laneHeight + laneHeight / 2,
        radius: Math.min(12, laneHeight / 4), // Make smaller radius for more participants
        color,
        speed: 0,
        finished: false,
        laneIndex: index,
        laneHeight,
      });
    });

    // Pre-determine the winner
    selectedWinner = Math.floor(Math.random() * participants.length);
  }

  // Draw participants
  function drawParticipants() {
    participants.forEach((participant) => {
      // Draw runner (circle)
      ctx.beginPath();
      ctx.arc(participant.x, participant.y, participant.radius, 0, Math.PI * 2);
      ctx.fillStyle = participant.color;
      ctx.fill();

      // Draw initials
      ctx.fillStyle = "#fff";
      const fontSize = Math.min(12, participant.radius * 1.2);
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Get the first letter (initial) of the name
      const initial = participant.name.charAt(0);
      ctx.fillText(initial, participant.x, participant.y);

      // Draw name next to the runner - adjust font size based on lane height
      ctx.fillStyle = "#333";
      const nameFontSize = Math.min(14, participant.laneHeight / 2.5);
      ctx.font = `${nameFontSize}px Arial`;
      ctx.textAlign = "left";
      ctx.fillText(
        participant.name,
        10,
        participant.y - participant.radius - 2
      );
    });
  }

  // Animate the race
  function animateRace() {
    // Clear previous frame
    drawTrack();

    // Check if all participants have finished
    const allFinished = participants.every((p) => p.finished);
    if (allFinished) {
      endRace();
      return;
    }

    // Update positions and draw participants
    participants.forEach((participant, index) => {
      if (!participant.finished) {
        // Base speed - everyone moves (reduced for slower overall race)
        let speed = (0.5 + Math.random() * 1.5) / speedFactor;

        // Boost for the predetermined winner
        if (index === selectedWinner) {
          // Winner gets a small consistent advantage, but not too obvious
          speed += (0.2 + Math.random() * 0.3) / speedFactor;
        }

        // Random speed bursts for drama (less frequent for slower race)
        if (Math.random() < 0.05) {
          speed *= 1.3 + Math.random() * 0.3;
        }

        // Occasional slowdowns for drama
        if (Math.random() < 0.05) {
          speed *= 0.6;
        }

        // Catch-up mechanics: if falling behind, speed up
        const maxX = Math.max(...participants.map((p) => p.x));
        const distanceFromLeader = maxX - participant.x;

        // The further behind, the bigger the boost (with diminishing returns)
        if (distanceFromLeader > 100) {
          const catchUpFactor = Math.min(1.3, 1 + distanceFromLeader / 400);
          speed *= catchUpFactor;
        }

        // Near finish line excitement - runners get a burst near the end
        const distanceToFinish = canvas.width - 20 - participant.x;
        if (distanceToFinish < 100 && Math.random() < 0.1) {
          speed *= 1.2;
        }

        // Update position
        participant.x += speed;

        // Check if finished
        if (participant.x >= canvas.width - 20) {
          participant.x = canvas.width - 20; // Snap to finish line
          participant.finished = true;
        }
      }
    });

    // Draw participants in their updated positions
    drawParticipants();

    // Continue animation
    animationId = requestAnimationFrame(animateRace);
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

      // Setup the race
      initializeParticipants(names);
      drawTrack();
      drawParticipants();

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
    drawTrack();
    drawParticipants();

    // Show countdown number
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 60px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (countdown > 0) {
      ctx.fillText(countdown, canvas.width / 2, canvas.height / 2);
      countdown--;
      setTimeout(countdownDisplay, 1000);
    } else {
      ctx.fillText("GO!", canvas.width / 2, canvas.height / 2);
      setTimeout(() => {
        // Start the race animation
        animationId = requestAnimationFrame(animateRace);
      }, 1000);
    }
  }

  // Add result to history display
  function addResultToHistory(winnerName, color, timestamp, save = true) {
    const resultElement = document.createElement("div");
    resultElement.className = "result-item";
    resultElement.innerHTML = `
      <div class="result-color" style="background-color: ${color}"></div>
      <div class="result-info">
        <div class="result-winner">${winnerName}</div>
        <div class="result-time">${timestamp}</div>
      </div>
    `;

    // Add to results list
    resultsContainer.insertBefore(resultElement, resultsContainer.firstChild);

    // Save to localStorage if this is a new result
    if (save) {
      saveRaceResult(winnerName, color);
    }

    // Add fade-in animation
    setTimeout(() => {
      resultElement.classList.add("visible");
    }, 50);
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
    addResultToHistory(winner.name, winner.color, timestamp);

    // Add celebration animation
    setTimeout(() => {
      winnerDisplay.classList.add("show");
    }, 100);
  }

  // Helper function to determine color brightness
  function getColorBrightness(color) {
    // For HSL colors, estimate brightness based on lightness
    const match = color.match(/hsl\(\d+,\s*\d+%,\s*(\d+)%\)/);
    if (match) {
      return parseInt(match[1], 10) * 2.55; // Convert lightness percentage to 0-255
    }
    return 128; // Default middle brightness
  }

  // Reset race
  function resetRace() {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    raceInProgress = false;
    participants = [];
    selectedWinner = null;
    startRaceBtn.disabled = false;
    resetRaceBtn.disabled = false;
    tryDemoBtn.disabled = false;
    speedControl.disabled = false;
    nameInput.disabled = false;
    winnerDisplay.style.display = "none";
    winnerDisplay.classList.remove("show");

    drawTrack();
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

  // Add error handling for canvas operations
  window.addEventListener("error", function (e) {
    console.error("Runtime error:", e.message);
    if (raceInProgress) {
      alert("An error occurred. The race has been reset.");
      resetRace();
    }
  });
});
