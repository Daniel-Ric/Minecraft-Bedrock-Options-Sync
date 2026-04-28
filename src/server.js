const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile, spawn } = require('child_process');
const fs = require('fs-extra');
const express = require('express');
const multer = require('multer');
const archiver = require('archiver');
const chokidar = require('chokidar');

const app = express();
const PORT = Number(process.env.PORT || 4321);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const BACKUP_DIR = path.join(ROOT, 'backups');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const DEFAULT_USERS_PATH = path.join(process.env.APPDATA || '', 'Minecraft Bedrock', 'Users');

fs.ensureDirSync(BACKUP_DIR);
fs.ensureDirSync(UPLOAD_DIR);

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 1024 * 1024 }
});

app.use(express.json({ limit: '2mb' }));
app.use(express.static(PUBLIC_DIR));

let watcher = null;
const gamertagCache = new Map();
const sessionErrors = [];

function recordSessionError(type, message, details = {}) {
  const entry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    type,
    message: String(message || 'Unknown error.'),
    details
  };
  sessionErrors.unshift(entry);
  sessionErrors.splice(100);
  return entry;
}

function isNumericAccountFolder(name) {
  return /^\d+$/.test(name) && name !== 'Shared';
}

function getOptionsPath(basePath, folderName) {
  return path.join(basePath, folderName, 'games', 'com.mojang', 'minecraftpe', 'options.txt');
}

function getMinecraftPePath(basePath, folderName) {
  return path.join(basePath, folderName, 'games', 'com.mojang', 'minecraftpe');
}

async function readTextIfExists(filePath) {
  if (!(await fs.pathExists(filePath))) return null;
  return fs.readFile(filePath, 'utf8');
}

function parseOptions(text) {
  const entries = [];
  const map = Object.create(null);

  String(text || '').split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) {
      entries.push({ type: 'blank', raw: line, index });
      return;
    }

    const separator = line.indexOf(':');
    if (separator === -1) {
      entries.push({ type: 'raw', raw: line, index });
      return;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1);
    const entry = { type: 'option', key, value, raw: line, index };
    entries.push(entry);
    map[key] = value;
  });

  return { entries, map };
}

function optionValue(parsed, key) {
  if (!Object.prototype.hasOwnProperty.call(parsed.map, key)) return null;
  const value = String(parsed.map[key]).trim();
  return value ? value : null;
}

