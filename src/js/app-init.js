/*
 * =====================================================
 * Vinsert Editor - アプリケーション初期化（フォントサイズ表示対応版）
 * =====================================================
 */

import { setEditor, setCurrentContent, setTauriInvoke } from './globals.js';
import { initializeUndoStack } from './undo-redo.js';
import { updateLineNumbers, updateStatus, updateWindowTitle, updateFontSizeDisplay } from './ui-updater.js';
import { setupEventListeners } from './event-listeners.js';
import { exitApp } from './app-exit.js';
import { initializeI18n, t, updateElementText } from './locales.js';
import { createLanguageSwitcher } from './language-switcher.js';
import { loadFontSettings } from './font-settings.js';
import { loadLineHighlightSetting } from './globals.js';
import { initializeLineHighlight } from './line-highlight.js';
import { initializeThemeSystem } from './theme-manager.js';

/**
 * Tauri APIの初期化
 * ウィンドウクローズイベントの設定も行う
 */
async function initializeTauri() {
    try {
        console.log('Initializing Tauri...');
        console.log('window.__TAURI__:', typeof window.__TAURI__);
        
        if (window.__TAURI__ && window.__TAURI__.core) {
            console.log('Tauri core found, setting up invoke');
            setTauriInvoke(window.__TAURI__.core.invoke);
            console.log('Tauri invoke set up successfully');
            
            // ウィンドウクローズイベントの設定
            if (window.__TAURI__.window) {
                console.log('Setting up window close handler');
                const { getCurrentWindow } = window.__TAURI__.window;
                const currentWindow = getCurrentWindow();
                
                await currentWindow.onCloseRequested(async (event) => {
                    console.log('🚪 Window close requested via X button');
                    event.preventDefault();
                    
                    // 直接exitAppを呼び出し（フラグ管理や遅延を削除）
                    try {
                        console.log('🚪 Calling exitApp from window close event');
                        await exitApp();
                    } catch (error) {
                        console.error('❌ Window close exitApp failed:', error);
                        // エラー時は強制終了
                        await currentWindow.close();
                    }
                });
                console.log('Window close handler set up');
            }
            
            // Tauri APIs の確認
            console.log('Tauri.fs available:', !!window.__TAURI__.fs);
            console.log('Tauri.dialog available:', !!window.__TAURI__.dialog);
            console.log('Tauri.clipboard available:', !!window.__TAURI__.clipboard);
            console.log('Tauri.window available:', !!window.__TAURI__.window);
            
        } else {
            console.log('Tauri core not available');
        }
    } catch (error) {
        console.error('Tauri API initialization failed:', error);
    }
}

/**
 * UIの多言語化を適用
 */
function applyI18nToUI() {
    console.log('🌐 Applying i18n to UI...');
    
    try {
        // data-i18n属性を持つ要素を更新
        const i18nElements = document.querySelectorAll('[data-i18n]');
        console.log(`🔍 Found ${i18nElements.length} elements with data-i18n`);
        
        i18nElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                const translatedText = t(key);
                element.textContent = translatedText;
                console.log(`🌐 Updated element: ${key} -> ${translatedText}`);
            }
        });
        
        // data-i18n-placeholder属性を持つ要素のplaceholderを更新
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        console.log(`🔍 Found ${placeholderElements.length} elements with data-i18n-placeholder`);
        
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (key) {
                const translatedText = t(key);
                element.placeholder = translatedText;
                console.log(`🌐 Updated placeholder: ${key} -> ${translatedText}`);
            }
        });
        
        // ステータスバーの初期化
        updateStatusBarI18n();
        
        console.log('✅ UI i18n applied successfully');
    } catch (error) {
        console.error('❌ Failed to apply i18n to UI:', error);
    }
}

/**
 * ステータスバーの多言語化（フォントサイズ表示対応）
 */
function updateStatusBarI18n() {
    const cursorPosition = document.getElementById('cursor-position');
    const charCount = document.getElementById('char-count');
    const fontSizeDisplay = document.getElementById('font-size-display');
    
    if (cursorPosition) {
        cursorPosition.textContent = `${t('statusBar.line')}: 1, ${t('statusBar.column')}: 1`;
    }
    
    if (charCount) {
        charCount.textContent = `${t('statusBar.charCount')}: 0`;
    }
    
    if (fontSizeDisplay) {
        // フォントサイズ表示の初期化（loadFontSettings後に正確な値で更新される）
        fontSizeDisplay.textContent = `${t('statusBar.fontSize')}: 14px`;
    }
}

/**
 * 言語変更イベントのリスナーを設定
 */
