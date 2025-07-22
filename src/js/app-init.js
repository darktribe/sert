/*
 * =====================================================
 * Vinsert Editor - アプリケーション初期化（正しい行番号表示対応版）
 * =====================================================
 */

import { setEditor, setCurrentContent, setTauriInvoke } from './globals.js';
import { initializeUndoStack } from './undo-redo.js';
import { updateLineNumbers, updateStatus, updateWindowTitle, updateFontSizeDisplay, getCurrentLogicalLineNumber, getCurrentColumnNumber } from './ui-updater.js';
import { setupEventListeners } from './event-listeners.js';
import { exitApp } from './app-exit.js';
import { initializeI18n, t, updateElementText } from './locales.js';
import { createLanguageSwitcher } from './language-switcher.js';
import { loadFontSettings } from './font-settings.js';
import { loadTypewriterSettings } from './typewriter-mode.js';

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
        i18nElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                element.textContent = t(key);
            }
        });
        
        // data-i18n-placeholder属性を持つ要素のplaceholderを更新
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (key) {
                element.placeholder = t(key);
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
 * ステータスバーの多言語化（論理行・列番号対応）
 */
function updateStatusBarI18n() {
    const cursorPosition = document.getElementById('cursor-position');
    const charCount = document.getElementById('char-count');
    const fontSizeDisplay = document.getElementById('font-size-display');
    
    if (cursorPosition) {
        // 論理行・列番号を表示（初期値）
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
        console.log('🌐 Language changed, updating UI...');
        applyI18nToUI();
        
        // 言語切り替えUIの状態も更新
        import('./language-switcher.js').then(module => {
            module.updateLanguageSwitcherState();
        });
        
        // フォントサイズ表示も更新
        updateFontSizeDisplay();
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
    
    // タイプライターモード設定の初期化（新機能）
    console.log('📝 Initializing typewriter mode settings...');
    loadTypewriterSettings();
    
    // イベントリスナーを設定
    setupEventListeners();
    
    // 言語変更イベントリスナーを設定
    setupLanguageChangeListener();
    
    // UIに多言語化を適用
    applyI18nToUI();
    
    // 言語切り替えUIを作成
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
    
    // 機能の説明をコンソールに表示
    console.log('🔧 機能が正常に初期化されました:');
    console.log('  📊 行番号: 論理行のみ表示（改行文字でのみ増加）');
    console.log('  🔤 ワードラップ: 視覚的な折り返しのみ（行番号は増加しない）');
    console.log('  🔍 ステータスバー: 論理行・列番号を表示');
    console.log('  ⌨️  Tab機能: Tab（インデント追加）、Shift+Tab（インデント削除）');
    console.log('  🎨 フォント機能: サイズ変更・直接入力・ステータス表示');
    console.log('  📝 タイプライターモード: 視覚行でスクロール、論理行で行番号表示');
}

/**
 * ステータス更新時の多言語化対応（論理行・列番号版）
 */
export function updateStatusI18n(line, column, charCount) {
    const cursorPosition = document.getElementById('cursor-position');
    const charCountElement = document.getElementById('char-count');
    
    if (cursorPosition) {
        // 論理行・列番号を表示
        cursorPosition.textContent = `${t('statusBar.line')}: ${line}, ${t('statusBar.column')}: ${column}`;
    }
    
    if (charCountElement) {
        charCountElement.textContent = `${t('statusBar.charCount')}: ${charCount}`;
    }
}

/**
 * リアルタイムステータス更新（論理行・列番号対応）
 */
export function updateCurrentStatus() {
    if (!window.editor) return;
    
    const logicalLine = getCurrentLogicalLineNumber();
    const column = getCurrentColumnNumber();
    const charCount = window.editor.value.length;
    
    updateStatusI18n(logicalLine, column, charCount);
}