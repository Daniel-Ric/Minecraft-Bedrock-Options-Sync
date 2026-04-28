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
const DEFAULT_FLARIAL_CONFIG_PATH = path.join(process.env.LOCALAPPDATA || '', 'Flarial', 'Client', 'Config');
const DEFAULT_FLARIAL_EXPORT_PATH = path.join(os.homedir(), 'Documents', 'Flarial Config Saves');

fs.ensureDirSync(BACKUP_DIR);
fs.ensureDirSync(UPLOAD_DIR);

const upload = multer({
  dest: UPLOAD_DIR,
  preservePath: true,
  limits: { fileSize: 10 * 1024 * 1024 }
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

function configTypeFrom(value) {
  return String(value || '').toLowerCase() === 'flarial' ? 'flarial' : 'vanilla';
}

function configTypeLabel(configType) {
  return configType === 'flarial' ? 'Flarial Client Config' : 'Minecraft Bedrock Users';
}

function defaultPathFor(configType) {
  return configType === 'flarial' ? DEFAULT_FLARIAL_CONFIG_PATH : DEFAULT_USERS_PATH;
}

function defaultExportPathFor(configType) {
  return configType === 'flarial' ? DEFAULT_FLARIAL_EXPORT_PATH : '';
}

function expandSpecialBackupIds(configType, accountIds, basePath) {
  if (!accountIds.includes('__all__')) return Promise.resolve(accountIds);
  if (configType === 'flarial') return Promise.resolve(['__all__']);
  return scanAccounts(basePath).then((accounts) => accounts.filter((account) => account.hasOptions).map((account) => account.id));
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

function parseJsonConfig(text) {
  return JSON.parse(String(text || '{}').replace(/^\uFEFF/, ''));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}${os.EOL}`;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFlarialProfileFile(name) {
  return /\.json$/i.test(name) && !/\.bak$/i.test(name);
}

function getFlarialProfilePath(basePath, id) {
  return path.join(basePath, id);
}

function requireFlarialProfileId(id, label = 'Profile') {
  const clean = path.basename(String(id || ''));
  if (!clean || clean !== String(id) || !isFlarialProfileFile(clean)) {
    const err = new Error(`${label} must be a Flarial .json config file.`);
    err.status = 400;
    throw err;
  }
  return clean;
}

async function requireFlarialProfile(basePath, id, label = 'Profile') {
  const profileId = requireFlarialProfileId(id, label);
  const profilePath = getFlarialProfilePath(basePath, profileId);
  if (!(await fs.pathExists(profilePath))) {
    const err = new Error(`${label} config was not found.`);
    err.status = 404;
    throw err;
  }
  return profileId;
}

function flattenJsonLeaves(value, prefix = []) {
  if (!isPlainObject(value)) return [];
  const entries = [];
  for (const [key, child] of Object.entries(value)) {
    const pathParts = [...prefix, key];
    if (isPlainObject(child)) {
      const nested = flattenJsonLeaves(child, pathParts);
      if (nested.length) entries.push(...nested);
      else entries.push({ key: pathParts.join('.'), value: '{}', rawValue: child, module: prefix[0] || key });
    } else {
      entries.push({
        key: pathParts.join('.'),
        value: typeof child === 'string' ? child : JSON.stringify(child),
        rawValue: child,
        module: prefix[0] || key
      });
    }
  }
  return entries;
}

function flarialCategory(moduleName, propertyPath = '') {
  const text = `${moduleName} ${propertyPath}`.toLowerCase();
  if (/(hud|counter|display|clock|coordinates|direction|fps|cps|ping|armor|inventory|scoreboard|tab list|bossbar|hotbar|paperdoll|title|waila)/.test(text)) return 'hud';
  if (/(fov|camera|zoom|freelook|view|motion|blur|fullbright|fog|outline|hitbox|hurt color|animation|weather|time|render|nametag|crosshair)/.test(text)) return 'visuals';
  if (/(sprint|sneak|keystrokes|mouse|input|sensitivity|hotkey|wheel|inventory lock|bow|click|cps limiter)/.test(text)) return 'controls';
  if (/(reach|combo|crystal|pvp|hive|zeqa|pot|meds|null movement|opponent|block hit|break progress)/.test(text)) return 'combat';
  if (/(enabled|favorite|keybind|settings|clickgui|config|audio|logger|notifier|utils|waypoints|nick|party)/.test(text)) return 'client';
  return 'other';
}

function isSyncableFlarialKey(key) {
  return !/(^|\.)(account|token|session|secret|private|password|xuid|uuid)$/i.test(key);
}

function parseTypedJsonValue(value) {
  const text = String(value ?? '');
  if (!text.trim()) return '';
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getPathValue(root, dotPath) {
  const parts = String(dotPath || '').split('.').filter(Boolean);
  let current = root;
  for (const part of parts) {
    if (!isPlainObject(current) || !Object.prototype.hasOwnProperty.call(current, part)) return undefined;
    current = current[part];
  }
  return current;
}

function setPathValue(root, dotPath, value) {
  const parts = String(dotPath || '').split('.').filter(Boolean);
  if (!parts.length) throw Object.assign(new Error('Invalid config key.'), { status: 400 });
  let current = root;
  for (const part of parts.slice(0, -1)) {
    if (!isPlainObject(current[part])) current[part] = {};
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

function buildMergedFlarialConfig(destinationText, sourceText, mode, categories, keys) {
  const destination = parseJsonConfig(destinationText || '{}');
  const source = parseJsonConfig(sourceText || '{}');

  if (mode === 'full') return stableJson(source);

  const selectedCategories = new Set(categories || []);
  const selectedKeys = new Set(keys || []);

  if (mode === 'categories') {
    for (const [moduleName, moduleValue] of Object.entries(source)) {
      if (selectedCategories.has(flarialCategory(moduleName))) {
        destination[moduleName] = moduleValue;
      }
    }
    return stableJson(destination);
  }

  for (const key of selectedKeys) {
    if (!isSyncableFlarialKey(key)) continue;
    const value = getPathValue(source, key);
    if (value !== undefined) setPathValue(destination, key, value);
  }

  return stableJson(destination);
}

function diffJsonLeaves(beforeText, afterText) {
  let before = {};
  let after = {};
  try { before = parseJsonConfig(beforeText || '{}'); } catch {}
  try { after = parseJsonConfig(afterText || '{}'); } catch {}
  const beforeMap = new Map(flattenJsonLeaves(before).map((entry) => [entry.key, entry.value]));
  const afterMap = new Map(flattenJsonLeaves(after).map((entry) => [entry.key, entry.value]));
  return [...new Set([...beforeMap.keys(), ...afterMap.keys()])]
    .sort()
    .filter((key) => beforeMap.get(key) !== afterMap.get(key))
    .map((key) => ({
      key,
      before: beforeMap.has(key) ? beforeMap.get(key) : null,
      after: afterMap.has(key) ? afterMap.get(key) : null,
      category: flarialCategory(key.split('.')[0], key)
    }));
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

async function scanFlarialConfigs(basePath) {
  if (!basePath || !(await fs.pathExists(basePath))) return [];
  const children = await fs.readdir(basePath, { withFileTypes: true }).catch(() => []);
  const files = children
    .filter((entry) => entry.isFile() && isFlarialProfileFile(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const profiles = [];
  for (const file of files) {
    const configPath = getFlarialProfilePath(basePath, file);
    const stat = await fs.stat(configPath);
    let moduleCount = 0;
    let optionCount = 0;
    let parseError = null;
    try {
      const data = parseJsonConfig(await fs.readFile(configPath, 'utf8'));
      moduleCount = isPlainObject(data) ? Object.keys(data).length : 0;
      optionCount = flattenJsonLeaves(data).length;
    } catch (error) {
      parseError = error.message;
    }

    const bakPath = `${configPath}.bak`;
    profiles.push({
      id: file,
      folder: file,
      gamertag: null,
      displayName: file.replace(/\.json$/i, ''),
      optionsPath: configPath,
      hasOptions: !parseError,
      optionCount,
      moduleCount,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      activityModifiedAt: stat.mtime.toISOString(),
      isLikelyActive: false,
      backupFile: (await fs.pathExists(bakPath)) ? path.basename(bakPath) : null,
      parseError
    });
  }

  const latestActivity = Math.max(0, ...profiles.map((profile) => profile.modifiedAt ? new Date(profile.modifiedAt).getTime() : 0));
  for (const profile of profiles) {
    profile.isLikelyActive = latestActivity > 0 && new Date(profile.modifiedAt).getTime() === latestActivity;
  }

  return profiles;
}

async function scanEntries(configType, basePath) {
  return configType === 'flarial' ? scanFlarialConfigs(basePath) : scanAccounts(basePath);
}

function requireSafeBase(basePath) {
  const resolved = path.resolve(basePath || '');
  if (!resolved || resolved === path.parse(resolved).root) {
    const err = new Error('Invalid config path.');
    err.status = 400;
    throw err;
  }
  return resolved;
}

function requireSafeDestination(destinationPath) {
  const resolved = path.resolve(String(destinationPath || '').trim());
  if (!resolved || resolved === path.parse(resolved).root) {
    const err = new Error('Invalid export destination path.');
    err.status = 400;
    throw err;
  }
  return resolved;
}

async function requireExistingBase(basePath, configType = 'vanilla') {
  const resolved = requireSafeBase(basePath);
  if (!(await fs.pathExists(resolved))) {
    const err = new Error(`${configTypeLabel(configType)} folder was not found.`);
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

function validateMode(mode, categories = [], keys = [], configType = 'vanilla') {
  const allowedModes = new Set(['full', 'categories', 'keys']);
  if (!allowedModes.has(mode)) {
    const err = new Error('Invalid sync mode.');
    err.status = 400;
    throw err;
  }

  const allowedCategories = configType === 'flarial'
    ? new Set(['hud', 'visuals', 'controls', 'combat', 'client', 'other'])
    : new Set(['graphics', 'audio', 'controls', 'interface', 'other']);
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
      const syncable = configType === 'flarial' ? isSyncableFlarialKey(key) : isSyncableOptionKey(key);
      if (!syncable) {
        const err = new Error(`Account-related option keys cannot be synced: ${key}`);
        err.status = 400;
        throw err;
      }
    }
  }
}

async function validateSyncRequest(basePath, body, configType = 'vanilla') {
  const mode = body.mode || 'full';
  validateMode(mode, body.categories, body.keys, configType);

  if (!body.source || !body.source.type) {
    const err = new Error('Source is missing.');
    err.status = 400;
    throw err;
  }

  if (body.source.type === 'account') {
    if (configType === 'flarial') await requireFlarialProfile(basePath, body.source.accountId, 'Source profile');
    else await requireAccountFolder(basePath, body.source.accountId, 'Source account');
  } else if (body.source.type !== 'upload') {
    const err = new Error('Invalid source type.');
    err.status = 400;
    throw err;
  }

  const destinationIds = [...new Set(body.destinationIds || [])].filter(Boolean).map((id) => (
    configType === 'flarial' ? requireFlarialProfileId(id, 'Destination profile') : requireAccountId(id, 'Destination account')
  ));
  if (!destinationIds.length) {
    const err = new Error('No destination accounts selected.');
    err.status = 400;
    throw err;
  }

  for (const id of destinationIds) {
    if (configType === 'flarial') await requireFlarialProfile(basePath, id, 'Destination profile');
    else await requireAccountFolder(basePath, id, 'Destination account');
  }

  if (body.source.type === 'account' && destinationIds.includes(String(body.source.accountId))) {
    const err = new Error('The source account cannot also be a destination account.');
    err.status = 400;
    throw err;
  }

  return { mode, destinationIds };
}

async function addDirectoryToArchive(archive, directoryPath, archiveRoot) {
  if (!(await fs.pathExists(directoryPath))) return;
  const items = await fs.readdir(directoryPath, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(directoryPath, item.name);
    const entryName = path.posix.join(archiveRoot, item.name);
    if (item.isDirectory()) await addDirectoryToArchive(archive, fullPath, entryName);
    else if (item.isFile()) archive.file(fullPath, { name: entryName });
  }
}

async function copyDirectory(sourcePath, destinationPath) {
  await fs.ensureDir(destinationPath);
  const items = await fs.readdir(sourcePath, { withFileTypes: true });
  for (const item of items) {
    const sourceItem = path.join(sourcePath, item.name);
    const destinationItem = path.join(destinationPath, item.name);
    if (item.isDirectory()) await copyDirectory(sourceItem, destinationItem);
    else if (item.isFile()) await fs.copy(sourceItem, destinationItem, { overwrite: true, preserveTimestamps: true });
  }
}

async function copyFlarialConfigFolder(sourcePath, destinationPath, includeLegacy = true) {
  await fs.ensureDir(destinationPath);
  const items = await fs.readdir(sourcePath, { withFileTypes: true });
  for (const item of items) {
    if (!includeLegacy && item.isDirectory() && item.name.toLowerCase() === 'legacy') continue;
    const sourceItem = path.join(sourcePath, item.name);
    const destinationItem = path.join(destinationPath, item.name);
    if (item.isDirectory()) await copyDirectory(sourceItem, destinationItem);
    else if (item.isFile()) await fs.copy(sourceItem, destinationItem, { overwrite: true, preserveTimestamps: true });
  }
}

function safeExportFileName(label, fallback = 'flarial-config.json') {
  const clean = path.basename(String(label || fallback)).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  return clean.toLowerCase().endsWith('.json') ? clean : `${clean}.json`;
}

function safeFlarialImportName(label) {
  return safeExportFileName(label || 'imported-flarial.json', 'imported-flarial.json');
}

async function resolveFlarialExportTarget(destinationPath, fileName) {
  const destination = requireSafeDestination(destinationPath);
  const ext = path.extname(destination).toLowerCase();
  if (ext === '.json') {
    await fs.ensureDir(path.dirname(destination));
    return destination;
  }
  await fs.ensureDir(destination);
  return path.join(destination, safeExportFileName(fileName));
}

async function buildFlarialExport(basePath, body) {
  const exportScope = body.exportScope === 'folder' ? 'folder' : 'profile';
  const destinationPath = requireSafeDestination(body.destinationPath || DEFAULT_FLARIAL_EXPORT_PATH);

  if (exportScope === 'folder') {
    const outputPath = path.join(destinationPath, `FlarialConfig_${new Date().toISOString().replace(/[:.]/g, '-')}`);
    const sourceRoot = path.resolve(basePath);
    const outputRoot = path.resolve(outputPath);
    if (outputRoot === sourceRoot || outputRoot.startsWith(`${sourceRoot}${path.sep}`)) {
      const err = new Error('Choose an export destination outside the active Flarial Config folder.');
      err.status = 400;
      throw err;
    }
    return {
      exportScope,
      destinationPath,
      source: { label: 'full-config-folder' },
      outputPath,
      bytes: 0,
      changeCount: 0,
      valueCount: 0,
      previewLines: [
        `Source folder: ${basePath}`,
        `Destination folder: ${destinationPath}`,
        'Mode: full Flarial Config folder copy',
        body.includeLegacy === false ? 'Legacy folder: skipped' : 'Legacy folder: included'
      ]
    };
  }

  validateMode(body.mode || 'full', body.categories, body.keys, 'flarial');
  if (!body.source || !body.source.type) throw Object.assign(new Error('Source is missing.'), { status: 400 });
  if (body.source.type === 'account') await requireFlarialProfile(basePath, body.source.accountId, 'Source profile');
  else if (body.source.type !== 'upload') throw Object.assign(new Error('Invalid source type.'), { status: 400 });

  const source = await getSourceText(basePath, body.source, 'flarial');
  const outputPath = await resolveFlarialExportTarget(destinationPath, source.label === 'uploaded-file' ? 'uploaded-flarial.json' : source.label);
  const before = await readTextIfExists(outputPath) || '{}';
  const after = buildMergedFlarialConfig(before, source.text, body.mode || 'full', body.categories, body.keys);
  const changes = diffJsonLeaves(before, after);
  return {
    exportScope,
    destinationPath,
    source,
    outputPath,
    text: after,
    bytes: Buffer.byteLength(after, 'utf8'),
    changeCount: changes.length,
    valueCount: flattenJsonLeaves(parseJsonConfig(after)).length,
    previewLines: [
      `Source profile: ${source.label}`,
      `Output file: ${outputPath}`,
      `Mode: ${body.mode || 'full'}`,
      `Values in export: ${flattenJsonLeaves(parseJsonConfig(after)).length}`,
      `Changed values at destination: ${changes.length}`,
      '',
      ...changes.slice(0, 20).map((change) => `  ${change.key}: ${change.before ?? '<missing>'} -> ${change.after ?? '<missing>'}`)
    ]
  };
}

async function createBackup(basePath, accountIds, label = 'sync', configType = 'vanilla') {
  await fs.ensureDir(BACKUP_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeLabel = `${configType}_${String(label).replace(/[^a-z0-9_-]/gi, '_').slice(0, 40) || 'backup'}`;
  const zipPath = path.join(BACKUP_DIR, `${stamp}_${safeLabel}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  const finished = new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
  });

  archive.pipe(output);
  if (configType === 'flarial' && accountIds.includes('__all__')) {
    await addDirectoryToArchive(archive, basePath, 'FlarialConfig');
  } else {
    for (const id of accountIds) {
      if (configType === 'flarial') {
        const profileId = requireFlarialProfileId(id);
        const profilePath = getFlarialProfilePath(basePath, profileId);
        if (await fs.pathExists(profilePath)) archive.file(profilePath, { name: `FlarialConfig/${profileId}` });
        const bakPath = `${profilePath}.bak`;
        if (await fs.pathExists(bakPath)) archive.file(bakPath, { name: `FlarialConfig/${path.basename(bakPath)}` });
      } else {
        const optionsPath = getOptionsPath(basePath, id);
        if (await fs.pathExists(optionsPath)) {
          archive.file(optionsPath, { name: `${id}/options.txt` });
        }
      }
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

function execFileAsync(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function extractZipArchive(zipPath, destinationPath) {
  await fs.ensureDir(destinationPath);
  try {
    await execFileAsync('tar', ['-xf', zipPath, '-C', destinationPath]);
    return;
  } catch (tarError) {
    if (process.platform !== 'win32') throw tarError;
  }

  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-Command',
    'Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force',
    zipPath,
    destinationPath
  ]);
}

async function selectFolderWithDialog(initialPath, description = 'Select folder') {
  if (process.platform !== 'win32') {
    const err = new Error('Folder picker is only supported on Windows.');
    err.status = 400;
    throw err;
  }

  const resolvedInitial = path.resolve(initialPath || os.homedir());
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
    '$dialog.Description = $args[1]',
    '$dialog.ShowNewFolderButton = $true',
    'if (Test-Path -LiteralPath $args[0]) { $dialog.SelectedPath = $args[0] }',
    '$result = $dialog.ShowDialog()',
    'if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }'
  ].join('; ');
  const { stdout } = await execFileAsync('powershell.exe', ['-STA', '-NoProfile', '-Command', script, resolvedInitial, description], { timeout: 120000 });
  const selectedPath = stdout.trim();
  return selectedPath ? path.resolve(selectedPath) : null;
}

async function restoreVanillaBackup(extractPath, basePath) {
  const entries = await fs.readdir(extractPath, { withFileTypes: true });
  const restored = [];
  for (const entry of entries.filter((item) => item.isDirectory() && isNumericAccountFolder(item.name))) {
    const sourceOptions = path.join(extractPath, entry.name, 'options.txt');
    if (!(await fs.pathExists(sourceOptions))) continue;
    const destinationOptions = getOptionsPath(basePath, entry.name);
    await writeOptionsFile(destinationOptions, await fs.readFile(sourceOptions, 'utf8'));
    restored.push({ id: entry.name, path: destinationOptions });
  }
  return restored;
}

async function restoreFlarialBackup(extractPath, basePath) {
  const flarialRoot = path.join(extractPath, 'FlarialConfig');
  const sourceRoot = (await fs.pathExists(flarialRoot)) ? flarialRoot : extractPath;
  const restoredFiles = [];
  const children = await fs.readdir(sourceRoot, { withFileTypes: true }).catch(() => []);
  for (const child of children) {
    if (child.isFile() && (isFlarialProfileFile(child.name) || /\.json\.bak$/i.test(child.name))) restoredFiles.push(child.name);
    if (child.isDirectory()) restoredFiles.push(`${child.name}/`);
  }
  const looksLikeFlarial = restoredFiles.some((name) => /\.json(\.bak)?$/i.test(name) || name.toLowerCase() === 'legacy/');
  if (!looksLikeFlarial) {
    const err = new Error('This backup does not contain Flarial config files.');
    err.status = 400;
    throw err;
  }
  await copyFlarialConfigFolder(sourceRoot, basePath, true);
  return restoredFiles;
}

async function flarialBackupSourceRoot(extractPath) {
  const flarialRoot = path.join(extractPath, 'FlarialConfig');
  return (await fs.pathExists(flarialRoot)) ? flarialRoot : extractPath;
}

function vanillaVersionScore(parsed) {
  const parts = ['major', 'minor', 'patch', 'revision'].map((part) => Number(parsed.map[`options_version_${part}`] || 0));
  return parts.reduce((score, part) => (score * 1000) + (Number.isFinite(part) ? part : 0), 0);
}

function vanillaProfileStats(text) {
  const parsed = parseOptions(text || '');
  const keys = Object.keys(parsed.map);
  return {
    keyCount: keys.length,
    syncableKeyCount: keys.filter(isSyncableOptionKey).length,
    versionScore: vanillaVersionScore(parsed),
    keys: new Set(keys)
  };
}

function flarialProfileStats(text) {
  const parsed = parseJsonConfig(text || '{}');
  const modules = isPlainObject(parsed) ? Object.keys(parsed) : [];
  const leaves = flattenJsonLeaves(parsed);
  return {
    moduleCount: modules.length,
    valueCount: leaves.length,
    modules: new Set(modules),
    keys: new Set(leaves.map((entry) => entry.key))
  };
}

function missingFromSet(sourceSet, targetSet) {
  return [...targetSet].filter((value) => !sourceSet.has(value));
}

function importValidationResult({ ok = true, title = 'Import validation passed', warnings = [], advice = [], stats = {} } = {}) {
  return { ok, title, warnings, advice, stats };
}

function validateVanillaImportAgainstTarget(importStats, targetStats, targetLabel) {
  const warnings = [];
  const advice = [];
  if (!targetStats) {
    return importValidationResult({
      warnings: [`No existing options.txt was found for ${targetLabel}; this import will create one.`],
      advice: ['This is safe if the target account is new or intentionally missing options.txt.']
    });
  }

  const missingKeys = missingFromSet(importStats.keys, targetStats.keys);
  if (importStats.versionScore && targetStats.versionScore && importStats.versionScore < targetStats.versionScore) {
    warnings.push(`The imported options.txt has an older options_version than ${targetLabel}.`);
  }
  if (importStats.keyCount + 8 < targetStats.keyCount || missingKeys.length >= 12) {
    warnings.push(`The imported options.txt has fewer settings than ${targetLabel} (${importStats.keyCount} vs ${targetStats.keyCount}).`);
    warnings.push(`${Math.min(missingKeys.length, 30)} existing key(s) would be missing from the import, including: ${missingKeys.slice(0, 8).join(', ') || 'none'}.`);
  }

  if (!warnings.length) {
    return importValidationResult({
      stats: { importedKeys: importStats.keyCount, currentKeys: targetStats.keyCount }
    });
  }

  advice.push('Do not import this file over the current account. Start Minecraft Bedrock once with the current account, let it generate the newest options.txt, then use Advanced Mode to copy only selected categories or keys from the old file.');
  advice.push('If you only need one setting, upload the old file as a source and use Specific keys instead of replacing the full file.');
  return importValidationResult({
    ok: false,
    title: 'Import blocked: Vanilla options.txt looks older or feature-poor',
    warnings,
    advice,
    stats: { importedKeys: importStats.keyCount, currentKeys: targetStats.keyCount, missingKeys: missingKeys.length }
  });
}

function validateFlarialImportAgainstTarget(importStats, targetStats, targetLabel) {
  const warnings = [];
  const advice = [];
  if (!targetStats) {
    return importValidationResult({
      warnings: [`No existing Flarial profile named ${targetLabel} was found; this import will create one.`],
      advice: ['This is safe for adding a new preset. Keep the automatic backup enabled.']
    });
  }

  const missingModules = missingFromSet(importStats.modules, targetStats.modules);
  const missingKeys = missingFromSet(importStats.keys, targetStats.keys);
  if (importStats.moduleCount < targetStats.moduleCount || missingModules.length > 0) {
    warnings.push(`The imported Flarial profile has fewer modules than the existing ${targetLabel} (${importStats.moduleCount} vs ${targetStats.moduleCount}).`);
    warnings.push(`Missing existing module(s): ${missingModules.slice(0, 10).join(', ')}.`);
  }
  if (importStats.valueCount + 5 < targetStats.valueCount || missingKeys.length >= 12) {
    warnings.push(`The imported Flarial profile has fewer saved values (${importStats.valueCount} vs ${targetStats.valueCount}).`);
  }

  if (!warnings.length) {
    return importValidationResult({
      stats: { importedModules: importStats.moduleCount, currentModules: targetStats.moduleCount, importedValues: importStats.valueCount, currentValues: targetStats.valueCount }
    });
  }

  advice.push('Do not replace this Flarial profile directly. Open Flarial once so it writes the newest config format, then import old settings into a new profile name or export only selected modules/values.');
  advice.push('If the old file is from an older Flarial build, keep the existing profile as the main profile and use it as the feature-complete base.');
  return importValidationResult({
    ok: false,
    title: 'Import blocked: Flarial config looks older or missing modules',
    warnings,
    advice,
    stats: { importedModules: importStats.moduleCount, currentModules: targetStats.moduleCount, importedValues: importStats.valueCount, currentValues: targetStats.valueCount, missingModules: missingModules.length, missingValues: missingKeys.length }
  });
}

async function validateFlarialFileImport(basePath, text, targetName) {
  const importStats = flarialProfileStats(text);
  const targetPath = getFlarialProfilePath(basePath, targetName);
  const currentText = await readTextIfExists(targetPath);
  const targetStats = currentText === null ? null : flarialProfileStats(currentText);
  return validateFlarialImportAgainstTarget(importStats, targetStats, targetName);
}

async function validateVanillaFileImport(basePath, text, accountId) {
  const importStats = vanillaProfileStats(text);
  const targetPath = getOptionsPath(basePath, accountId);
  const currentText = await readTextIfExists(targetPath);
  const targetStats = currentText === null ? null : vanillaProfileStats(currentText);
  return validateVanillaImportAgainstTarget(importStats, targetStats, accountId);
}

async function validateFlarialFolderImport(basePath, sourceRoot) {
  const files = await fs.readdir(sourceRoot, { withFileTypes: true }).catch(() => []);
  const validations = [];
  for (const file of files.filter((entry) => entry.isFile() && isFlarialProfileFile(entry.name))) {
    const text = await fs.readFile(path.join(sourceRoot, file.name), 'utf8');
    const stats = flarialProfileStats(text);
    if (stats.valueCount) validations.push({ fileName: file.name, ...await validateFlarialFileImport(basePath, text, file.name) });
  }
  return validations;
}

async function validateVanillaFolderImport(basePath, sourceRoot) {
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true }).catch(() => []);
  const validations = [];
  for (const entry of entries.filter((item) => item.isDirectory() && isNumericAccountFolder(item.name))) {
    const sourceOptions = path.join(sourceRoot, entry.name, 'options.txt');
    if (!(await fs.pathExists(sourceOptions))) continue;
    const text = await fs.readFile(sourceOptions, 'utf8');
    validations.push({ accountId: entry.name, ...await validateVanillaFileImport(basePath, text, entry.name) });
  }
  return validations;
}

