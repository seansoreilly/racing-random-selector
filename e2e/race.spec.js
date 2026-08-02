const { test, expect } = require("@playwright/test");

// Full-race lifecycle smoke test against the real app, driven through the UI,
// using the window.__race test hook (state/PHASE) for assertions that would
// otherwise require flaky pixel/text scraping.

test.describe("Race lifecycle", () => {
  test("racers move, race completes, and the announced winner matches state.selectedWinner", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /load demo/i }).click();
    await expect(page.locator("#nameInput")).not.toHaveValue("");

    const firstRacer = page.locator("#racer-0");
    await expect(firstRacer).toBeVisible(); // racers preview at the start line as soon as names exist

    await page.getByRole("button", { name: /start race/i }).click();

    // Countdown (3-2-1-GO) runs for ~4s before racing begins.
    await expect
      .poll(async () => page.evaluate(() => window.__race?.state?.phase), { timeout: 8_000 })
      .toBe("running");

    const racer = page.locator("#racer-0");
    await expect(racer).toBeVisible();

    const transformBefore = await racer.evaluate((el) => el.style.transform);

    await expect
      .poll(async () => {
        const transformNow = await racer.evaluate((el) => el.style.transform);
        return transformNow !== transformBefore;
      }, { timeout: 5_000 })
      .toBe(true);

    // Race should complete on its own.
    await expect
      .poll(async () => page.evaluate(() => window.__race?.state?.phase), { timeout: 30_000 })
      .toBe("finished");

    const raceInfo = await page.evaluate(() => {
      const { state } = window.__race;
      const winnerIndex = state.finishOrder[0];
      return {
        selectedWinnerName: state.participants[state.selectedWinner].name,
        actualWinnerName: state.participants[winnerIndex].name,
      };
    });

    // The pre-selected winner should be the one who actually finished first.
    expect(raceInfo.actualWinnerName).toBe(raceInfo.selectedWinnerName);

    const winnerDisplay = page.locator("#winner .winner-name");
    await expect(winnerDisplay).toContainText(raceInfo.selectedWinnerName);
  });

  test("new race during countdown returns to idle and no race starts afterwards", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /load demo/i }).click();
    await page.getByRole("button", { name: /start race/i }).click();

    await expect
      .poll(async () => page.evaluate(() => window.__race?.state?.phase), { timeout: 4_000 })
      .toBe("countdown");

    await page.getByRole("button", { name: /new race/i }).click();

    await expect
      .poll(async () => page.evaluate(() => window.__race?.state?.phase))
      .toBe("idle");

    // Give the race enough time to have started/finished if the reset had failed to stick.
    await page.waitForTimeout(6_000);

    expect(await page.evaluate(() => window.__race?.state?.phase)).toBe("idle");
    expect(await page.evaluate(() => window.__race?.state?.raceInterval)).toBeNull();
  });
});
