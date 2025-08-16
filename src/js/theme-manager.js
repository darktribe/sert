/*
 * =====================================================
 * Vinsert Editor - テーマ管理システム
 * =====================================================
 */

import { t } from './locales.js';
import { closeAllMenus } from './menu-controller.js';
import { makeDraggable } from './dialog-utils.js';

// テーマ管理の状態
let currentTheme = 'dark';
let availableThemes = [];
let themesDirectory = null;
let isThemeSystemEnabled = false;

// デフォルトテーマ定義
const DEFAULT_THEMES = {
    dark: {
        _meta: {
            name: 'Dark Theme',
            nativeName: 'ダークテーマ',
            version: '1.0.0'
        },
        editor: {
            backgroundColor: '#1e1e1e',
            textColor: '#d4d4d4',
            cursorColor: '#ffffff',
            selectionBackgroundColor: 'rgba(173, 214, 255, 0.15)'
        },
        lineNumbers: {
            backgroundColor: '#252526',
            textColor: '#858585',
            borderColor: '#3e3e40'
        },
        menuBar: {
            backgroundColor: '#2d2d30',
            textColor: '#d4d4d4',
            hoverBackgroundColor: '#37373d',
            borderColor: '#3e3e40'
        },
        statusBar: {
            backgroundColor: '#007acc',
            textColor: '#ffffff'
        },
        lineHighlight: {
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
        }
    },
    light: {
        _meta: {
            name: 'Light Theme',
            nativeName: 'ライトテーマ',
            version: '1.0.0'
        },
        editor: {
            backgroundColor: '#ffffff',
            textColor: '#000000',
            cursorColor: '#000000',
            selectionBackgroundColor: 'rgba(0, 122, 255, 0.15)'
        },
        lineNumbers: {
            backgroundColor: '#f8f8f8',
            textColor: '#237893',
            borderColor: '#e0e0e0'
        },
        menuBar: {
            backgroundColor: '#f0f0f0',
            textColor: '#333333',
            hoverBackgroundColor: '#e0e0e0',
            borderColor: '#cccccc'
        },
        statusBar: {
            backgroundColor: '#007acc',
            textColor: '#ffffff'
        },
        lineHighlight: {
            backgroundColor: 'rgba(0, 0, 0, 0.05)'
        }
    }
};

/**
 * テーマディレクトリのパスを取得
 */
async function getThemesDirectory() {
    try {
        if (window.__TAURI__ && window.__TAURI__.path) {
            const { appDataDir, join } = window.__TAURI__.path;
            const appData = await appDataDir();
            const configDir = await join(appData, 'vinsert');
            const themesPath = await join(configDir, 'theme');
            
            console.log('🎨 Themes directory path:', themesPath);
            return themesPath;
        } else {
            throw new Error('Tauri path API not available');
        }
    } catch (error) {
        console.warn('⚠️ Could not get themes directory:', error);
        return null;
    }
}

/**
 * テーマディレクトリを作成
 */