async function resolveGamertagFromXuid(xuid) {
  if (!xuid || !/^\d+$/.test(String(xuid))) return null;
  if (gamertagCache.has(xuid)) return gamertagCache.get(xuid);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(`https://api.geysermc.org/v2/xbox/gamertag/${encodeURIComponent(xuid)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    const gamertag = typeof data.gamertag === 'string' && data.gamertag.trim() ? data.gamertag.trim() : null;
    gamertagCache.set(xuid, gamertag);
    return gamertag;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function findUserDataFile(basePath, folderName) {
  const mojangPath = path.join(basePath, folderName, 'games', 'com.mojang');
  if (!(await fs.pathExists(mojangPath))) return null;
  const files = await fs.readdir(mojangPath).catch(() => []);
  const file = files.find((name) => /^ud\d+\.dat$/i.test(name));
  if (!file) return null;
  const fullPath = path.join(mojangPath, file);
  const id = file.replace(/^ud/i, '').replace(/\.dat$/i, '');
  const entPath = path.join(path.dirname(basePath), `${id}.ent`);
  return {
    id,
    file,
    path: fullPath,
    modifiedAt: (await fs.stat(fullPath)).mtime,
    entFile: `${id}.ent`,
    entPath,
    entModifiedAt: (await fs.pathExists(entPath)) ? (await fs.stat(entPath)).mtime : null
  };
}

async function latestExistingMtime(paths) {
  const dates = [];
  for (const filePath of paths.filter(Boolean)) {
    if (await fs.pathExists(filePath)) dates.push((await fs.stat(filePath)).mtime);
  }
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function isMinecraftRunning() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve(false);
    try {
      const child = execFile('tasklist', ['/FI', 'IMAGENAME eq Minecraft.Windows.exe', '/NH'], { windowsHide: true }, (error, stdout) => {
        if (error) return resolve(false);
        resolve(stdout.toLowerCase().includes('minecraft.windows.exe'));
      });
      child.on('error', () => resolve(false));
    } catch {
      resolve(false);
    }
  });
}

function serializeOptions(entries) {
  return entries.map((entry) => {
    if (entry.type !== 'option') return entry.raw || '';
    return `${entry.key}:${entry.value}`;
  }).join(os.EOL);
}

function requireOptionKey(key) {
  const optionKey = String(key || '').trim();
  if (!optionKey || optionKey.includes(':') || /[\r\n]/.test(optionKey)) {
    const err = new Error('Invalid option key.');
    err.status = 400;
    throw err;
  }
  if (!isSyncableOptionKey(optionKey)) {
    const err = new Error('Account-related option keys cannot be edited here.');
    err.status = 400;
    throw err;
  }
  return optionKey;
}

function requireOptionValue(value) {
  const optionValueText = String(value ?? '');
  if (/[\r\n]/.test(optionValueText)) {
    const err = new Error('Option values cannot contain line breaks.');
    err.status = 400;
    throw err;
  }
  if (optionValueText.length > 4096) {
    const err = new Error('Option value is too long.');
    err.status = 400;
    throw err;
  }
  return optionValueText;
}

function updateOptionText(text, key, value) {
  const parsed = parseOptions(text || '');
  let found = false;
  const entries = parsed.entries.map((entry) => {
    if (entry.type !== 'option' || entry.key !== key) return entry;
    found = true;
    return { ...entry, value };
  });
  if (!found) entries.push({ type: 'option', key, value });
  return serializeOptions(entries);
}

function optionCategory(key) {
  const k = key.toLowerCase();
  if (/^(gfx_|fullscreen|vsync|raytracing|render|graphics|gamma|texel|fov)/.test(k)) return 'graphics';
  if (/^(audio|sound|music|volume|mute)/.test(k)) return 'audio';
  if (/^(ctrl_|keyboard|mouse|gamepad|swap|sensitivity|auto_jump|touch)/.test(k)) return 'controls';
  if (/^(chat|language|ui_|safezone|split|screen|hud|show|hide)/.test(k)) return 'interface';
  if (/^(last_|server|realms|mp_|xbl|account|client|dev_)/.test(k)) return 'account';
  return 'other';
}

function isSyncableOptionKey(key) {
  return optionCategory(key) !== 'account';
}

async function findAccountName(basePath, folderName) {
  const minecraftPe = getMinecraftPePath(basePath, folderName);
  const candidates = [
    path.join(minecraftPe, 'licensestore.json'),
    path.join(minecraftPe, 'minecraftprofile.json')
  ];

  if (await fs.pathExists(minecraftPe)) {
    const jsonFiles = await fs.readdir(minecraftPe).catch(() => []);
    for (const file of jsonFiles.filter((name) => name.endsWith('.json'))) {
      candidates.push(path.join(minecraftPe, file));
    }
  }

  for (const file of [...new Set(candidates)]) {
    try {
      const data = JSON.parse(await fs.readFile(file, 'utf8'));
      const name = findNameInObject(data);
      if (name) return name;
    } catch {
      try {
        const raw = await fs.readFile(file, 'utf8');
        const match = raw.match(/"(?:gamertag|displayName|name)"\s*:\s*"([^"]+)"/i);
        if (match) return match[1];
      } catch {}
    }
  }

  return null;
}

function findNameInObject(value) {
  if (!value || typeof value !== 'object') return null;
  for (const key of ['gamertag', 'displayName', 'name']) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
  }
  for (const child of Object.values(value)) {
    const found = findNameInObject(child);
    if (found) return found;
  }
  return null;
}

async function scanAccounts(basePath) {
  if (!basePath || !(await fs.pathExists(basePath))) return [];
  const children = await fs.readdir(basePath, { withFileTypes: true });
  const folders = children
    .filter((entry) => entry.isDirectory() && isNumericAccountFolder(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => Number(a) - Number(b));

  const accounts = [];
  for (const folder of folders) {
    const optionsPath = getOptionsPath(basePath, folder);
    const exists = await fs.pathExists(optionsPath);
    const stat = exists ? await fs.stat(optionsPath) : null;
    const text = exists ? await readTextIfExists(optionsPath) : '';
    const parsed = parseOptions(text);
    const userData = await findUserDataFile(basePath, folder);
    const minecraftPe = getMinecraftPePath(basePath, folder);
    const activityModifiedAt = await latestExistingMtime([
      userData?.path,
      userData?.entPath,
      path.join(minecraftPe, 'telemetry_info.json'),
      path.join(minecraftPe, 'clientId.txt')
    ]);
    const xuid = optionValue(parsed, 'last_xuid');
    const minecraftId = optionValue(parsed, 'last_minecraft_id');
    const titleAccountId = optionValue(parsed, 'last_title_account_id');
    const gamertag = await findAccountName(basePath, folder) || await resolveGamertagFromXuid(xuid);
    const fallbackName = xuid ? `XUID ${xuid}` : folder;

    accounts.push({
      id: folder,
      folder,
      gamertag,
      xuid,
      minecraftId,
      titleAccountId,
      userData,
      displayName: gamertag ? `${gamertag} (${folder})` : `${fallbackName} (${folder})`,
      optionsPath,
      hasOptions: exists,
      optionCount: Object.keys(parsed.map).length,
      size: stat ? stat.size : 0,
      modifiedAt: stat ? stat.mtime.toISOString() : null,
      activityModifiedAt: activityModifiedAt ? activityModifiedAt.toISOString() : null,
      isLikelyActive: false
    });
  }

  const latestActivity = Math.max(0, ...accounts.map((account) => account.activityModifiedAt ? new Date(account.activityModifiedAt).getTime() : 0));
  for (const account of accounts) {
    account.isLikelyActive = latestActivity > 0 && account.activityModifiedAt && new Date(account.activityModifiedAt).getTime() === latestActivity;
  }

  return accounts;
}

function requireSafeBase(basePath) {
  const resolved = path.resolve(basePath || '');
  if (!resolved || resolved === path.parse(resolved).root) {
    const err = new Error('Invalid Minecraft Users path.');
    err.status = 400;
    throw err;
  }
  return resolved;
}

async function requireExistingBase(basePath) {
  const resolved = requireSafeBase(basePath);
  if (!(await fs.pathExists(resolved))) {
    const err = new Error('Minecraft Users folder was not found.');
    err.status = 404;
    throw err;
  }
  return resolved;
}

function requireAccountId(id, label = 'Account') {
  if (!id || !/^\d+$/.test(String(id))) {
    const err = new Error(`${label} must be a numeric Minecraft account folder.`);
    err.status = 400;
    throw err;
  }
  return String(id);
}

function backupLabelFromFile(fileName) {
  return String(fileName)
    .replace(/\.zip$/i, '')
    .replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_/, '')
    .replace(/_/g, ' ');
}

function requireBackupFileName(fileName) {
  const cleanName = path.basename(String(fileName || ''));
  if (!cleanName.endsWith('.zip') || cleanName !== fileName) {
    const err = new Error('Invalid backup file.');
    err.status = 400;
    throw err;
  }
  return cleanName;
}

async function requireAccountFolder(basePath, id, label = 'Account') {
  const accountId = requireAccountId(id, label);
  const accountPath = path.join(basePath, accountId);
  if (!(await fs.pathExists(accountPath))) {
    const err = new Error(`${label} folder was not found.`);
    err.status = 404;
    throw err;
  }
  return accountId;
}

function validateMode(mode, categories = [], keys = []) {
  const allowedModes = new Set(['full', 'categories', 'keys']);
  if (!allowedModes.has(mode)) {
    const err = new Error('Invalid sync mode.');
    err.status = 400;
    throw err;
  }

  const allowedCategories = new Set(['graphics', 'audio', 'controls', 'interface', 'other']);
  if (mode === 'categories') {
    if (!Array.isArray(categories) || categories.length === 0) {
      const err = new Error('Select at least one category.');
      err.status = 400;
      throw err;
    }
    for (const category of categories) {
      if (!allowedCategories.has(category)) {
        const err = new Error(`Invalid category: ${category}`);
        err.status = 400;
        throw err;
      }
    }
  }

  if (mode === 'keys' && (!Array.isArray(keys) || keys.length === 0)) {
    const err = new Error('Select at least one key.');
    err.status = 400;
    throw err;
  }

  if (mode === 'keys') {
    for (const key of keys) {
      if (!isSyncableOptionKey(key)) {
        const err = new Error(`Account-related option keys cannot be synced: ${key}`);
        err.status = 400;
        throw err;
      }
    }
  }
}

async function validateSyncRequest(basePath, body) {
  const mode = body.mode || 'full';
  validateMode(mode, body.categories, body.keys);

  if (!body.source || !body.source.type) {
    const err = new Error('Source is missing.');
    err.status = 400;
    throw err;
  }

  if (body.source.type === 'account') {
    await requireAccountFolder(basePath, body.source.accountId, 'Source account');
  } else if (body.source.type !== 'upload') {
    const err = new Error('Invalid source type.');
    err.status = 400;
    throw err;
  }

  const destinationIds = [...new Set(body.destinationIds || [])].filter(Boolean).map((id) => requireAccountId(id, 'Destination account'));
  if (!destinationIds.length) {
    const err = new Error('No destination accounts selected.');
    err.status = 400;
    throw err;
  }

  for (const id of destinationIds) {
    await requireAccountFolder(basePath, id, 'Destination account');
  }

  if (body.source.type === 'account' && destinationIds.includes(String(body.source.accountId))) {
    const err = new Error('The source account cannot also be a destination account.');
    err.status = 400;
    throw err;
  }

  return { mode, destinationIds };
}

async function createBackup(basePath, accountIds, label = 'sync') {
  await fs.ensureDir(BACKUP_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeLabel = String(label).replace(/[^a-z0-9_-]/gi, '_').slice(0, 40) || 'backup';
  const zipPath = path.join(BACKUP_DIR, `${stamp}_${safeLabel}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  const finished = new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
  });

  archive.pipe(output);
  for (const id of accountIds) {
    const optionsPath = getOptionsPath(basePath, id);
    if (await fs.pathExists(optionsPath)) {
      archive.file(optionsPath, { name: `${id}/options.txt` });
    }
  }
  await archive.finalize();
  await finished;

  return {
    fileName: path.basename(zipPath),
    path: zipPath,
    bytes: (await fs.stat(zipPath)).size
  };
}

