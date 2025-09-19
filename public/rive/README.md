Put your .riv assets here, one per animal, matching these basenames:

- cat.riv
- dog.riv
- rabbit.riv
- fox.riv
- monkey.riv
- panda.riv
- lion.riv
- koala.riv
- pig.riv
- bear.riv

Each file should include a default animation or state machine suitable for looping while the race runs.

Notes
- The app will fall back to a simple car + emoji driver if a .riv file is missing or the runtime fails to load.
- Recommended canvas size fit: approximately 64×40 CSS pixels. The runtime calls `resizeDrawingSurfaceToCanvas()` on load for crisp output.