async function ensureThemesDirectory() {
    try {
        if (!themesDirectory || !window.__TAURI__?.fs) {
            throw new Error('テーマファイル保存場所が利用できません');
        }

        const { exists, mkdir } = window.__TAURI__.fs;
        
        console.log('🔍 Checking themes directory exists:', themesDirectory);
        const dirExists = await exists(themesDirectory);
        console.log('📁 Themes directory exists:', dirExists);
        
        if (!dirExists) {
            console.log('📁 Creating themes directory:', themesDirectory);
            
            await mkdir(themesDirectory, { 
                recursive: true,
                mode: 0o755
            });
            
            const createdExists = await exists(themesDirectory);
            console.log('✅ Themes directory created successfully:', createdExists);
            
            if (!createdExists) {
                throw new Error('ディレクトリの作成に成功したように見えますが、まだディレクトリが存在しません');
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to create themes directory:', error);
        throw new Error(`テーマファイル保存場所（${themesDirectory}）が開けませんでした`);
    }
}

/**
 * デフォルトテーマファイルを作成
 */
async function createDefaultThemeFiles() {
    if (!window.__TAURI__?.fs || !themesDirectory) {
        return;
    }
    
    const { exists, writeTextFile } = window.__TAURI__.fs;
    const { join } = window.__TAURI__.path;
    
    for (const [themeId, themeData] of Object.entries(DEFAULT_THEMES)) {
        try {
            const filePath = await join(themesDirectory, `${themeId}.json`);
            const fileExists = await exists(filePath);
            
            if (!fileExists) {
                console.log(`🎨 Creating theme file: ${themeId}.json`);
                await writeTextFile(filePath, JSON.stringify(themeData, null, 2));
            }
        } catch (error) {
            console.error(`❌ Failed to create ${themeId}.json:`, error);
        }
    }
}

/**
 * テーマファイルを読み込み
 */
export async function loadThemes() {
    if (!window.__TAURI__?.fs || !themesDirectory) {
        console.log('⚠️ Using fallback themes');
        availableThemes = [
            { id: 'dark', name: 'Dark Theme', nativeName: 'ダークテーマ' },
            { id: 'light', name: 'Light Theme', nativeName: 'ライトテーマ' }
        ];
        return;
    }
    
    try {
        const { readDir, readTextFile } = window.__TAURI__.fs;
        const { join } = window.__TAURI__.path;
        
        const entries = await readDir(themesDirectory);
        const jsonFiles = entries.filter(entry => 
            entry.name.endsWith('.json') && !entry.isDirectory
        );
        
        const themes = [];
        
        for (const file of jsonFiles) {
            try {
                const filePath = await join(themesDirectory, file.name);
                const content = await readTextFile(filePath);
                const themeData = JSON.parse(content);
                
                if (themeData._meta && themeData._meta.name) {
                    const themeId = file.name.replace('.json', '');
                    themes.push({
                        id: themeId,
                        name: themeData._meta.name,
                        nativeName: themeData._meta.nativeName || themeData._meta.name
                    });
                }
            } catch (error) {
                console.error(`❌ Failed to load theme file ${file.name}:`, error);
            }
        }
        
        availableThemes = themes.length > 0 ? themes : [
            { id: 'dark', name: 'Dark Theme', nativeName: 'ダークテーマ' },
            { id: 'light', name: 'Light Theme', nativeName: 'ライトテーマ' }
        ];
        
        console.log('🎨 Themes loaded:', availableThemes);
        
    } catch (error) {
        console.error('❌ Failed to load themes:', error);
        availableThemes = [
            { id: 'dark', name: 'Dark Theme', nativeName: 'ダークテーマ' },
            { id: 'light', name: 'Light Theme', nativeName: 'ライトテーマ' }
        ];
    }
}

/**
 * テーマを適用
 */
export async function applyTheme(themeId) {
    try {
        let themeData = null;
        
        // 外部ファイルから読み込み
        if (isThemeSystemEnabled && themesDirectory) {
            themeData = await loadThemeFromFile(themeId);
        }
        
        // フォールバック
        if (!themeData && DEFAULT_THEMES[themeId]) {
            themeData = DEFAULT_THEMES[themeId];
        }
        
        if (!themeData) {
            console.error(`❌ Theme not found: ${themeId}`);
            return false;
        }
        
        // CSSカスタムプロパティを使用してテーマを適用
        const root = document.documentElement;
        
        // エディタ関連
        root.style.setProperty('--editor-bg-color', themeData.editor.backgroundColor);
        root.style.setProperty('--editor-text-color', themeData.editor.textColor);
        root.style.setProperty('--editor-cursor-color', themeData.editor.cursorColor);
        root.style.setProperty('--editor-selection-bg-color', themeData.editor.selectionBackgroundColor);
        
        // 行番号関連
        root.style.setProperty('--line-numbers-bg-color', themeData.lineNumbers.backgroundColor);
        root.style.setProperty('--line-numbers-text-color', themeData.lineNumbers.textColor);
        root.style.setProperty('--line-numbers-border-color', themeData.lineNumbers.borderColor);
        
        // メニューバー関連
        root.style.setProperty('--menu-bar-bg-color', themeData.menuBar.backgroundColor);
        root.style.setProperty('--menu-bar-text-color', themeData.menuBar.textColor);
        root.style.setProperty('--menu-bar-hover-bg-color', themeData.menuBar.hoverBackgroundColor);
        root.style.setProperty('--menu-bar-border-color', themeData.menuBar.borderColor);
        
        // ステータスバー関連
        root.style.setProperty('--status-bar-bg-color', themeData.statusBar.backgroundColor);
        root.style.setProperty('--status-bar-text-color', themeData.statusBar.textColor);
        
        // 行ハイライト関連
        root.style.setProperty('--line-highlight-bg-color', themeData.lineHighlight.backgroundColor);
        
        currentTheme = themeId;
        saveThemeToStorage(themeId);
        
        console.log(`✅ Theme applied: ${themeId}`);
        return true;
        
    } catch (error) {
        console.error('❌ Failed to apply theme:', error);
        return false;
    }
}

/**
 * 外部テーマファイルから読み込み
 */
/**
 * 外部テーマファイルから読み込み
 */
async function loadThemeFromFile(themeId) {
    if (!window.__TAURI__?.fs || !themesDirectory) {
        console.log('⚠️ Tauri FS or themes directory not available');
        return null;
    }
    
    try {
        const { readTextFile } = window.__TAURI__.fs;
        const { join } = window.__TAURI__.path;
        const filePath = await join(themesDirectory, `${themeId}.json`);
        
        console.log(`📖 Reading theme file: ${filePath}`);
        const content = await readTextFile(filePath);
        const langData = JSON.parse(content);
        
        console.log(`✅ Theme file loaded: ${themeId}`);
        
        // _metaを除いて実際のテーマデータを返す
        const { _meta, ...actualThemeData } = langData;
        return actualThemeData;
        
    } catch (error) {
        console.error(`❌ Failed to load theme file ${themeId}.json:`, error);
        return null;
    }
}

/**
 * テーマダイアログを表示
 */
export function showThemeDialog() {
    console.log('🎨 Opening theme dialog');
    closeAllMenus();
    
    const existingDialog = document.getElementById('theme-dialog-overlay');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    createThemeDialog();
}

/**
 * テーマダイアログの作成
 */
function createThemeDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'theme-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay theme-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog theme-dialog';
    
    dialog.innerHTML = `
        <div class="search-dialog-header">${t('theme.title')}</div>
        <div class="search-dialog-content">
            <div class="search-input-group">
                <label for="theme-select">${t('theme.selectLabel')}</label>
                <select id="theme-select" class="theme-select">
                    ${availableThemes.map(theme => 
                        `<option value="${theme.id}" ${theme.id === currentTheme ? 'selected' : ''}>
                            ${theme.nativeName}
                        </option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="theme-preview-section">
                <label>${t('theme.preview')}</label>
                <div id="theme-preview" class="theme-preview">
                    <div class="preview-menubar">${t('menu.file')} ${t('menu.edit')} ${t('menu.view')}</div>
                    <div class="preview-editor">
                        <div class="preview-line-numbers">1<br>2<br>3</div>
                        <div class="preview-text">function hello() {<br>    console.log('Hello!');<br>}</div>
                    </div>
                    <div class="preview-statusbar">${t('statusBar.line')}: 1, ${t('statusBar.column')}: 1</div>
                </div>
            </div>
            
            <div class="search-button-group">
                <button id="theme-apply-btn" class="search-button search-button-primary">${t('theme.buttons.apply')}</button>
                <button id="theme-cancel-btn" class="search-button search-button-cancel">${t('theme.buttons.cancel')}</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    // ダイアログをドラッグ可能にする
    makeDraggable(dialog);
    
    setupThemeDialogEvents(dialogOverlay);
    
    // 初期プレビューを設定（少し遅延させて確実にDOM要素が利用可能にする）
    setTimeout(() => {
        console.log('🎨 Setting initial preview...');
        updateThemePreview();
    }, 200);
    
    updateThemePreview();
    
    setTimeout(async () => {
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.focus();
            // フォーカス時に初回プレビューも更新（非同期）
            await updateThemePreview();
        }
    }, 100);
}