async function getSourceText(basePath, source) {
  if (!source || !source.type) throw Object.assign(new Error('Source is missing.'), { status: 400 });

  if (source.type === 'account') {
    requireAccountId(source.accountId, 'Source account');
    const sourcePath = getOptionsPath(basePath, source.accountId);
    if (!(await fs.pathExists(sourcePath))) throw Object.assign(new Error('Source account has no options.txt.'), { status: 404 });
    return { text: await fs.readFile(sourcePath, 'utf8'), label: source.accountId, path: sourcePath };
  }

  if (source.type === 'upload') {
    if (!source.uploadId) throw Object.assign(new Error('Upload id is missing.'), { status: 400 });
    const sourcePath = path.join(UPLOAD_DIR, path.basename(source.uploadId));
    if (!(await fs.pathExists(sourcePath))) throw Object.assign(new Error('Uploaded options.txt was not found.'), { status: 404 });
    return { text: await fs.readFile(sourcePath, 'utf8'), label: 'uploaded-file', path: sourcePath };
  }

  throw Object.assign(new Error('Unknown source type.'), { status: 400 });
}

function buildMergedOptions(destinationText, sourceText, mode, categories, keys) {
  const destination = parseOptions(destinationText || '');
  const source = parseOptions(sourceText || '');

  if (mode === 'full') {
    const entries = [
      ...source.entries.filter((entry) => entry.type !== 'option' || isSyncableOptionKey(entry.key)),
      ...destination.entries.filter((entry) => entry.type === 'option' && !isSyncableOptionKey(entry.key))
    ];
    return serializeOptions(entries);
  }

  const selectedCategories = new Set(categories || []);
  const selectedKeys = new Set(keys || []);

  for (const entry of destination.entries) {
    if (entry.type !== 'option') continue;
    if (!isSyncableOptionKey(entry.key)) continue;
    const shouldCopy =
      (mode === 'categories' && selectedCategories.has(optionCategory(entry.key))) ||
      (mode === 'keys' && selectedKeys.has(entry.key));
    if (shouldCopy && Object.prototype.hasOwnProperty.call(source.map, entry.key)) {
      entry.value = source.map[entry.key];
    }
  }

  for (const sourceEntry of source.entries.filter((entry) => entry.type === 'option')) {
    if (!isSyncableOptionKey(sourceEntry.key)) continue;
    const exists = Object.prototype.hasOwnProperty.call(destination.map, sourceEntry.key);
    const shouldCopy =
      (mode === 'categories' && selectedCategories.has(optionCategory(sourceEntry.key))) ||
      (mode === 'keys' && selectedKeys.has(sourceEntry.key));
    if (!exists && shouldCopy) {
      destination.entries.push({ ...sourceEntry });
    }
  }

  return serializeOptions(destination.entries);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function normalizeWriteAccess(filePath) {
  if (!(await fs.pathExists(filePath))) return;
  try {
    await fs.chmod(filePath, 0o666);
  } catch (error) {
    if (!['ENOENT', 'ENOTSUP'].includes(error.code)) throw error;
  }
}

function explainWriteError(error, filePath) {
  if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) return error;
  const message = [
    `Could not write options.txt at ${filePath}.`,
    'The file is blocked by Windows, read-only, or currently locked by Minecraft Bedrock.',
    'Close Minecraft Bedrock completely and retry. If it still fails, run Option Sync as administrator once.'
  ].join(' ');
  const wrapped = new Error(message);
  wrapped.code = error.code;
  wrapped.cause = error;
  return wrapped;
}

