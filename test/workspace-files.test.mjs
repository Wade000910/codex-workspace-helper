import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { readWorkspaceText, writeWorkspaceText } from '../src/workspace-files.mjs';

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-files-'));
  fs.mkdirSync(path.join(root, 'src'));
  return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('creates and reads a UTF-8 workspace file with matching digest', () => {
  const { root, cleanup } = setup();
  try {
    const written = writeWorkspaceText(root, { path: 'src/note.md', content: 'hello 世界\n', expected_sha256: 'MISSING' });
    const read = readWorkspaceText(root, 'src/note.md');
    assert.equal(read.content, 'hello 世界\n');
    assert.equal(read.sha256, written.sha256);
    assert.equal(written.uploaded, false);
  } finally { cleanup(); }
});

test('uses compare-and-swap when replacing a file', () => {
  const { root, cleanup } = setup();
  try {
    const initial = writeWorkspaceText(root, { path: 'src/note.md', content: 'one', expected_sha256: 'MISSING' });
    assert.throws(() => writeWorkspaceText(root, { path: 'src/note.md', content: 'two', expected_sha256: 'wrong' }), /FILE_CHANGED/);
    const replaced = writeWorkspaceText(root, { path: 'src/note.md', content: 'two', expected_sha256: initial.sha256 });
    assert.equal(readWorkspaceText(root, 'src/note.md').sha256, replaced.sha256);
  } finally { cleanup(); }
});

test('rejects traversal, sensitive paths, binaries, oversized files and symlinks', t => {
  const { root, cleanup } = setup();
  try {
    assert.throws(() => readWorkspaceText(root, '../outside.txt'), /PATH/);
    assert.throws(() => writeWorkspaceText(root, { path: '.env', content: 'x', expected_sha256: 'MISSING' }), /DENIED/);
    assert.throws(() => writeWorkspaceText(root, { path: 'src/file.bin', content: 'x', expected_sha256: 'MISSING' }), /TEXT_FILE_ONLY/);
    fs.writeFileSync(path.join(root, 'src/binary.txt'), Buffer.from([0, 1]));
    assert.throws(() => readWorkspaceText(root, 'src/binary.txt'), /BINARY/);
    fs.writeFileSync(path.join(root, 'src/large.txt'), Buffer.alloc(128 * 1024 + 1));
    assert.throws(() => readWorkspaceText(root, 'src/large.txt'), /LIMIT/);
    let symlinkCreated = false;
    try { fs.symlinkSync(path.join(root, 'src/note.md'), path.join(root, 'src/link.md')); symlinkCreated = true; }
    catch (error) { if (error.code !== 'EPERM' && error.code !== 'EACCES') throw error; t.diagnostic('symlink test skipped: platform denied symlink creation'); }
    if (symlinkCreated) assert.throws(() => readWorkspaceText(root, 'src/link.md'), /SYMLINK/);
  } finally { cleanup(); }
});