/**
 * テーマリストを再読み込みしてセレクトボックスを更新
 */
async function refreshThemeList(themeSelect) {
    try {
        // テーマを再読み込み
        await loadThemes();
        
        // 現在選択されているテーマを保存
        const currentSelection = themeSelect.value;
        
        // セレクトボックスの選択肢を更新
        themeSelect.innerHTML = '';
        availableThemes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.id;
            option.textContent = theme.nativeName;
            option.selected = theme.id === currentSelection;
            themeSelect.appendChild(option);
        });
        
        console.log(`🎨 Theme list refreshed: ${availableThemes.length} themes found`);
        
    } catch (error) {
        console.error('❌ Failed to refresh theme list:', error);
    }
}


/**
 * テーマダイアログのイベント設定
 */
function setupThemeDialogEvents(dialogOverlay) {
    const themeSelect = document.getElementById('theme-select');
    const applyBtn = document.getElementById('theme-apply-btn');
    const cancelBtn = document.getElementById('theme-cancel-btn');
    
    let selectedTheme = currentTheme;
    
    // セレクトボックスが開かれた時に最新のテーマリストを読み込み
    themeSelect.addEventListener('focus', async () => {
        console.log('🎨 Theme select focused - reloading themes...');
        await refreshThemeList(themeSelect);
    });
    
    themeSelect.addEventListener('click', async () => {
        console.log('🎨 Theme select clicked - reloading themes...');
        await refreshThemeList(themeSelect);
    });
    
    // テーマ選択変更
    themeSelect.addEventListener('change', async () => {
        console.log('🎨 Theme selection changed to:', themeSelect.value);
        selectedTheme = themeSelect.value;
        await updateThemePreview();
    });
    
    // 適用ボタン
    applyBtn.addEventListener('click', async () => {
        const success = await applyTheme(selectedTheme);
        if (success) {
            closeThemeDialog(dialogOverlay);
        }
    });
    
    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
        closeThemeDialog(dialogOverlay);
    });
    
    // ESCキーでキャンセル
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            closeThemeDialog(dialogOverlay);
        }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeThemeDialog(dialogOverlay);
        }
    });
    
    dialogOverlay.addEventListener('remove', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
}

