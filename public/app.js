const state = {
  configType: 'vanilla',
  basePath: '',
  accounts: [],
  uploadId: null,
  sourceOptions: [],
  minecraftRunning: false,
  errors: [],
  backups: [],
};

const MODE_COPY = {
  vanilla: {
    label: 'Vanilla',
    slogan: 'Sync your Bedrock options.txt between local accounts with safe defaults and automatic backups.',
    pathTitle: 'Users folder',
    pathLabel: 'Minecraft Bedrock Users path',
    itemName: 'account',
    itemNamePlural: 'accounts',
    configFile: 'options.txt',
    fastCopy: 'Choose source and targets. Everything else is automatic.',
    advancedCopy: 'Upload files, pick categories, select keys, and manage backups.',
    targetCopy: 'Choose which accounts receive the options.',
    sourceTitle: 'Use base account',
    sourceCopy: 'Copy from the selected source account.',
    uploadTitle: 'Upload options.txt',
    uploadCopy: 'Use an external file as source.',
    sourceSelectLabel: 'Base account',
    uploadAccept: '.txt',
    categories: [
      ['graphics', 'Graphics'],
      ['audio', 'Audio'],
      ['controls', 'Controls'],
      ['interface', 'Interface'],
      ['other', 'Other'],
    ],
  },
  flarial: {
    label: 'Flarial Client',
    slogan: 'Save, export, and tune your Flarial Client profiles anywhere on this PC with automatic restore points.',
    pathTitle: 'Config folder',
    pathLabel: 'Flarial Client Config path',
    itemName: 'profile',
    itemNamePlural: 'profiles',
    configFile: 'Flarial .json',
    fastCopy: 'Pick a Flarial profile and save it directly to another folder on this PC.',
    advancedCopy: 'Export full folders, selected module groups, exact values, and still edit profile settings in place.',
    targetCopy: 'Choose where the Flarial config should be saved or copied on this PC.',
    sourceTitle: 'Use base profile',
    sourceCopy: 'Copy from the selected Flarial profile.',
    uploadTitle: 'Upload Flarial JSON',
    uploadCopy: 'Use an external Flarial profile JSON as source.',
    sourceSelectLabel: 'Base profile',
    uploadAccept: '.json',
    categories: [
      ['hud', 'HUD'],
      ['visuals', 'Visuals'],
      ['controls', 'Controls'],
      ['combat', 'Combat'],
      ['client', 'Client'],
      ['other', 'Other'],
    ],
  },
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
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed.');
    error.validation = data.validation;
    throw error;
  }
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

function activeModeCopy() {
  return MODE_COPY[state.configType] || MODE_COPY.vanilla;
}

function selectedSourceType() {
  return document.querySelector('input[name="sourceType"]:checked').value;
}

function selectedImportKind() {
  return document.querySelector('input[name="importKind"]:checked')?.value || 'file';
}

function selectedDestinationIds() {
  return [...document.querySelectorAll('.account-check:checked')].map((input) => input.value);
}

function fastTargetIds() {
  if (state.configType === 'flarial') {
    return $('fastDestinationPath')?.value.trim() ? ['__flarial_export__'] : [];
  }
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
  if (state.configType === 'flarial') {
    const destination = isFastModeActive() ? $('fastDestinationPath')?.value.trim() : $('flarialDestinationPath')?.value.trim();
    return destination ? ['__flarial_export__'] : [];
  }
  if (isFastModeActive()) {
    const sourceId = $('sourceAccount').value;
    return fastTargetIds().filter((id) => id !== sourceId);
  }

  const ids = selectedDestinationIds();
  const sourceId = $('advancedSourceAccount').value;
  return ids.filter((id) => selectedSourceType() !== 'account' || id !== sourceId);
}

