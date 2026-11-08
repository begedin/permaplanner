import { expect, it } from 'vitest';
import { ApiError, expectJson } from './client';

it.each([413, 503])('preserves HTTP %s when the response is not JSON', async (status) => {
  const error = await expectJson(
    new Response('<html>Proxy error</html>', { status }),
  ).catch((error) => error);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status, body: undefined });
});

it('preserves the JSON error body', async () => {
  await expect(
    expectJson(
      new Response(JSON.stringify({ error: 'stale_revision' }), { status: 409 }),
    ),
  ).rejects.toMatchObject({ status: 409, body: { error: 'stale_revision' } });
});

it('still rejects malformed successful responses', async () => {
  await expect(
    expectJson(new Response('<html>Unexpected page</html>')),
  ).rejects.toBeInstanceOf(SyntaxError);
});