/**
 * テーマプレビューを更新（外部テーマファイル対応）
 */
async function updateThemePreview() {
    const preview = document.getElementById('theme-preview');
    const themeSelect = document.getElementById('theme-select');
    
    console.log('🎨 updateThemePreview called');
    console.log('Preview element:', preview);
    console.log('Theme select element:', themeSelect);
    
    if (!preview || !themeSelect) {
        console.warn('⚠️ Preview or theme select element not found');
        return;
    }
    
    const selectedThemeId = themeSelect.value;
    console.log('🎨 Selected theme ID:', selectedThemeId);
    
    let themeData = null;
    
    // まず外部ファイルから読み込みを試行
    if (isThemeSystemEnabled && themesDirectory) {
        console.log('🎨 Trying to load theme from external file...');
        const externalThemeData = await loadThemeFromFile(selectedThemeId);
        if (externalThemeData) {
            // _metaを除いて実際のテーマデータを取得
            themeData = externalThemeData;
            console.log('✅ External theme data loaded:', themeData);
        }
    }
    
    // 外部ファイルが見つからない場合はデフォルトテーマから取得
    if (!themeData && DEFAULT_THEMES[selectedThemeId]) {
        themeData = DEFAULT_THEMES[selectedThemeId];
        console.log('📦 Using default theme data:', themeData);
    }
    
    console.log('🎨 Final theme data:', themeData);
    
    if (themeData) {
        // プレビュー要素の子要素を直接スタイリング
        const menubar = preview.querySelector('.preview-menubar');
        const editor = preview.querySelector('.preview-editor');
        const lineNumbers = preview.querySelector('.preview-line-numbers');
        const text = preview.querySelector('.preview-text');
        const statusbar = preview.querySelector('.preview-statusbar');
        
        console.log('🎨 Found preview elements:', {
            menubar: !!menubar,
            editor: !!editor,
            lineNumbers: !!lineNumbers,
            text: !!text,
            statusbar: !!statusbar
        });
        
        if (menubar) {
            menubar.style.backgroundColor = themeData.menuBar.backgroundColor;
            menubar.style.color = themeData.menuBar.textColor;
            menubar.style.borderBottomColor = themeData.lineNumbers.borderColor;
        }
        
        if (lineNumbers) {
            lineNumbers.style.backgroundColor = themeData.lineNumbers.backgroundColor;
            lineNumbers.style.color = themeData.lineNumbers.textColor;
            lineNumbers.style.borderRightColor = themeData.lineNumbers.borderColor;
        }
        
        if (text) {
            text.style.backgroundColor = themeData.editor.backgroundColor;
            text.style.color = themeData.editor.textColor;
        }
        
        if (statusbar) {
            statusbar.style.backgroundColor = themeData.statusBar.backgroundColor;
            statusbar.style.color = themeData.statusBar.textColor;
        }
        
        // プレビュー全体の背景も設定
        preview.style.backgroundColor = themeData.editor.backgroundColor;
        preview.style.color = themeData.editor.textColor;
        
        console.log(`✅ Preview updated for theme: ${selectedThemeId}`);
    } else {
        console.warn(`⚠️ Theme data not found for: ${selectedThemeId}`);
    }
}