function backupScopeIds() {
  if (state.configType === 'flarial') return ['__all__'];
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
  const configType = state.configType;
  if (isFastModeActive()) {
    return {
      configType,
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
    configType,
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
  const copy = activeModeCopy();
  if (!state.basePath) throw new Error(`${copy.pathTitle} is missing.`);
  if (!state.accounts.length) throw new Error(`No ${copy.itemNamePlural} found. Check the path in Advanced Mode.`);
  if (payload.source.type === 'account' && !payload.source.accountId) throw new Error(`Select a base ${copy.itemName} first.`);
  if (payload.source.type === 'upload' && !payload.source.uploadId) throw new Error(`Upload a ${copy.configFile} file first.`);
  if (!payload.destinationIds.length) throw new Error(`Select at least one target ${copy.itemName}.`);
  if (payload.destinationIds.includes(payload.source.accountId)) throw new Error(`The base ${copy.itemName} cannot also be a target.`);
  if (payload.mode === 'categories' && !payload.categories.length) throw new Error('Select at least one category.');
  if (payload.mode === 'keys' && !payload.keys.length) throw new Error('Select at least one key.');
  if (!previewOnly && payload.backup !== false && !payload.destinationIds.length) throw new Error('Backup requires at least one target account.');
}

function updateSelectedCount() {
  const selectedCount = $('selectedCount');
  const count = activeDestinationIds().length;
  if (selectedCount) selectedCount.textContent = String(count);
  const fastTargetCount = $('fastTargetCount');
  if (fastTargetCount) {
    fastTargetCount.textContent = state.configType === 'flarial'
      ? (count ? 'Save target set' : 'No save target')
      : `${count} target${count === 1 ? '' : 's'}`;
  }
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

function flarialExportPayload() {
  const fast = isFastModeActive();
  return {
    configType: 'flarial',
    basePath: state.basePath,
    source: fast ? { type: 'account', accountId: $('sourceAccount').value } : sourcePayload(),
    destinationPath: fast ? $('fastDestinationPath').value.trim() : $('flarialDestinationPath').value.trim(),
    exportScope: fast ? 'profile' : $('flarialExportScope').value,
    includeLegacy: fast ? false : $('flarialIncludeLegacy').checked,
    mode: fast || $('flarialExportScope').value === 'folder' ? 'full' : selectedMode(),
    backup: fast ? true : $('backupToggle').checked,
    categories: fast ? [] : [...document.querySelectorAll('#categoryPicker input:checked')].map((input) => input.value),
    keys: fast ? [] : [...document.querySelectorAll('#keys input:checked')].map((input) => input.value),
  };
}

function validateFlarialExportPayload(payload, { previewOnly = false } = {}) {
  if (!state.basePath) throw new Error('Flarial Config folder is missing.');
  if (!state.accounts.length) throw new Error('No Flarial profiles found. Check the Config path in Advanced Mode.');
  if (!payload.destinationPath) throw new Error('Enter a destination folder or .json file on this PC.');
  if (payload.exportScope !== 'folder') {
    if (payload.source.type === 'account' && !payload.source.accountId) throw new Error('Select a Flarial source profile first.');
    if (payload.source.type === 'upload' && !payload.source.uploadId) throw new Error('Upload a Flarial .json config file first.');
    if (payload.mode === 'categories' && !payload.categories.length) throw new Error('Select at least one Flarial category.');
    if (payload.mode === 'keys' && !payload.keys.length) throw new Error('Select at least one Flarial value.');
  }
  if (!previewOnly && payload.backup !== false && !state.basePath) throw new Error('Backup requires a loaded Flarial Config folder.');
}

function renderCategoryPicker() {
  const categories = activeModeCopy().categories;
  $('categoryPicker').innerHTML = categories.map(([value, label], index) =>
    `<label><input type="checkbox" value="${escapeHtml(value)}" ${index < 4 ? 'checked' : ''}> ${escapeHtml(label)}</label>`
  ).join('');
}

function applyConfigModeText() {
  const copy = activeModeCopy();
  const flarial = state.configType === 'flarial';
  $('appRoot').classList.toggle('theme-flarial', state.configType === 'flarial');
  document.querySelectorAll('[data-config-type]').forEach((button) => {
    const active = button.dataset.configType === state.configType;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $('slogan').textContent = copy.slogan;
  $('fastModeCopy').textContent = copy.fastCopy;
  $('advancedModeCopy').textContent = copy.advancedCopy;
  $('pathPanelTitle').textContent = copy.pathTitle;
  $('pathLabel').textContent = copy.pathLabel;
  $('targetsCopy').textContent = copy.targetCopy;
  $('sourceAccountTitle').textContent = copy.sourceTitle;
  $('sourceAccountCopy').textContent = copy.sourceCopy;
  $('uploadSourceTitle').textContent = copy.uploadTitle;
  $('uploadSourceCopy').textContent = copy.uploadCopy;
  $('sourceSelectLabel').textContent = copy.sourceSelectLabel;
  $('uploadFile').accept = copy.uploadAccept;
  $('importFile').accept = copy.uploadAccept;
  $('importFileCopy').textContent = flarial ? 'Import one Flarial profile JSON after format validation.' : 'Import one options.txt into a selected local account after validation.';
  $('importFolderCopy').textContent = flarial ? 'Import a Flarial Config folder after profile compatibility checks.' : 'Import a folder containing account options.txt files after validation.';
  $('importFileLabel').textContent = flarial ? 'Flarial JSON file' : 'options.txt file';
  $('importFolderLabel').textContent = flarial ? 'Flarial Config folder' : 'Minecraft Users/account folder';
  $('importTargetAccountLabel').textContent = flarial ? 'Unused for folder imports' : 'Target account';
  $('fastTargetsField').classList.toggle('hidden', flarial);
  $('fastDestinationField').classList.toggle('hidden', !flarial);
  $('chooseFastDestinationBtn').classList.toggle('hidden', !flarial);
  $('targetActions').classList.toggle('hidden', flarial);
  $('accounts').classList.toggle('hidden', flarial);
  $('flarialExportPanel').classList.toggle('hidden', !flarial);
  $('targetsStepLabel').textContent = flarial ? 'Save target' : 'Targets';
  $('targetsTitle').textContent = flarial ? 'Choose save location' : 'Select targets';
  $('fastSyncBtn').textContent = flarial ? 'Save' : 'Sync';
  $('syncCtaTitle').textContent = flarial ? 'Save / Export Now' : 'Sync Now';
  $('syncCtaCopy').textContent = flarial ? 'Write the selected Flarial config to the destination path' : 'Start syncing with the selected settings';
  renderCategoryPicker();
  renderImportControls();
}

function renderImportControls() {
  const flarial = state.configType === 'flarial';
  const folder = selectedImportKind() === 'folder';
  $('importTargetAccountBlock').classList.toggle('hidden', flarial || folder);
  $('importTargetNameBlock').classList.toggle('hidden', !flarial || folder);
  $('importFileBlock').classList.toggle('hidden', folder);
  $('importFolderBlock').classList.toggle('hidden', !folder);
  $('importConfigBtn').textContent = folder ? 'Validate and Import Folder' : 'Validate and Import File';
  $('importValidationBadge').textContent = 'No import selected';
  $('importValidationBadge').classList.remove('ok', 'missing');
}

function renderImportValidation(validation, { blocked = false } = {}) {
  const panel = $('importValidationPanel');
  const badge = $('importValidationBadge');
  if (!validation) {
    panel.classList.add('hidden');
    badge.textContent = 'No import selected';
    badge.classList.remove('ok', 'missing');
    return;
  }

  panel.classList.remove('hidden', 'ok', 'blocked');
  panel.classList.add(blocked || validation.ok === false ? 'blocked' : 'ok');
  badge.textContent = blocked || validation.ok === false ? 'Import blocked' : 'Import validated';
  badge.classList.toggle('ok', !(blocked || validation.ok === false));
  badge.classList.toggle('missing', blocked || validation.ok === false);

  const warnings = validation.warnings || [];
  const advice = validation.advice || [];
  panel.innerHTML = `
    <strong>${escapeHtml(validation.title || (validation.ok === false ? 'Import blocked' : 'Import validation passed'))}</strong>
    ${warnings.length ? `<ul>${warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>No compatibility problems were detected.</p>'}
    ${advice.length ? `<p>${escapeHtml(advice.join(' '))}</p>` : ''}
  `;
}

async function setConfigType(configType) {
  if (state.configType === configType) return;
  state.configType = configType;
  state.uploadId = null;
  state.sourceOptions = [];
  $('uploadFile').value = '';
  $('uploadStatus').textContent = '';
  applyConfigModeText();
  const defaults = await api(`/api/default-path?configType=${encodeURIComponent(state.configType)}`);
  $('basePath').value = defaults.path;
  if (defaults.exportPath) {
    $('fastDestinationPath').value = defaults.exportPath;
    $('flarialDestinationPath').value = defaults.exportPath;
  }
  if (defaults.exportPath) {
    $('fastDestinationPath').value = defaults.exportPath;
    $('flarialDestinationPath').value = defaults.exportPath;
  }
  await loadAccounts();
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
  if ($('importTargetAccount')) $('importTargetAccount').innerHTML = sourceOptions;
  renderFastTargets();
  document.querySelectorAll('.account-check').forEach((input) => input.addEventListener('change', updateSelectedCount));
  updateSelectedCount();
}

function renderFastTargets() {
  const sourceId = $('sourceAccount').value;
  $('fastTargets').innerHTML = state.accounts
    .filter((account) => account.id !== sourceId && account.hasOptions)
    .map((account) => `<option value="${account.id}" selected>${escapeHtml(account.displayName)}</option>`)
    .join('');
  renderFastTargetSummary();
}

function renderFastTargetSummary() {
  const targetSummary = $('fastTargetSummary');
  if (!targetSummary) return;

  if (state.configType === 'flarial') {
    const destination = $('fastDestinationPath')?.value.trim();
    targetSummary.innerHTML = destination
      ? `<span class="fast-chip">Save to ${escapeHtml(destination)}</span>`
      : '<span class="fast-empty">Enter a destination folder or .json file</span>';
    return;
  }

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
  if (state.configType !== 'flarial') {
    document.querySelectorAll('.account-check').forEach((input) => {
      const account = state.accounts.find((item) => item.id === input.value);
      input.checked = Boolean(account?.hasOptions);
    });
  }
  renderFastTargets();
  updateSourceVisibility();
  updateModeVisibility();
  updateSelectedCount();
}

async function loadAccounts({ preserveOutput = false } = {}) {
  state.basePath = $('basePath').value.trim();
  const copy = activeModeCopy();
  toast(`Loading ${copy.itemNamePlural}`, `Scanning the ${copy.pathTitle.toLowerCase()}.`);
  const data = await api(`/api/accounts?configType=${encodeURIComponent(state.configType)}&basePath=${encodeURIComponent(state.basePath)}`);
  state.basePath = data.basePath;
  state.configType = data.configType || state.configType;
  state.accounts = data.accounts;
  state.minecraftRunning = Boolean(data.minecraftRunning);
  $('basePath').value = data.basePath;
  renderAccounts();
  applyAutoDefaults();
  await loadSourceOptions();
  await loadBackups({ silent: true });
  const message = state.accounts.length
    ? `Ready. Found ${state.accounts.length} ${copy.itemNamePlural}. The most recently changed entry is marked as likely active.`
    : `No ${copy.itemNamePlural} were found. Open Advanced Mode and check the ${copy.pathTitle.toLowerCase()}.`;
  $('homeStatus').innerHTML = state.accounts.length
    ? `Ready. Found <button class="inline-link" type="button" data-open-users-folder>${state.accounts.length} ${copy.itemNamePlural}</button>.`
    : escapeHtml(message);
  $('openUsersFolderBtn').classList.toggle('hidden', !state.accounts.length);
  bindOpenFolderLinks();
  if (!preserveOutput) writeOutput(message);
  toast(state.accounts.length ? `${copy.label} loaded` : `No ${copy.itemNamePlural} found`, state.accounts.length ? `${state.accounts.length} ${copy.itemNamePlural} ready.` : `Check the ${copy.pathTitle.toLowerCase()} in Advanced Mode.`, state.accounts.length ? 'ok' : 'warn');
}

function bindOpenFolderLinks() {
  document.querySelectorAll('[data-open-users-folder]').forEach((button) => {
    button.addEventListener('click', () => openUsersFolder().catch(showError));
  });
}

async function openUsersFolder() {
  if (!state.basePath) throw new Error(`${activeModeCopy().pathTitle} is missing.`);
  await api(`/api/open-users-folder?configType=${encodeURIComponent(state.configType)}&basePath=${encodeURIComponent(state.basePath)}`);
  toast(`${activeModeCopy().pathTitle} opened`, state.basePath, 'ok');
}

async function chooseFolderFor(inputId, purpose = 'base') {
  const input = $(inputId);
  if (!input) return;
  const data = await api('/api/select-folder', {
    method: 'POST',
    body: JSON.stringify({
      configType: state.configType,
      purpose,
      initialPath: input.value.trim() || state.basePath,
    }),
  });
  if (data.canceled || !data.path) return;
  input.value = data.path;
  if (inputId === 'basePath') await loadAccounts();
  else updateSelectedCount();
  toast('Folder selected', data.path, 'ok');
}

async function loadSourceOptions() {
  const advancedVisible = !$('advancedView').classList.contains('hidden');
  const sourceId = advancedVisible ? $('advancedSourceAccount').value : $('sourceAccount').value;
  if (!sourceId) {
    state.sourceOptions = [];
    renderKeys();
    return;
  }
  const data = await api(`/api/accounts/${encodeURIComponent(sourceId)}/options?configType=${encodeURIComponent(state.configType)}&basePath=${encodeURIComponent(state.basePath)}`);
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

function humanizeKeyPart(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseJsonLikeValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function interpretedValue(option) {
  const key = option.key.toLowerCase();
  const raw = String(option.value ?? '').trim();
  const parsed = parseJsonLikeValue(raw);

  if (raw === '0' || raw === '1' || parsed === true || parsed === false) {
    const on = raw === '1' || parsed === true;
    if (/enabled|favorite|show|hide|toggle|fullscreen|vsync|autojump|invert|vibration|trusted|subtitles|cloud|shadow|blur|border|outline|overlay/i.test(option.key)) {
      return on ? 'Enabled / on' : 'Disabled / off';
    }
  }

  if (key.includes('thirdperson')) {
    return ({ 0: 'First person', 1: 'Third person back', 2: 'Third person front' })[raw] || `Camera mode ${raw}`;
  }

  if (key.includes('difficulty')) {
    return ({ 0: 'Peaceful', 1: 'Easy', 2: 'Normal', 3: 'Hard' })[raw] || `Difficulty value ${raw}`;
  }

  if (key.includes('language')) return `Language code ${raw || '<empty>'}`;

  const number = Number(raw);
  if (Number.isFinite(number)) {
    if (/volume|opacity|alpha|gamma|sensitivity|scale|safe_zone|strength|speed|percentage/i.test(option.key)) {
      const percent = number <= 1 && number >= 0 ? Math.round(number * 100) : number;
      return `${percent}% style slider value`;
    }
    if (/fov|field_of_view/i.test(option.key)) return `${number} field-of-view value`;
    if (/x$|y$|pos|padding|width|height|offset|anchor/i.test(option.key)) return `Numeric layout/position value ${number}`;
    if (/key|bind|hotkey/i.test(option.key)) return `Input code ${number}`;
  }

  if (Array.isArray(parsed)) return `List with ${parsed.length} item(s)`;
  if (parsed && typeof parsed === 'object') return `Object with ${Object.keys(parsed).length} field(s)`;
  if (/^#?[0-9a-f]{6,8}$/i.test(raw)) return `Color value ${raw}`;
  if (/^\d+\s*,\s*\d+\s*,\s*\d+/i.test(raw)) return `RGB-like color value ${raw}`;
  return raw ? `Raw value: ${valueText(raw)}` : 'Empty value';
}

function optionSyncAdvice(option) {
  if (option.syncable === false) return 'Locked because it can contain identity, entitlement, account, or service state.';
  if (state.configType === 'flarial') {
    const key = option.key.toLowerCase();
    if (/key|bind|hotkey/.test(key)) return 'Portable inside Flarial, but only useful if the target PC uses the same keyboard/mouse layout.';
    if (/x|y|pos|scale|anchor|padding|width|height/.test(key)) return 'Safe to export, but layout can look different on another resolution or UI scale.';
    if (/color|rgb|opacity|blur|glow|border/.test(key)) return 'Safe visual preference. Good candidate for profile presets.';
    return 'Safe Flarial profile value. Exporting it changes only the saved client profile JSON.';
  }
  if (/(last_|xuid|account|iap_|playfab|store_|realms|server|mp_)/i.test(option.key)) return 'Treat carefully: this is account, marketplace, multiplayer, or service state.';
  if (/(gfx_|audio_|ctrl_|keyboard|mouse|gamepad|chat|language)/i.test(option.key)) return 'Generally safe to sync between local Bedrock accounts.';
  return 'Usually safe, but preview first because Bedrock can rewrite unknown or version-specific values.';
}

function flarialModuleDescription(moduleName) {
  const name = moduleName.toLowerCase();
  const known = {
    animations: 'Controls Flarial animation behavior and animation speed preferences.',
    armorhud: 'HUD overlay showing armor and item durability information.',
    'arrow counter': 'HUD counter for arrows or projectile-related inventory state.',
    'audio controller': 'Windows media/audio control module using configured keybinds.',
    'auto gg': 'Chat automation that sends a configured message after supported match events.',
    'auto perspective': 'Automatically changes camera perspective during actions such as elytra, swimming, riding, or emoting.',
    'better inventory': 'Inventory quality-of-life module for extra item data, previews, durability, and tooltips.',
    'block outline': 'Visual module for block outline and overlay styling.',
    'bow sensitivity': 'Temporarily lowers sensitivity while aiming with a bow.',
    clickgui: 'Flarial settings interface module; stores menu colors, layout, search, and theme behavior.',
    coordinates: 'HUD overlay displaying player coordinates.',
    cps: 'HUD overlay displaying clicks per second.',
    'custom crosshair': 'Visual module replacing or styling the crosshair.',
    directionhud: 'HUD overlay showing direction and navigation information.',
    freelook: 'Camera module allowing independent look direction where supported.',
    fullbright: 'Visual module that increases scene brightness.',
    hitbox: 'Visual module for hitbox rendering.',
    'hive statistics': 'Server-statistics HUD for Hive-related game stats.',
    keystrokes: 'HUD/input overlay showing pressed movement and mouse keys.',
    memory: 'HUD overlay for memory/performance information.',
    'motion blur': 'Post-processing visual module for blur while moving.',
    nametag: 'Visual module for player/entity nametag behavior.',
    'ping counter': 'HUD overlay showing ping/network latency.',
    potionhud: 'HUD overlay for active potion and effect information.',
    tablist: 'Tab list customization module for server/player display.',
    'toggle sprint': 'Input module for persistent sprint behavior.',
    zoom: 'Camera zoom module, often with sensitivity and keybind settings.'
  };
  return known[name] || `${moduleName} is a Flarial module. Its config values are loaded by the client to enable the module and customize rendering, input, layout, or behavior.`;
}

function flarialPropertyDescription(property, moduleName) {
  const p = property.toLowerCase();
  if (p === 'enabled') return `Turns the ${moduleName} module on or off in this profile.`;
  if (p === 'favorite') return `Pins or marks ${moduleName} as a favorite in Flarial's module UI.`;
  if (/keybind|bind|hotkey|key/.test(p)) return `Stores the activation keybind for ${moduleName}. Values are usually internal key or mouse-button codes.`;
  if (/^x$|^y$|pos|anchor|align/.test(p)) return `Controls screen position or anchor placement for ${moduleName}.`;
  if (/scale|size|width|height|padding|spacing|offset/.test(p)) return `Controls size, spacing, or layout density for ${moduleName}.`;
  if (/color|colour|rgb|col|opacity|alpha/.test(p)) return `Controls color or transparency for ${moduleName}. RGB fields usually pair with opacity or color mode fields.`;
  if (/blur|glow|shadow|border|outline|overlay|background|bg/.test(p)) return `Controls visual styling such as background, border, glow, blur, outline, or overlay for ${moduleName}.`;
  if (/text|format|prefix|suffix|message|font|numeral/.test(p)) return `Controls text content, formatting, or display style for ${moduleName}.`;
  if (/mode|type|style|preset/.test(p)) return `Selects a behavior or visual mode for ${moduleName}. Exact numeric values are client-defined enum choices.`;
  if (/speed|duration|delay|time|cooldown/.test(p)) return `Controls timing, animation speed, delay, or duration for ${moduleName}.`;
  if (/hide|show|render|display|visible/.test(p)) return `Controls whether a sub-element of ${moduleName} is rendered or hidden.`;
  return `Stores the ${humanizeKeyPart(property)} setting for ${moduleName}.`;
}

function optionTooltipDetails(option) {
  const details = [
    ['Current value', interpretedValue(option)],
    ['Sync guidance', optionSyncAdvice(option)]
  ];

  if (state.configType === 'flarial') {
    const [moduleName, ...propertyParts] = option.key.split('.');
    const property = propertyParts.join('.') || 'module';
    details.unshift(['Module', flarialModuleDescription(moduleName)]);
    details.splice(1, 0, ['Property', flarialPropertyDescription(property, moduleName)]);
    return details;
  }

  const key = option.key.toLowerCase();
  if (/^gfx_/.test(key)) details.unshift(['Bedrock area', 'Graphics/video option saved in options.txt. Bedrock may clamp this to supported device values on launch.']);
  else if (/^audio_/.test(key)) details.unshift(['Bedrock area', 'Audio mixer option. Values are usually slider percentages or category volumes.']);
  else if (/^ctrl_|keyboard|mouse|gamepad/.test(key)) details.unshift(['Bedrock area', 'Input/control option. Key codes and device-specific values can depend on keyboard, mouse, touch, or gamepad setup.']);
  else if (/chat|language|ui_|safezone|hud|screen/.test(key)) details.unshift(['Bedrock area', 'Interface option controlling language, chat, HUD, screen layout, or accessibility-related display behavior.']);
  else details.unshift(['Bedrock area', 'General Bedrock client preference or version-specific state stored in options.txt.']);
  return details;
}

function optionHelpText(option) {
  if (state.configType === 'flarial') {
    const [moduleName, ...propertyParts] = option.key.split('.');
    const property = propertyParts.join('.') || 'module';
    return `${flarialPropertyDescription(property, moduleName)} ${flarialModuleDescription(moduleName)}`;
  }
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
    body: JSON.stringify({ configType: state.configType, basePath: state.basePath, key, value: input.value }),
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
  const details = optionTooltipDetails(option)
    .map(([label, text]) => `
      <div class="option-popover-detail">
        <b>${escapeHtml(label)}</b>
        <p>${escapeHtml(text)}</p>
      </div>
    `)
    .join('');
  popover.innerHTML = `
    <strong>${escapeHtml(option.key)}</strong>
    <span>${escapeHtml(option.category)} category</span>
    <p>${escapeHtml(optionHelpText(option))}</p>
    <div class="option-popover-details">${details}</div>
    <small>Raw value: ${escapeHtml(valueText(option.value))}</small>
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
  const copy = activeModeCopy();
  if (state.configType === 'vanilla' && file.name.toLowerCase() !== 'options.txt') throw new Error('Please upload a file named options.txt.');
  if (state.configType === 'flarial' && !file.name.toLowerCase().endsWith('.json')) throw new Error('Please upload a Flarial .json config file.');
  const body = new FormData();
  body.append('options', file);
  body.append('configType', state.configType);
  const data = await api('/api/upload', { method: 'POST', body });
  state.uploadId = data.uploadId;
  $('uploadStatus').textContent = `${file.name} uploaded (${data.optionCount} values).`;
  toast('Upload ready', `${data.optionCount} ${state.configType === 'flarial' ? 'config values' : 'options'} found in ${copy.configFile}.`, 'ok');
}

async function importFlarialConfig() {
  const file = $('flarialImportFile').files[0];
  if (!file) throw new Error('Select a Flarial .json config to import.');
  if (!file.name.toLowerCase().endsWith('.json')) throw new Error('Please import a .json config file.');

  const body = new FormData();
  body.append('config', file);
  body.append('basePath', state.basePath);
  body.append('targetName', $('flarialImportName').value.trim() || file.name);
  body.append('backup', 'true');

  const data = await api('/api/flarial/import', { method: 'POST', body });
  writeOutput([
    `Imported Flarial config: ${data.fileName}`,
    `Values: ${data.valueCount}`,
    `Path: ${data.path}`,
    data.backup ? `Backup: ${data.backup.fileName}` : 'Backup: off'
  ].join('\n'));
  toast('Flarial config imported', data.fileName, 'ok');
  $('flarialImportFile').value = '';
  $('flarialImportName').value = '';
  await loadAccounts({ preserveOutput: true });
  await loadBackups({ silent: true });
}

async function importConfig() {
  renderImportValidation(null);
  const kind = selectedImportKind();
  const body = new FormData();
  body.append('configType', state.configType);
  body.append('basePath', state.basePath);
  body.append('backup', 'true');

  if (kind === 'folder') {
    const files = [...$('importFolder').files];
    if (!files.length) throw new Error('Select a folder to import.');
    files.forEach((file) => {
      body.append('files', file, file.webkitRelativePath || file.name);
    });
  } else {
    const file = $('importFile').files[0];
    if (!file) throw new Error('Select a config file to import.');
    if (state.configType === 'vanilla') {
      if (file.name.toLowerCase() !== 'options.txt') throw new Error('Vanilla imports require a file named options.txt.');
      if (!$('importTargetAccount').value) throw new Error('Select the target account for this options.txt import.');
      body.append('accountId', $('importTargetAccount').value);
    } else {
      if (!file.name.toLowerCase().endsWith('.json')) throw new Error('Flarial imports require a .json profile file.');
      body.append('targetName', $('importTargetName').value.trim() || file.name);
    }
    body.append('config', file);
  }

  try {
    const endpoint = kind === 'folder' ? '/api/import/folder' : '/api/import/file';
    const data = await api(endpoint, { method: 'POST', body });
    const validation = Array.isArray(data.validations) ? { ok: true, title: 'Folder import validation passed', warnings: [], advice: [] } : data.validation;
    renderImportValidation(validation || { ok: true, title: 'Import validation passed' });
    const written = data.written || [data.path].filter(Boolean);
    writeOutput([
      `Import complete: ${state.configType}`,
      `Written item(s): ${written.length}`,
      data.backup ? `Backup: ${data.backup.fileName}` : 'Backup: off',
      ...written.slice(0, 12).map((item) => `  ${item}`)
    ].join('\n'));
    toast('Import complete', `${written.length} item(s) written.`, 'ok');
    $('importFile').value = '';
    $('importFolder').value = '';
    await loadAccounts({ preserveOutput: true });
    await loadBackups({ silent: true });
  } catch (error) {
    if (error.validation) {
      renderImportValidation(error.validation, { blocked: true });
      writeOutput([
        error.validation.title || 'Import blocked',
        '',
        ...(error.validation.warnings || []),
        '',
        ...(error.validation.advice || [])
      ].join('\n'));
      toast('Import blocked', 'The current config appears newer or more complete. Read the validation advice.', 'warn');
      return;
    }
    throw error;
  }
}

async function preview() {
  if (state.configType === 'flarial') {
    const payload = flarialExportPayload();
    validateFlarialExportPayload(payload, { previewOnly: true });
    toast('Preparing export preview', payload.exportScope === 'folder' ? 'Full Flarial Config folder copy.' : 'Checking selected Flarial values.');
    const data = await api('/api/flarial/export-preview', { method: 'POST', body: JSON.stringify(payload) });
    writeOutput(data.preview || `Output: ${data.outputPath}`);
    toast('Preview ready', data.outputPath, 'ok');
    return;
  }

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
  if (state.configType === 'flarial') {
    const payload = flarialExportPayload();
    validateFlarialExportPayload(payload);
    toast(payload.exportScope === 'folder' ? 'Folder export started' : 'Config save started', payload.destinationPath);
    writeOutput('Flarial export is running. A local restore point is created first when backup is enabled.');
    const data = await api('/api/flarial/export', { method: 'POST', body: JSON.stringify(payload) });
    const lines = [
      `Written: ${data.written.length}`,
      `Failed: ${data.failed.length}`,
      data.backup ? `Backup: ${data.backup.fileName}` : 'Backup: off',
      '',
      ...data.written.map((item) => `${item.path}: ${item.values || 0} value(s), ${item.changes || 0} change(s)`),
      ...data.failed.map((item) => `${item.path || 'export'}: ${item.error}`),
    ];
    writeOutput(lines.join('\n'));
    toast(data.failed.length ? 'Export completed with errors' : 'Export complete', data.written[0]?.path || payload.destinationPath, data.failed.length ? 'warn' : 'ok');
    await loadBackups({ silent: true });
    return;
  }

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
  if (!ids.length) throw new Error(`Select at least one ${activeModeCopy().itemName} to back up.`);
  const label = $('backupLabel').value.trim() || 'manual';
  const data = await api('/api/backups', {
    method: 'POST',
    body: JSON.stringify({ configType: state.configType, basePath: state.basePath, accountIds: ids, label }),
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
          <button type="button" data-restore-backup="${escapeHtml(backup.file)}">Restore</button>
          <button type="button" data-delete-backup="${escapeHtml(backup.file)}">Delete</button>
        </div>
      </div>
    `).join('')
    : `<p class="status-text">${state.backups.length ? 'No backups match the current search.' : 'No backups yet.'}</p>`;
  bindBackupActions();
}

function bindBackupActions() {
  document.querySelectorAll('[data-restore-backup]').forEach((button) => {
    button.addEventListener('click', () => restoreBackup(button.dataset.restoreBackup).catch(showError));
  });
  document.querySelectorAll('[data-delete-backup]').forEach((button) => {
    button.addEventListener('click', () => deleteBackup(button.dataset.deleteBackup).catch(showError));
  });
}

async function restoreBackup(fileName) {
  if (!fileName) return;
  const copy = activeModeCopy();
  const confirmed = window.confirm([
    `Restore backup into the current ${copy.label} path?`,
    '',
    fileName,
    '',
    'A fresh backup of the current state will be created before importing.'
  ].join('\n'));
  if (!confirmed) return;

  let data;
  try {
    data = await api(`/api/backups/${encodeURIComponent(fileName)}/restore`, {
      method: 'POST',
      body: JSON.stringify({ configType: state.configType, basePath: state.basePath, backup: true }),
    });
  } catch (error) {
    if (error.validation) {
      renderImportValidation(error.validation, { blocked: true });
      writeOutput([
        error.validation.title || 'Restore blocked',
        '',
        ...(error.validation.warnings || []),
        '',
        ...(error.validation.advice || [])
      ].join('\n'));
      closeBackupModal();
      toast('Restore blocked', 'The active config appears newer or more complete. Read the validation advice.', 'warn');
      return;
    }
    throw error;
  }
  const restoredCount = Array.isArray(data.restored) ? data.restored.length : 0;
  writeOutput([
    `Restored backup: ${data.file}`,
    `Mode: ${data.configType}`,
    `Restored item(s): ${restoredCount}`,
    data.preRestoreBackup ? `Pre-restore backup: ${data.preRestoreBackup.fileName}` : 'Pre-restore backup: off'
  ].join('\n'));
  toast('Backup restored', `${restoredCount} item(s) restored.`, 'ok');
  await loadAccounts({ preserveOutput: true });
  await loadBackups({ silent: true });
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
  const folderExport = state.configType === 'flarial' && $('flarialExportScope')?.value === 'folder';
  $('categoryPicker').classList.toggle('hidden', folderExport || selectedMode() !== 'categories');
  $('keyPicker').classList.toggle('hidden', folderExport || selectedMode() !== 'keys');
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
  if (state.configType === 'flarial') {
    const parts = [`${account.moduleCount || 0} modules`, `${account.optionCount || 0} values`];
    if (account.backupFile) parts.push(account.backupFile);
    if (account.modifiedAt) parts.push(`modified ${new Date(account.modifiedAt).toLocaleString()}`);
    if (account.parseError) parts.push(`parse error`);
    return escapeHtml(parts.join(' | '));
  }
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
  applyConfigModeText();
  const defaults = await api(`/api/default-path?configType=${encodeURIComponent(state.configType)}`);
  $('basePath').value = defaults.path;
  document.querySelectorAll('[data-config-type]').forEach((button) => {
    button.addEventListener('click', () => setConfigType(button.dataset.configType).catch(showError));
  });
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
  $('chooseBasePathBtn').addEventListener('click', () => chooseFolderFor('basePath', 'base').catch(showError));
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
  $('fastDestinationPath').addEventListener('input', updateSelectedCount);
  $('chooseFastDestinationBtn').addEventListener('click', () => chooseFolderFor('fastDestinationPath', 'export').catch(showError));
  $('flarialDestinationPath').addEventListener('input', updateSelectedCount);
  $('chooseFlarialDestinationBtn').addEventListener('click', () => chooseFolderFor('flarialDestinationPath', 'export').catch(showError));
  $('flarialExportScope').addEventListener('change', () => {
    const folder = $('flarialExportScope').value === 'folder';
    $('backupToggle').checked = true;
    $('categoryPicker').classList.toggle('hidden', folder || selectedMode() !== 'categories');
    $('keyPicker').classList.toggle('hidden', folder || selectedMode() !== 'keys');
    $('flarialIncludeLegacy').disabled = !folder;
    renderAdvancedSummary();
    updateSelectedCount();
  });
  $('uploadFile').addEventListener('change', () => uploadFile().catch(showError));
  $('importConfigBtn').addEventListener('click', () => importConfig().catch(showError));
  document.querySelectorAll('input[name="importKind"]').forEach((input) => input.addEventListener('change', () => {
    renderImportValidation(null);
    renderImportControls();
  }));
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
  if (error.validation) renderImportValidation(error.validation, { blocked: true });
  $('homeStatus').textContent = `Error: ${error.message}`;
  writeOutput(`Error: ${error.message}`);
  toast('Action failed', error.message, 'err');
  loadErrors({ open: true, silent: true }).catch(() => {});
}

init().catch(showError);
