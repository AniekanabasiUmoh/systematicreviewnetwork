import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterKey, encodeFilterKey, parseFilterKey } from '../lib/public-filters.ts';

test('equivalent query URLs share a safe route key and preserve unicode filters', () => {
  const allowed = ['category', 'view'];
  const a = new URLSearchParams('view=past&category=Trust+Fund&utm_source=x');
  const b = new URLSearchParams('category=Trust+Fund&view=past');
  assert.equal(encodeFilterKey(a, allowed), encodeFilterKey(b, allowed));
  const token = encodeFilterKey(a, allowed);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(parseFilterKey(token, allowed), {category:'Trust Fund', view:'past'});
  const unicode = new URLSearchParams({category:'Éducation & schools/2026'});
  assert.equal(parseFilterKey(encodeFilterKey(unicode,allowed),allowed).category, unicode.get('category'));
});

test('malformed, duplicate, unknown and oversized filter keys cannot become cache variants', () => {
  const allowed = ['category'];
  assert.equal(parseFilterKey('!',allowed), null);
  assert.equal(parseFilterKey(btoa('category=a&unknown=b').replace(/=+$/, ''),allowed),null);
  assert.equal(parseFilterKey(btoa('category=a&category=b').replace(/=+$/, ''),allowed),null);
  assert.equal(parseFilterKey('x'.repeat(8193),allowed),null);
  assert.equal(filterKey(new URLSearchParams({category:'x'.repeat(121)}),allowed),'');
  assert.equal(filterKey(new URLSearchParams('category=&utm_source=x'),allowed),'');
});
