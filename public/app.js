const state = {
  basePath: '',
  accounts: [],
  uploadId: null,
  sourceOptions: [],
  minecraftRunning: false,
  errors: [],
  backups: [],
};

const $ = (id) => document.getElementById(id);

const CATEGORY_HELP = {
  graphics: 'Graphics settings control rendering, brightness, field of view, frame rate, UI scale, safe zone, particles, and visual quality. Sync these when you want accounts to look and perform the same.',
  audio: 'Audio settings control master volume and sound groups such as music, blocks, weather, players, hostile creatures, ambient sounds, and records.',
  controls: 'Control settings define camera sensitivity, touch controls, keyboard/gamepad behavior, auto-jump, sprint behavior, vibration, and related input preferences.',
  interface: 'Interface settings control chat, language, HUD, screen layout, safe-zone behavior, and other visible UI preferences.',
  other: 'Other settings are gameplay or client preferences that are not clearly graphics, audio, controls, interface, or account identity data.',
};

const OPTION_HELP = {
  game_difficulty_new: 'Stores the selected game difficulty used by the client.',
  game_thirdperson: 'Stores camera perspective: first person, third person back, or third person front.',
  game_language: 'Stores the selected in-game language.',
  game_skintypefull: 'Stores the identifier of the currently selected skin.',
  game_lastcustomskinnew: 'Stores data for the most recently used custom skin.',
  game_recentskin1: 'Stores a recently used skin reference.',
  game_recentskin2: 'Stores a recently used skin reference.',
  game_recentskin3: 'Stores a recently used skin reference.',
  ctrl_interactionModel: 'Selects the touch interaction model, such as joystick with tap-to-interact or crosshair interaction.',
  ctrl_sprintonmovement: 'Controls whether movement input can trigger sprinting on touch controls.',
  ctrl_moveStickVisible: 'Controls whether the movement joystick is visible on touch controls.',
  ctrl_defaultMoveStickVisible: 'Controls whether the touch movement stick is always visible by default.',
  ctrl_creativeDelayedBlockBreaking: 'Toggles delayed block breaking behavior in Creative mode for touch controls.',
  ctrl_enableNewTouchControlSchemes: 'Toggles newer touch-control layouts and behavior.',
  ctrl_swapjumpandsneak: 'Swaps the jump and sneak buttons.',
  ctrl_sensitivity: 'Controls camera/look sensitivity.',
  ctrl_invertmouse: 'Inverts vertical camera movement.',
  ctrl_usetouchscreen: 'Stores whether touch-screen controls are used.',
  ctrl_autojump: 'Toggles auto-jump.',
  ctrl_keyboardlayout: 'Stores the keyboard layout mapping, such as QWERTY, QWERTZ, AZERTY, or QZERTY.',
  ctrl_gamePadMap: 'Stores gamepad button mapping data.',
  feedback_vibration: 'Controls vibration feedback, such as feedback when breaking blocks.',
  gfx_dpadscale: 'Controls the size of the touch D-pad.',
  gfx_alwayshighlighthoveringboxincrosshair: 'Controls whether blocks are always highlighted by the crosshair in touch crosshair mode.',
  gfx_showActionButton: 'Controls whether touch action buttons are shown for interacting with blocks and entities.',
  gfx_showBlockSelectButton: 'Controls whether the pick-block button appears in touch controls.',
  gfx_showToggleCameraPerspectiveButton: 'Controls whether touch controls show a button for switching camera perspective.',
  gfx_thumbstickopacity: 'Controls opacity of the touch thumbstick.',
  gfx_wysiwygX: 'Stores horizontal placement for a touch-control layout element.',
  gfx_wysiwygY: 'Stores vertical placement for a touch-control layout element.',
  gfx_wysiwygScale: 'Stores scale for a touch-control layout element.',
  gfx_viewdistance: 'Controls render distance in blocks.',
  gfx_renderdistance: 'Legacy render-distance slider value.',
  gfx_renderdistance_new: 'Controls render distance in newer Bedrock versions.',
  gfx_particleviewdistance: 'Controls how far away particles are rendered.',
  gfx_viewbobbing: 'Toggles camera bobbing while moving.',
  gfx_transparentleaves: 'Toggles transparent leaves.',
  gfx_vr_transparentleaves: 'Toggles transparent leaves while using VR.',
  gfx_smoothlighting: 'Toggles smooth lighting.',
  gfx_vr_smoothlighting: 'Toggles smooth lighting while using VR.',
  gfx_fancyskies: 'Controls whether sky details such as sun, moon, clouds, stars, and sky colors are visible.',
  gfx_field_of_view: 'Controls field of view in degrees.',
  gfx_msaa: 'Controls multisample anti-aliasing level.',
  gfx_texel_aa: 'Controls texel anti-aliasing in older versions.',
  gfx_texel_aa_2: 'Controls texel anti-aliasing in newer versions.',
  gfx_gamma: 'Controls screen brightness.',
  gfx_multithreaded_renderer: 'Controls whether rendering can use multiple threads.',
  gfx_vsync: 'Toggles vertical synchronization.',
  gfx_max_framerate: 'Controls maximum frame rate; zero usually means unlimited.',
  gfx_fullscreen: 'Toggles fullscreen mode.',
  gfx_guiscale: 'Controls UI scale in older Bedrock versions.',
  gfx_guiscale_offset: 'Adjusts UI scale relative to the game default.',
  gfx_splitscreen_guiscale_offset: 'Adjusts UI scale for split-screen layouts.',
  gfx_safe_zone_x: 'Controls horizontal screen safe-zone scaling.',
  gfx_safe_zone_y: 'Controls vertical screen safe-zone scaling.',
  gfx_safe_zone_all: 'Controls overall safe-zone scaling.',
  gfx_safe_zone_pos_x: 'Controls horizontal safe-zone position.',
  gfx_safe_zone_pos_y: 'Controls vertical safe-zone position.',
  gfx_ui_profile: 'Chooses Pocket UI or Classic UI style.',
  gfx_hidegui: 'Toggles whether the HUD and player hand are hidden.',
  gfx_pixeldensity: 'Legacy option controlling D-pad and chat-button size.',
  gfx_animatetextures: 'Legacy option for animated water, lava, and fire textures.',
  gfx_ao: 'Legacy smooth-lighting option.',
  show_advanced_video_settings: 'Controls whether advanced video settings are shown.',
  audio_main: 'Controls overall game audio volume.',
  audio_sound: 'Controls sound-effect volume.',
  audio_music: 'Controls music volume.',
  audio_ambient: 'Controls ambient and environmental sound volume.',
  audio_block: 'Controls block sound volume.',
  audio_hostile: 'Controls hostile creature sound volume.',
  audio_neutral: 'Controls friendly or neutral creature sound volume.',
  audio_record: 'Controls jukebox and note block sound volume.',
  audio_player: 'Controls player sound volume.',
  audio_weather: 'Controls weather sound volume.',
  vr_cameraMovement: 'Controls a VR camera movement preference.',
  vr_stutter_turn: 'Controls a VR turn movement preference.',
  vr_head_steering: 'Controls a VR head-steering preference.',
  vr_stereo: 'Controls a VR stereo rendering preference.',
};

