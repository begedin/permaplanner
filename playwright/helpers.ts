import path from 'path';
import fs from 'fs';
import { Page } from '@playwright/test';

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
  const newPath = path.join(process.cwd(), 'playwright', 'fixtures', fileName);
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
