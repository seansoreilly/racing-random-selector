const getOrdinalSuffix = (num) => {
  const j = num % 10, k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

const escapeHtml = (str) => {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
};

let buildInfo = null;

const fetchBuildInfo = async () => {
  try {
    const response = await fetch("/api/build-info");
    if (response.ok) {
      buildInfo = await response.json();
      console.log("Build info loaded:", buildInfo);
      displayBuildInfo();
      createDebugPanel();
    }
  } catch (error) {
    console.warn("Error fetching build info:", error);
  }
};

const buildInfoMarkup = (commitHash) =>
  `Created by <a href="https://balddata.xyz/" target="_blank" rel="noopener noreferrer">Bald Data</a> • Build: <span class="build-hash">${escapeHtml(commitHash)}</span>`;

const displayBuildInfo = () => {
  if (!buildInfo) return;

  const buildInfoElement = document.createElement("div");
  buildInfoElement.className = "build-info";
  buildInfoElement.innerHTML = `
    <div class="build-info-content">
      ${buildInfoMarkup(buildInfo.commitHash)}
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
      <p class="text-sm text-gray-500">${buildInfoMarkup(buildInfo.commitHash || "unknown")}</p>
    `;
    document.body.appendChild(debugPanel);
  }
};

/* ------------------------------------------------------------------ *
 * Timer controller — owns every timer the race schedules so that any
 * reset/cleanup can cancel all pending work (audit item 2).
 * ------------------------------------------------------------------ */
const createTimerController = () => {
  const timeouts = new Set();
  const intervals = new Set();
  const frames = new Set();

  return {
    setTimeout(fn, ms) {
      const id = window.setTimeout(() => {
        timeouts.delete(id);
        fn();
      }, ms);
      timeouts.add(id);
      return id;
    },
    setInterval(fn, ms) {
      const id = window.setInterval(fn, ms);
      intervals.add(id);
      return id;
    },
    requestAnimationFrame(fn) {
      const id = window.requestAnimationFrame((t) => {
        frames.delete(id);
        fn(t);
      });
      frames.add(id);
      return id;
    },
    clearTimeout(id) {
      if (id == null) return;
      timeouts.delete(id);
      window.clearTimeout(id);
    },
    clearInterval(id) {
      if (id == null) return;
      intervals.delete(id);
      window.clearInterval(id);
    },
    cancelAnimationFrame(id) {
      if (id == null) return;
      frames.delete(id);
      window.cancelAnimationFrame(id);
    },
    cancelAll() {
      timeouts.forEach(id => window.clearTimeout(id));
      intervals.forEach(id => window.clearInterval(id));
      frames.forEach(id => window.cancelAnimationFrame(id));
      timeouts.clear();
      intervals.clear();
      frames.clear();
    }
  };
};

/* ------------------------------------------------------------------ *
 * Pure race engine (audit items 7 & 8).
 *
 * Winner contract: the winner is preselected before the race starts and
 * is guaranteed to cross the finish line first. Two mechanisms enforce
 * it, in order:
 *   1. Soft — the winner keeps pace with the field and gets a closing
 *      surge over the last stretch, so it usually leads on merit and
 *      the race reads naturally.
 *   2. Hard — non-winners are clamped just short of the line until the
 *      selected winner has crossed. This is the airtight guarantee that
 *      random bursts and catch-up multipliers can never break.
 *
 * `advanceRace` is pure w.r.t. the DOM: it only mutates the race state
 * it is handed and takes its randomness from the injected `rng`, so it
 * is deterministic under test.
 * ------------------------------------------------------------------ */
const RACE_ENGINE = {
  BASE_SPEED: 5 / 3,
  CATCHUP_GAP_RATIO: 0.3,
  // Winner keeps pace with the quicker half of the field...
  WINNER_PACE: 1.25,
  // ...then surges over the closing stretch.
  WINNER_SURGE_FROM: 0.6,
  WINNER_SURGE: 1.35,
  // How far short of the line a non-winner is held while the winner runs.
  HOLD_BACK_PX: 12
};