Object.assign(OPTION_HELP, {
  ctrl_restoreInteractionModelToClassic: 'Restores the touch interaction model to the classic control style.',
  ctrl_top_button_scale: 'Controls the scale of the top touch-control button area.',
  ctrl_islefthanded: 'Toggles a left-handed touch-control layout.',
  ctrl_joystickVisibility: 'Controls when the touch joystick is visible.',
  ctrl_staticJoystick: 'Keeps the touch joystick anchored instead of appearing dynamically.',
  ctrl_usetouchjoypad: 'Toggles the touch joypad control layout.',
  ctrl_clear_hotbar: 'Controls the clear-hotbar action preference.',
  ctrl_hotbarOnlyTouch: 'Restricts hotbar interaction behavior for touch controls.',
  ctrl_fullkeyboardgameplay: 'Enables keyboard-only gameplay behavior for supported controls.',
  ctrl_smoothrotationspeed: 'Controls smoothing speed for camera rotation.',
  ctrl_dwellbeforedragtime: 'Sets how long touch input must dwell before starting a drag.',
  ctrl_stacksplittingtriggertime: 'Sets how long touch input must hold before stack splitting starts.',
  ctrl_resetOnStart: 'Resets touch-control customization at startup when enabled.',
  ctrl_improvedInputResponse: 'Toggles an improved input-response mode.',
  game_ackautosave: 'Records whether the autosave message has been acknowledged.',
  game_tips_enabled: 'Controls whether gameplay tips are enabled.',
  game_tips_enabled_for_debug: 'Debug flag for gameplay tips.',
  game_tips_animation_enabled: 'Controls animations used by gameplay tips.',
  game_shownplatformnetworkconnect: 'Records whether the platform network connection message has been shown.',
  game_shownplatformpremiumupsell: 'Records whether the platform premium upsell has been shown.',
  day_one_experience_completed: 'Records whether the first-run experience has been completed.',
  is_legacy_player: 'Records whether the profile is treated as a legacy player.',
  pause_feature_enabled: 'Controls whether the pause feature is enabled.',
  pause_menu_on_focus_lost: 'Controls whether the game pauses when focus is lost.',
  dvce_filestoragelocation: 'Stores the selected device file-storage location.',
  allow_cellular_data: 'Controls whether cellular data can be used.',
  auto_update_mode: 'Stores the selected automatic update mode.',
  auto_update_enabled: 'Controls whether automatic updates are enabled.',
  websockets_enabled: 'Controls whether websocket connections are enabled.',
  websocket_encryption: 'Controls whether websocket traffic uses encryption.',
  crossplatform_toggle: 'Controls cross-platform multiplayer availability.',
  camera_shake: 'Toggles camera shake effects.',
  hide_endflash: 'Toggles the End dimension flash visual effect.',
  darkness_effect_modifier: 'Controls the strength of the darkness visual effect.',
  glint_strength: 'Controls enchantment glint intensity.',
  glint_speed: 'Controls enchantment glint animation speed.',
  filter_profanity: 'Toggles profanity filtering.',
  only_show_trusted_skins: 'Controls whether only trusted skins are shown.',
  do_not_show_multiplayer_online_safety_warning: 'Suppresses the online multiplayer safety warning.',
  do_not_show_multiplayer_ip_safety_warning: 'Suppresses the external server/IP safety warning.',
  do_not_show_worlds_without_entitlement_warning: 'Suppresses the warning for worlds without entitlement.',
  do_not_show_old_worlds_warning: 'Suppresses the warning for older worlds.',
  do_not_hardcore_mode_warning: 'Suppresses the hardcore-mode warning.',
  do_not_show_using_external_storage_warning: 'Suppresses the external-storage warning.',
  do_not_show_hidden_local_worlds_warning: 'Suppresses the hidden local worlds warning.',
  do_not_show_addon_stacking_warning: 'Suppresses the add-on stacking warning.',
  do_not_show_slow_connection_warning: 'Suppresses the slow connection warning.',
  do_not_show_friends_list_ftue: 'Suppresses the friends-list first-time user experience.',
  text_to_speech_discovered: 'Records whether text-to-speech support has been discovered.',
  monitor_platform_text_to_speech: 'Controls monitoring of platform text-to-speech availability.',
  enable_gameplay_subtitles: 'Toggles gameplay subtitles.',
  chat_text_to_speech: 'Toggles chat text-to-speech.',
  ui_text_to_speech: 'Toggles UI text-to-speech.',
  open_chat_message: 'Controls whether the open-chat message is shown.',
  audio_texttospeech: 'Controls text-to-speech audio behavior.',
  chat_color_code: 'Stores the default chat text color code.',
  chat_font_size: 'Controls chat font size.',
  chat_line_spacing: 'Controls spacing between chat lines.',
  chat_mentions_color_code: 'Stores the color code used for chat mentions.',
  chat_typeface: 'Stores the selected chat typeface.',
  chat_message_duration: 'Controls how long chat messages stay visible.',
  toast_notification_duration: 'Controls how long toast notifications stay visible.',
  emoteChat: 'Controls whether emotes can appear in chat.',
  screen_animations: 'Toggles UI screen animations.',
  content_log_file: 'Controls writing content log output to a file.',
  content_log_gui: 'Controls whether content log output appears in the GUI.',
  content_log_gui_level: 'Sets the verbosity level for GUI content logs.',
  content_log_gui_show_on_errors: 'Shows the content log GUI automatically when content errors occur.',
  store_has_purchased_coins: 'Records whether the store has seen a Minecoin purchase on this profile.',
  switch_coin_debug: 'Debug flag for Nintendo Switch coin/store behavior.',
  playfab_commerce_enabled: 'Controls PlayFab commerce availability.',
  iap_owning_account: 'Stores the account used for in-app purchase ownership checks.',
  manuallyTrackedAchievements: 'Stores achievement tracking state managed by the client.',
  startup_statistics: 'Controls or records client startup statistics behavior.',
  app_launched_count: 'Stores how many times the app has launched.',
  loading_tips_index: 'Stores the current loading-tip rotation index.',
  nether_reached: 'Records whether the Nether has been reached.',
  has_dismissed_new_player_flow: 'Records whether the new-player flow has been dismissed.',
  new_player_flow_v3_abc_test_group: 'Stores the assigned new-player-flow experiment group.',
  new_player_path_tutorial_mode_ab_test_group: 'Stores the assigned tutorial-path experiment group.',
  options_version_major: 'Stores the options-file major version.',
  options_version_minor: 'Stores the options-file minor version.',
  options_version_patch: 'Stores the options-file patch version.',
  options_version_revision: 'Stores the options-file revision version.',
  old_game_version_major: 'Stores the previous major game version used by this profile.',
  old_game_version_minor: 'Stores the previous minor game version used by this profile.',
  old_game_version_patch: 'Stores the previous patch game version used by this profile.',
  old_game_version_revision: 'Stores the previous revision game version used by this profile.',
  old_game_version_beta: 'Stores whether the previous game version was a beta version.',
  gfx_damagebobbing: 'Toggles camera bobbing when damage is taken.',
  gfx_toggleclouds: 'Toggles cloud rendering.',
  gfx_hidepaperdoll: 'Toggles the on-screen paper doll player preview.',
  gfx_tooltips: 'Toggles item/control tooltips.',
  gfx_classic_box_selection: 'Toggles the classic block selection outline.',
  gfx_splitscreen: 'Controls split-screen mode state.',
  gfx_hidehud: 'Toggles the heads-up display.',
  gfx_hidehand: 'Toggles rendering of the player hand.',
  gfx_ingame_player_names: 'Toggles in-game player name labels.',
  gfx_splitscreen_ingame_player_names: 'Toggles player name labels in split-screen.',
  gfx_interface_opacity: 'Controls HUD/interface opacity.',
  gfx_splitscreen_interface_opacity: 'Controls HUD/interface opacity in split-screen.',
  gfx_hud_text_background_opacity: 'Controls opacity behind HUD text.',
  gfx_actionbar_text_background_opacity: 'Controls opacity behind actionbar text.',
  gfx_chat_background_opacity: 'Controls chat background opacity.',
  gfx_showautosaveicon: 'Toggles the autosave icon.',
  gfx_has_set_safe_zone: 'Records whether the safe zone has been configured.',
  gfx_field_of_view_toggle: 'Controls whether FOV changes are enabled.',
  gfx_gamepad_cursor: 'Toggles the gamepad cursor.',
  gfx_gamepad_cursor_sensitivity: 'Controls gamepad cursor sensitivity.',
  gfx_bubble_particles: 'Toggles bubble particle rendering.',
  gfx_gui_accessibility_scaling: 'Toggles accessibility UI scaling.',
  gfx_upscaling: 'Toggles graphics upscaling.',
  gfx_resizableui: 'Toggles resizable UI behavior.',
  gfx_hotbarScale: 'Controls hotbar scale.',
  graphics_mode: 'Stores the selected graphics mode.',
  graphics_api: 'Stores the selected graphics API.',
  graphics_quality_preset_mode: 'Stores the selected graphics quality preset.',
  graphics_mode_switch: 'Stores the graphics-mode switch state.',
  shadow_quality: 'Controls shadow quality.',
  cloud_quality: 'Controls cloud quality.',
  point_light_shadow_quality: 'Controls point-light shadow quality.',
  point_light_loding_quality: 'Controls point-light loading quality.',
  volumetric_fog_quality: 'Controls volumetric fog quality.',
  reflections_quality: 'Controls reflection quality.',
  bloom_strength: 'Controls bloom strength.',
  bloom_custom_strength: 'Controls custom bloom strength.',
  raytracing_viewdistance: 'Controls ray-tracing render distance.',
  deferred_viewdistance: 'Controls deferred-rendering view distance.',
  upscaling_percentage: 'Controls upscaling percentage.',
  upscaling_mode: 'Stores the selected upscaling mode.',
  target_resolution: 'Stores target rendering resolution.',
  texture_streaming: 'Toggles texture streaming.',
  frame_pacing_enabled: 'Toggles frame pacing.',
});

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function formatErrorEntry(error) {
  const lines = [
    `[${new Date(error.createdAt).toLocaleString()}] ${error.type}`,
    error.message,
  ];

  if (error.details) {
    Object.entries(error.details)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .forEach(([key, value]) => lines.push(`${key}: ${value}`));
  }

  if (error.id) lines.push(`errorId: ${error.id}`);
  return lines.join('\n');
}

