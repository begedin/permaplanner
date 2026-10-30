import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, expect, it } from 'vitest';
import GuildPlantNote from './GuildPlantNote.vue';

afterEach(cleanup);

it('opens and focuses a note editor and saves multiline text on blur', async () => {
  const { emitted } = render(GuildPlantNote, {
    props: { label: 'Apple', editing: true },
  });
  const editor = screen.getByRole('textbox', { name: 'Note for Apple' });
  await waitFor(() => expect(editor).toHaveFocus());
  await fireEvent.update(editor, 'Prune in winter\nCheck graft');
  await fireEvent.blur(editor);
  expect(emitted()['update:note']).toEqual([['Prune in winter\nCheck graft']]);
});

it('displays existing notes and allows clearing them', async () => {
  const { emitted, rerender } = render(GuildPlantNote, {
    props: { label: 'Apple', note: 'Check graft' },
  });
  expect(screen.getByRole('button', { name: 'Edit note for Apple' })).toHaveTextContent(
    'Check graft',
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Edit note for Apple' }));
  const editor = screen.getByRole('textbox', { name: 'Note for Apple' });
  await fireEvent.update(editor, '   ');
  await fireEvent.blur(editor);
  expect(emitted()['update:note']).toEqual([['']]);
  await rerender({ note: undefined });
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('cancels edits with Escape', async () => {
  const { emitted } = render(GuildPlantNote, { props: { label: 'Apple', note: 'Keep' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Edit note for Apple' }));
  const editor = screen.getByRole('textbox', { name: 'Note for Apple' });
  await fireEvent.update(editor, 'Discard');
  await fireEvent.keyDown(editor, { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Edit note for Apple' })).toHaveTextContent(
    'Keep',
  );
  expect(emitted()['update:note']).toBeUndefined();
});