async function writeOptionsFile(destinationPath, text) {
  await fs.ensureDir(path.dirname(destinationPath));
  await normalizeWriteAccess(destinationPath);

  const tempPath = path.join(path.dirname(destinationPath), `.options-sync-${crypto.randomUUID()}.tmp`);
  try {
    await fs.writeFile(tempPath, text, { encoding: 'utf8', mode: 0o666 });
    await normalizeWriteAccess(destinationPath);
    await fs.move(tempPath, destinationPath, { overwrite: true });
    await normalizeWriteAccess(destinationPath);
  } catch (error) {
    await fs.remove(tempPath).catch(() => {});

    if (['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) {
      await sleep(250);
      try {
        await normalizeWriteAccess(destinationPath);
        await fs.writeFile(destinationPath, text, { encoding: 'utf8', mode: 0o666 });
        await normalizeWriteAccess(destinationPath);
        return;
      } catch (retryError) {
        throw explainWriteError(retryError, destinationPath);
      }
    }

    throw explainWriteError(error, destinationPath);
  }
}

function diffOptions(beforeText, afterText) {
  const before = parseOptions(beforeText || '').map;
  const after = parseOptions(afterText || '').map;
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys
    .filter((key) => before[key] !== after[key])
    .map((key) => ({ key, before: before[key] ?? null, after: after[key] ?? null, category: optionCategory(key) }));
}

app.get('/api/default-path', (_req, res) => {
  res.json({ path: DEFAULT_USERS_PATH });
});

app.get('/api/open-users-folder', async (req, res, next) => {
  try {
    const basePath = await requireExistingBase(req.query.basePath || DEFAULT_USERS_PATH);
    if (process.platform !== 'win32') return res.status(400).json({ error: 'Opening folders is only supported on Windows.' });
    const explorerPath = path.join(process.env.WINDIR || 'C:\\Windows', 'explorer.exe');
    try {
      const child = spawn(explorerPath, [basePath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });
      child.unref();
    } catch {
      execFile('cmd.exe', ['/c', 'start', '', basePath], { windowsHide: false }, () => {});
    }
    res.json({ opened: true, path: basePath });
  } catch (error) {
    next(error);
  }
});

app.post('/api/open-backups-folder', async (_req, res, next) => {
  try {
    await fs.ensureDir(BACKUP_DIR);
    if (process.platform !== 'win32') return res.status(400).json({ error: 'Opening folders is only supported on Windows.' });
    const explorerPath = path.join(process.env.WINDIR || 'C:\\Windows', 'explorer.exe');
    try {
      const child = spawn(explorerPath, [BACKUP_DIR], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });
      child.unref();
    } catch {
      execFile('cmd.exe', ['/c', 'start', '', BACKUP_DIR], { windowsHide: false }, () => {});
    }
    res.json({ opened: true, path: BACKUP_DIR });
  } catch (error) {
    next(error);
  }
});