function renderErrorDump({ open = false } = {}) {
  const dock = $('errorDumpDock');
  const panel = $('errorDumpPanel');
  const count = $('errorDumpCount');
  const output = $('errorDumpOutput');
  if (!dock || !panel || !count || !output) return;

  const total = state.errors.length;
  dock.classList.toggle('hidden', total === 0);
  count.textContent = String(total);
  output.textContent = total
    ? state.errors.map(formatErrorEntry).join('\n\n---\n\n')
    : 'No errors in this session.';

  if (open && total > 0) panel.classList.remove('hidden');
  if (total === 0) panel.classList.add('hidden');
}

async function loadErrors({ open = false, silent = false } = {}) {
  const data = await api('/api/errors');
  state.errors = data.errors || [];
  renderErrorDump({ open });
  if (!silent && state.errors.length) toast('Error dump updated', `${state.errors.length} session error(s) stored.`, 'warn');
}

async function clearErrors() {
  await api('/api/errors', { method: 'DELETE' });
  state.errors = [];
  renderErrorDump();
  toast('Error dump cleared', 'Session errors were removed.', 'ok');
}

function selectedMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function selectedModeLabel() {
  return {
    full: 'Full file',
    categories: 'Categories',
    keys: 'Specific keys',
  }[selectedMode()] || 'Full file';
}

function selectedSourceType() {
  return document.querySelector('input[name="sourceType"]:checked').value;
}

function selectedDestinationIds() {
  return [...document.querySelectorAll('.account-check:checked')].map((input) => input.value);
}

function fastTargetIds() {
  return [...$('fastTargets').selectedOptions].map((option) => option.value);
}

function setFastTargets(checked) {
  [...$('fastTargets').options].forEach((option) => {
    option.selected = checked;
  });
  updateSelectedCount();
}

function isFastModeActive() {
  return !$('fastPanel').classList.contains('hidden') && $('advancedView').classList.contains('hidden');
}

function activeDestinationIds() {
  if (isFastModeActive()) {
    const sourceId = $('sourceAccount').value;
    return fastTargetIds().filter((id) => id !== sourceId);
  }

  const ids = selectedDestinationIds();
  const sourceId = $('advancedSourceAccount').value;
  return ids.filter((id) => selectedSourceType() !== 'account' || id !== sourceId);
}

function backupScopeIds() {
  if ($('backupScope')?.value === 'all') {
    return state.accounts.filter((account) => account.hasOptions).map((account) => account.id);
  }
  return selectedDestinationIds();
}

