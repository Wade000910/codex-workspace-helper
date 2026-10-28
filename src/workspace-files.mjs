import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveWorkspaceRoot } from './policy.mjs';

const MAX_BYTES = 128 * 1024;
const deniedSegment = /^(?:\.git|\.codex|\.agents|\.aws|node_modules|\.env(?:\..*)?|.*(?:secret|credential|password|token|private).*)$/iu;
const textExtension = /\.(?:md|txt|json|mjs|cjs|js|ts|tsx|jsx|py|ps1|sh|bat|cmd|css|html|xml|yaml|yml|toml|ini|csv|sql|java|kt|c|h|cpp|hpp|rs|go|rb|php)$/iu;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function resolveTarget(root, relativePath, { write = false } = {}) {
  if (typeof relativePath !== 'string' || !relativePath || relativePath.length > 500 ||
      /[\\:*?"<>|\u0000-\u001f]/u.test(relativePath) || path.posix.isAbsolute(relativePath)) {
    throw new Error('WORKSPACE_PATH_INVALID');
  }
  const segments = relativePath.normalize('NFC').split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..' || deniedSegment.test(segment))) {
    throw new Error('WORKSPACE_PATH_DENIED');
  }
  if (!textExtension.test(relativePath)) throw new Error('WORKSPACE_TEXT_FILE_ONLY');

  const base = resolveWorkspaceRoot(root);
  const target = path.resolve(base, ...segments);
  const rel = path.relative(base, target);
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error('WORKSPACE_PATH_ESCAPE');
  }

  let current = base;
  for (const segment of segments.slice(0, -1)) {
    current = path.join(current, segment);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error('WORKSPACE_SYMLINK_DENIED');
    } catch (error) {
      if (error.code === 'ENOENT' && write) break;
      throw error;
    }
  }
  try {
    if (fs.lstatSync(target).isSymbolicLink()) throw new Error('WORKSPACE_SYMLINK_DENIED');
  } catch (error) {
    if (error.code !== 'ENOENT' || !write) throw error;
  }
  return { target, relativePath: segments.join('/') };
}

export function readWorkspaceText(root, relativePath) {
  const { target, relativePath: safePath } = resolveTarget(root, relativePath);
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.nlink > 1 || stat.size > MAX_BYTES) throw new Error('WORKSPACE_FILE_LIMIT_OR_TYPE');
  const bytes = fs.readFileSync(target);
  if (bytes.includes(0)) throw new Error('WORKSPACE_BINARY_DENIED');
  const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return { path: safePath, sha256: hash(bytes), bytes: bytes.length, content };
}

export function writeWorkspaceText(root, { path: relativePath, content, expected_sha256: expected }) {
  if (typeof content !== 'string' || typeof expected !== 'string') throw new Error('WORKSPACE_WRITE_ARGUMENTS_INVALID');
  const { target, relativePath: safePath } = resolveTarget(root, relativePath, { write: true });
  const bytes = Buffer.from(content, 'utf8');
  if (bytes.length > MAX_BYTES) throw new Error('WORKSPACE_FILE_LIMIT_OR_TYPE');
  if (expected === 'MISSING') {
    if (fs.existsSync(target)) throw new Error('WORKSPACE_CREATE_CONFLICT');
  } else {
    const stat = fs.lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink > 1 || stat.size > MAX_BYTES) throw new Error('WORKSPACE_FILE_LIMIT_OR_TYPE');
    if (hash(fs.readFileSync(target)) !== expected) throw new Error('WORKSPACE_FILE_CHANGED');
  }

  const parent = path.dirname(target);
  if (fs.lstatSync(parent).isSymbolicLink()) throw new Error('WORKSPACE_SYMLINK_DENIED');
  const temporary = path.join(parent, `.bounded-write-${crypto.randomUUID()}.tmp`);
  let fd;
  try {
    fd = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    if (expected === 'MISSING' && fs.existsSync(target)) throw new Error('WORKSPACE_CREATE_CONFLICT');
    if (expected !== 'MISSING' && hash(fs.readFileSync(target)) !== expected) throw new Error('WORKSPACE_FILE_CHANGED');
    fs.renameSync(temporary, target);
  } catch (error) {
    if (fd !== undefined) fs.closeSync(fd);
    try { fs.unlinkSync(temporary); } catch {}
    throw error;
  }
  return { path: safePath, sha256: hash(bytes), bytes: bytes.length, committed: false, uploaded: false };
}

export const workspaceTools = Object.freeze([
  Object.freeze({
    type: 'function', name: 'workspace_read',
    description: 'Read one UTF-8 text file inside the configured workspace. Sensitive paths, links, binaries and oversized files are denied.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false }
  }),
  Object.freeze({
    type: 'function', name: 'workspace_write',
    description: 'Create a UTF-8 text file with expected_sha256=MISSING, or replace a file using the SHA-256 returned by workspace_read. Does not commit or upload.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' }, expected_sha256: { type: 'string' } }, required: ['path', 'content', 'expected_sha256'], additionalProperties: false }
  })
]);

export function callWorkspaceTool(root, name, args) {
  if (name === 'workspace_read') {
    if (!args || Object.keys(args).length !== 1 || typeof args.path !== 'string') throw new Error('WORKSPACE_READ_ARGUMENTS_INVALID');
    return readWorkspaceText(root, args.path);
  }
  if (name === 'workspace_write') {
    if (!args || Object.keys(args).sort().join(',') !== 'content,expected_sha256,path') throw new Error('WORKSPACE_WRITE_ARGUMENTS_INVALID');
    return writeWorkspaceText(root, args);
  }
  throw new Error('WORKSPACE_TOOL_NOT_FOUND');
}