function assertImportAllowed(validation) {
  if (validation.ok) return;
  const err = new Error(`${validation.title}. ${validation.advice.join(' ')}`);
  err.status = 409;
  err.validation = validation;
  throw err;
}

async function getSourceText(basePath, source, configType = 'vanilla') {
  if (!source || !source.type) throw Object.assign(new Error('Source is missing.'), { status: 400 });

  if (source.type === 'account') {
    const sourceId = configType === 'flarial'
      ? requireFlarialProfileId(source.accountId, 'Source profile')
      : requireAccountId(source.accountId, 'Source account');
    const sourcePath = configType === 'flarial'
      ? getFlarialProfilePath(basePath, sourceId)
      : getOptionsPath(basePath, sourceId);
    if (!(await fs.pathExists(sourcePath))) throw Object.assign(new Error(configType === 'flarial' ? 'Source profile was not found.' : 'Source account has no options.txt.'), { status: 404 });
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

function buildMergedText(destinationText, sourceText, mode, categories, keys, configType = 'vanilla') {
  return configType === 'flarial'
    ? buildMergedFlarialConfig(destinationText, sourceText, mode, categories, keys)
    : buildMergedOptions(destinationText, sourceText, mode, categories, keys);
}

function diffText(beforeText, afterText, configType = 'vanilla') {
  return configType === 'flarial' ? diffJsonLeaves(beforeText, afterText) : diffOptions(beforeText, afterText);
}

function destinationConfigPath(basePath, id, configType = 'vanilla') {
  return configType === 'flarial' ? getFlarialProfilePath(basePath, id) : getOptionsPath(basePath, id);
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
    `Could not write config at ${filePath}.`,
    'The file is blocked by Windows, read-only, or currently locked by the client.',
    'Close Minecraft Bedrock and Flarial Client completely and retry. If it still fails, run Option Sync as administrator once.'
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

app.get('/api/default-path', (req, res) => {
  const configType = configTypeFrom(req.query.configType);
  res.json({ path: defaultPathFor(configType), exportPath: defaultExportPathFor(configType), configType });
});

app.post('/api/select-folder', async (req, res, next) => {
  try {
    const configType = configTypeFrom(req.body.configType);
    const purpose = String(req.body.purpose || 'base');
    const fallback = purpose === 'export' ? defaultExportPathFor(configType) || os.homedir() : defaultPathFor(configType);
    const selectedPath = await selectFolderWithDialog(req.body.initialPath || fallback, purpose === 'export' ? 'Select export destination folder' : `Select ${configTypeLabel(configType)} folder`);
    res.json({ canceled: !selectedPath, path: selectedPath });
  } catch (error) {
    next(error);
  }
});

app.get('/api/open-users-folder', async (req, res, next) => {
  try {
    const configType = configTypeFrom(req.query.configType);
    const basePath = await requireExistingBase(req.query.basePath || defaultPathFor(configType), configType);
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
    const configType = configTypeFrom(req.query.configType);
    const basePath = requireSafeBase(req.query.basePath || defaultPathFor(configType));
    res.json({
      basePath,
      configType,
      minecraftRunning: await isMinecraftRunning(),
      accounts: await scanEntries(configType, basePath)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/accounts/:id/options', async (req, res, next) => {
  try {
    const configType = configTypeFrom(req.query.configType);
    const basePath = await requireExistingBase(req.query.basePath || defaultPathFor(configType), configType);
    const accountId = configType === 'flarial'
      ? await requireFlarialProfile(basePath, req.params.id, 'Profile')
      : await requireAccountFolder(basePath, req.params.id, 'Account');
    const optionsPath = destinationConfigPath(basePath, accountId, configType);
    const text = await readTextIfExists(optionsPath);
    if (text === null) return res.status(404).json({ error: configType === 'flarial' ? 'Config profile not found.' : 'options.txt not found.' });
    if (configType === 'flarial') {
      const parsed = parseJsonConfig(text);
      return res.json({
        accountId: req.params.id,
        optionsPath,
        options: flattenJsonLeaves(parsed)
          .map((entry) => ({ key: entry.key, value: entry.value, category: flarialCategory(entry.module, entry.key), syncable: isSyncableFlarialKey(entry.key) }))
      });
    }
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
    const configType = configTypeFrom(req.body.configType);
    const basePath = await requireExistingBase(req.body.basePath || defaultPathFor(configType), configType);
    const accountId = configType === 'flarial'
      ? await requireFlarialProfile(basePath, req.params.id, 'Profile')
      : await requireAccountFolder(basePath, req.params.id, 'Account');
    const key = configType === 'flarial' ? String(req.body.key || '').trim() : requireOptionKey(req.body.key);
    if (configType === 'flarial' && (!key || !isSyncableFlarialKey(key))) {
      const err = new Error('Protected Flarial config keys cannot be edited here.');
      err.status = 400;
      throw err;
    }
    const value = requireOptionValue(req.body.value);
    const optionsPath = destinationConfigPath(basePath, accountId, configType);
    const before = await readTextIfExists(optionsPath);
    if (before === null) return res.status(404).json({ error: configType === 'flarial' ? 'Config profile not found.' : 'options.txt not found.' });

    let after;
    if (configType === 'flarial') {
      const parsed = parseJsonConfig(before);
      setPathValue(parsed, key, parseTypedJsonValue(value));
      after = stableJson(parsed);
    } else {
      after = updateOptionText(before, key, value);
    }
    await writeOptionsFile(optionsPath, after);
    res.json({ accountId, key, value, category: configType === 'flarial' ? flarialCategory(key.split('.')[0], key) : optionCategory(key), changed: before !== after });
  } catch (error) {
    next(error);
  }
});

app.post('/api/upload', upload.single('options'), async (req, res, next) => {
  try {
    const configType = configTypeFrom(req.body.configType || req.query.configType);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const original = req.file.originalname || 'options.txt';
    const expectedExtension = configType === 'flarial' ? '.json' : '.txt';
    if (!original.toLowerCase().endsWith(expectedExtension)) {
      await fs.remove(req.file.path);
      return res.status(400).json({ error: configType === 'flarial' ? 'Please upload a Flarial .json config file.' : 'Please upload an options.txt file.' });
    }
    const id = `${crypto.randomUUID()}${expectedExtension}`;
    const finalPath = path.join(UPLOAD_DIR, id);
    await fs.move(req.file.path, finalPath, { overwrite: true });
    const text = await fs.readFile(finalPath, 'utf8');
    const optionCount = configType === 'flarial'
      ? flattenJsonLeaves(parseJsonConfig(text)).length
      : Object.keys(parseOptions(text).map).length;
    if (optionCount === 0) {
      await fs.remove(finalPath);
      return res.status(400).json({ error: configType === 'flarial' ? 'The uploaded file does not look like a valid Flarial config.' : 'The uploaded file does not look like a valid options.txt file.' });
    }
    res.json({ uploadId: id, optionCount });
  } catch (error) {
    next(error);
  }
});

app.post('/api/preview', async (req, res, next) => {
  try {
    const configType = configTypeFrom(req.body.configType);
    const basePath = await requireExistingBase(req.body.basePath || defaultPathFor(configType), configType);
    const validation = await validateSyncRequest(basePath, req.body, configType);
    const source = await getSourceText(basePath, req.body.source, configType);
    const destinationIds = validation.destinationIds;
    const results = [];

    for (const id of destinationIds) {
      const destinationPath = destinationConfigPath(basePath, id, configType);
      const before = await readTextIfExists(destinationPath) || '';
      const after = buildMergedText(before, source.text, validation.mode, req.body.categories, req.body.keys, configType);
      results.push({ accountId: id, changes: diffText(before, after, configType).slice(0, 200) });
    }

    res.json({ source: source.label, results });
  } catch (error) {
    next(error);
  }
});

app.post('/api/sync', async (req, res, next) => {
  try {
    const configType = configTypeFrom(req.body.configType);
    const basePath = await requireExistingBase(req.body.basePath || defaultPathFor(configType), configType);
    const validation = await validateSyncRequest(basePath, req.body, configType);
    const source = await getSourceText(basePath, req.body.source, configType);
    const destinationIds = validation.destinationIds;

    const backup = req.body.backup !== false
      ? await createBackup(basePath, destinationIds, `before_${source.label}`, configType)
      : null;

    const written = [];
    const failed = [];
    for (const id of destinationIds) {
      try {
        const destinationPath = destinationConfigPath(basePath, id, configType);
        const before = await readTextIfExists(destinationPath) || '';
        const after = buildMergedText(before, source.text, validation.mode, req.body.categories, req.body.keys, configType);
        await writeOptionsFile(destinationPath, after);
        written.push({ accountId: id, path: destinationPath, changes: diffText(before, after, configType).length });
      } catch (error) {
        const entry = recordSessionError('sync-target', error.message, {
          accountId: id,
          destinationPath: destinationConfigPath(basePath, id, configType),
          source: source.label,
          mode: validation.mode,
          configType,
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

app.post('/api/flarial/export-preview', async (req, res, next) => {
  try {
    const basePath = await requireExistingBase(req.body.basePath || DEFAULT_FLARIAL_CONFIG_PATH, 'flarial');
    const prepared = await buildFlarialExport(basePath, req.body);
    res.json({
      source: prepared.source.label,
      exportScope: prepared.exportScope,
      outputPath: prepared.outputPath,
      bytes: prepared.bytes,
      changeCount: prepared.changeCount,
      valueCount: prepared.valueCount,
      preview: prepared.previewLines.join('\n')
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/flarial/export', async (req, res, next) => {
  try {
    const basePath = await requireExistingBase(req.body.basePath || DEFAULT_FLARIAL_CONFIG_PATH, 'flarial');
    const prepared = await buildFlarialExport(basePath, req.body);
    const backup = req.body.backup !== false
      ? await createBackup(basePath, ['__all__'], 'before_export', 'flarial')
      : null;

    if (prepared.exportScope === 'folder') {
      await copyFlarialConfigFolder(basePath, prepared.outputPath, req.body.includeLegacy !== false);
      return res.json({
        backup,
        exportScope: prepared.exportScope,
        written: [{ path: prepared.outputPath, changes: 0, values: 0 }],
        failed: []
      });
    }

    await writeOptionsFile(prepared.outputPath, prepared.text);
    res.json({
      backup,
      exportScope: prepared.exportScope,
      written: [{ path: prepared.outputPath, changes: prepared.changeCount, values: prepared.valueCount }],
      failed: []
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/flarial/import', upload.single('config'), async (req, res, next) => {
  try {
    const basePath = await requireExistingBase(req.body.basePath || DEFAULT_FLARIAL_CONFIG_PATH, 'flarial');
    if (!req.file) return res.status(400).json({ error: 'No Flarial config uploaded.' });
    const original = req.file.originalname || 'imported-flarial.json';
    if (!original.toLowerCase().endsWith('.json')) {
      await fs.remove(req.file.path);
      return res.status(400).json({ error: 'Please upload a Flarial .json config file.' });
    }

    const text = await fs.readFile(req.file.path, 'utf8');
    const parsed = parseJsonConfig(text);
    const valueCount = flattenJsonLeaves(parsed).length;
    if (!valueCount) {
      await fs.remove(req.file.path);
      return res.status(400).json({ error: 'The uploaded file does not look like a valid Flarial config.' });
    }

    const fileName = safeFlarialImportName(req.body.targetName || original);
    const validation = await validateFlarialFileImport(basePath, text, fileName);
    assertImportAllowed(validation);
    const destinationPath = getFlarialProfilePath(basePath, fileName);
    const backup = req.body.backup !== 'false'
      ? await createBackup(basePath, ['__all__'], `before_import_${fileName.replace(/\.json$/i, '')}`, 'flarial')
      : null;
    await writeOptionsFile(destinationPath, stableJson(parsed));
    await fs.remove(req.file.path);
    res.json({ imported: true, fileName, path: destinationPath, valueCount, backup, validation });
  } catch (error) {
    if (req.file?.path) await fs.remove(req.file.path).catch(() => {});
    next(error);
  }
});

app.post('/api/import/file', upload.single('config'), async (req, res, next) => {
  try {
    const configType = configTypeFrom(req.body.configType);
    const basePath = await requireExistingBase(req.body.basePath || defaultPathFor(configType), configType);
    if (!req.file) return res.status(400).json({ error: 'No import file uploaded.' });

    const original = req.file.originalname || (configType === 'flarial' ? 'imported.json' : 'options.txt');
    const text = await fs.readFile(req.file.path, 'utf8');

    if (configType === 'flarial') {
      if (!original.toLowerCase().endsWith('.json')) return res.status(400).json({ error: 'Please upload a Flarial .json config file.' });
      const parsed = parseJsonConfig(text);
      const valueCount = flattenJsonLeaves(parsed).length;
      if (!valueCount) return res.status(400).json({ error: 'The uploaded file does not look like a valid Flarial config.' });
      const fileName = safeFlarialImportName(req.body.targetName || original);
      const validation = await validateFlarialFileImport(basePath, text, fileName);
      assertImportAllowed(validation);
      const backup = req.body.backup !== 'false'
        ? await createBackup(basePath, ['__all__'], `before_import_${fileName.replace(/\.json$/i, '')}`, 'flarial')
        : null;
      const destinationPath = getFlarialProfilePath(basePath, fileName);
      await writeOptionsFile(destinationPath, stableJson(parsed));
      return res.json({ imported: true, configType, fileName, path: destinationPath, valueCount, backup, validation });
    }

    if (original.toLowerCase() !== 'options.txt') return res.status(400).json({ error: 'Please upload a file named options.txt.' });
    const accountId = await requireAccountFolder(basePath, req.body.accountId, 'Target account');
    const parsed = parseOptions(text);
    const optionCount = Object.keys(parsed.map).length;
    if (!optionCount) return res.status(400).json({ error: 'The uploaded file does not look like a valid options.txt file.' });
    const validation = await validateVanillaFileImport(basePath, text, accountId);
    assertImportAllowed(validation);
    const backup = req.body.backup !== 'false'
      ? await createBackup(basePath, [accountId], `before_import_${accountId}`, 'vanilla')
      : null;
    const destinationPath = getOptionsPath(basePath, accountId);
    await writeOptionsFile(destinationPath, serializeOptions(parsed.entries));
    res.json({ imported: true, configType, accountId, path: destinationPath, optionCount, backup, validation });
  } catch (error) {
    next(error);
  } finally {
    if (req.file?.path) await fs.remove(req.file.path).catch(() => {});
  }
});

function importRelativeName(file) {
  return String(file.originalname || file.filename || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function vanillaFolderAccountId(relativeName) {
  const parts = relativeName.split('/').filter(Boolean);
  const numeric = parts.find((part) => isNumericAccountFolder(part));
  if (!numeric) return null;
  if (path.basename(relativeName).toLowerCase() !== 'options.txt') return null;
  return numeric;
}

function flarialFolderDestination(relativeName) {
  const parts = relativeName.split('/').filter(Boolean);
  if (!parts.length) return null;
  const legacyIndex = parts.findIndex((part) => part.toLowerCase() === 'legacy');
  if (legacyIndex !== -1) return parts.slice(legacyIndex).join('/');
  const baseName = parts[parts.length - 1];
  if (isFlarialProfileFile(baseName) || /\.json\.bak$/i.test(baseName)) return baseName;
  return null;
}

app.post('/api/import/folder', upload.any(), async (req, res, next) => {
  try {
    const configType = configTypeFrom(req.body.configType);
    const basePath = await requireExistingBase(req.body.basePath || defaultPathFor(configType), configType);
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No folder files uploaded.' });

    if (configType === 'flarial') {
      const profileImports = [];
      const copyItems = [];
      for (const file of files) {
        const relative = importRelativeName(file);
        const destinationRelative = flarialFolderDestination(relative);
        if (!destinationRelative) continue;
        copyItems.push({ file, destinationRelative });
        const baseName = path.basename(destinationRelative);
        if (isFlarialProfileFile(baseName)) {
          const text = await fs.readFile(file.path, 'utf8');
          const stats = flarialProfileStats(text);
          if (stats.valueCount) profileImports.push({ file, text, fileName: baseName, stats });
        }
      }
      if (!profileImports.length && !copyItems.length) return res.status(400).json({ error: 'The uploaded folder does not contain Flarial config files.' });

      const validations = [];
      for (const item of profileImports) {
        const validation = await validateFlarialFileImport(basePath, item.text, item.fileName);
        validations.push({ fileName: item.fileName, ...validation });
      }
      const blocked = validations.filter((validation) => !validation.ok);
      if (blocked.length) {
        const err = new Error('Folder import blocked because one or more Flarial profiles look older than the current Config folder.');
        err.status = 409;
        err.validation = importValidationResult({
          ok: false,
          title: 'Import blocked: folder contains older Flarial profile(s)',
          warnings: blocked.flatMap((entry) => [`${entry.fileName}: ${entry.title}`, ...entry.warnings]).slice(0, 20),
          advice: ['Do not import the whole folder. Import old configs as new profile names or export only selected modules/values into the current Flarial-generated config.']
        });
        throw err;
      }

      const backup = req.body.backup !== 'false'
        ? await createBackup(basePath, ['__all__'], 'before_folder_import', 'flarial')
        : null;
      const written = [];
      for (const item of copyItems) {
        const destinationPath = path.join(basePath, ...item.destinationRelative.split('/').filter(Boolean));
        await fs.ensureDir(path.dirname(destinationPath));
        if (isFlarialProfileFile(path.basename(destinationPath))) {
          const parsed = parseJsonConfig(await fs.readFile(item.file.path, 'utf8'));
          await writeOptionsFile(destinationPath, stableJson(parsed));
        } else {
          await fs.copy(item.file.path, destinationPath, { overwrite: true });
        }
        written.push(destinationPath);
      }
      return res.json({ imported: true, configType, written, backup, validations });
    }

    const imports = [];
    for (const file of files) {
      const relative = importRelativeName(file);
      const accountId = vanillaFolderAccountId(relative);
      if (!accountId) continue;
      const text = await fs.readFile(file.path, 'utf8');
      const stats = vanillaProfileStats(text);
      if (stats.keyCount) imports.push({ file, accountId, text, stats });
    }
    if (!imports.length) return res.status(400).json({ error: 'The uploaded folder does not contain Vanilla account options.txt files.' });

    const validations = [];
    for (const item of imports) {
      await requireAccountFolder(basePath, item.accountId, 'Target account');
      const validation = await validateVanillaFileImport(basePath, item.text, item.accountId);
      validations.push({ accountId: item.accountId, ...validation });
    }
    const blocked = validations.filter((validation) => !validation.ok);
    if (blocked.length) {
      const err = new Error('Folder import blocked because one or more Vanilla options.txt files look older than the current Users folder.');
      err.status = 409;
      err.validation = importValidationResult({
        ok: false,
        title: 'Import blocked: folder contains older Vanilla options.txt file(s)',
        warnings: blocked.flatMap((entry) => [`${entry.accountId}: ${entry.title}`, ...entry.warnings]).slice(0, 20),
        advice: ['Do not import the whole folder. Use the old folder as an uploaded source and sync only selected categories or keys into the current Minecraft-generated account folders.']
      });
      throw err;
    }

    const accountIds = [...new Set(imports.map((item) => item.accountId))];
    const backup = req.body.backup !== 'false'
      ? await createBackup(basePath, accountIds, 'before_folder_import', 'vanilla')
      : null;
    const written = [];
    for (const item of imports) {
      const parsed = parseOptions(item.text);
      const destinationPath = getOptionsPath(basePath, item.accountId);
      await writeOptionsFile(destinationPath, serializeOptions(parsed.entries));
      written.push(destinationPath);
    }
    res.json({ imported: true, configType, written, backup, validations });
  } catch (error) {
    next(error);
  } finally {
    for (const file of req.files || []) {
      await fs.remove(file.path).catch(() => {});
    }
  }
});

app.post('/api/backups', async (req, res, next) => {
  try {
    const configType = configTypeFrom(req.body.configType);
    const basePath = await requireExistingBase(req.body.basePath || defaultPathFor(configType), configType);
    const requestedIds = [...new Set(req.body.accountIds || [])].filter(Boolean).map(String);
    const expandedIds = await expandSpecialBackupIds(configType, requestedIds, basePath);
    const accountIds = expandedIds.map((id) => (
      configType === 'flarial' && id === '__all__' ? '__all__' : configType === 'flarial' ? requireFlarialProfileId(id) : requireAccountId(id)
    ));
    if (!accountIds.length) return res.status(400).json({ error: 'No accounts selected.' });
    if (!(configType === 'flarial' && accountIds.includes('__all__'))) {
      for (const id of accountIds) {
        if (configType === 'flarial') await requireFlarialProfile(basePath, id);
        else await requireAccountFolder(basePath, id);
      }
    }
    res.json({ backup: await createBackup(basePath, accountIds, req.body.label || 'manual', configType) });
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

app.post('/api/backups/:file/restore', async (req, res, next) => {
  const restoreId = crypto.randomUUID();
  const extractPath = path.join(UPLOAD_DIR, `restore-${restoreId}`);
  try {
    const configType = configTypeFrom(req.body.configType);
    const basePath = await requireExistingBase(req.body.basePath || defaultPathFor(configType), configType);
    const fileName = requireBackupFileName(req.params.file);
    const backupPath = path.join(BACKUP_DIR, fileName);
    if (!(await fs.pathExists(backupPath))) return res.status(404).json({ error: 'Backup not found.' });

    await extractZipArchive(backupPath, extractPath);
    let preRestoreBackup = null;
    let restored = [];

    if (configType === 'flarial') {
      const sourceRoot = await flarialBackupSourceRoot(extractPath);
      const validations = await validateFlarialFolderImport(basePath, sourceRoot);
      const blocked = validations.filter((validation) => !validation.ok);
      if (blocked.length) {
        const err = new Error('Backup restore blocked because the backup contains older Flarial profile data than the current Config folder.');
        err.status = 409;
        err.validation = importValidationResult({
          ok: false,
          title: 'Restore blocked: backup looks older than current Flarial config',
          warnings: blocked.flatMap((entry) => [`${entry.fileName}: ${entry.title}`, ...entry.warnings]).slice(0, 20),
          advice: ['Do not restore this backup over the active Flarial folder. Restore it into a separate folder manually, then import only the specific profile/modules/values you need.']
        });
        throw err;
      }
      preRestoreBackup = req.body.backup !== false
        ? await createBackup(basePath, ['__all__'], `before_restore_${fileName.replace(/\.zip$/i, '')}`, 'flarial')
        : null;
      restored = await restoreFlarialBackup(extractPath, basePath);
    } else {
      const vanillaEntries = (await fs.readdir(extractPath, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && isNumericAccountFolder(entry.name))
        .map((entry) => entry.name);
      if (!vanillaEntries.length) {
        const err = new Error('This backup does not contain Vanilla account options.');
        err.status = 400;
        throw err;
      }
      const validations = await validateVanillaFolderImport(basePath, extractPath);
      const blocked = validations.filter((validation) => !validation.ok);
      if (blocked.length) {
        const err = new Error('Backup restore blocked because the backup contains older Vanilla options than the current Users folder.');
        err.status = 409;
        err.validation = importValidationResult({
          ok: false,
          title: 'Restore blocked: backup looks older than current Vanilla options',
          warnings: blocked.flatMap((entry) => [`${entry.accountId}: ${entry.title}`, ...entry.warnings]).slice(0, 20),
          advice: ['Do not restore this backup over the active Users folder. Use it as a source and sync only selected categories or keys into the current Minecraft-generated options.txt files.']
        });
        throw err;
      }
      preRestoreBackup = req.body.backup !== false
        ? await createBackup(basePath, vanillaEntries, `before_restore_${fileName.replace(/\.zip$/i, '')}`, 'vanilla')
        : null;
      restored = await restoreVanillaBackup(extractPath, basePath);
    }

    res.json({ restored, preRestoreBackup, file: fileName, configType });
  } catch (error) {
    next(error);
  } finally {
    await fs.remove(extractPath).catch(() => {});
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
    const configType = configTypeFrom(req.body.configType);
    const basePath = requireSafeBase(req.body.basePath || defaultPathFor(configType));
    if (watcher) await watcher.close();
    watcher = chokidar.watch(configType === 'flarial' ? path.join(basePath, '*.json') : path.join(basePath, '*', 'games', 'com.mojang', 'minecraftpe', 'options.txt'), {
      ignoreInitial: true,
      depth: 6
    });
    res.json({ watching: true, basePath, configType });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  recordSessionError('request', error.message || 'Unexpected error.', {
    status: error.status || 500,
    validation: error.validation,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
  res.status(error.status || 500).json({ error: error.message || 'Unexpected error.', validation: error.validation });
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