function setRadioValue(name, value) {
  const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (input) input.checked = true;
}

function toast(title, message = '', type = 'info') {
  const root = $('toastRoot');
  if (!root) return;
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.innerHTML = `<strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ''}`;
  root.appendChild(item);
  window.setTimeout(() => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(8px)';
    window.setTimeout(() => item.remove(), 220);
  }, type === 'err' ? 7600 : 5600);
}

function sourcePayload() {
  if (isFastModeActive()) return { type: 'account', accountId: $('sourceAccount').value };
  if (selectedSourceType() === 'upload') return { type: 'upload', uploadId: state.uploadId };
  return { type: 'account', accountId: $('advancedSourceAccount').value };
}

function syncPayload() {
  if (isFastModeActive()) {
    return {
      basePath: state.basePath,
      source: { type: 'account', accountId: $('sourceAccount').value },
      destinationIds: activeDestinationIds(),
      mode: 'full',
      backup: true,
      categories: [],
      keys: [],
    };
  }

  return {
    basePath: state.basePath,
    source: sourcePayload(),
    destinationIds: activeDestinationIds(),
    mode: selectedMode(),
    backup: $('backupToggle').checked,
    categories: [...document.querySelectorAll('#categoryPicker input:checked')].map((input) => input.value),
    keys: [...document.querySelectorAll('#keys input:checked')].map((input) => input.value),
  };
}

function validatePayload(payload, { previewOnly = false } = {}) {
  if (!state.basePath) throw new Error('Minecraft Users folder is missing.');
  if (!state.accounts.length) throw new Error('No accounts found. Check the Users folder in Advanced Mode.');
  if (payload.source.type === 'account' && !payload.source.accountId) throw new Error('Select a base account first.');
  if (payload.source.type === 'upload' && !payload.source.uploadId) throw new Error('Upload an options.txt file first.');
  if (!payload.destinationIds.length) throw new Error('Select at least one target account.');
  if (payload.destinationIds.includes(payload.source.accountId)) throw new Error('The base account cannot also be a target.');
  if (payload.mode === 'categories' && !payload.categories.length) throw new Error('Select at least one category.');
  if (payload.mode === 'keys' && !payload.keys.length) throw new Error('Select at least one key.');
  if (!previewOnly && payload.backup !== false && !payload.destinationIds.length) throw new Error('Backup requires at least one target account.');
}

function updateSelectedCount() {
  const selectedCount = $('selectedCount');
  const count = activeDestinationIds().length;
  if (selectedCount) selectedCount.textContent = String(count);
  const fastTargetCount = $('fastTargetCount');
  if (fastTargetCount) fastTargetCount.textContent = `${count} target${count === 1 ? '' : 's'}`;
  $('fastSyncBtn').disabled = !state.accounts.length || !$('sourceAccount').value || count === 0;
  $('syncBtn').disabled = !state.accounts.length || count === 0;
  const backupTargetTotal = $('backupTargetTotal');
  if (backupTargetTotal) backupTargetTotal.textContent = String(backupScopeIds().length);
  if ($('backupBtn')) $('backupBtn').disabled = !state.accounts.length || backupScopeIds().length === 0;
  renderAdvancedSummary();
  renderFastTargetSummary();
}

function renderAdvancedSummary() {
  const sourceSummary = $('advancedSourceSummary');
  const modeSummary = $('advancedModeSummary');
  const backupSummary = $('advancedBackupSummary');
  if (sourceSummary) sourceSummary.textContent = selectedSourceType() === 'upload' ? 'Upload' : 'Account';
  if (modeSummary) modeSummary.textContent = selectedModeLabel();
  if (backupSummary) {
    backupSummary.textContent = $('backupToggle').checked ? 'Backup on' : 'Backup off';
    backupSummary.classList.toggle('ok', $('backupToggle').checked);
    backupSummary.classList.toggle('missing', !$('backupToggle').checked);
  }
}

function showView(name) {
  $('homeView').classList.toggle('hidden', name !== 'home');
  $('advancedView').classList.toggle('hidden', name !== 'advanced');
  updateSelectedCount();
  if (name === 'advanced') toast('Advanced Mode opened', 'Manual sync settings are available here.');
}

function writeOutput(message) {
  if ($('fastPreview')) $('fastPreview').textContent = message;
  if ($('advancedPreview')) $('advancedPreview').textContent = message;
}

function renderAccounts() {
  const accountCount = $('accountCount');
  if (accountCount) accountCount.textContent = String(state.accounts.length);
  $('accounts').innerHTML = state.accounts.map((account) => `
    <label class="account">
      <input class="account-check" type="checkbox" value="${account.id}" ${account.hasOptions ? 'checked' : ''}>
      <span>
        <strong>${escapeHtml(account.displayName)}</strong>
        <small>${accountDetail(account)}</small>
      </span>
      <span class="badge ${account.isLikelyActive ? 'active' : account.hasOptions ? 'ok' : 'missing'}">${account.isLikelyActive ? 'Likely active' : account.hasOptions ? 'Ready' : 'Missing'}</span>
    </label>
  `).join('');

  const sourceOptions = state.accounts
    .filter((account) => account.hasOptions)
    .map((account) => `<option value="${account.id}">${escapeHtml(account.displayName)}</option>`)
    .join('');
  $('sourceAccount').innerHTML = sourceOptions;
  $('advancedSourceAccount').innerHTML = sourceOptions;
  renderFastTargets();
  document.querySelectorAll('.account-check').forEach((input) => input.addEventListener('change', updateSelectedCount));
  updateSelectedCount();
}

function renderFastTargets() {
  const sourceId = $('sourceAccount').value;
  $('fastTargets').innerHTML = state.accounts
    .filter((account) => account.id !== sourceId)
    .map((account) => `<option value="${account.id}" selected>${escapeHtml(account.displayName)}</option>`)
    .join('');
  renderFastTargetSummary();
}

function renderFastTargetSummary() {
  const targetSummary = $('fastTargetSummary');
  if (!targetSummary) return;

  const selectedIds = new Set(fastTargetIds());
  const selectedAccounts = state.accounts.filter((account) => selectedIds.has(account.id));
  if (!selectedAccounts.length) {
    targetSummary.innerHTML = `
      <span class="fast-empty">No targets selected</span>
      <button class="mini-link" type="button" data-fast-targets="all">All</button>
    `;
    bindFastSummaryActions();
    return;
  }

  targetSummary.innerHTML = `
    <button class="mini-link" type="button" data-fast-targets="all">All</button>
    <button class="mini-link" type="button" data-fast-targets="none">None</button>
  ` + selectedAccounts
    .slice(0, 5)
    .map((account) => `<span class="fast-chip">${escapeHtml(account.displayName)}</span>`)
    .join('');

  if (selectedAccounts.length > 5) {
    targetSummary.innerHTML += `<span class="fast-chip muted">+${selectedAccounts.length - 5} more</span>`;
  }
  bindFastSummaryActions();
}

