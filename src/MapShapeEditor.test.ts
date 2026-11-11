import { rectangleShapePath } from './mapShapeGeometry';
import { createPinia, setActivePinia } from 'pinia';
import { render, fireEvent, cleanup } from '@testing-library/vue';
import { beforeEach, afterEach, expect, it } from 'vitest';
import MapShapeEditor from './MapShapeEditor.vue';
import { SHAPE_FEATURES, type ShapeFeature } from './mapShapeFeatures';

beforeEach(() => setActivePinia(createPinia()));
afterEach(cleanup);

it.each<ShapeFeature>(['landmark', 'path'])(
  'emits name, rotation and delete changes for a %s',
  async (feature) => {
    const label = SHAPE_FEATURES[feature].label;
    const shape = {
      id: 'house',
      name: 'Landmark',
      x: 10,
      y: 20,
      width: 130,
      height: 260,
      rotation: 0,
      path: rectangleShapePath(),
    };
    const view = render(MapShapeEditor, { props: { shape, feature } });
    await fireEvent.update(view.getByLabelText(`${label} name`), 'House');
    await fireEvent(
      view.getByLabelText(`${label} name`),
      new Event('change', { bubbles: true }),
    );
    await fireEvent.update(view.getByLabelText('Rotation (degrees)'), '-45');
    await fireEvent(
      view.getByLabelText('Rotation (degrees)'),
      new Event('change', { bubbles: true }),
    );
    expect(view.emitted('update')).toEqual([
      [{ ...shape, name: 'House' }],
      [{ ...shape, rotation: 315 }],
    ]);
    expect(view.getByText('1.00 × 2.00 m')).toBeVisible();
    await fireEvent.click(view.getByRole('button', { name: `Delete ${feature}` }));
    expect(view.emitted('remove')).toEqual([[]]);
  },
);