function setupLanguageChangeListener() {
    window.addEventListener('languageChanged', (event) => {
        console.log('🌐 Language changed event received, updating UI...');
        console.log('🎯 New language:', event.detail?.language);
        
        // UI更新を実行
        applyI18nToUI();
        
        // 言語切り替えUIの状態も更新
        import('./language-switcher.js').then(module => {
            module.updateLanguageSwitcherState();
        });
        
        // フォントサイズ表示も更新
        updateFontSizeDisplay();
        
        console.log('✅ UI updated for new language');
    });
}

/**
 * アプリケーション初期化
 */
export async function initializeApp() {
    console.log('Starting app initialization...');
    
    // 多言語化システムの初期化
    console.log('🌐 Initializing i18n system...');
    const i18nSuccess = await initializeI18n();
    if (!i18nSuccess) {
        console.error('❌ Failed to initialize i18n system');
    }
    
    await initializeTauri();
    
    // 外部ファイルシステムの初期化を試行
    try {
        console.log('🌐 Starting external file system initialization...');
        console.log('🔍 Importing locales module...');
        const localesModule = await import('./locales.js');
        console.log('✅ Locales module imported successfully');
        console.log('🔍 Calling tryExternalFileSystem...');
        await localesModule.tryExternalFileSystem();
        console.log('✅ External file system initialization completed');
    } catch (error) {
        console.error('❌ External file system initialization failed:', error);
        console.warn('⚠️ Using fallback system - app will continue normally');
        // エラーがあってもフォールバックシステムで続行
    }
    
    const editorElement = document.getElementById('editor');
    if (!editorElement) {
        console.error('Editor element not found');
        return;
    }
    
    console.log('Editor element found, setting up...');
    setEditor(editorElement);
    
    // エディタの初期設定
    setCurrentContent(editorElement.value);
    initializeUndoStack();
    
    // フォント設定の初期化
    console.log('🎨 Initializing font settings...');
    loadFontSettings();
    
    // 行ハイライト設定の初期化
    console.log('🎨 Initializing line highlight settings...');
    loadLineHighlightSetting();
    initializeLineHighlight();
    
    // テーマシステムの初期化
    console.log('🎨 Initializing theme system...');
    try {
        await initializeThemeSystem();
    } catch (error) {
        console.error('❌ Theme system initialization failed:', error);
    }
    
    // イベントリスナーを設定
    setupEventListeners();
    
    // 外部ファイルシステムの初期化を試行
    console.log('🌐 Starting external file system initialization...');
    try {
        const { tryExternalFileSystem } = await import('./locales.js');
        await tryExternalFileSystem();
        console.log('✅ External file system initialization completed');
    } catch (error) {
        console.error('❌ External file system initialization failed:', error);
        console.warn('⚠️ Using fallback system');
    }
    
    // 言語変更イベントリスナーを設定
    setupLanguageChangeListener();
    
    // UIに多言語化を適用
    applyI18nToUI();
    
    // 言語切り替えUIを作成（多言語化システム初期化後）
    console.log('🌐 Creating language switcher...');
    createLanguageSwitcher();
    
    // 初期UI更新
    updateLineNumbers();
    updateStatus();
    
    // フォントサイズ表示の初期化
    console.log('🎨 Initializing font size display...');
    updateFontSizeDisplay();
    
    // 初期タイトル設定を追加
    console.log('🏷️ Setting initial window title...');
    await updateWindowTitle();
    
    // カーソルを1行目1列目に設定
    editorElement.setSelectionRange(0, 0);
    editorElement.focus();
    
    console.log('App initialization completed');
    
    // Tab機能の使用方法をコンソールに表示
    console.log('🔧 Tab機能が有効になりました:');
    console.log('  - Tab: インデント追加（タブ文字挿入）');
    console.log('  - Shift+Tab: インデント削除');
    console.log('  - 複数行選択してShift+Tab: 選択行全体のインデント削除');
    console.log('🎨 フォントサイズ表示機能が有効になりました:');
    console.log('  - ステータスバーに現在のフォントサイズが表示されます');
    console.log('  - 表示メニュー > フォントサイズ指定で直接数値入力できます');
}

/**
 * ステータス更新時の多言語化対応（他のモジュールから呼び出される）
 */
export function updateStatusI18n(line, column, charCount) {
    const cursorPosition = document.getElementById('cursor-position');
    const charCountElement = document.getElementById('char-count');
    
    if (cursorPosition) {
        cursorPosition.textContent = `${t('statusBar.line')}: ${line}, ${t('statusBar.column')}: ${column}`;
    }
    
    if (charCountElement) {
        charCountElement.textContent = `${t('statusBar.charCount')}: ${charCount}`;
    }
}