function bindFastSummaryActions() {
  document.querySelectorAll('[data-fast-targets]').forEach((button) => {
    button.addEventListener('click', () => setFastTargets(button.dataset.fastTargets === 'all'));
  });
}

function applyAutoDefaults() {
  setRadioValue('sourceType', 'account');
  setRadioValue('mode', 'full');
  $('backupToggle').checked = true;
  document.querySelectorAll('.account-check').forEach((input) => {
    const account = state.accounts.find((item) => item.id === input.value);
    input.checked = Boolean(account?.hasOptions);
  });
  renderFastTargets();
  updateSourceVisibility();
  updateModeVisibility();
  updateSelectedCount();
}

async function loadAccounts({ preserveOutput = false } = {}) {
  state.basePath = $('basePath').value.trim();
  toast('Loading accounts', 'Scanning the Minecraft Bedrock Users folder.');
  const data = await api(`/api/accounts?basePath=${encodeURIComponent(state.basePath)}`);
  state.basePath = data.basePath;
  state.accounts = data.accounts;
  state.minecraftRunning = Boolean(data.minecraftRunning);
  $('basePath').value = data.basePath;
  renderAccounts();
  applyAutoDefaults();
  await loadSourceOptions();
  await loadBackups({ silent: true });
  const message = state.accounts.length
    ? `Ready. Found ${state.accounts.length} account(s). The most recently used profile data is marked as likely active.`
    : 'No numeric account folders were found. Open Advanced Mode and check the Users folder.';
  $('homeStatus').innerHTML = state.accounts.length
    ? `Ready. Found <button class="inline-link" type="button" data-open-users-folder>${state.accounts.length} account(s)</button>.`
    : escapeHtml(message);
  $('openUsersFolderBtn').classList.toggle('hidden', !state.accounts.length);
  bindOpenFolderLinks();
  if (!preserveOutput) writeOutput(message);
  toast(state.accounts.length ? 'Accounts loaded' : 'No accounts found', state.accounts.length ? `${state.accounts.length} account(s) ready.` : 'Check the Users folder in Advanced Mode.', state.accounts.length ? 'ok' : 'warn');
}

function bindOpenFolderLinks() {
  document.querySelectorAll('[data-open-users-folder]').forEach((button) => {
    button.addEventListener('click', () => openUsersFolder().catch(showError));
  });
}

async function openUsersFolder() {
  if (!state.basePath) throw new Error('Minecraft Users folder is missing.');
  await api(`/api/open-users-folder?basePath=${encodeURIComponent(state.basePath)}`);
  toast('Users folder opened', state.basePath, 'ok');
}

async function loadSourceOptions() {
  const advancedVisible = !$('advancedView').classList.contains('hidden');
  const sourceId = advancedVisible ? $('advancedSourceAccount').value : $('sourceAccount').value;
  if (!sourceId) {
    state.sourceOptions = [];
    renderKeys();
    return;
  }
  const data = await api(`/api/accounts/${encodeURIComponent(sourceId)}/options?basePath=${encodeURIComponent(state.basePath)}`);
  state.sourceOptions = data.options;
  renderKeys();
}

function renderKeys() {
  const filter = $('keyFilter').value.trim().toLowerCase();
  const options = state.sourceOptions.filter((option) => {
    const haystack = `${option.key} ${option.category}`.toLowerCase();
    return haystack.includes(filter);
  });
  $('keys').innerHTML = options.map((option) => `
    <label class="key-row ${option.syncable === false ? 'locked' : ''}" tabindex="0" data-option-key="${escapeHtml(option.key)}" data-option-category="${escapeHtml(option.category)}" data-option-value="${escapeHtml(option.value)}" data-option-syncable="${option.syncable !== false}">
      <input type="checkbox" value="${escapeHtml(option.key)}" ${option.syncable === false ? 'disabled' : ''}>
      <span>${escapeHtml(option.key)} <small>(${option.category}${option.syncable === false ? ', locked' : ''})</small></span>
      <input class="option-value-input" type="text" value="${escapeHtml(option.value)}" spellcheck="false" aria-label="Value for ${escapeHtml(option.key)}" ${option.syncable === false ? 'disabled' : ''}>
      <button class="option-save-button" type="button" data-save-option="${escapeHtml(option.key)}" ${option.syncable === false ? 'disabled' : ''}>Save</button>
    </label>
  `).join('');
}

