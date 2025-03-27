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
  let sprites = {}; // Character sprites
  let animationFrame = 0; // For sprite animation
  let frameCount = 0; // For controlling animation speed

  // Define character set
  const characterSet = [
    { name: "runner", frames: 2, runningPhrase: "I'm running fast!" },
    { name: "unicorn", frames: 2, runningPhrase: "Magical speed!" },
    { name: "robot", frames: 2, runningPhrase: "Beep boop zoom!" },
    { name: "dino", frames: 2, runningPhrase: "Prehistoric pace!" },
    { name: "ninja", frames: 2, runningPhrase: "Silent but swift!" },
    { name: "zombie", frames: 2, runningPhrase: "Braaains... fast brains!" },
    { name: "dog", frames: 2, runningPhrase: "Woof! Catch me!" },
    { name: "cat", frames: 2, runningPhrase: "Meow-speed!" },
  ];

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

  // Preload character sprites
  function loadSprites() {
    characterSet.forEach((character) => {
      sprites[character.name] = [];
      for (let i = 1; i <= character.frames; i++) {
        const img = new Image();
        img.src = `sprites/${character.name}${i}.png`;
        sprites[character.name].push(img);

        // Fallback if image fails to load
        img.onerror = function () {
          console.log(`Failed to load sprite: ${character.name}${i}.png`);
          // Create emoji fallback
          const emojiMap = {
            runner: "🏃",
            unicorn: "🦄",
            robot: "🤖",
            dino: "🦖",
            ninja: "🥷",
            zombie: "🧟",
            dog: "🐕",
            cat: "🐈",
          };
          character.emoji = emojiMap[character.name] || "😊";
        };
      }
    });
  }

  // Initialize speed control
  function initSpeedControl() {
    speedControl.addEventListener("input", function () {
      const value = this.value;
      // Modify to make the race about 3x slower by default
      speedFactor = (2 - value / 100) * 3;
      speedValue.textContent = getSpeedLabel(value);
    });

    // Set initial value
    speedControl.value = 70;
    speedValue.textContent = getSpeedLabel(70);
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

  // Initialize when page loads
  setupCanvas();
  loadSavedNames();
  loadRaceHistory();
  initSpeedControl();
  loadSprites();
  window.addEventListener("resize", setupCanvas);

  // Draw the race track with fun theme
  function drawTrack() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "#f0f4ff");
    gradient.addColorStop(1, "#e6edff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw clouds in the background
    drawClouds();

    // Draw grass
    ctx.fillStyle = "#95e495";
    ctx.fillRect(0, canvas.height - 15, canvas.width, 15);

    // Draw finish line
    drawFinishLine();

    // Draw lane dividers
    if (participants.length > 0) {
      const laneHeight = canvas.height / participants.length;

      for (let i = 1; i < participants.length; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * laneHeight);
        ctx.lineTo(canvas.width, i * laneHeight);
        ctx.strokeStyle = "#dcecff";
        ctx.stroke();
      }
    }
  }

  // Draw decorative clouds
  function drawClouds() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

    // Cloud 1
    drawCloud(canvas.width * 0.2, 40, 60);

    // Cloud 2
    drawCloud(canvas.width * 0.6, 30, 45);

    // Cloud 3
    drawCloud(canvas.width * 0.8, 50, 65);
  }

  // Helper function to draw a cloud
  function drawCloud(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.arc(x + size / 2, y - size / 4, size / 3, 0, Math.PI * 2);
    ctx.arc(x + size, y, size / 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw finish line
  function drawFinishLine() {
    const finishX = canvas.width - 40;
    const checkSize = 10;
    const finishHeight = canvas.height - 15; // Above grass

    // Draw finish pole
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(finishX, 0, 10, finishHeight);

    // Draw checkered pattern
    ctx.fillStyle = "#000";
    for (let y = 0; y < finishHeight; y += checkSize * 2) {
      for (let i = 0; i < 2; i++) {
        ctx.fillRect(finishX, y + i * checkSize, checkSize, checkSize);
        ctx.fillRect(
          finishX + checkSize,
          y + (i + 1) * checkSize,
          checkSize,
          checkSize
        );
      }
    }

    // Draw finishing banner
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(finishX - 5, 0, 20, 30);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Arial";
    ctx.save();
    ctx.translate(finishX + 5, 15);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("FINISH", 0, 0);
    ctx.restore();
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

      // Assign random character type
      const characterType =
        characterSet[Math.floor(Math.random() * characterSet.length)];

      participants.push({
        name,
        x: 20, // Starting position
        y: index * laneHeight + laneHeight / 2,
        size: Math.min(24, laneHeight / 3), // Size for character
        color,
        speed: 0,
        speedVariation: 0,
        finished: false,
        laneIndex: index,
        laneHeight,
        character: characterType.name,
        phrase: characterType.runningPhrase,
        showPhrase: false,
        phraseDuration: 0,
      });
    });

    // Pre-determine the winner
    selectedWinner = Math.floor(Math.random() * participants.length);
  }

  // Draw participants
  function drawParticipants() {
    // Update animation frame every few frames
    frameCount++;
    if (frameCount > 5) {
      animationFrame = (animationFrame + 1) % 2; // Toggle between 0 and 1 for simple 2-frame animation
      frameCount = 0;
    }

    participants.forEach((participant) => {
      const x = participant.x;
      const y = participant.y;
      const size = participant.size;

      // Check if we have the sprite
      if (
        sprites[participant.character] &&
        sprites[participant.character].length > 0
      ) {
        // Use loaded sprite
        const sprite = sprites[participant.character][animationFrame];
        if (sprite.complete && sprite.naturalHeight !== 0) {
          // Draw sprite image
          ctx.drawImage(sprite, x - size, y - size, size * 2, size * 2);
        } else {
          // Fallback to emoji
          drawEmojiCharacter(participant);
        }
      } else {
        // Fallback to emoji
        drawEmojiCharacter(participant);
      }

      // Draw name above character
      ctx.fillStyle = "#333";
      const nameFontSize = Math.min(14, participant.laneHeight / 2.5);
      ctx.font = `${nameFontSize}px var(--font-primary)`;
      ctx.textAlign = "center";
      ctx.fillText(participant.name, x, y - size - 5);

      // Draw speech bubble if active
      if (participant.showPhrase && participant.phraseDuration > 0) {
        drawSpeechBubble(x + size + 10, y, participant.phrase);
      }

      // Draw "dust" behind running character
      if (!participant.finished && raceInProgress) {
        drawRunningDust(x - size / 2, y + size / 2);
      }
    });
  }

  // Draw emoji character as fallback
  function drawEmojiCharacter(participant) {
    const character = characterSet.find(
      (c) => c.name === participant.character
    );
    const emoji = character?.emoji || "🏃";

    ctx.font = `${participant.size * 1.5}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, participant.x, participant.y);
  }

  // Draw speech bubble
  function drawSpeechBubble(x, y, text) {
    const bubbleWidth = ctx.measureText(text).width + 20;
    const bubbleHeight = 30;

    // Bubble background
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;

    // Draw rounded rectangle
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 10, y + 10);
    ctx.lineTo(x, y + 5);
    ctx.lineTo(x, y + bubbleHeight);
    ctx.arcTo(x + bubbleWidth, y + bubbleHeight, x + bubbleWidth, y, 5);
    ctx.arcTo(x + bubbleWidth, y, x, y, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.fillStyle = "#333";
    ctx.font = "12px var(--font-secondary)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + bubbleWidth / 2, y + bubbleHeight / 2);
  }

  // Draw dust effect behind running character
  function drawRunningDust(x, y) {
    ctx.fillStyle = "rgba(200, 200, 200, 0.5)";

    // Draw a few random particles
    for (let i = 0; i < 3; i++) {
      const size = Math.random() * 5 + 2;
      const offsetX = Math.random() * 10 - 15;
      const offsetY = Math.random() * 10 - 5;

      ctx.beginPath();
      ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
      ctx.fill();
    }
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

          // Randomly show speech bubble during speed bursts
          if (Math.random() < 0.3 && !participant.showPhrase) {
            participant.showPhrase = true;
            participant.phraseDuration = 50; // Show for 50 frames
          }
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
        const distanceToFinish = canvas.width - 60 - participant.x;
        if (distanceToFinish < 100 && Math.random() < 0.1) {
          speed *= 1.2;
        }

        // Update position
        participant.x += speed;

        // Decrease speech bubble duration if active
        if (participant.showPhrase) {
          participant.phraseDuration--;
          if (participant.phraseDuration <= 0) {
            participant.showPhrase = false;
          }
        }

        // Check if finished
        if (participant.x >= canvas.width - 60) {
          participant.x = canvas.width - 60; // Snap to finish line
          participant.finished = true;

          // Show celebration phrase for winner
          if (index === selectedWinner) {
            participant.phrase = "I won! 🎉";
            participant.showPhrase = true;
            participant.phraseDuration = 100; // Show longer for winner
          }
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
    ctx.font = "bold 60px var(--font-primary)";
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

    // Don't reset participants so they remain visible on the track
  }

  // Play celebration effect
  function playCelebrationEffect() {
    // Draw confetti
    const confettiAmount = 100;
    let confetti = [];

    // Create confetti particles
    for (let i = 0; i < confettiAmount; i++) {
      confetti.push({
        x: canvas.width - 60, // Position near finish line
        y: 0,
        size: Math.random() * 8 + 5,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        speedX: (Math.random() - 0.5) * 5,
        speedY: Math.random() * 5 + 2,
        rotation: Math.random() * 360,
      });
    }

    // Animate confetti
    function animateConfetti() {
      if (!winnerDisplay.classList.contains("show")) return; // Stop if celebration ended

      // Clear only the top portion where confetti will be
      ctx.clearRect(0, 0, canvas.width, 100);
      drawTrack();
      drawParticipants();

      // Draw and update confetti
      for (let i = 0; i < confetti.length; i++) {
        const c = confetti[i];

        // Draw confetti piece
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate((c.rotation * Math.PI) / 180);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
        ctx.restore();

        // Update position
        c.x += c.speedX;
        c.y += c.speedY;
        c.rotation += 5;

        // Reset if off screen
        if (c.y > canvas.height) {
          c.y = 0;
          c.x = Math.random() * canvas.width;
        }
      }

      requestAnimationFrame(animateConfetti);
    }

    // Start confetti animation
    animateConfetti();
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

  // Reset race (but keep participants visible)
  function resetRace() {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    raceInProgress = false;
    startRaceBtn.disabled = false;
    resetRaceBtn.disabled = false;
    tryDemoBtn.disabled = false;
    speedControl.disabled = false;
    nameInput.disabled = false;
    winnerDisplay.style.display = "none";
    winnerDisplay.classList.remove("show");

    // Instead of clearing participants, just reset their positions if they exist
    if (participants.length > 0) {
      participants.forEach((participant) => {
        participant.x = 20;
        participant.finished = false;
        participant.showPhrase = false;
      });

      drawTrack();
      drawParticipants();
    } else {
      drawTrack();
    }
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
