const getOrdinalSuffix = (num) => {
  const j = num % 10, k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

let buildInfo = null;

const fetchBuildInfo = async () => {
  try {
    const response = await fetch("/api/build-info");
    if (response.ok) {
      buildInfo = await response.json();
      console.log("Build info loaded:", buildInfo);
      displayBuildInfo();
    }
  } catch (error) {
    console.warn("Error fetching build info:", error);
  }
};

const displayBuildInfo = () => {
  if (!buildInfo) return;

  const buildInfoElement = document.createElement("div");
  buildInfoElement.className = "build-info";
  buildInfoElement.innerHTML = `
    <div class="build-info-content">
      Created by <a href="https://balddata.xyz/" target="_blank" rel="noopener noreferrer">Bald Data</a> • Build: <span class="build-hash">${buildInfo.commitHash}</span>
    </div>
  `;

  const footer = document.querySelector("footer");
  if (footer) footer.appendChild(buildInfoElement);
};

const createDebugPanel = () => {
  if (buildInfo && !buildInfo.isProduction) {
    const debugPanel = document.createElement("div");
    debugPanel.className = "text-center";
    debugPanel.innerHTML = `
      <p class="text-sm text-gray-500">Created by <a href="https://balddata.xyz/" target="_blank" rel="noopener noreferrer">Bald Data</a> • Build: <span class="font-mono text-gray-600">${buildInfo.commitHash || "unknown"}</span></p>
    `;
    document.body.appendChild(debugPanel);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  fetchBuildInfo();

  // DOM Elements
  const elements = {
    nameInput: document.getElementById("nameInput"),
    startRaceBtn: document.getElementById("startRace"),
    speedControl: document.getElementById("speedControl"),
    speedValue: document.getElementById("speedValue"),
    winnerDisplay: document.getElementById("winner"),
    resultsContainer: document.getElementById("resultsContainer"),
    raceTrackContainer: document.getElementById("raceTrackContainer"),
    raceLanes: document.getElementById("raceLanes"),
    countdownOverlay: document.getElementById("countdownOverlay")
  };

  // Race state
  const state = {
    participants: [],
    raceInProgress: false,
    raceCount: 0,
    selectedWinner: 0,
    countdown: 3,
    raceInterval: null,
    finishOrder: []
  };

  // Constants
  const CONFIG = {
    FINISH_LINE: elements.raceTrackContainer.clientWidth - 150,
    MAX_PARTICIPANTS: 20,
    RACE_DURATION_BASE: 5000
  };

  const DATA = {
    sampleNames: ["Lightning", "Thunder", "Blaze", "Zoom", "Flash", "Bolt", "Dash", "Rocket", "Speedy", "Swift"],
    characterSet: [
      { name: "cat", emoji: "🐱" }, { name: "dog", emoji: "🐶" }, { name: "rabbit", emoji: "🐰" },
      { name: "panda", emoji: "🐼" }, { name: "fox", emoji: "🦊" }, { name: "bear", emoji: "🐻" },
      { name: "koala", emoji: "🐨" }, { name: "tiger", emoji: "🐯" }, { name: "monkey", emoji: "🐵" }, { name: "pig", emoji: "🐷" }
    ],
    colorPalette: ["#FF5733", "#33FF57", "#3357FF", "#FF33A8", "#33FFF5", "#F5FF33", "#C233FF", "#FF8C33", "#33FFBD", "#FF335C"]
  };

  const initSpeedControl = () => {
    elements.speedControl.addEventListener("input", () => {
      const value = elements.speedControl.value;
      const labels = ["Slow", "Medium", "Fast", "Super Fast"];
      const index = Math.min(Math.floor(value / 25), 3);
      elements.speedValue.textContent = labels[index];
    });
  };

  const parseNames = () => {
    const rawInput = elements.nameInput.value.trim();
    if (!rawInput) throw new Error("No names entered");
    return rawInput.split("\n").map(name => name.trim()).filter(name => name.length > 0);
  };

  const initializeParticipants = (names) => {
    state.participants = [];
    elements.raceLanes.innerHTML = "";
    state.selectedWinner = Math.floor(Math.random() * names.length);
    const laneHeight = calculateLaneHeight(names.length);

    names.forEach((name, index) => {
      const color = DATA.colorPalette[index % DATA.colorPalette.length];
      const character = DATA.characterSet[Math.floor(Math.random() * DATA.characterSet.length)];

      const participant = {
        name, color, emoji: character.emoji, x: 20,
        y: index * laneHeight + laneHeight / 2, speed: 0,
        baseSpeed: 1 + Math.random() * 0.5, finished: false,
        winning: index === state.selectedWinner, showPhrase: false,
        laneIndex: index, nameOffset: 0
      };

      state.participants.push(participant);

      const lane = createLaneElement(laneHeight, index, name, color, character.emoji);
      elements.raceLanes.appendChild(lane);
    });

    document.querySelectorAll(".background-element").forEach(el => el.remove());
    updateTethersAndNames();
  };

  const createLaneElement = (laneHeight, index, name, color, emoji) => {
    const lane = document.createElement("div");
    lane.className = "race-lane";
    lane.style.height = `${laneHeight}px`;

    const racer = document.createElement("div");
    racer.className = "racer";
    racer.id = `racer-${index}`;
    racer.style.top = `${laneHeight / 2 - 25}px`;

    const carContainer = document.createElement("div");
    carContainer.className = "car-container";
    carContainer.style.left = "20px";

    const carBody = document.createElement("div");
    carBody.className = "racer-car";
    carBody.style.backgroundColor = color;

    const wheels = ['front', 'back'].map(pos => {
      const wheel = document.createElement("div");
      wheel.className = `car-wheel ${pos}`;
      return wheel;
    });

    const exhaust = document.createElement("div");
    exhaust.className = "car-exhaust";

    const animal = document.createElement("div");
    animal.className = "racer-animal";
    animal.textContent = emoji;

    const tether = document.createElement("div");
    tether.className = "tether";
    tether.id = `tether-${index}`;

    const nameLabel = document.createElement("div");
    nameLabel.className = "racer-name";
    nameLabel.id = `name-${index}`;
    nameLabel.textContent = name;
    nameLabel.style.cssText = "left: -40px; top: 50%;";

    carBody.append(...wheels, exhaust);
    
    const avatarContainer = document.createElement("div");
    avatarContainer.className = "racer-avatar";
    avatarContainer.append(carBody, animal);
    
    carContainer.appendChild(avatarContainer);
    racer.appendChild(carContainer);
    lane.append(racer, tether, nameLabel);
    
    return lane;
  };

  const calculateLaneHeight = (participantCount) => {
    const minLaneHeight = 60, padding = 30, minContainerHeight = 400;
    const optimalHeight = Math.max(participantCount * minLaneHeight + padding, minContainerHeight);
    elements.raceTrackContainer.style.height = `${optimalHeight}px`;
    return (optimalHeight - 15) / participantCount;
  };


  const createDust = (racerId) => {
    const racer = document.getElementById(`racer-${racerId}`);
    const carContainer = racer?.querySelector(".car-container");
    if (!carContainer) return;

    const dust = document.createElement("div");
    dust.className = "running-dust";

    const carRect = carContainer.getBoundingClientRect();
    const containerRect = elements.raceTrackContainer.getBoundingClientRect();

    const size = 3 + Math.random() * 7;
    const opacity = 0.3 + Math.random() * 0.3;
    
    dust.style.cssText = `
      left: ${carRect.left - containerRect.left - 10 + Math.random() * 4}px;
      top: ${carRect.top - containerRect.top + carRect.height / 2 + 5}px;
      width: ${size}px; height: ${size}px;
      background-color: rgba(150, 150, 150, ${opacity});
      transition: all 0.3s ease-out;
    `;

    elements.raceTrackContainer.appendChild(dust);

    setTimeout(() => {
      dust.style.transform = `translate(-${10 + Math.random() * 15}px, -${Math.random() * 10}px) scale(${1 + Math.random()})`;
      dust.style.opacity = "0";
    }, 10);

    setTimeout(() => dust.remove(), 350);
  };

  const updateTethersAndNames = () => {
    state.participants.forEach((participant, index) => {
      const carContainer = document.querySelector(`#racer-${index} .car-container`);
      const nameLabel = document.getElementById(`name-${index}`);
      const tether = document.getElementById(`tether-${index}`);

      if (!carContainer || !nameLabel || !tether) return;

      const carRect = carContainer.getBoundingClientRect();
      const carCenterY = carRect.top + carRect.height / 2;
      const laneRect = document.querySelectorAll(".race-lane")[index].getBoundingClientRect();

      const nameOffsetMax = 120, followerSpeed = 0.93;

      if (participant.finished) {
        const nameX = CONFIG.FINISH_LINE - nameOffsetMax;
        const nameWidth = nameLabel.getBoundingClientRect().width;
        const tetherStartX = nameX + nameWidth;
        const tetherLength = Math.max(5, CONFIG.FINISH_LINE - tetherStartX);

        nameLabel.style.left = `${nameX}px`;
        tether.style.cssText = `left: ${tetherStartX}px; top: ${carCenterY - laneRect.top}px; width: ${tetherLength}px`;
      } else if (!state.raceInProgress && participant.x <= 20) {
        nameLabel.style.left = `-40px`;
        tether.style.cssText = `left: 0px; top: ${carCenterY - laneRect.top}px; width: 10px`;
      } else {
        participant.nameOffset = Math.min(
          participant.nameOffset + (1 - followerSpeed) * (participant.x / 15),
          nameOffsetMax
        );

        const nameX = Math.max(20, participant.x - participant.nameOffset);
        const nameWidth = nameLabel.getBoundingClientRect().width;
        const tetherStartX = nameX + nameWidth;
        const tetherLength = Math.max(5, participant.x - tetherStartX);

        nameLabel.style.left = `${nameX}px`;
        tether.style.cssText = `left: ${tetherStartX}px; top: ${carCenterY - laneRect.top}px; width: ${tetherLength}px`;
      }
    });
  };

  const animateRace = () => {
    const allFinished = state.participants.every(p => p.finished);
    if (allFinished && state.finishOrder.length > 0) {
      clearInterval(state.raceInterval);
      state.raceInterval = null;
      state.raceInProgress = false;

      const winner = state.participants[state.finishOrder[0]];
      const lastPlace = state.participants[state.finishOrder[state.finishOrder.length - 1]];

      const resultDisplay = document.createElement("div");
      resultDisplay.className = "race-result-display";
      resultDisplay.innerHTML = `
        <div class="result-header">Race Results</div>
        <div class="position-display">
          <div class="first-place">🥇 First: ${winner.name} ${winner.emoji}</div>
          <div class="last-place">Last: ${lastPlace.name} ${lastPlace.emoji}</div>
        </div>
      `;

      elements.winnerDisplay.innerHTML = "";
      elements.winnerDisplay.appendChild(resultDisplay);
      elements.winnerDisplay.style.display = "block";
      elements.winnerDisplay.classList.add("show");

      addResultToHistory(winner.name, winner.color, winner.emoji, new Date().toLocaleString());

      setTimeout(() => {
        elements.startRaceBtn.disabled = false;
        elements.speedControl.disabled = false;
        elements.nameInput.disabled = false;
        playCelebrationEffect();
      }, 500);

      return;
    }

    const sortedFinished = state.finishOrder.map(index => state.participants[index]);
    const runningParticipants = state.participants.filter(p => !p.finished);
    const sortedRunning = [...runningParticipants].sort((a, b) => b.x - a.x);
    const sortedByPosition = [...sortedFinished, ...sortedRunning];

    sortedByPosition.forEach((participant, place) => {
      const racer = document.getElementById(`racer-${participant.laneIndex}`);
      if (!racer) return;

      let placeLabel = racer.querySelector(".place-label");
      if (!placeLabel) {
        placeLabel = document.createElement("div");
        placeLabel.className = "place-label";
        placeLabel.style.cssText = `
          position: absolute; right: -60px; top: 50%; transform: translateY(-50%);
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white; padding: 4px 8px; border-radius: 12px; font-size: 14px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); min-width: 35px; text-align: center;
          font-family: 'Montserrat', sans-serif; z-index: 20; animation: pulsePlace 2s infinite;
        `;
        racer.appendChild(placeLabel);
      }
      placeLabel.textContent = `${place + 1}${getOrdinalSuffix(place + 1)}`;
    });

    const raceFactor = 1 - elements.speedControl.value / 100;

    state.participants.forEach((participant, index) => {
      if (participant.finished) return;

      const racer = document.getElementById(`racer-${index}`);
      if (!racer) return;

      racer.classList.add("running");

      let maxSpeed = 5 / 3;

      if (participant.winning) {
        maxSpeed *= (1.05 + Math.random() * 0.1);
        if (participant.x / CONFIG.FINISH_LINE > 0.7) maxSpeed *= 1.1;
      } else {
        maxSpeed *= participant.baseSpeed;
        if (Math.random() < 0.05) maxSpeed *= 1.5;

        const leader = state.participants.reduce((prev, curr) => prev.x > curr.x ? prev : curr);
        if (leader.x - participant.x > CONFIG.FINISH_LINE * 0.3) maxSpeed *= 1.2;
      }

      maxSpeed *= (1 - raceFactor * 0.8);
      participant.x += maxSpeed * (0.8 + Math.random() * 0.4);

      const carContainer = racer.querySelector(".car-container");
      if (carContainer) carContainer.style.left = `${participant.x}px`;

      if (Math.random() < 0.1) createDust(index);

      if (participant.x >= CONFIG.FINISH_LINE && !participant.finished) {
        participant.finished = true;
        participant.x = CONFIG.FINISH_LINE;
        if (carContainer) carContainer.style.left = `${CONFIG.FINISH_LINE}px`;
        racer.classList.remove("running");

        if (!state.finishOrder.includes(participant.laneIndex)) {
          state.finishOrder.push(participant.laneIndex);

          if (state.finishOrder.length === 1) {
            participant.winning = true;
            racer.classList.add("winner");
          }
        }

        if (!participant.winning && state.participants.filter(p => p.finished).length === 1) {
          state.participants.forEach((p, idx) => {
            p.winning = idx === index;
          });
        }

        if (participant.winning) racer.classList.add("winner");
      }
    });

    updateTethersAndNames();
  };

  const startRace = () => {
    try {
      if (state.raceInterval) {
        clearInterval(state.raceInterval);
        state.raceInterval = null;
      }

      document.querySelectorAll(".race-lane").forEach(lane => {
        lane.querySelectorAll(".place-label").forEach(label => label.remove());
      });
      document.querySelectorAll(".running-dust").forEach(dust => dust.remove());

      if (!elements.nameInput.value.trim()) {
        elements.nameInput.value = DATA.sampleNames.join("\n");
      }

      const names = parseNames();

      if (names.length < 2) {
        alert("Please enter at least 2 names to start the race.");
        return;
      }

      if (names.length > CONFIG.MAX_PARTICIPANTS) {
        alert(`Maximum ${CONFIG.MAX_PARTICIPANTS} participants allowed. Only the first ${CONFIG.MAX_PARTICIPANTS} names will be used.`);
        names.splice(CONFIG.MAX_PARTICIPANTS);
      }

      state.raceInProgress = true;
      state.raceCount++;
      elements.startRaceBtn.disabled = true;
      elements.speedControl.disabled = true;
      elements.nameInput.disabled = true;
      elements.winnerDisplay.style.display = "none";
      elements.winnerDisplay.classList.remove("show");

      saveNames();
      state.finishOrder = [];
      state.participants = [];

      initializeParticipants(names);

      state.countdown = 3;
      countdownDisplay();
    } catch (error) {
      console.error("Error starting race:", error);
      alert("An error occurred while starting the race. Please refresh the page and try again.");
      cleanupRace();
    }
  };

  const countdownDisplay = () => {
    elements.countdownOverlay.style.display = "flex";

    if (state.countdown > 0) {
      elements.countdownOverlay.textContent = state.countdown;
      state.countdown--;
      setTimeout(countdownDisplay, 1000);
    } else {
      elements.countdownOverlay.textContent = "GO!";
      setTimeout(() => {
        elements.countdownOverlay.style.display = "none";
        state.raceInterval = setInterval(animateRace, 48);
      }, 1000);
    }
  };


  const playCelebrationEffect = () => {
    for (let i = 0; i < 50; i++) {
      setTimeout(createConfetti, i * 50);
    }
  };

  const createConfetti = () => {
    const confetti = document.createElement("div");
    const size = Math.random() * 10 + 5;
    const color = DATA.colorPalette[Math.floor(Math.random() * DATA.colorPalette.length)];
    
    const rect = elements.winnerDisplay.getBoundingClientRect();
    const winX = rect.left + rect.width / 2;
    const winY = rect.top + rect.height / 2;
    const startX = winX + (Math.random() * 200 - 100);
    const startY = winY - 100;

    confetti.style.cssText = `
      position: absolute; width: ${size}px; height: ${size}px;
      background-color: ${color}; border-radius: 50%; z-index: 10;
      left: ${startX}px; top: ${startY}px;
    `;

    document.body.appendChild(confetti);

    const fallDuration = 1000 + Math.random() * 3000;
    const fallDelay = Math.random() * 500;

    confetti.style.transition = `
      top ${fallDuration}ms ease-in ${fallDelay}ms,
      left ${fallDuration}ms ease-out ${fallDelay}ms,
      opacity ${fallDuration * 0.5}ms ease-in ${fallDuration * 0.5 + fallDelay}ms
    `;

    setTimeout(() => {
      confetti.style.top = `${winY + 300 + Math.random() * 100}px`;
      confetti.style.left = `${startX + (Math.random() * 200 - 100)}px`;
      confetti.style.opacity = "0";
      setTimeout(() => confetti.remove(), fallDuration + fallDelay);
    }, 10);
  };

  const addResultToHistory = (participantName, color, character, timestamp, save = true) => {
    if (!elements.resultsContainer) return;

    const resultsSection = document.querySelector(".results-section");
    if (resultsSection) resultsSection.style.display = "block";

    const resultElement = document.createElement("div");
    resultElement.className = "result-item";

    const characterObj = DATA.characterSet.find(c => c.name === character);
    const emoji = characterObj?.emoji || (character?.length === 2 ? character : "🏃");

    resultElement.innerHTML = `
      <div class="result-color" style="background-color: ${color}">${emoji}</div>
      <div class="result-info">
        <div class="result-winner">🏆 ${participantName || "Unknown Racer"}</div>
        <div class="result-time">${timestamp}</div>
      </div>
    `;

    elements.resultsContainer.insertBefore(resultElement, elements.resultsContainer.firstChild);
    resultElement.offsetHeight;
    resultElement.classList.add("visible");

    if (save) saveRaceResult(participantName, color, character);
  };

  const cleanupRace = () => {
    if (state.raceInterval) {
      clearInterval(state.raceInterval);
      state.raceInterval = null;
    }

    state.raceInProgress = false;
    elements.startRaceBtn.disabled = false;
    elements.speedControl.disabled = false;
    elements.nameInput.disabled = false;
    elements.winnerDisplay.style.display = "none";
    elements.winnerDisplay.classList.remove("show");
    elements.countdownOverlay.style.display = "none";
    state.finishOrder = [];

    document.querySelectorAll(".running-dust").forEach(dust => dust.remove());
    document.querySelectorAll(".race-lane").forEach(lane => {
      lane.querySelectorAll(".place-label").forEach(label => label.remove());
    });
  };

  const loadSavedNames = () => {
    const savedNames = localStorage.getItem("raceNames");
    if (savedNames) elements.nameInput.value = savedNames;
  };

  const loadRaceHistory = () => {
    const savedResults = localStorage.getItem("raceResults");
    if (savedResults) {
      try {
        const results = JSON.parse(savedResults);
        results.forEach(result => {
          addResultToHistory(
            result.participant || "Unknown Racer",
            result.color || "#4f46e5",
            result.character || "🏃",
            result.timestamp || new Date().toLocaleString(),
            false
          );
        });
      } catch (error) {
        console.error("Error loading race history:", error);
        localStorage.removeItem("raceResults");
      }
    }
  };

  const saveNames = () => localStorage.setItem("raceNames", elements.nameInput.value);

  const saveRaceResult = (participant, color, emoji) => {
    const result = {
      participant: participant || "Unknown Racer",
      color: color || "#4f46e5",
      character: emoji || "🏃",
      timestamp: new Date().toLocaleString()
    };

    let results = [];
    try {
      const savedResults = localStorage.getItem("raceResults");
      if (savedResults) results = JSON.parse(savedResults);
    } catch (error) {
      console.error("Error parsing saved results:", error);
    }

    results.push(result);
    localStorage.setItem("raceResults", JSON.stringify(results));
    return result;
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all race history?")) {
      elements.resultsContainer.innerHTML = "";
      localStorage.removeItem("raceResults");
    }
  };

  const loadDemoNames = () => {
    elements.nameInput.value = DATA.sampleNames.join("\n");
  };

  // Event listeners
  elements.startRaceBtn.addEventListener("click", startRace);
  
  const clearHistoryBtn = document.getElementById("clearHistory");
  if (clearHistoryBtn) clearHistoryBtn.addEventListener("click", clearHistory);

  const loadDemoBtn = document.getElementById("loadDemo");
  if (loadDemoBtn) loadDemoBtn.addEventListener("click", loadDemoNames);

  const clearNamesBtn = document.getElementById("clearNames");
  if (clearNamesBtn) clearNamesBtn.addEventListener("click", () => elements.nameInput.value = "");

  const resetRaceBtn = document.getElementById("resetRace");
  if (resetRaceBtn) resetRaceBtn.addEventListener("click", cleanupRace);

  const newRaceBtn = document.getElementById("newRace");
  if (newRaceBtn) newRaceBtn.addEventListener("click", () => {
    elements.nameInput.value = "";
    cleanupRace();
  });

  window.addEventListener("error", (e) => {
    console.error("Runtime error:", e.message);
    if (state.raceInProgress) {
      alert("An error occurred. Please refresh the page to start a new race.");
      cleanupRace();
    }
  });

  window.addEventListener("resize", () => {
    if (state.participants.length > 0) {
      const laneHeight = calculateLaneHeight(state.participants.length);
      document.querySelectorAll(".race-lane").forEach((lane, index) => {
        lane.style.height = `${laneHeight}px`;
        const racer = document.getElementById(`racer-${index}`);
        if (racer) racer.style.top = `${laneHeight / 2 - 25}px`;
      });
    }
  });

  // Initialize
  loadSavedNames();
  loadRaceHistory();
  initSpeedControl();

  setTimeout(() => {
    if (buildInfo) createDebugPanel();
  }, 100);
});