function optionHelpText(option) {
  if (OPTION_HELP[option.key]) return OPTION_HELP[option.key];

  const key = option.key.toLowerCase();
  if (key === 'mp_username') return 'Stores the local multiplayer username field. It is account identity data and is locked in Option Sync.';
  if (/^mp_.*_visible$/i.test(key)) return 'Controls whether a specific multiplayer network or service is visible/available for this profile. It is locked to avoid copying account/network state.';
  if (/^(last_xuid|last_minecraft_id|last_title_account_id|iap_owning_account|xbl_)/i.test(key)) return 'Stores account identity, entitlement, or sign-in state. It is locked and never synced between accounts.';
  if (/^game_(haseverloggedintoxbl|haschosennottosignintoxbl|hasshownsocialdrawer)/i.test(key)) return 'Stores Xbox Live/social sign-in history for this profile. It is locked and never synced between accounts.';
  if (/^serverbound_client_diagnostics/i.test(key)) return 'Controls sending client diagnostics to servers or services. It is locked as account/network-related state.';
  const actionKey = key.match(/(?:ctrl_type|keyboard_type)_\d+_(?:key|container)\.([a-z0-9.]+)/i)?.[1];
  if (actionKey) return `Stores the key or button binding for the "${actionKey}" action. Numeric values are platform/input key codes; comma-separated values mean multiple accepted bindings.`;
  const commandMacro = key.match(/command_macro_command_(\d+)|commandmacro\.(\d+)/i);
  if (commandMacro) return `Stores command macro slot ${commandMacro[1] || commandMacro[2]}, used by configurable command shortcuts.`;
  const touchButton = key.match(/^gfx_(touchbutton|classicbutton)(\d+)(x|y|scale|opacity)$/i);
  if (touchButton) {
    const property = { x: 'horizontal position', y: 'vertical position', scale: 'size', opacity: 'opacity' }[touchButton[3].toLowerCase()];
    return `Controls touch layout button ${touchButton[2]} ${property}.`;
  }
  const touchStick = key.match(/^gfx_(movestick|altstick|touchdpad)(x|y|scale|opacity)$/i);
  if (touchStick) {
    const control = { movestick: 'movement stick', altstick: 'alternate/look stick', touchdpad: 'touch D-pad' }[touchStick[1].toLowerCase()];
    const property = { x: 'horizontal position', y: 'vertical position', scale: 'size', opacity: 'opacity' }[touchStick[2].toLowerCase()];
    return `Controls the ${control} ${property} in the customizable touch layout.`;
  }
  if (/^show_.*_tip_times_remain$/i.test(key)) return 'Stores how many times this onboarding control tip may still be shown.';
  if (/^feedback_.*_vibration_(mouse|touch|gamepad)$/i.test(key)) return 'Controls vibration feedback for the named input device and action.';
  if (/^ctrl_(sensitivity2|invertmouse|autojump|togglecrouch|spyglassdamp)_(mouse|touch|gamepad)$/i.test(key)) return 'Stores a per-device control setting for mouse, touch, or gamepad input.';
  if (/^realms/i.test(key) || key.includes('realms')) return 'Stores a Minecraft Realms UI, purchase, invite, offer, moderation, or migration state.';
  if (/^do_not_show/i.test(key) || key.includes('_warning')) return 'Stores whether a specific warning or first-time message should be suppressed.';
  if (/^script_debugger_/i.test(key)) return 'Configures the Bedrock scripting debugger connection, attachment mode, passcode, host, port, or timeout.';
  if (/^script_watchdog_/i.test(key)) return 'Configures script watchdog warnings and thresholds for slow, spiking, or hanging scripts.';
  if (/^device_info_/i.test(key)) return 'Overrides or configures client device information used for memory-tier behavior.';
  if (/^dev_/i.test(key) || key.includes('debug') || key.includes('validation') || key.includes('renderdoc')) return 'Developer or diagnostics option used for debugging, validation, hot reloading, tracing, or internal testing.';
  if (/^party/i.test(key)) return 'Stores party privacy, invite filtering, or invite privilege preferences.';
  if (/^editor_/i.test(key)) return 'Stores Minecraft Editor-related settings or telemetry collection preferences.';
  if (/^(store_|playfab_|iap_|switch_coin|ecomode|enable_braze|device_lost_telemetry)/i.test(key)) return 'Stores marketplace, commerce, telemetry, notification, or platform-service behavior.';
  if (/^(new_|has_|shown_|show_|old_|day_one|is_legacy|app_launched|loading_|nether_|save_and_quit)/i.test(key)) return 'Stores progression, onboarding, prompt, version, or first-run state used by the client UI.';
  if (key.includes('volume')) return 'Controls volume for a sound group or audio source.';
  if (key.includes('fov') || key.includes('field_of_view')) return 'Controls field of view and how wide the camera appears.';
  if (key.includes('safe_zone')) return 'Controls screen safe-zone placement or scale so UI elements stay inside the visible display area.';
  if (key.includes('guiscale') || key.includes('ui')) return 'Controls user interface layout, scale, or visual profile.';
  if (key.includes('sensitivity')) return 'Controls camera or input sensitivity.';
  if (key.includes('invert')) return 'Controls inverted input behavior.';
  if (key.includes('fullscreen')) return 'Controls fullscreen display behavior.';
  if (key.includes('vsync')) return 'Controls vertical synchronization to reduce tearing.';
  if (key.includes('framerate')) return 'Controls frame-rate limiting.';
  if (key.includes('render') || key.includes('viewdistance')) return 'Controls rendering distance or rendering behavior.';
  if (key.includes('chat')) return 'Controls chat display or chat interaction behavior.';
  if (key.includes('language')) return 'Controls the selected language.';
  if (key.includes('skin')) return 'Stores skin-related display preferences.';
  if (key.includes('cloud')) return 'Controls cloud rendering or cloud quality.';
  if (key.includes('shadow')) return 'Controls shadow rendering quality.';
  if (key.includes('bloom')) return 'Controls bloom post-processing strength.';
  if (key.includes('realm')) return 'Stores a Minecraft Realms state or preference.';

  return CATEGORY_HELP[option.category] || 'Stores a Minecraft Bedrock client preference from options.txt.';
}

async function saveOptionValue(key) {
  const source = sourcePayload();
  if (source.type !== 'account' || !source.accountId) {
    throw new Error('Only options from an account source can be edited.');
  }

  const row = [...document.querySelectorAll('[data-option-key]')].find((item) => item.dataset.optionKey === key);
  const input = row?.querySelector('.option-value-input');
  if (!input) throw new Error('Option value input was not found.');

  const data = await api(`/api/accounts/${encodeURIComponent(source.accountId)}/options`, {
    method: 'PATCH',
    body: JSON.stringify({ basePath: state.basePath, key, value: input.value }),
  });

  const option = state.sourceOptions.find((item) => item.key === key);
  if (option) option.value = data.value;
  row.dataset.optionValue = data.value;
  toast('Option saved', `${key} = ${valueText(data.value)}`, 'ok');
  await loadAccounts({ preserveOutput: true });
}

function showOptionPopover(target, option) {
  hideOptionPopover();
  const popover = document.createElement('div');
  popover.id = 'optionPopover';
  popover.className = 'option-popover';
  popover.innerHTML = `
    <strong>${escapeHtml(option.key)}</strong>
    <span>${escapeHtml(option.category)} category</span>
    <p>${escapeHtml(optionHelpText(option))}</p>
    <small>Current value: ${escapeHtml(valueText(option.value))}</small>
    ${option.syncable === false ? '<em>Locked: this option is never synced or edited by Option Sync.</em>' : ''}
  `;
  document.body.appendChild(popover);

  const targetRect = target.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const gap = 10;
  const top = Math.min(
    window.innerHeight - popoverRect.height - gap,
    Math.max(gap, targetRect.top + targetRect.height / 2 - popoverRect.height / 2)
  );
  const left = targetRect.right + popoverRect.width + gap < window.innerWidth
    ? targetRect.right + gap
    : Math.max(gap, targetRect.left - popoverRect.width - gap);

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}

function hideOptionPopover() {
  $('optionPopover')?.remove();
}

function optionFromPopoverTarget(target) {
  const key = target.dataset.optionKey;
  const category = target.dataset.optionCategory;
  const value = target.dataset.optionValue;
  const syncable = target.dataset.optionSyncable !== 'false';
  if (!key || !category) return null;
  return { key, category, value, syncable };
}