const advanceRace = (race, rng) => {
  const { participants, finishLine, speedSetting } = race;
  const raceFactor = 1 - speedSetting / 100;
  const speedScale = 1 - raceFactor * 0.8;

  // Leader is computed once per tick rather than once per participant.
  let leaderX = -Infinity;
  for (let i = 0; i < participants.length; i++) {
    if (participants[i].x > leaderX) leaderX = participants[i].x;
  }

  const winnerFinished = participants.some(p => p.winning && p.finished);
  const newlyFinished = [];

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    if (participant.finished) continue;

    let maxSpeed = RACE_ENGINE.BASE_SPEED;

    if (participant.winning) {
      maxSpeed *= RACE_ENGINE.WINNER_PACE * (1.05 + rng() * 0.1);
      if (participant.x / finishLine > RACE_ENGINE.WINNER_SURGE_FROM) maxSpeed *= RACE_ENGINE.WINNER_SURGE;
    } else {
      maxSpeed *= participant.baseSpeed;
      if (rng() < 0.05) maxSpeed *= 1.5;
      if (leaderX - participant.x > finishLine * RACE_ENGINE.CATCHUP_GAP_RATIO) maxSpeed *= 1.2;
    }

    maxSpeed *= speedScale;
    participant.x += maxSpeed * (0.8 + rng() * 0.4);

    // Winner contract: nobody may cross before the selected winner does.
    if (!participant.winning && !winnerFinished) {
      const ceiling = finishLine - RACE_ENGINE.HOLD_BACK_PX;
      if (participant.x > ceiling) participant.x = ceiling;
    }

    if (participant.x >= finishLine) {
      participant.x = finishLine;
      participant.finished = true;
      newlyFinished.push(participant);
    }
  }

  // Stable finish ordering for racers crossing on the same tick.
  newlyFinished.sort((a, b) => (a.winning === b.winning ? 0 : a.winning ? -1 : 1));
  newlyFinished.forEach(participant => {
    if (!race.finishOrder.includes(participant.laneIndex)) {
      race.finishOrder.push(participant.laneIndex);
    }
  });

  race.allFinished = participants.every(p => p.finished);

  return { newlyFinished, allFinished: race.allFinished };
};

