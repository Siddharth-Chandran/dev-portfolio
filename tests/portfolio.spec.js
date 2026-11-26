import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const SHOTS_DIR =
  '/Users/sidchan/.gemini/antigravity/brain/5e4a0bd4-d127-4089-8aa2-134f879d070b/scratch/shots-shader-studio';

test.beforeAll(() => {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
});

test.describe('sidchan.dev — Interactive Shader & Studio Contrast', () => {
  test('fresh load defaults to light theme with zero console/page errors and renders hero + shader', async ({
    page,
  }) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForTimeout(600);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Siddharth');

    // Verify shader host initialized cleanly (either WebGL canvas or static SVG fallback)
    const shaderHost = page.locator('#hero-shader');
    await expect(shaderHost).toHaveAttribute('data-shader-mode', /webgl2|webgl1|fallback/);

    const mode = await shaderHost.getAttribute('data-shader-mode');
    if (mode === 'webgl2' || mode === 'webgl1') {
      const canvas = shaderHost.locator('canvas.hero-shader-canvas');
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box?.width).toBeGreaterThan(300);
      expect(box?.height).toBeGreaterThan(300);
    }

    // Toggle shader pause/play button and verify aria-pressed + state
    const shaderToggle = page.locator('#shader-toggle');
    await expect(shaderToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(shaderToggle).toHaveAttribute('data-shader-paused', 'false');

    await page.screenshot({
      path: path.join(SHOTS_DIR, 'desktop-1440-hero.png'),
      fullPage: false,
    });

    await shaderToggle.click();
    await expect(shaderToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(shaderToggle).toHaveAttribute('data-shader-paused', 'true');
    await expect(page.locator('#shader-toggle-state')).toHaveText('Paused');

    await shaderToggle.click();
    await expect(shaderToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(shaderToggle).toHaveAttribute('data-shader-paused', 'false');
    await expect(page.locator('#shader-toggle-state')).toHaveText('Live');

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('theme toggle switches light <-> dark and persists across reload', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForTimeout(350);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await page.waitForTimeout(400);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.screenshot({
      path: path.join(SHOTS_DIR, 'desktop-1440-dark.png'),
      fullPage: false,
    });

    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    expect(pageErrors).toEqual([]);
  });

  test('renders all 7 projects and era filter buttons work cleanly', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const allCards = page.locator('.project-card');
    await expect(allCards).toHaveCount(7);

    const visibleCards = page.locator('.project-card:visible');
    await expect(visibleCards).toHaveCount(7);

    await page.locator('.filter-btn[data-filter="ai-era"]').click();
    await expect(page.locator('.filter-btn[data-filter="ai-era"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.locator('.project-card:visible')).toHaveCount(3);
    await expect(page.locator('[data-group="foundations"]')).toBeHidden();

    await page.locator('.filter-btn[data-filter="foundations"]').click();
    await expect(page.locator('.filter-btn[data-filter="foundations"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.locator('.project-card:visible')).toHaveCount(4);
    await expect(page.locator('[data-group="ai-era"]')).toBeHidden();

    await page.locator('.filter-btn[data-filter="all"]').click();
    await expect(page.locator('.project-card:visible')).toHaveCount(7);
  });

  test('interactive sidecar simulator updates live telemetry and view mode cleanly', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const sim = page.locator('#sidecar-simulator');
    await sim.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);

    await page.screenshot({
      path: path.join(SHOTS_DIR, 'desktop-1440-obsidian-simulator.png'),
      fullPage: false,
    });

    const beforeTotal = await page.locator('#sim-total-tokens').textContent();
    const beforeGemini = await page.locator('#sim-gemini-pct').textContent();
    expect(beforeTotal).toBe('148.2K');
    expect(beforeGemini).toBe('82%');

    // Click Simulate Subagent Burst
    await page.locator('#sim-burst-btn').click();
    await expect(sim).toHaveAttribute('data-burst-count', '1');
    await expect(page.locator('#sim-poll-badge')).toHaveAttribute('data-http-status', '200');
    await expect(page.locator('#sim-poll-badge')).toContainText('ETag 200');
    await expect(page.locator('#sim-gemini-pct')).toHaveText('78%');
    await expect(page.locator('#sim-claude-pct')).toHaveText('40%');

    const afterTotal = await page.locator('#sim-total-tokens').textContent();
    expect(afterTotal).not.toBe(beforeTotal);

    // Toggle Full <-> Minimal view
    const viewBtn = page.locator('#sim-view-toggle');
    await expect(sim).toHaveAttribute('data-sim-view', 'full');
    await expect(viewBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#sim-subagents')).toBeVisible();

    await viewBtn.click();
    await expect(sim).toHaveAttribute('data-sim-view', 'minimal');
    await expect(viewBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#sim-subagents')).toBeHidden();

    await viewBtn.click();
    await expect(sim).toHaveAttribute('data-sim-view', 'full');
    await expect(page.locator('#sim-subagents')).toBeVisible();
  });

  test('copy email triggers toast notification cleanly', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const copyBtn = page.locator('#copy-email-btn');
    await copyBtn.scrollIntoViewIfNeeded();
    await copyBtn.click();

    const toast = page.locator('#copy-toast');
    await expect(toast).toBeVisible();
    await expect(page.locator('#toast-message')).toContainText('sidchan@duck.com');
  });

  test('zero horizontal overflow across desktop, tablet, and mobile viewports', async ({
    page,
  }) => {
    const viewports = [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 375, height: 812 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto('/');
      await page.waitForTimeout(600);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(
        overflow.scrollWidth,
        `Horizontal overflow detected at ${vp.width}x${vp.height}`
      ).toBeLessThanOrEqual(overflow.innerWidth);

      if (vp.width === 375) {
        await page.screenshot({
          path: path.join(SHOTS_DIR, 'mobile-375.png'),
          fullPage: false,
        });
      }
    }
  });
});