function bindOptionPopover() {
  const keys = $('keys');
  keys.addEventListener('click', (event) => {
    if (event.target.closest('.option-value-input')) {
      event.stopPropagation();
      return;
    }
    const saveButton = event.target.closest('[data-save-option]');
    if (!saveButton) return;
    event.preventDefault();
    event.stopPropagation();
    saveOptionValue(saveButton.dataset.saveOption).catch(showError);
  });
  keys.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !event.target.classList.contains('option-value-input')) return;
    event.preventDefault();
    const row = event.target.closest('[data-option-key]');
    if (row) saveOptionValue(row.dataset.optionKey).catch(showError);
  });
  keys.addEventListener('mouseover', (event) => {
    const target = event.target.closest('[data-option-key]');
    if (!target || !keys.contains(target)) return;
    const option = optionFromPopoverTarget(target);
    if (option) showOptionPopover(target, option);
  });
  keys.addEventListener('mouseout', (event) => {
    const target = event.target.closest('[data-option-key]');
    if (!target || target.contains(event.relatedTarget)) return;
    hideOptionPopover();
  });
  keys.addEventListener('focusin', (event) => {
    const target = event.target.closest('[data-option-key]');
    const option = target ? optionFromPopoverTarget(target) : null;
    if (target && option) showOptionPopover(target, option);
  });
  keys.addEventListener('focusout', hideOptionPopover);
}

async function uploadFile() {
  const file = $('uploadFile').files[0];
  if (!file) return;
  if (file.name.toLowerCase() !== 'options.txt') throw new Error('Please upload a file named options.txt.');
  const body = new FormData();
  body.append('options', file);
  const data = await api('/api/upload', { method: 'POST', body });
  state.uploadId = data.uploadId;
  $('uploadStatus').textContent = `${file.name} uploaded (${data.optionCount} options).`;
  toast('Upload ready', `${data.optionCount} options found.`, 'ok');
}

async function preview() {
  const payload = syncPayload();
  validatePayload(payload, { previewOnly: true });
  toast('Generating preview', `${payload.destinationIds.length} target account(s).`);
  const data = await api('/api/preview', { method: 'POST', body: JSON.stringify(payload) });
  if (!data.results.length) {
    writeOutput('No destination accounts selected.');
    return;
  }
  writeOutput(data.results.map((result) => {
    const changes = result.changes.slice(0, 20).map((change) =>
      `  ${change.key}: ${valueText(change.before)} -> ${valueText(change.after)}`
    );
    return `${result.accountId}: ${result.changes.length} change(s)\n${changes.join('\n') || '  no differences'}`;
  }).join('\n\n'));
  toast('Preview ready', 'Review the detected changes before syncing.', 'ok');
}

async function syncNow() {
  const payload = syncPayload();
  validatePayload(payload);
  toast('Sync started', `${payload.destinationIds.length} target account(s). Backup is ${payload.backup ? 'enabled' : 'off'}.`);
  writeOutput('Sync is running. Backups are created first when enabled.');
  const data = await api('/api/sync', { method: 'POST', body: JSON.stringify(payload) });
  const lines = [
    `Written: ${data.written.length}`,
    `Failed: ${data.failed.length}`,
    data.backup ? `Backup: ${data.backup.fileName}` : 'Backup: off',
    '',
    ...data.written.map((item) => `${item.accountId}: ${item.changes} change(s)`),
    ...data.failed.map((item) => `${item.accountId}: ${item.error}`),
  ];
  writeOutput(lines.join('\n'));
  if (data.failed.length) await loadErrors({ open: true, silent: true });
  toast(
    data.failed.length ? 'Sync completed with errors' : 'Sync complete',
    data.failed.length
      ? `${data.written.length} written, ${data.failed.length} failed. Details are in the session error dump.`
      : `${data.written.length} written, ${data.failed.length} failed.`,
    data.failed.length ? 'warn' : 'ok'
  );
  await loadAccounts({ preserveOutput: true });
}

async function createBackup() {
  const ids = backupScopeIds();
  if (!ids.length) throw new Error('Select at least one account to back up.');
  const label = $('backupLabel').value.trim() || 'manual';
  const data = await api('/api/backups', {
    method: 'POST',
    body: JSON.stringify({ basePath: state.basePath, accountIds: ids, label }),
  });
  writeOutput(`Backup created: ${data.backup.fileName}`);
  toast('Backup created', data.backup.fileName, 'ok');
  $('backupLabel').value = '';
  await loadBackups({ silent: true });
}

async function loadBackups({ silent = false } = {}) {
  const data = await api('/api/backups');
  state.backups = data.backups || [];
  renderBackups();
  if (!silent) toast('Backups refreshed', `${data.backups.length} backup(s) found.`, 'ok');
}

function renderBackups() {
  const backupCount = $('backupCount');
  const backupSummary = $('backupSummary');
  const backupTotal = $('backupTotal');
  const backupStorage = $('backupStorage');
  const filter = $('backupFilter') ? $('backupFilter').value.trim().toLowerCase() : '';
  const visibleBackups = state.backups.filter((backup) => {
    const haystack = `${backup.file} ${backup.label || ''}`.toLowerCase();
    return !filter || haystack.includes(filter);
  });
  const totalBytes = state.backups.reduce((sum, backup) => sum + Number(backup.bytes || 0), 0);
  if (backupCount) backupCount.textContent = String(state.backups.length);
  if (backupSummary) backupSummary.textContent = `${state.backups.length} backup${state.backups.length === 1 ? '' : 's'}`;
  if (backupTotal) backupTotal.textContent = String(state.backups.length);
  if (backupStorage) backupStorage.textContent = formatBytes(totalBytes);
  if ($('backupTargetTotal')) $('backupTargetTotal').textContent = String(backupScopeIds().length);
  if ($('deleteAllBackupsBtn')) $('deleteAllBackupsBtn').disabled = state.backups.length === 0;

  $('backups').innerHTML = visibleBackups.length
    ? visibleBackups.map((backup) => `
      <div class="backup-item">
        <div>
          <strong>${escapeHtml(backup.file)}</strong>
          <span>${escapeHtml(backup.label || 'backup')} | ${formatBytes(backup.bytes)} | ${new Date(backup.createdAt).toLocaleString()}</span>
        </div>
        <div class="backup-actions">
          <a href="/api/backups/${encodeURIComponent(backup.file)}">Download</a>
          <button type="button" data-delete-backup="${escapeHtml(backup.file)}">Delete</button>
        </div>
      </div>
    `).join('')
    : `<p class="status-text">${state.backups.length ? 'No backups match the current search.' : 'No backups yet.'}</p>`;
  bindBackupActions();
}

function bindBackupActions() {
  document.querySelectorAll('[data-delete-backup]').forEach((button) => {
    button.addEventListener('click', () => deleteBackup(button.dataset.deleteBackup).catch(showError));
  });
}