app.get('/api/accounts', async (req, res, next) => {
  try {
    const basePath = requireSafeBase(req.query.basePath || DEFAULT_USERS_PATH);
    res.json({ basePath, minecraftRunning: await isMinecraftRunning(), accounts: await scanAccounts(basePath) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/accounts/:id/options', async (req, res, next) => {
  try {
    const basePath = await requireExistingBase(req.query.basePath || DEFAULT_USERS_PATH);
    const accountId = await requireAccountFolder(basePath, req.params.id, 'Account');
    const optionsPath = getOptionsPath(basePath, accountId);
    const text = await readTextIfExists(optionsPath);
    if (text === null) return res.status(404).json({ error: 'options.txt not found.' });
    const parsed = parseOptions(text);
    res.json({
      accountId: req.params.id,
      optionsPath,
      options: Object.entries(parsed.map)
        .map(([key, value]) => ({ key, value, category: optionCategory(key), syncable: isSyncableOptionKey(key) }))
    });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/accounts/:id/options', async (req, res, next) => {
  try {
    const basePath = await requireExistingBase(req.body.basePath || DEFAULT_USERS_PATH);
    const accountId = await requireAccountFolder(basePath, req.params.id, 'Account');
    const key = requireOptionKey(req.body.key);
    const value = requireOptionValue(req.body.value);
    const optionsPath = getOptionsPath(basePath, accountId);
    const before = await readTextIfExists(optionsPath);
    if (before === null) return res.status(404).json({ error: 'options.txt not found.' });

    const after = updateOptionText(before, key, value);
    await writeOptionsFile(optionsPath, after);
    res.json({ accountId, key, value, category: optionCategory(key), changed: before !== after });
  } catch (error) {
    next(error);
  }
});

app.post('/api/upload', upload.single('options'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const original = req.file.originalname || 'options.txt';
    if (!original.toLowerCase().endsWith('.txt')) {
      await fs.remove(req.file.path);
      return res.status(400).json({ error: 'Please upload an options.txt file.' });
    }
    const id = `${crypto.randomUUID()}.txt`;
    const finalPath = path.join(UPLOAD_DIR, id);
    await fs.move(req.file.path, finalPath, { overwrite: true });
    const text = await fs.readFile(finalPath, 'utf8');
    const optionCount = Object.keys(parseOptions(text).map).length;
    if (optionCount === 0) {
      await fs.remove(finalPath);
      return res.status(400).json({ error: 'The uploaded file does not look like a valid options.txt file.' });
    }
    res.json({ uploadId: id, optionCount });
  } catch (error) {
    next(error);
  }
});

app.post('/api/preview', async (req, res, next) => {
  try {
    const basePath = await requireExistingBase(req.body.basePath || DEFAULT_USERS_PATH);
    const validation = await validateSyncRequest(basePath, req.body);
    const source = await getSourceText(basePath, req.body.source);
    const destinationIds = validation.destinationIds;
    const results = [];

    for (const id of destinationIds) {
      const destinationPath = getOptionsPath(basePath, id);
      const before = await readTextIfExists(destinationPath) || '';
      const after = buildMergedOptions(before, source.text, validation.mode, req.body.categories, req.body.keys);
      results.push({ accountId: id, changes: diffOptions(before, after).slice(0, 200) });
    }

    res.json({ source: source.label, results });
  } catch (error) {
    next(error);
  }
});

app.post('/api/sync', async (req, res, next) => {
  try {
    const basePath = await requireExistingBase(req.body.basePath || DEFAULT_USERS_PATH);
    const validation = await validateSyncRequest(basePath, req.body);
    const source = await getSourceText(basePath, req.body.source);
    const destinationIds = validation.destinationIds;

    const backup = req.body.backup !== false
      ? await createBackup(basePath, destinationIds, `before_${source.label}`)
      : null;

    const written = [];
    const failed = [];
    for (const id of destinationIds) {
      try {
        const destinationPath = getOptionsPath(basePath, id);
        const before = await readTextIfExists(destinationPath) || '';
        const after = buildMergedOptions(before, source.text, validation.mode, req.body.categories, req.body.keys);
        await writeOptionsFile(destinationPath, after);
        written.push({ accountId: id, path: destinationPath, changes: diffOptions(before, after).length });
      } catch (error) {
        const entry = recordSessionError('sync-target', error.message, {
          accountId: id,
          destinationPath: getOptionsPath(basePath, id),
          source: source.label,
          mode: validation.mode,
          code: error.code
        });
        failed.push({ accountId: id, error: error.message, errorId: entry.id });
      }
    }

    res.json({ backup, written, failed });
  } catch (error) {
    next(error);
  }
});

app.post('/api/backups', async (req, res, next) => {
  try {
    const basePath = await requireExistingBase(req.body.basePath || DEFAULT_USERS_PATH);
    const accountIds = [...new Set(req.body.accountIds || [])].filter(Boolean).map((id) => requireAccountId(id));
    if (!accountIds.length) return res.status(400).json({ error: 'No accounts selected.' });
    for (const id of accountIds) {
      await requireAccountFolder(basePath, id);
    }
    res.json({ backup: await createBackup(basePath, accountIds, req.body.label || 'manual') });
  } catch (error) {
    next(error);
  }
});

app.get('/api/backups', async (_req, res, next) => {
  try {
    const files = (await fs.readdir(BACKUP_DIR)).filter((file) => file.endsWith('.zip'));
    const backups = [];
    for (const file of files) {
      const fullPath = path.join(BACKUP_DIR, file);
      const stat = await fs.stat(fullPath);
      backups.push({ file, label: backupLabelFromFile(file), bytes: stat.size, createdAt: stat.mtime.toISOString() });
    }
    backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ backups });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/backups', async (req, res, next) => {
  try {
    const requestedFiles = Array.isArray(req.body.files) ? req.body.files : [];
    const files = requestedFiles.length
      ? requestedFiles.map((file) => {
        try {
          return requireBackupFileName(file);
        } catch {
          return null;
        }
      }).filter(Boolean)
      : (await fs.readdir(BACKUP_DIR)).filter((file) => file.endsWith('.zip'));
    const deleted = [];
    for (const file of [...new Set(files)]) {
      const backupPath = path.join(BACKUP_DIR, file);
      if (await fs.pathExists(backupPath)) {
        await fs.remove(backupPath);
        deleted.push(file);
      }
    }
    res.json({ deleted });
  } catch (error) {
    next(error);
  }
});

app.get('/api/backups/:file', async (req, res, next) => {
  try {
    const fileName = requireBackupFileName(req.params.file);
    const backupPath = path.join(BACKUP_DIR, fileName);
    if (!(await fs.pathExists(backupPath))) return res.status(404).json({ error: 'Backup not found.' });
    res.download(backupPath);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/backups/:file', async (req, res, next) => {
  try {
    const fileName = requireBackupFileName(req.params.file);
    const backupPath = path.join(BACKUP_DIR, fileName);
    if (!(await fs.pathExists(backupPath))) return res.status(404).json({ error: 'Backup not found.' });
    await fs.remove(backupPath);
    res.json({ deleted: true, file: fileName });
  } catch (error) {
    next(error);
  }
});

app.get('/api/errors', (_req, res) => {
  res.json({ errors: sessionErrors });
});

app.delete('/api/errors', (_req, res) => {
  sessionErrors.length = 0;
  res.json({ cleared: true });
});

app.post('/api/watch', async (req, res, next) => {
  try {
    const basePath = requireSafeBase(req.body.basePath || DEFAULT_USERS_PATH);
    if (watcher) await watcher.close();
    watcher = chokidar.watch(path.join(basePath, '*', 'games', 'com.mojang', 'minecraftpe', 'options.txt'), {
      ignoreInitial: true,
      depth: 6
    });
    res.json({ watching: true, basePath });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  recordSessionError('request', error.message || 'Unexpected error.', {
    status: error.status || 500,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
  res.status(error.status || 500).json({ error: error.message || 'Unexpected error.' });
});

app.listen(PORT, async () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Option Sync is running at ${url}`);
  if (process.env.NO_OPEN === '1') return;
  try {
    const { default: open } = await import('open');
    await open(url);
  } catch {
    console.log('Open the URL above in your browser.');
  }
});
