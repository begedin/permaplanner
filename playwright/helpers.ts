import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { expect, Page } from '@playwright/test';

const helpersDir = path.dirname(fileURLToPath(import.meta.url));
const emptyPlanPath = path.join(helpersDir, 'fixtures', 'emptyPlan.json');

/** Dispatches a paste event with a tiny PNG (more reliable than OS clipboard in headless). */
export const pasteAerialPhotoOntoMap = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAADMElEQVR4nOzVwQnAIBQFQYXff81RUkQCOyDj1YOPnbXWPmeTRef+/3O/OyBjzh3CD95BfqICMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMO0TAAD//2Anhf4QtqobAAAAAElFTkSuQmCC';
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'aerial.png', { type: 'image/png' });
    const clipboardData = new DataTransfer();
    clipboardData.items.add(file);
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true }));
  });
};

export const putImageIntoClipboard = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const dataURLtoFile = async (dataurl: string): Promise<File> => {
      const result = await fetch(dataurl);
      const blob = await result.blob();
      return new File([blob], 'hello.png', { type: 'image/png' });
    };

    dataURLtoFile(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAADMElEQVR4nOzVwQnAIBQFQYXff81RUkQCOyDj1YOPnbXWPmeTRef+/3O/OyBjzh3CD95BfqICMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMO0TAAD//2Anhf4QtqobAAAAAElFTkSuQmCC',
    ).then((file) => {
      const item = new ClipboardItem({ 'image/png': file });
      navigator.clipboard.write([item]);
    });
  });
};

/** Full-screen gate is gone and primary nav is usable. */
export const waitForMainApp = async (page: Page): Promise<void> => {
  await expect(page.getByRole('link', { name: 'Guilds' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Choose where to save your plan' })).toBeHidden();
};

export const stubSaveFilePicker = async (page: Page, fileName: string) => {
  const newPath = path.join(helpersDir, 'fixtures', fileName);
  const bytes = fs.readFileSync(newPath);
  await page.evaluate(
    async ({ content, saveName }) => {
      const blob = new Blob([new Uint8Array(content)], { type: 'application/json' });
      window.showSaveFilePicker = () =>
        Promise.resolve({
          name: saveName,
          getFile: () => Promise.resolve(blob as File),
          createWritable: () =>
            Promise.resolve({
              write: () => Promise.resolve(),
              close: () => Promise.resolve(),
            } as unknown as FileSystemWritableFileStream),
        } as unknown as FileSystemFileHandle);
    },
    { content: [...bytes], saveName: fileName },
  );
};

/** Dismiss the setup gate by creating a new plan (requires save picker stub). */
export const createNewPlanThroughGate = async (
  page: Page,
  fixtureFileName = 'new.json',
): Promise<void> => {
  await stubSaveFilePicker(page, fixtureFileName);
  await page.getByRole('button', { name: 'Create new plan…' }).click();
  await waitForMainApp(page);
};

export const onboard = async (page: Page): Promise<void> => {
  await createNewPlanThroughGate(page, 'new.json');
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

  await page.getByLabel('Map scale').fill('100');
};

const readEmptyPlan = (): string => fs.readFileSync(emptyPlanPath, 'utf-8');

/**
 * Seeds Origin Private File System with a real FileSystemFileHandle and stubs the
 * picker APIs to return it. Chromium can persist that handle in IndexedDB, so save →
 * reload → auto-restore behaves like a user-chosen file.
 *
 * addInitScript runs on every navigation; we only write the fixture once per tab
 * (sessionStorage) so a reload does not clobber saved JSON before restore runs.
 *
 * Important: the callback body is serialized for the browser — only locals and the
 * injected argument exist there; do not reference outer-scope variables.
 */
export const installOpfsPlanFileHandleE2E = async (page: Page) => {
  const initial = readEmptyPlan();
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