const rankParticipants = (race) => {
  const finished = race.finishOrder.map(index => race.participants[index]);
  const running = race.participants.filter(p => !p.finished).sort((a, b) => b.x - a.x);
  return [...finished, ...running];
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
    countdownOverlay: document.getElementById("countdownOverlay"),
    countdownDisplay: document.querySelector("#countdownOverlay .countdown-display"),
    raceStatus: document.getElementById("raceStatus")
  };

  const timers = createTimerController();

  // Race phases (audit item 9): idle -> countdown -> running -> finished
  const PHASE = { IDLE: "idle", COUNTDOWN: "countdown", RUNNING: "running", FINISHED: "finished" };

  // Race state
  const state = {
    phase: PHASE.IDLE,
    participants: [],
    nodes: [],
    selectedWinner: 0,
    countdown: 3,
    finishLine: 0,
    speedSetting: 70,
    finishOrder: [],
    allFinished: false,
    raceInterval: null,
    history: []
  };

  // Constants
  const CONFIG = {
    FINISH_LINE_OFFSET: 150,
    finishLine: () => elements.raceTrackContainer.clientWidth - CONFIG.FINISH_LINE_OFFSET,
    MAX_PARTICIPANTS: 20,
    FRAME_MS: 48,
    LANE_PADDING: 80,
    RACER_HALF_HEIGHT: 25,
    START_X: 20,
    HISTORY_LIMIT: 50,
    HISTORY_VERSION: 1,
    IDLE_TRACK_BACKGROUND: "linear-gradient(135deg, #f8fafc, #e2e8f0)",
    RACING_TRACK_BACKGROUND: `repeating-linear-gradient(
      90deg,
      #ffffff 0px,
      #ffffff 20px,
      #1f2937 20px,
      #1f2937 40px
    )`
  };

  const DATA = {
    sampleNames: ["Lightning", "Thunder", "Blaze", "Zoom", "Flash", "Bolt", "Dash", "Rocket", "Speedy", "Swift"],
    characterSet: [
      { name: "cat", emoji: "🐱" }, { name: "dog", emoji: "🐶" }, { name: "rabbit", emoji: "🐰" },
      { name: "panda", emoji: "🐼" }, { name: "fox", emoji: "🦊" }, { name: "bear", emoji: "🐻" },
      { name: "koala", emoji: "🐨" }, { name: "tiger", emoji: "🐯" }, { name: "monkey", emoji: "🐵" }, { name: "pig", emoji: "🐷" }
    ],
    colorPalette: ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#FFD1FF", "#FFDFBA", "#C9BAFF", "#BAFFFF", "#F0BAFF", "#BAFFE0"]
  };

  const SPEED_LABELS = ["Slow", "Medium", "Fast", "Super Fast"];

  /* ---------------- Phase-driven UI rendering (audit item 9) ------- */

  const announce = (message) => {
    if (elements.raceStatus) elements.raceStatus.textContent = message;
  };

  const renderPhase = () => {
    const busy = state.phase === PHASE.COUNTDOWN || state.phase === PHASE.RUNNING;

    elements.startRaceBtn.disabled = busy;
    elements.speedControl.disabled = busy;
    elements.nameInput.disabled = busy;

    const showCountdown = state.phase === PHASE.COUNTDOWN;
    elements.countdownOverlay.classList.toggle("hidden", !showCountdown);
    elements.countdownOverlay.style.display = showCountdown ? "flex" : "none";

    const showWinner = state.phase === PHASE.FINISHED;
    elements.winnerDisplay.classList.toggle("hidden", !showWinner);
    elements.winnerDisplay.classList.toggle("show", showWinner);
    elements.winnerDisplay.style.display = showWinner ? "block" : "none";

    elements.raceTrackContainer.style.background =
      state.phase === PHASE.RUNNING ? CONFIG.RACING_TRACK_BACKGROUND : CONFIG.IDLE_TRACK_BACKGROUND;
  };

  const setPhase = (phase) => {
    state.phase = phase;
    renderPhase();
  };

  /* ---------------- Form rendering (audit item 14) ----------------- */

  const renderSpeedValue = () => {
    const value = Number(elements.speedControl.value);
    state.speedSetting = value;
    elements.speedValue.textContent = SPEED_LABELS[Math.min(Math.floor(value / 25), SPEED_LABELS.length - 1)];
  };

  const renderNames = (value) => {
    elements.nameInput.value = value == null ? "" : String(value);
  };

  const initSpeedControl = () => {
    elements.speedControl.addEventListener("input", renderSpeedValue);
    renderSpeedValue();
  };

  const parseNames = () => {
    const rawInput = elements.nameInput.value.trim();
    if (!rawInput) throw new Error("No names entered");
    return rawInput.split("\n").map(name => name.trim()).filter(name => name.length > 0);
  };

  /* ---------------- Participant setup ------------------------------ */

  const initializeParticipants = (names) => {
    state.participants = [];
    state.nodes = [];
    elements.raceLanes.innerHTML = "";
    state.selectedWinner = Math.floor(Math.random() * names.length);
    const laneHeight = calculateLaneHeight(names.length);

    // Create a shuffled copy of characterSet to ensure unique animals
    const availableCharacters = [...DATA.characterSet];
    for (let i = availableCharacters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableCharacters[i], availableCharacters[j]] = [availableCharacters[j], availableCharacters[i]];
    }

    names.forEach((name, index) => {
      const color = DATA.colorPalette[index % DATA.colorPalette.length];
      const character = availableCharacters[index % availableCharacters.length];

      const participant = {
        name, color, emoji: character.emoji, x: CONFIG.START_X,
        y: index * laneHeight + laneHeight / 2, speed: 0,
        baseSpeed: 1 + Math.random() * 0.5, finished: false,
        winning: index === state.selectedWinner,
        laneIndex: index
      };

      state.participants.push(participant);

      const lane = createLaneElement(laneHeight, index, name, color, character.emoji);
      elements.raceLanes.appendChild(lane);
    });

    document.querySelectorAll(".background-element").forEach(el => el.remove());
    state.finishLine = CONFIG.finishLine();
    renderRacers();
    updateTethersAndNames();
  };

  // Cache DOM references at initialization (audit item 13).
  const createLaneElement = (laneHeight, index, name, color, emoji) => {
    const lane = document.createElement("div");
    lane.className = "race-lane";
    lane.style.height = `${laneHeight}px`;

    const racer = document.createElement("div");
    racer.className = "racer";
    racer.id = `racer-${index}`;
    racer.style.top = `${laneHeight / 2 - CONFIG.RACER_HALF_HEIGHT}px`;
    // `.racer` is the positioned element, so it is what we animate.
    racer.style.transform = `translateX(${CONFIG.START_X}px) translateZ(0)`;

    const animalContainer = document.createElement("div");
    animalContainer.className = "car-container";

    const animal = document.createElement("div");
    animal.className = "racer-animal";
    animal.textContent = emoji;
    animal.style.color = color;
    animal.style.fontSize = "34px";
    animal.style.lineHeight = "1";

    const tether = document.createElement("div");
    tether.className = "tether";
    tether.id = `tether-${index}`;
    tether.style.cssText = "position: absolute; height: 2px; background-color: rgba(31,41,55,0.35); z-index: 5;";

    const nameLabel = document.createElement("div");
    nameLabel.className = "racer-name";
    nameLabel.id = `name-${index}`;
    nameLabel.textContent = name;
    nameLabel.style.cssText = "position: absolute; top: 4px; left: -40px; white-space: nowrap; z-index: 15;";

    animalContainer.appendChild(animal);
    racer.appendChild(animalContainer);
    lane.append(racer, tether, nameLabel);

    state.nodes.push({ lane, racer, animalContainer, animal, tether, nameLabel, placeLabel: null });

    return lane;
  };

  const calculateLaneHeight = (participantCount) => {
    const minLaneHeight = 100, padding = 100, minContainerHeight = 700;
    const optimalHeight = Math.max(participantCount * minLaneHeight + padding, minContainerHeight);
    elements.raceTrackContainer.style.height = `${optimalHeight}px`;
    return (optimalHeight - CONFIG.LANE_PADDING) / participantCount;
  };

  const createDust = (racerIndex) => {
    const nodes = state.nodes[racerIndex];
    if (!nodes) return;

    const dust = document.createElement("div");
    dust.className = "running-dust";

    const animalRect = nodes.animalContainer.getBoundingClientRect();
    const containerRect = elements.raceTrackContainer.getBoundingClientRect();

    const size = 3 + Math.random() * 7;
    const opacity = 0.3 + Math.random() * 0.3;

    dust.style.cssText = `
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      z-index: 4;
      left: ${animalRect.left - containerRect.left - 10 + Math.random() * 4}px;
      top: ${animalRect.top - containerRect.top + animalRect.height / 2 + 5}px;
      width: ${size}px; height: ${size}px;
      background-color: rgba(150, 150, 150, ${opacity});
      transition: all 0.3s ease-out;
    `;

    elements.raceTrackContainer.appendChild(dust);

    timers.setTimeout(() => {
      dust.style.transform = `translate(-${10 + Math.random() * 15}px, -${Math.random() * 10}px) scale(${1 + Math.random()})`;
      dust.style.opacity = "0";
    }, 10);

    timers.setTimeout(() => dust.remove(), 350);
  };

  const updateTethersAndNames = () => {
    const racing = state.phase === PHASE.RUNNING;

    state.participants.forEach((participant, index) => {
      const nodes = state.nodes[index];
      if (!nodes) return;

      const { nameLabel, tether } = nodes;
      const laneHeight = nodes.lane.clientHeight;
      const centerY = laneHeight / 2;

      if (participant.finished) {
        const finishLine = state.finishLine;
        const nameX = finishLine - 80;
        const nameWidth = nameLabel.offsetWidth;
        const tetherStartX = nameX + nameWidth;
        const tetherLength = Math.max(5, finishLine - tetherStartX);

        nameLabel.style.left = `${nameX}px`;
        tether.style.left = `${tetherStartX}px`;
        tether.style.top = `${centerY}px`;
        tether.style.width = `${tetherLength}px`;
        tether.style.opacity = "1";
      } else if (!racing && participant.x <= CONFIG.START_X) {
        nameLabel.style.left = "-40px";
        tether.style.left = "0px";
        tether.style.top = `${centerY}px`;
        tether.style.width = "10px";
        tether.style.opacity = "1";
      } else {
        // Make name follow with the icon, positioned to the left for readability
        const nameWidth = nameLabel.offsetWidth;
        const nameX = participant.x - nameWidth - 10; // Position name to the left of icon with 10px gap

        nameLabel.style.left = `${Math.max(5, nameX)}px`; // Ensure minimum 5px from left edge
        // Hide tether during race to keep it clean
        tether.style.left = "0px";
        tether.style.top = `${centerY}px`;
        tether.style.width = "0px";
        tether.style.opacity = "0";
      }
    });
  };

  /* ---------------- Rendering the race ----------------------------- */

  const renderRacers = () => {
    for (let i = 0; i < state.participants.length; i++) {
      const nodes = state.nodes[i];
      if (!nodes) continue;
      nodes.racer.style.transform = `translateX(${state.participants[i].x}px) translateZ(0)`;
    }
  };

  const renderPlaces = () => {
    const ranked = rankParticipants(state);

    for (let place = 0; place < ranked.length; place++) {
      const participant = ranked[place];
      const nodes = state.nodes[participant.laneIndex];
      if (!nodes) continue;

      const color = (place === 0 && !participant.finished) ? "#22c55e" : participant.color;
      if (nodes.animal && nodes.animal.style.color !== color) nodes.animal.style.color = color;

      if (!nodes.placeLabel) {
        nodes.placeLabel = document.createElement("div");
        nodes.placeLabel.className = "place-label";
        nodes.racer.appendChild(nodes.placeLabel);
      }
      const label = `${place + 1}${getOrdinalSuffix(place + 1)}`;
      if (nodes.placeLabel.textContent !== label) nodes.placeLabel.textContent = label;
    }
  };

  const raceTick = () => {
    if (state.phase !== PHASE.RUNNING) return;

    const { newlyFinished, allFinished } = advanceRace(state, Math.random);

    newlyFinished.forEach(participant => {
      const nodes = state.nodes[participant.laneIndex];
      if (!nodes) return;
      nodes.racer.classList.remove("running");
      if (state.finishOrder[0] === participant.laneIndex) nodes.racer.classList.add("winner");
    });

    renderRacers();
    renderPlaces();

    for (let i = 0; i < state.participants.length; i++) {
      if (state.participants[i].finished) continue;
      const nodes = state.nodes[i];
      if (nodes && !nodes.racer.classList.contains("running")) nodes.racer.classList.add("running");
      if (Math.random() < 0.1) createDust(i);
    }

    updateTethersAndNames();

    if (allFinished && state.finishOrder.length > 0) finishRace();
  };

  const finishRace = () => {
    timers.clearInterval(state.raceInterval);
    state.raceInterval = null;

    try {
      const winner = state.participants[state.finishOrder[0]];
      const lastPlace = state.participants[state.finishOrder[state.finishOrder.length - 1]];

      const resultDisplay = document.createElement("div");
      resultDisplay.className = "race-result-display";
      resultDisplay.innerHTML = `
        <div class="result-header">Race Results</div>
        <div class="position-display">
          <div class="first-place">🥇 First: ${escapeHtml(winner.name)} ${escapeHtml(winner.emoji)}</div>
          <div class="last-place">Last: ${escapeHtml(lastPlace.name)} ${escapeHtml(lastPlace.emoji)}</div>
        </div>
      `;

      elements.winnerDisplay.innerHTML = "";
      elements.winnerDisplay.appendChild(resultDisplay);

      announce(`Race finished. Winner: ${winner.name}.`);

      addResultToHistory({
        participant: winner.name,
        color: winner.color,
        character: winner.emoji,
        timestamp: new Date().toLocaleString()
      });
    } catch (error) {
      console.error("Error finishing race:", error);
    } finally {
      // Controls must always come back, whatever went wrong above (item 6).
      setPhase(PHASE.FINISHED);
      timers.setTimeout(playCelebrationEffect, 500);
    }
  };

  const clearRaceDebris = () => {
    document.querySelectorAll(".running-dust").forEach(dust => dust.remove());
    state.nodes.forEach(nodes => {
      if (nodes.placeLabel) {
        nodes.placeLabel.remove();
        nodes.placeLabel = null;
      }
      nodes.racer.classList.remove("running", "winner");
    });
  };

  /* ---------------- Race lifecycle --------------------------------- */

  const startRace = () => {
    try {
      timers.cancelAll();
      state.raceInterval = null;

      clearRaceDebris();

      if (!elements.nameInput.value.trim()) {
        renderNames(DATA.sampleNames.join("\n"));
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

      saveNames();
      state.finishOrder = [];
      state.participants = [];
      state.allFinished = false;

      initializeParticipants(names);

      state.countdown = 3;
      setPhase(PHASE.COUNTDOWN);
      countdownDisplay();
    } catch (error) {
      console.error("Error starting race:", error);
      alert("An error occurred while starting the race. Please refresh the page and try again.");
      cleanupRace();
    }
  };

  const countdownDisplay = () => {
    if (state.phase !== PHASE.COUNTDOWN) return;

    // Update the countdown child element, never the overlay itself (item 12).
    const target = elements.countdownDisplay || elements.countdownOverlay;

    if (state.countdown > 0) {
      target.textContent = String(state.countdown);
      announce(`Race starting in ${state.countdown}`);
      state.countdown--;
      timers.setTimeout(countdownDisplay, 1000);
    } else {
      target.textContent = "GO!";
      announce("Go!");
      timers.setTimeout(beginRacing, 1000);
    }
  };

  const beginRacing = () => {
    if (state.phase !== PHASE.COUNTDOWN) return;
    state.finishLine = CONFIG.finishLine();
    state.speedSetting = Number(elements.speedControl.value);
    setPhase(PHASE.RUNNING);
    state.raceInterval = timers.setInterval(raceTick, CONFIG.FRAME_MS);
  };

  const cleanupRace = () => {
    timers.cancelAll();
    state.raceInterval = null;

    state.finishOrder = [];
    state.allFinished = false;
    state.participants.forEach(p => {
      p.finished = false;
      p.x = CONFIG.START_X;
    });

    clearRaceDebris();
    renderRacers();
    setPhase(PHASE.IDLE);
    updateTethersAndNames();
    announce("Race reset.");
  };

  /* ---------------- Celebration ------------------------------------ */

  const playCelebrationEffect = () => {
    for (let i = 0; i < 50; i++) {
      timers.setTimeout(createConfetti, i * 50);
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

    timers.setTimeout(() => {
      confetti.style.top = `${winY + 300 + Math.random() * 100}px`;
      confetti.style.left = `${startX + (Math.random() * 200 - 100)}px`;
      confetti.style.opacity = "0";
      timers.setTimeout(() => confetti.remove(), fallDuration + fallDelay);
    }, 10);
  };

  /* ---------------- History (audit items 6 & 11) -------------------- */

  const normaliseHistoryEntry = (entry) => {
    if (!entry || typeof entry !== "object") return null;
    return {
      participant: typeof entry.participant === "string" && entry.participant ? entry.participant : "Unknown Racer",
      color: typeof entry.color === "string" && entry.color ? entry.color : "#4f46e5",
      character: typeof entry.character === "string" && entry.character ? entry.character : "🏃",
      timestamp: typeof entry.timestamp === "string" && entry.timestamp ? entry.timestamp : new Date().toLocaleString()
    };
  };

  const readStorage = (key) => {
    try {
      return window.localStorage ? window.localStorage.getItem(key) : null;
    } catch (error) {
      console.warn(`Unable to read "${key}" from storage:`, error);
      return null;
    }
  };

  const writeStorage = (key, value) => {
    try {
      if (window.localStorage) window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Unable to write "${key}" to storage:`, error);
    }
  };

  const removeStorage = (key) => {
    try {
      if (window.localStorage) window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Unable to remove "${key}" from storage:`, error);
    }
  };

  const parseHistory = (raw) => {
    if (!raw) return [];
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.error("Error parsing saved results:", error);
      return [];
    }

    // Tolerate both the legacy bare array and the versioned envelope.
    const entries = Array.isArray(parsed)
      ? parsed
      : (parsed && typeof parsed === "object" && Array.isArray(parsed.entries) ? parsed.entries : []);

    return entries
      .map(normaliseHistoryEntry)
      .filter(entry => entry !== null)
      .slice(-CONFIG.HISTORY_LIMIT);
  };

  const persistHistory = () => {
    writeStorage("raceResults", JSON.stringify({
      version: CONFIG.HISTORY_VERSION,
      entries: state.history
    }));
  };

  // Renders either the result list or exactly one empty state (item 11).
  const renderHistory = () => {
    if (!elements.resultsContainer) return;

    elements.resultsContainer.innerHTML = "";

    if (state.history.length === 0) {
      const empty = document.createElement("div");
      empty.className = "text-center text-secondary-400 py-8";
      empty.innerHTML = `
        <i class="fas fa-trophy text-4xl mb-3 opacity-50"></i>
        <p class="text-sm">No races completed yet. Start your first race!</p>
      `;
      elements.resultsContainer.appendChild(empty);
      return;
    }

    // Newest first.
    for (let i = state.history.length - 1; i >= 0; i--) {
      const entry = state.history[i];
      const resultElement = document.createElement("div");
      resultElement.className = "result-item visible";
      resultElement.innerHTML = `
        <div class="result-color" style="background-color: ${escapeHtml(entry.color)}">${escapeHtml(entry.character)}</div>
        <div class="result-info">
          <div class="result-winner">🏆 ${escapeHtml(entry.participant)}</div>
          <div class="result-time">${escapeHtml(entry.timestamp)}</div>
        </div>
      `;
      elements.resultsContainer.appendChild(resultElement);
    }
  };

  const addResultToHistory = (entry) => {
    const normalised = normaliseHistoryEntry(entry);
    if (!normalised) return;

    state.history.push(normalised);
    if (state.history.length > CONFIG.HISTORY_LIMIT) {
      state.history = state.history.slice(-CONFIG.HISTORY_LIMIT);
    }

    renderHistory();
    persistHistory();
  };

  const loadSavedNames = () => {
    const savedNames = readStorage("raceNames");
    if (savedNames) renderNames(savedNames);
    else renderNames("");
  };

  const loadRaceHistory = () => {
    state.history = parseHistory(readStorage("raceResults"));
    renderHistory();
  };

  const saveNames = () => writeStorage("raceNames", elements.nameInput.value);

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all race history?")) {
      state.history = [];
      removeStorage("raceResults");
      renderHistory();
    }
  };

  const loadDemoNames = () => renderNames(DATA.sampleNames.join("\n"));

  // Event listeners
  elements.startRaceBtn.addEventListener("click", startRace);

  const clearHistoryBtn = document.getElementById("clearHistory");
  if (clearHistoryBtn) clearHistoryBtn.addEventListener("click", clearHistory);

  const loadDemoBtn = document.getElementById("loadDemo");
  if (loadDemoBtn) loadDemoBtn.addEventListener("click", loadDemoNames);

  const clearNamesBtn = document.getElementById("clearNames");
  if (clearNamesBtn) clearNamesBtn.addEventListener("click", () => renderNames(""));

  const resetRaceBtn = document.getElementById("resetRace");
  if (resetRaceBtn) resetRaceBtn.addEventListener("click", cleanupRace);

  const newRaceBtn = document.getElementById("newRace");
  if (newRaceBtn) newRaceBtn.addEventListener("click", () => {
    renderNames("");
    cleanupRace();
  });

  window.addEventListener("error", (e) => {
    console.error("Runtime error:", e.message);
    if (state.phase === PHASE.COUNTDOWN || state.phase === PHASE.RUNNING) {
      alert("An error occurred. Please refresh the page to start a new race.");
      cleanupRace();
    }
  });

  window.addEventListener("resize", () => {
    if (state.participants.length === 0) return;

    const laneHeight = calculateLaneHeight(state.participants.length);
    state.nodes.forEach((nodes) => {
      nodes.lane.style.height = `${laneHeight}px`;
      nodes.racer.style.top = `${laneHeight / 2 - CONFIG.RACER_HALF_HEIGHT}px`;
    });
    state.finishLine = CONFIG.finishLine();
    updateTethersAndNames();
  });

  // Initialize
  loadSavedNames();
  loadRaceHistory();
  initSpeedControl();
  renderPhase();

  // Exposed for automated testing of the race lifecycle.
  window.__race = { state, PHASE, advanceRace, RACE_ENGINE };
});
