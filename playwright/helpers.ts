import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Page } from '@playwright/test';

const helpersDir = path.dirname(fileURLToPath(import.meta.url));
const emptyPlanPath = path.join(helpersDir, 'fixtures', 'emptyPlan.json');

export const putImageIntoClipboard = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const dataURLtoFile = async (dataurl: string): Promise<File> => {
      const result = await fetch(dataurl);
      const blob = await result.blob();
      return new File([blob], 'hello.png', { type: 'image/png' });
    };

    dataURLtoFile(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAADMElEQVR4nOzVwQnAIBQFQYXff81RUkQCOyDj1YOPnbXWPmeTRef+/3O/OyBjzh3CD95BfqICMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMO0TAAD//2Anhf4QtqobAAAAAElFTkSuQmCC',
    ).then((file) => {
      const item = new ClipboardItem({ 'image/png': file });
      navigator.clipboard.write([item]);
    });
  });
};

export const onboard = async (page: Page): Promise<void> => {
  await stubSaveFilePicker(page, 'new.json');
  await page.getByRole('button', { name: 'New plan' }).click();
  await putImageIntoClipboard(page);
  await page.keyboard.press('ControlOrMeta+v');
  await page.waitForSelector('image');

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

export const stubSaveFilePicker = async (page: Page, fileName: string) => {
  const newPath = path.join(helpersDir, 'fixtures', fileName);
  const blob = fs.openAsBlob(newPath);
  await page.evaluate(async (blob) => {
    window.showSaveFilePicker = () =>
      Promise.resolve({
        name: 'new.json',
        getFile: () => Promise.resolve(blob),
        createWritable: () =>
          Promise.resolve({
            write: () => Promise.resolve(),
            close: () => Promise.resolve(),
          } as unknown as FileSystemWritableFileStream),
      } as unknown as FileSystemFileHandle);
  }, blob);
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