/**
 * テーマダイアログを閉じる
 */
function closeThemeDialog(dialogOverlay) {
    try {
        document.body.removeChild(dialogOverlay);
        
        setTimeout(() => {
            const editor = document.getElementById('editor');
            if (editor && editor.focus) {
                editor.focus();
            }
        }, 100);
    } catch (error) {
        console.warn('⚠️ Error closing theme dialog:', error);
    }
}

/**
 * テーマシステムを初期化
 */
export async function initializeThemeSystem() {
    console.log('🎨 Initializing theme system...');
    
    try {
        // テーマディレクトリを取得
        themesDirectory = await getThemesDirectory();
        if (!themesDirectory) {
            throw new Error('設定ファイル保存場所が取得できませんでした');
        }
        
        // テーマディレクトリを作成
        await ensureThemesDirectory();
        
        // デフォルトテーマファイルを作成
        await createDefaultThemeFiles();
        
        // テーマを読み込み
        await loadThemes();
        
        isThemeSystemEnabled = true;
        
        // 保存されたテーマを適用
        const savedTheme = loadThemeFromStorage();
        await applyTheme(savedTheme);
        
        console.log('✅ Theme system initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Theme system initialization failed:', error);
        alert(error.message);
        
        // フォールバックテーマシステム
        isThemeSystemEnabled = false;
        availableThemes = [
            { id: 'dark', name: 'Dark Theme', nativeName: 'ダークテーマ' },
            { id: 'light', name: 'Light Theme', nativeName: 'ライトテーマ' }
        ];
        await applyTheme('dark');
        
        return false;
    }
}

/**
 * 利用可能なテーマ一覧を取得
 */
export function getAvailableThemes() {
    return [...availableThemes];
}

/**
 * 現在のテーマを取得
 */
export function getCurrentTheme() {
    return currentTheme;
}

/**
 * テーマ設定をローカルストレージに保存
 */
function saveThemeToStorage(themeId) {
    try {
        localStorage.setItem('vinsert-theme', themeId);
        console.log(`💾 Theme saved to storage: ${themeId}`);
    } catch (error) {
        console.warn('⚠️ Could not save theme to localStorage:', error);
    }
}

/**
 * ローカルストレージからテーマ設定を読み込み
 */
function loadThemeFromStorage() {
    try {
        const savedTheme = localStorage.getItem('vinsert-theme');
        if (savedTheme && availableThemes.some(t => t.id === savedTheme)) {
            return savedTheme;
        }
    } catch (error) {
        console.warn('⚠️ Could not load theme from localStorage:', error);
    }
    
    return 'dark'; // デフォルト
}

/**
 * 言語設定ダイアログを表示（機能拡張メニュー用）
 */