async function deleteBackup(fileName) {
  if (!fileName) return;
  const confirmed = window.confirm(`Delete backup?\n\n${fileName}`);
  if (!confirmed) return;
  const data = await api(`/api/backups/${encodeURIComponent(fileName)}`, { method: 'DELETE' });
  toast('Backup deleted', data.file, 'ok');
  await loadBackups({ silent: true });
}

async function deleteAllBackups() {
  if (!state.backups.length) return;
  const confirmed = window.confirm(`Delete all backups?\n\n${state.backups.length} backup file(s) will be removed.`);
  if (!confirmed) return;
  const data = await api('/api/backups', {
    method: 'DELETE',
    body: JSON.stringify({ files: state.backups.map((backup) => backup.file) }),
  });
  toast('Backups deleted', `${data.deleted.length} backup file(s) removed.`, 'ok');
  await loadBackups({ silent: true });
}

async function openBackupsFolder() {
  await api('/api/open-backups-folder', { method: 'POST' });
  toast('Backup folder opened', 'Local backup directory is available.', 'ok');
}

function openBackupModal() {
  $('backupModal').classList.remove('hidden');
  document.body.classList.add('modal-open');
  renderBackups();
  loadBackups({ silent: true }).catch(showError);
}

function closeBackupModal() {
  $('backupModal').classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function updateModeVisibility() {
  $('categoryPicker').classList.toggle('hidden', selectedMode() !== 'categories');
  $('keyPicker').classList.toggle('hidden', selectedMode() !== 'keys');
  renderAdvancedSummary();
}

function updateSourceVisibility() {
  const upload = selectedSourceType() === 'upload';
  $('advancedAccountSourceBlock').classList.toggle('hidden', upload);
  $('uploadBlock').classList.toggle('hidden', !upload);
  $('uploadStatus').classList.toggle('hidden', !upload);
  renderAdvancedSummary();
  updateSelectedCount();
}

function valueText(value) {
  if (value === null || value === undefined) return '<missing>';
  return String(value).slice(0, 80);
}

function accountDetail(account) {
  const parts = [`${account.optionCount} options`];
  if (account.xuid) parts.push(`XUID ${account.xuid}`);
  if (account.userData?.entFile) parts.push(account.userData.entFile);
  if (account.activityModifiedAt) parts.push(`activity ${new Date(account.activityModifiedAt).toLocaleString()}`);
  return escapeHtml(parts.join(' | '));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

async function init() {
  const defaults = await api('/api/default-path');
  $('basePath').value = defaults.path;
  $('fastModeBtn').addEventListener('click', () => {
    setRadioValue('sourceType', 'account');
    setRadioValue('mode', 'full');
    $('backupToggle').checked = true;
    renderFastTargets();
    updateSourceVisibility();
    updateModeVisibility();
    $('fastPanel').classList.toggle('hidden');
    showView('home');
    toast($('fastPanel').classList.contains('hidden') ? 'Fast Mode closed' : 'Fast Mode ready', $('fastPanel').classList.contains('hidden') ? '' : 'Choose a base account and target accounts.');
  });
  $('advancedModeBtn').addEventListener('click', () => showView('advanced'));
  document.querySelectorAll('[data-view="home"]').forEach((button) => button.addEventListener('click', () => showView('home')));
  $('loadBtn').addEventListener('click', () => loadAccounts().catch(showError));
  $('refreshBtn').addEventListener('click', () => loadAccounts().catch(showError));
  $('openUsersFolderBtn').addEventListener('click', () => openUsersFolder().catch(showError));
  $('openAdvancedUsersFolderBtn').addEventListener('click', () => openUsersFolder().catch(showError));
  $('fastSyncBtn').addEventListener('click', () => syncNow().catch(showError));
  $('syncBtn').addEventListener('click', () => syncNow().catch(showError));
  $('selectAllBtn').addEventListener('click', () => {
    document.querySelectorAll('.account-check').forEach((input) => input.checked = true);
    updateSelectedCount();
  });
  $('selectNoneBtn').addEventListener('click', () => {
    document.querySelectorAll('.account-check').forEach((input) => input.checked = false);
    updateSelectedCount();
  });
  $('backupBtn').addEventListener('click', () => createBackup().catch(showError));
  $('previewBtn').addEventListener('click', () => preview().catch(showError));
  $('reloadBackupsBtn').addEventListener('click', () => loadBackups().catch(showError));
  $('toggleBackupsBtn').addEventListener('click', openBackupModal);
  $('closeBackupsBtn').addEventListener('click', closeBackupModal);
  $('backupModal').addEventListener('click', (event) => {
    if (event.target === $('backupModal')) closeBackupModal();
  });
  $('backupFilter').addEventListener('input', renderBackups);
  $('backupScope').addEventListener('change', updateSelectedCount);
  $('openBackupsFolderBtn').addEventListener('click', () => openBackupsFolder().catch(showError));
  $('deleteAllBackupsBtn').addEventListener('click', () => deleteAllBackups().catch(showError));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('backupModal').classList.contains('hidden')) closeBackupModal();
  });
  $('errorDumpToggle').addEventListener('click', () => $('errorDumpPanel').classList.toggle('hidden'));
  $('refreshErrorsBtn').addEventListener('click', () => loadErrors({ open: true }).catch(showError));
  $('clearErrorsBtn').addEventListener('click', () => clearErrors().catch(showError));
  $('sourceAccount').addEventListener('change', () => {
    renderFastTargets();
    updateSelectedCount();
    toast('Base account changed', 'Target list was updated automatically.');
    loadSourceOptions().catch(showError);
  });
  $('advancedSourceAccount').addEventListener('change', () => {
    updateSelectedCount();
    toast('Source changed', 'Advanced source account updated.');
    loadSourceOptions().catch(showError);
  });
  $('fastTargets').addEventListener('change', () => {
    updateSelectedCount();
    toast('Targets updated', `${activeDestinationIds().length} target account(s) selected.`);
  });
  $('uploadFile').addEventListener('change', () => uploadFile().catch(showError));
  $('keyFilter').addEventListener('input', renderKeys);
  bindOptionPopover();
  $('backupToggle').addEventListener('change', renderAdvancedSummary);
  document.querySelectorAll('input[name="mode"]').forEach((input) => input.addEventListener('change', updateModeVisibility));
  document.querySelectorAll('input[name="sourceType"]').forEach((input) => input.addEventListener('change', updateSourceVisibility));
  updateModeVisibility();
  updateSourceVisibility();
  await loadErrors({ silent: true }).catch(() => {});
  await loadAccounts().catch(showError);
}

function showError(error) {
  $('homeStatus').textContent = `Error: ${error.message}`;
  writeOutput(`Error: ${error.message}`);
  toast('Action failed', error.message, 'err');
  loadErrors({ open: true, silent: true }).catch(() => {});
}

init().catch(showError);
