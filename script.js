
// Helper function to get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j == 1 && k != 11) return "st";
  if (j == 2 && k != 12) return "nd";
  if (j == 3 && k != 13) return "rd";
  return "th";
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded");
  
  // DOM Elements
  const nameInput = document.getElementById("nameInput");
  const startRaceBtn = document.getElementById("startRace");
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
  let finishOrder = []; // Track order of finished cars

  // Constants
  const FINISH_LINE = raceTrackContainer.clientWidth - 150;
  const MAX_PARTICIPANTS = 20;
  const RACE_DURATION_BASE = 5000;

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
    { name: "cat", emoji: "🐱" },
    { name: "dog", emoji: "🐶" },
    { name: "rabbit", emoji: "🐰" },
    { name: "panda", emoji: "🐼" },
    { name: "fox", emoji: "🦊" },
    { name: "bear", emoji: "🐻" },
    { name: "koala", emoji: "🐨" },
    { name: "tiger", emoji: "🐯" },
    { name: "monkey", emoji: "🐵" },
    { name: "pig", emoji: "🐷" },
  ];

  // Color palette for cars
  const colorPalette = [
    "#FF5733", // Red
    "#33FF57", // Green
    "#3357FF", // Blue
    "#FF33A8", // Pink
    "#33FFF5", // Cyan
    "#F5FF33", // Yellow
    "#C233FF", // Purple
    "#FF8C33", // Orange
    "#33FFBD", // Mint
    "#FF335C", // Crimson
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

      // Initialize participant starting position
      const participant = {
        name,
        color,
        emoji: character.emoji,
        x: 20,
        y: index * laneHeight + laneHeight / 2,
        speed: 0,
        baseSpeed: 1 + Math.random() * 0.5,
        finished: false,
        winning: index === selectedWinner,
        showPhrase: false,
        laneIndex: index,
        nameOffset: 0,
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
      racer.style.top = `${laneHeight / 2 - 25}px`;

      // Create a container for the car and animal
      const carContainer = document.createElement("div");
      carContainer.className = "car-container";
      carContainer.style.left = "20px";

      // Create car body
      const carBody = document.createElement("div");
      carBody.className = "racer-car";
      carBody.style.backgroundColor = color;

      // Create wheels
      const frontWheel = document.createElement("div");
      frontWheel.className = "car-wheel front";

      const backWheel = document.createElement("div");
      backWheel.className = "car-wheel back";

      // Create exhaust
      const exhaust = document.createElement("div");
      exhaust.className = "car-exhaust";

      // Create animal
      const animal = document.createElement("div");
      animal.className = "racer-animal";
      animal.textContent = character.emoji;

      // Create tether rope
      const tether = document.createElement("div");
      tether.className = "tether";
      tether.id = `tether-${index}`;

      // Create name label
      const nameLabel = document.createElement("div");
      nameLabel.className = "racer-name";
      nameLabel.id = `name-${index}`;
      nameLabel.textContent = name;

      // Position name label initially
      nameLabel.style.left = "-40px";
      nameLabel.style.top = "50%";

      // Assemble car
      carBody.appendChild(frontWheel);
      carBody.appendChild(backWheel);
      carBody.appendChild(exhaust);

      // Create avatar container
      const avatarContainer = document.createElement("div");
      avatarContainer.className = "racer-avatar";
      avatarContainer.appendChild(carBody);
      avatarContainer.appendChild(animal);

      // Assemble car container
      carContainer.appendChild(avatarContainer);

      // Assemble racer
      racer.appendChild(carContainer);
      lane.appendChild(racer);
      lane.appendChild(tether);
      lane.appendChild(nameLabel);

      // Add lane to track
      raceLanes.appendChild(lane);
    });

    // Add background elements
    createBackgroundElements();

    // Initial positioning of names and tethers
    updateTethersAndNames();
  }

  // Calculate lane height based on participant count
  function calculateLaneHeight(participantCount) {
    const containerHeight = raceTrackContainer.clientHeight;
    const groundHeight = 15;
    const usableHeight = containerHeight - groundHeight;
    return usableHeight / participantCount;
  }

  // Create background decorations
  function createBackgroundElements() {
    // Remove existing elements
    document.querySelectorAll(".background-element").forEach(el => el.remove());

    // Create decorative elements
    const decorations = [
      { emoji: "🌳", count: 5, class: "tree", yRange: [30, 70] },
      { emoji: "🌺", count: 4, class: "flower", yRange: [60, 80] },
      { emoji: "⛅", count: 3, class: "cloud", yRange: [10, 30] },
      { emoji: "👥", count: 6, class: "spectator", yRange: [50, 90] }
    ];

    decorations.forEach(decoration => {
      for (let i = 0; i < decoration.count; i++) {
        const element = document.createElement("div");
        element.className = `background-element ${decoration.class}`;
        element.textContent = decoration.emoji;
        element.style.cssText = `
          position: absolute;
          left: ${Math.random() * 90}%;
          top: ${decoration.yRange[0] + Math.random() * (decoration.yRange[1] - decoration.yRange[0])}%;
          font-size: ${1 + Math.random()}em;
          opacity: 0.8;
          transform: scale(${0.8 + Math.random() * 0.4});
          animation: float ${5 + Math.random() * 5}s infinite alternate ease-in-out;
          z-index: ${decoration.class === 'cloud' ? 0 : 1};
        `;
        raceTrackContainer.appendChild(element);
      }
    });

    // Add animated elements
    const animatedElements = [
      { emoji: "🦋", class: "butterfly", count: 2 },
      { emoji: "🐦", class: "bird", count: 2 }
    ];

    animatedElements.forEach(type => {
      for (let i = 0; i < type.count; i++) {
        const element = document.createElement("div");
        element.className = `background-element ${type.class}`;
        element.textContent = type.emoji;
        element.style.cssText = `
          position: absolute;
          left: ${Math.random() * 90}%;
          top: ${20 + Math.random() * 40}%;
          font-size: 1.2em;
          z-index: 2;
          animation: fly${type.class} ${10 + Math.random() * 5}s infinite linear;
          animation-delay: ${Math.random() * 5}s;
        `;
        raceTrackContainer.appendChild(element);
      }
    });
  }

  // Create running dust effect
  function createDust(racerId) {
    const racer = document.getElementById(`racer-${racerId}`);
    if (!racer) return;

    const carContainer = racer.querySelector(".car-container");
    if (!carContainer) return;

    const dust = document.createElement("div");
    dust.className = "running-dust";

    // Position behind the car
    const carRect = carContainer.getBoundingClientRect();
    const containerRect = raceTrackContainer.getBoundingClientRect();

    dust.style.left = `${
      carRect.left - containerRect.left - 10 + Math.random() * 4
    }px`;
    dust.style.top = `${
      carRect.top - containerRect.top + carRect.height / 2 + 5
    }px`;

    const size = 3 + Math.random() * 7;
    dust.style.width = `${size}px`;
    dust.style.height = `${size}px`;

    const opacity = 0.3 + Math.random() * 0.3;
    dust.style.backgroundColor = `rgba(150, 150, 150, ${opacity})`;

    raceTrackContainer.appendChild(dust);

    dust.style.transition = "all 0.3s ease-out";

    setTimeout(() => {
      dust.style.transform = `translate(-${10 + Math.random() * 15}px, -${
        Math.random() * 10
      }px) scale(${1 + Math.random()})`;
      dust.style.opacity = "0";
    }, 10);

    setTimeout(() => {
      dust.remove();
    }, 350);
  }

  // Update tethers and names
  function updateTethersAndNames() {
    participants.forEach((participant, index) => {
      const carContainer = document.querySelector(
        `#racer-${index} .car-container`
      );
      const nameLabel = document.getElementById(`name-${index}`);
      const tether = document.getElementById(`tether-${index}`);

      if (!carContainer || !nameLabel || !tether) return;

      const carRect = carContainer.getBoundingClientRect();
      const carCenterY = carRect.top + carRect.height / 2;
      const laneRect = document
        .querySelectorAll(".race-lane")
        [index].getBoundingClientRect();

      const nameOffsetMax = 120;
      const followerSpeed = 0.93;

      if (participant.finished) {
        const nameX = FINISH_LINE - nameOffsetMax;
        nameLabel.style.left = `${nameX}px`;

        const nameLabelRect = nameLabel.getBoundingClientRect();
        const nameWidth = nameLabelRect.width;

        const tetherStartX = nameX + nameWidth;
        const tetherEndX = FINISH_LINE;
        const tetherLength = Math.max(5, tetherEndX - tetherStartX);

        tether.style.left = `${tetherStartX}px`;
        tether.style.top = `${carCenterY - laneRect.top}px`;
        tether.style.width = `${tetherLength}px`;
      } else if (!raceInProgress && participant.x <= 20) {
        nameLabel.style.left = `-40px`;
        tether.style.left = `0px`;
        tether.style.top = `${carCenterY - laneRect.top}px`;
        tether.style.width = `10px`;
      } else {
        participant.nameOffset = Math.min(
          participant.nameOffset + (1 - followerSpeed) * (participant.x / 15),
          nameOffsetMax
        );

        const nameX = Math.max(20, participant.x - participant.nameOffset);

        nameLabel.style.left = `${nameX}px`;

        const nameLabelRect = nameLabel.getBoundingClientRect();
        const nameWidth = nameLabelRect.width;

        const tetherStartX = nameX + nameWidth;
        const tetherEndX = participant.x;
        const tetherLength = Math.max(5, tetherEndX - tetherStartX);

        tether.style.left = `${tetherStartX}px`;
        tether.style.top = `${carCenterY - laneRect.top}px`;
        tether.style.width = `${tetherLength}px`;
      }
    });
  }

  // Animate the race
  function animateRace() {
    const allFinished = participants.every((p) => p.finished);
    if (allFinished && finishOrder.length > 0) {
      console.log('Race completed, all participants finished');
      clearInterval(raceInterval);
      raceInterval = null;
      raceInProgress = false;

      // Get first and last place
      const winner = participants[finishOrder[0]];
      const lastPlace = participants[finishOrder[finishOrder.length - 1]];
      
      console.log('Race winners:', {
        winner: {
          name: winner.name,
          color: winner.color,
          emoji: winner.emoji
        },
        lastPlace: {
          name: lastPlace.name,
          emoji: lastPlace.emoji
        }
      });

      // Create and display results
      const resultDisplay = document.createElement('div');
      resultDisplay.className = 'race-result-display';
      resultDisplay.innerHTML = `
        <div class="result-header">Race Results</div>
        <div class="position-display">
          <div class="first-place">🥇 First: ${winner.name} ${winner.emoji}</div>
          <div class="last-place">Last: ${lastPlace.name} ${lastPlace.emoji}</div>
        </div>
      `;
      
      winnerDisplay.innerHTML = '';
      winnerDisplay.appendChild(resultDisplay);
      winnerDisplay.style.display = 'block';
      winnerDisplay.classList.add('show');
      
      // Add to race history
      addResultToHistory(
        winner.name,
        winner.color,
        winner.emoji,
        new Date().toLocaleString()
      );

      // Enable controls after a short delay
      setTimeout(() => {
        startRaceBtn.disabled = false;
        speedControl.disabled = false;
        nameInput.disabled = false;
        playCelebrationEffect();
      }, 500);
      
      return;
    }

    // Sort participants by position to determine current places
    // First get finished participants in their finish order
    const sortedFinished = finishOrder.map(index => participants[index]);
    
    // Then sort running participants by current position
    const runningParticipants = participants.filter(p => !p.finished);
    const sortedRunning = [...runningParticipants].sort((a, b) => b.x - a.x);
    
    // Combine finished and running participants
    const sortedByPosition = [...sortedFinished, ...sortedRunning];
    
    console.log('Race Status:', {
      finishOrder,
      finishedParticipants: sortedFinished.map(p => ({
        name: p.name,
        position: finishOrder.indexOf(p.laneIndex) + 1,
        x: p.x,
        laneIndex: p.laneIndex
      })),
      runningParticipants: sortedRunning.map(p => ({
        name: p.name,
        x: p.x,
        laneIndex: p.laneIndex
      }))
    });
    
    sortedByPosition.forEach((participant, place) => {
      const racer = document.getElementById(`racer-${participant.laneIndex}`);
      if (!racer) return;

      // Update place labels
      let placeLabel = racer.querySelector('.place-label');
      if (!placeLabel) {
        placeLabel = document.createElement('div');
        placeLabel.className = 'place-label';
        placeLabel.style.cssText = `
          position: absolute;
          right: -60px;
          top: 50%;
          transform: translateY(-50%);
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 14px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          min-width: 35px;
          text-align: center;
          font-family: 'Montserrat', sans-serif;
          z-index: 20;
          animation: pulsePlace 2s infinite;
        `;
        racer.appendChild(placeLabel);
      }
      placeLabel.textContent = `${place + 1}${getOrdinalSuffix(place + 1)}`;
    });

    const raceFactor = 1 - speedControl.value / 100;

    participants.forEach((participant, index) => {
      if (participant.finished) return;

      const racer = document.getElementById(`racer-${index}`);
      if (!racer) return;

      racer.classList.add("running");

      let maxSpeed = 5;
      maxSpeed = maxSpeed / 3;

      if (participant.winning) {
        const winningFactor = 1.05 + Math.random() * 0.1;
        maxSpeed *= winningFactor;

        const raceProgress = participant.x / FINISH_LINE;
        if (raceProgress > 0.7) {
          maxSpeed *= 1.1;
        }
      } else {
        maxSpeed *= participant.baseSpeed;

        if (Math.random() < 0.05) {
          maxSpeed *= 1.5;
        }

        const leader = participants.reduce((prev, curr) =>
          prev.x > curr.x ? prev : curr
        );

        if (leader.x - participant.x > FINISH_LINE * 0.3) {
          maxSpeed *= 1.2;
        }
      }

      maxSpeed *= 1 - raceFactor * 0.8;

      const randomFactor = 0.8 + Math.random() * 0.4;
      const speed = maxSpeed * randomFactor;

      participant.x += speed;

      const carContainer = racer.querySelector(".car-container");
      if (carContainer) {
        carContainer.style.left = `${participant.x}px`;
      }

      if (Math.random() < 0.1) {
        createDust(index);
      }

      if (participant.x >= FINISH_LINE && !participant.finished) {
        participant.finished = true;
        participant.x = FINISH_LINE;
        const carContainer = racer.querySelector(".car-container");
        if (carContainer) {
          carContainer.style.left = `${FINISH_LINE}px`;
        }
        racer.classList.remove("running");
        
        // Add to finish order if not already there
        if (!finishOrder.includes(participant.laneIndex)) {
          finishOrder.push(participant.laneIndex);
          
          // If this is the first finisher, they're the winner
          if (finishOrder.length === 1) {
            participant.winning = true;
            racer.classList.add("winner");
            console.log('Winner:', {
              name: participant.name,
              position: finishOrder.length,
              laneIndex: participant.laneIndex
            });
          }
        }

        if (
          !participant.winning &&
          participants.filter((p) => p.finished).length === 1
        ) {
          participants.forEach((p, idx) => {
            p.winning = idx === index;
          });
        }

        if (participant.winning) {
          racer.classList.add("winner");
        }
      }
    });

    updateTethersAndNames();
  }

  // Start race with countdown
  function startRace() {
    console.log("Starting race...");
    try {
      // Reset race state
      if (raceInterval) {
        clearInterval(raceInterval);
        raceInterval = null;
      }
      
      // Clear previous race positions
      document.querySelectorAll(".race-lane").forEach((lane) => {
        lane.querySelectorAll(".place-label").forEach((label) => label.remove());
      });
      document.querySelectorAll(".running-dust").forEach((dust) => dust.remove());
      
      console.log("Current participants:", nameInput.value);
      if (!nameInput.value.trim()) {
        nameInput.value = sampleNames.join("\n");
      }

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

      raceInProgress = true;
      raceCount++;
      startRaceBtn.disabled = true;
      speedControl.disabled = true;
      nameInput.disabled = true;
      winnerDisplay.style.display = "none";
      winnerDisplay.classList.remove("show");

      saveNames();
      finishOrder = []; // Reset finish order for new race
      participants = []; // Reset participants array

      initializeParticipants(names);

      countdown = 3;
      countdownDisplay();
    } catch (error) {
      console.error("Error starting race:", error);
      alert("An error occurred while starting the race. Please refresh the page and try again.");
      cleanupRace();
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
        raceInterval = setInterval(animateRace, 48);
      }, 1000);
    }
  }

  // Calculate color brightness
  function getColorBrightness(hex) {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  // Create confetti for celebration
  function playCelebrationEffect() {
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        createConfetti();
      }, i * 50);
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

    const rect = winnerDisplay.getBoundingClientRect();
    const winX = rect.left + rect.width / 2;
    const winY = rect.top + rect.height / 2;

    const startX = winX + (Math.random() * 200 - 100);
    const startY = winY - 100;

    confetti.style.left = `${startX}px`;
    confetti.style.top = `${startY}px`;

    document.body.appendChild(confetti);

    const fallDuration = 1000 + Math.random() * 3000;
    const fallDelay = Math.random() * 500;

    confetti.style.transition = `top ${fallDuration}ms ease-in ${fallDelay}ms, 
                              left ${fallDuration}ms ease-out ${fallDelay}ms,
                              opacity ${fallDuration * 0.5}ms ease-in ${
      fallDuration * 0.5 + fallDelay
    }ms`;

    setTimeout(() => {
      confetti.style.top = `${winY + 300 + Math.random() * 100}px`;
      confetti.style.left = `${startX + (Math.random() * 200 - 100)}px`;
      confetti.style.opacity = "0";

      setTimeout(() => {
        confetti.remove();
      }, fallDuration + fallDelay);
    }, 10);
  }

  // Add result to history display
  function addResultToHistory(
    participantName,
    color,
    character,
    timestamp,
    save = true
  ) {
    console.log('Adding result to history:', { participantName, color, character, timestamp });
    
    // Ensure results container exists and is visible
    if (!resultsContainer) {
      console.error('Results container not found');
      return;
    }
  
    // Make sure the results section is visible
    const resultsSection = document.querySelector('.results-section');
    if (resultsSection) {
      resultsSection.style.display = 'block';
    }
  
    const resultElement = document.createElement("div");
    resultElement.className = "result-item";
  
    // Try to find character by name, or use the character string directly if it's an emoji
    const characterObj = characterSet.find((c) => c.name === character);
    const emoji = characterObj?.emoji || (character?.length === 2 ? character : "🏃");
  
    resultElement.innerHTML = `
      <div class="result-color" style="background-color: ${color}">${emoji}</div>
      <div class="result-info">
        <div class="result-winner">🏆 ${participantName || "Unknown Racer"}</div>
        <div class="result-time">${timestamp}</div>
      </div>
    `;
  
    // Insert at the beginning of the container
    resultsContainer.insertBefore(resultElement, resultsContainer.firstChild);
  
    // Force a reflow to trigger the animation
    resultElement.offsetHeight;
  
    // Add visible class after insertion
    resultElement.classList.add("visible");
    console.log('Result element added:', resultElement);
  
    if (save) {
      saveRaceResult(participantName, color, character);
    }
  }

  // Error handling cleanup function
  function cleanupRace() {
    if (raceInterval) {
      clearInterval(raceInterval);
      raceInterval = null;
    }

    // Reset race state
    raceInProgress = false;
    startRaceBtn.disabled = false;
    speedControl.disabled = false;
    nameInput.disabled = false;
    winnerDisplay.style.display = "none";
    winnerDisplay.classList.remove("show");
    countdownOverlay.style.display = "none";
    finishOrder = [];
    
    // Clear visual elements
    document.querySelectorAll(".running-dust").forEach((dust) => dust.remove());
    document.querySelectorAll(".race-lane").forEach((lane) => {
      lane.querySelectorAll(".place-label").forEach((label) => label.remove());
    });
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
      try {
        const results = JSON.parse(savedResults);
        results.forEach((result) => {
          // result.character now contains the emoji directly
          addResultToHistory(
            result.participant || "Unknown Racer",
            result.color || "#4f46e5",
            result.character || "🏃", // Pass emoji directly
            result.timestamp || new Date().toLocaleString(),
            false
          );
        });
      } catch (error) {
        console.error("Error loading race history:", error);
        localStorage.removeItem("raceResults"); // Clear corrupted data
      }
    }
  }

  // Save names to localStorage
  function saveNames() {
    localStorage.setItem("raceNames", nameInput.value);
  }
  // Save race result to localStorage
  function saveRaceResult(participant, color, emoji) {
    // Ensure we have valid values for all fields
    const result = {
      participant: participant || "Unknown Racer",
      color: color || "#4f46e5",
      character: emoji || "🏃", // Store the emoji directly
      timestamp: new Date().toLocaleString()
    };
  
    let results = [];
    try {
      const savedResults = localStorage.getItem("raceResults");
      if (savedResults) {
        results = JSON.parse(savedResults);
      }
    } catch (error) {
      console.error("Error parsing saved results:", error);
      // Continue with empty results array
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
  console.log("Setting up event listeners");
  startRaceBtn.addEventListener("click", () => {
    console.log("Start Race button clicked");
    startRace();
  });

  const clearHistoryBtn = document.getElementById("clearHistory");
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", clearHistory);
  }

  window.addEventListener("error", function (e) {
    console.error("Runtime error:", e.message);
    if (raceInProgress) {
      alert("An error occurred. Please refresh the page to start a new race.");
      cleanupRace();
    }
  });

  window.addEventListener("resize", () => {
    if (participants.length > 0) {
      const laneHeight = calculateLaneHeight(participants.length);
      document.querySelectorAll(".race-lane").forEach((lane, index) => {
        lane.style.height = `${laneHeight}px`;

        const racer = document.getElementById(`racer-${index}`);
        if (racer) {
          racer.style.top = `${laneHeight / 2 - 25}px`;
        }
      });
    }
  });

  // Initialize when page loads
  loadSavedNames();
  loadRaceHistory();
  initSpeedControl();
});
