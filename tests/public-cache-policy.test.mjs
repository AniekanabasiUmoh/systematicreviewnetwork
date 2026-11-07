import assert from 'node:assert/strict';
import { test } from 'node:test';

test('anonymous content is shared; service-role seat counts never use that cache', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://cache-policy-test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    requests.push({url:String(url), ...init});
    return new Response('[]', {status:200, headers:{'content-type':'application/json'}});
  };
  try {
    const queries = await import('../lib/queries.ts');
    assert.deepEqual(await queries.getAllEvents(), []);
    assert.equal(requests[0].cache, 'force-cache');
    assert.equal(requests[0].next.revalidate, 300);
    assert.deepEqual(requests[0].next.tags, ['srn-public']);
    assert.deepEqual(await queries.getSeatCounts(['event-id']), {});
    assert.equal(requests[1].next, undefined);
    assert.notEqual(requests[1].cache, 'force-cache');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
