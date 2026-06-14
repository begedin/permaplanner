import { createHmac } from 'node:crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { expect, Page } from '@playwright/test';

const helpersDir = path.dirname(fileURLToPath(import.meta.url));
const emptyPlanPath = path.join(helpersDir, 'fixtures', 'emptyPlan.json');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const decodeBase32 = (input: string): Buffer => {
  const cleaned = input.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      continue;
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
};

export const totpCode = (secret: string, stepSeconds = 30): string => {
  const key = decodeBase32(secret);
  const counter = Math.floor(Date.now() / 1000 / stepSeconds);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
};

export const E2E_PASSWORD = 'valid_password_12';

export const uniqueE2eEmail = (): string =>
  `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@example.com`;

/** Dispatches a paste event with a tiny PNG (more reliable than OS clipboard in headless). */
export const pasteAerialPhotoOntoMap = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAADMElEQVR4nOzVwQnAIBQFQYXff81RUkQCOyDj1YOPnbXWPmeTRef+/3O/OyBjzh3CD95BfqICMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMO0TAAD//2Anhf4QtqobAAAAAElFTkSuQmCC';
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'aerial.png', { type: 'image/png' });
    const clipboardData = new DataTransfer();
    clipboardData.items.add(file);
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true }));
  });
};

/** Primary tab links in the top nav (not in-page RouterLinks). */
export const openNavTab = async (page: Page, name: string): Promise<void> => {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
};

/** Add a catalog plant to the open guild detail panel. */
export const addPlantToGuild = async (
  page: Page,
  query: string,
  rowLabel = 'Default',
): Promise<void> => {
  const guildDetails = page.getByRole('region', { name: 'Guild details' });
  await guildDetails.getByRole('button', { name: 'Add plant to guild' }).click();
  await page.getByRole('button', { name: 'Open plant list' }).click();
  const combobox = page.getByRole('combobox', { name: 'Species and cultivar' });
  await combobox.fill(query);
  await page.getByRole('option', { name: rowLabel }).click();
  await guildDetails.getByRole('button', { name: 'Add to guild' }).click();
};

/** Full-screen gate is gone and primary nav is usable. */
export const waitForMainApp = async (page: Page): Promise<void> => {
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'Guilds' }),
  ).toBeVisible({
    timeout: 20_000,
  });
};

/** Opens the top-bar plan menu (save, export, map tools on aerial). */
export const openPlanSessionDrawer = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: /^Plan and sync/ }).click();
  await expect(page.getByRole('dialog', { name: 'Plan and sync' })).toBeVisible();
};

export const registerAndReachImport = async (page: Page): Promise<void> => {
  const email = uniqueE2eEmail();
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Scan this in your authenticator')).toBeVisible();
  const secret = (await page.locator('.font-mono').first().textContent())?.trim();
  if (!secret) {
    throw new Error('TOTP secret missing on registration screen');
  }
  await page.getByLabel('Confirm with a code').fill(totpCode(secret));
  await page.getByRole('button', { name: 'Verify 2FA' }).click();
  await page.getByRole('button', { name: 'Continue to import' }).click();
  await expect(page.getByRole('heading', { name: 'Set up your garden' })).toBeVisible();
};

export const createEmptyGarden = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Create empty garden' }).click();
  await waitForMainApp(page);
};

export const setupAuthenticatedGarden = async (page: Page): Promise<void> => {
  await registerAndReachImport(page);
  await createEmptyGarden(page);
};

/** Register (if needed), create a garden, and land on the main app. */
export const ensureAuthenticatedGarden = async (page: Page): Promise<void> => {
  await page.goto('/guilds');
  const url = page.url();
  if (url.includes('/login') || url.includes('/register')) {
    await setupAuthenticatedGarden(page);
    return;
  }
  if (url.includes('/import')) {
    await createEmptyGarden(page);
    return;
  }
  await waitForMainApp(page);
};

/** @deprecated Use `setupAuthenticatedGarden` */
export const createNewPlanThroughGate = async (page: Page): Promise<void> => {
  await setupAuthenticatedGarden(page);
};

export const onboard = async (page: Page): Promise<void> => {
  await ensureAuthenticatedGarden(page);
  if (!page.url().includes('/aerial')) {
    await page.getByRole('link', { name: 'Aerial' }).click();
  }
  const map = page.locator('[data-main-svg]');
  await map.waitFor({ state: 'visible', timeout: 15_000 });
  await map.click();
  await pasteAerialPhotoOntoMap(page);
  await page.waitForSelector('image', { timeout: 15_000 });

  const bbox = await page.locator('image').boundingBox();

  if (!bbox) {
    throw new Error('No image bbox');
  }

  await page.locator('[data-ref-line-start]').hover();
  await page.mouse.down();
  await page.mouse.move(bbox.x + 30, bbox.y + 30);
  await page.mouse.up();

  await page.locator('[data-ref-line-end]').hover();
  await page.mouse.down();
  await page.mouse.move(bbox.x + bbox.width - 30, bbox.y + 30);
  await page.mouse.up();

  await openPlanSessionDrawer(page);
  await page.getByLabel('Map scale').fill('100');
  await page.keyboard.press('Escape');
};

/**
 * Seeds Origin Private File System with a plan file for legacy import E2E (optional).
 */
export const installOpfsPlanFileHandleE2E = async (page: Page) => {
  const initial = fs.readFileSync(emptyPlanPath, 'utf-8');
  await page.addInitScript((minText: string) => {
    const fileName = 'e2e-plan.json';
    const seededKey = 'permaplanner:e2e:opfs-seeded';

    const win = window as Window & {
      __permaplannerE2eOpfsReady: Promise<FileSystemFileHandle>;
    };

    win.__permaplannerE2eOpfsReady = (async () => {
      const root = await navigator.storage.getDirectory();

      if (!sessionStorage.getItem(seededKey)) {
        try {
          await root.removeEntry(fileName);
        } catch {
          // not present
        }
        const created = await root.getFileHandle(fileName, { create: true });
        const stream = await created.createWritable();
        await stream.write(minText);
        await stream.close();
        sessionStorage.setItem(seededKey, '1');
      }

      return root.getFileHandle(fileName, { create: true });
    })();

    window.showSaveFilePicker = () => win.__permaplannerE2eOpfsReady;
    window.showOpenFilePicker = async () => [await win.__permaplannerE2eOpfsReady];
  }, initial);
};