export async function showLanguageSettingsDialog() {
    console.log('🌐 Opening language settings dialog');
    closeAllMenus();
    
    // 既存のダイアログがあれば削除
    const existingDialog = document.getElementById('language-dialog-overlay');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    // locales.jsから必要な関数をインポート
    const { getAvailableLanguages, getCurrentLanguage, changeLanguage, loadExternalLanguages } = await import('./locales.js');
    
    // 最新の言語リストを取得するため再読み込み
    try {
        await loadExternalLanguages();
    } catch (error) {
        console.warn('⚠️ Could not reload external languages:', error);
    }
    
    const availableLanguages = getAvailableLanguages();
    const currentLanguage = getCurrentLanguage();
    
    // ダイアログを作成
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'language-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay language-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog language-dialog';
    
    dialog.innerHTML = `
        <div class="search-dialog-header">${t('extensionsMenu.languageSettings')}</div>
        <div class="search-dialog-content">
            <div class="search-input-group">
                <label for="language-dialog-select">${t('fonts.title').replace('フォント設定', '言語選択').replace('Font Settings', 'Language Selection').replace('Paramètres de police', 'Sélection de langue')}</label>
                <select id="language-dialog-select" class="theme-select">
                    ${availableLanguages.map(lang => 
                        `<option value="${lang.code}" ${lang.code === currentLanguage ? 'selected' : ''}>
                            ${lang.nativeName} (${lang.code.toUpperCase()})
                        </option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="language-info-section">
                <div style="margin-top: 20px; padding: 12px; background-color: #37373d; border-radius: 4px; font-size: 13px; color: #cccccc;">
                    <div style="margin-bottom: 8px;">
                        <strong>現在の言語 / Current Language:</strong> 
                        <span id="current-language-display">${availableLanguages.find(l => l.code === currentLanguage)?.nativeName || currentLanguage}</span>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>利用可能な言語数 / Available Languages:</strong> 
                        <span>${availableLanguages.length}</span>
                    </div>
                    <div>
                        <strong>言語ファイルの場所 / Language Files Location:</strong>
                        <div style="font-size: 11px; margin-top: 4px; word-break: break-all; opacity: 0.8;">
                            ~/Library/Application Support/com.saigetsudo.vinsert/vinsert/locale/
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="search-button-group">
                <button id="language-apply-btn" class="search-button search-button-primary">${t('fonts.buttons.apply')}</button>
                <button id="language-cancel-btn" class="search-button search-button-cancel">${t('fonts.buttons.cancel')}</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    // ダイアログをドラッグ可能にする
    makeDraggable(dialog);
    
    // イベントリスナーを設定
    setupLanguageDialogEvents(dialogOverlay, currentLanguage);
    
    // セレクトボックスにフォーカス
    setTimeout(() => {
        const langSelect = document.getElementById('language-dialog-select');
        if (langSelect) {
            langSelect.focus();
        }
    }, 100);
}

/**
 * 言語設定ダイアログのイベント設定
 */
async function setupLanguageDialogEvents(dialogOverlay, originalLanguage) {
    const langSelect = document.getElementById('language-dialog-select');
    const applyBtn = document.getElementById('language-apply-btn');
    const cancelBtn = document.getElementById('language-cancel-btn');
    const currentLangDisplay = document.getElementById('current-language-display');
    
    const { getAvailableLanguages, changeLanguage } = await import('./locales.js');
    
    let selectedLanguage = originalLanguage;
    
    // 言語選択変更時のプレビュー
    langSelect.addEventListener('change', () => {
        selectedLanguage = langSelect.value;
        const languages = getAvailableLanguages();
        const langInfo = languages.find(l => l.code === selectedLanguage);
        if (langInfo && currentLangDisplay) {
            currentLangDisplay.textContent = `${langInfo.nativeName} (変更後 / After change)`;
            currentLangDisplay.style.color = '#ffcc00';
        }
    });
    
    // 適用ボタン
    applyBtn.addEventListener('click', async () => {
        if (selectedLanguage !== originalLanguage) {
            const success = await changeLanguage(selectedLanguage);
            if (success) {
                console.log(`✅ Language changed to: ${selectedLanguage}`);
                
                // UI全体を更新
                window.dispatchEvent(new CustomEvent('languageChanged', {
                    detail: { language: selectedLanguage }
                }));
            }
        }
        closeLanguageDialog(dialogOverlay);
    });
    
    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
        closeLanguageDialog(dialogOverlay);
    });
    
    // ESCキーでキャンセル
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            closeLanguageDialog(dialogOverlay);
        }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeLanguageDialog(dialogOverlay);
        }
    });
    
    // クリーンアップ
    dialogOverlay.addEventListener('remove', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
}

/**
 * 言語設定ダイアログを閉じる
 */
function closeLanguageDialog(dialogOverlay) {
    try {
        document.body.removeChild(dialogOverlay);
        
        setTimeout(() => {
            const editor = document.getElementById('editor');
            if (editor && editor.focus) {
                editor.focus();
            }
        }, 100);
    } catch (error) {
        console.warn('⚠️ Error closing language dialog:', error);
    }
}