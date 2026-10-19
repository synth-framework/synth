import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render } from '../src/board.js';

test('existing label output unchanged when no fill is given', () => {
  assert.equal(render('A'), '<text>A</text>');
});

test('user-selected fill is emitted as a fill attribute', () => {
  assert.equal(render('A', '#00ff00'), '<text fill="#00ff00">A</text>');
});
