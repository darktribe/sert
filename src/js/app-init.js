/*
 * =====================================================
 * Sert Editor - アプリケーション初期化（Tauri 2.5専用・安全版）
 * ドラッグアンドドロップ・ファイル関連付け対応（修正版）
 * =====================================================
 */

import { setEditor, setCurrentContent, setTauriInvoke, setCurrentFilePath, setIsModified, initializeGlobalState } from './globals.js';
import { initializeUndoStack } from './undo-redo.js';
import { updateLineNumbers, updateStatus, updateWindowTitle } from './ui-updater.js';
import { setupEventListeners } from './event-listeners.js';
import { exitApp } from './app-exit.js';
import { initializeI18n, t } from './locales.js';
import { createLanguageSwitcher } from './language-switcher.js';

/**
 * Tauri APIの初期化 - Tauri 2.5専用版
 */
async function initializeTauri() {
    try {
        console.log('🔧 Initializing Tauri 2.5...');
        
        if (window.__TAURI__ && window.__TAURI__.core) {
            console.log('✅ Tauri core found, setting up invoke');
            setTauriInvoke(window.__TAURI__.core.invoke);
            
            // ウィンドウクローズイベントの設定
            if (window.__TAURI__.window) {
                console.log('🚪 Setting up window close handler');
                const { getCurrent } = window.__TAURI__.window;
                const currentWindow = getCurrent();
                
                await currentWindow.onCloseRequested(async (event) => {
                    console.log('🚪 Window close requested via X button');
                    event.preventDefault();
                    
                    try {
                        await exitApp();
                    } catch (error) {
                        console.error('❌ Window close exitApp failed:', error);
                        await currentWindow.close();
                    }
                });
                console.log('✅ Window close handler set up');
            }
            
            // Tauri 2.5専用のファイルイベント設定
            if (window.__TAURI__.event) {
                console.log('🗂️ Setting up file event listeners (Tauri 2.5)');
                
                try {
                    // 新しいウィンドウでファイルを開くイベント
                    await window.__TAURI__.event.listen('open-file-on-start', (event) => {
                        console.log('📂 Open file on start event received:', event.payload);
                        handleOpenFileEventSafe(event.payload);
                    });
                    
                    // 現在のウィンドウでファイルを開くイベント
                    await window.__TAURI__.event.listen('open-file-in-current', (event) => {
                        console.log('📂 Open file in current window event received:', event.payload);
                        handleOpenFileEventSafe(event.payload);
                    });
                    
                    // 変更状態チェック要求イベント（修正版）
                    await window.__TAURI__.event.listen('request-modification-status', (event) => {
                        console.log('📁 Modification status request received:', event.payload);
                        handleModificationStatusRequestSafe(event.payload);
                    });
                    
                    console.log('✅ File event listeners set up successfully');
                } catch (eventError) {
                    console.error('❌ Failed to set up event listeners:', eventError);
                }
            }
            
            console.log('✅ Tauri 2.5 initialization completed');
        } else {
            console.log('⚠️ Tauri core not available - running in browser mode');
        }
    } catch (error) {
        console.error('❌ Tauri API initialization failed:', error);
    }
}

/**
 * 起動時のファイルパスを取得して開く
 */
async function handleStartupFile() {
    try {
        console.log('🔍 Checking for startup file...');
        
        if (window.__TAURI__ && window.__TAURI__.core) {
            const startupFilePath = await window.__TAURI__.core.invoke('get_startup_file_path');
            
            if (startupFilePath) {
                console.log('📂 Startup file found:', startupFilePath);
                await openFileFromPathSafe(startupFilePath);
            } else {
                console.log('📄 No startup file specified');
            }
        }
    } catch (error) {
        console.error('❌ Failed to handle startup file:', error);
    }
}

/**
 * 変更状態チェック要求を処理する（Tauri 2.5専用版）
 */
async function handleModificationStatusRequestSafe(payload) {
    try {
        // payload の構造を確認
        let filePath, windowLabel;
        
        if (typeof payload === 'string') {
            // 古い形式の場合
            filePath = payload;
            windowLabel = 'main';
        } else if (payload && typeof payload === 'object') {
            // 新しい形式の場合
            filePath = payload.filePath || payload;
            windowLabel = payload.windowLabel || 'main';
        } else {
            throw new Error('Invalid payload format');
        }
        
        console.log('📁 Processing modification status request:');
        console.log('  File:', filePath);
        console.log('  Window:', windowLabel);
        
        // 安全にグローバル状態を取得
        const isCurrentlyModified = window.isModified || false;
        console.log('📝 Current modification status:', isCurrentlyModified);
        
        if (window.__TAURI__ && window.__TAURI__.core) {
            try {
                // Rustコマンドを呼び出して適切な動作を実行
                const result = await window.__TAURI__.core.invoke('handle_file_drop_with_modification_check', {
                    app_handle: {}, // Tauri 2.5 では app_handle は自動で渡される
                    window_label: windowLabel,
                    file_path: filePath,
                    is_modified: isCurrentlyModified
                });
                
                console.log('✅ File drop handled successfully:', result);
            } catch (invokeError) {
                console.error('❌ Failed to invoke file drop handler:', invokeError);
                throw invokeError;
            }
        }
    } catch (error) {
        console.error('❌ Failed to handle modification status request:', error);
        
        // エラー時のフォールバック：新しいウィンドウを作成
        try {
            if (window.__TAURI__ && window.__TAURI__.core) {
                console.log('🔄 Attempting fallback: creating new window');
                const filePath = typeof payload === 'string' ? payload : (payload.filePath || payload);
                await window.__TAURI__.core.invoke('create_new_window_with_file', {
                    file_path: filePath
                });
                console.log('✅ Fallback new window created successfully');
            }
        } catch (fallbackError) {
            console.error('❌ Fallback new window creation also failed:', fallbackError);
        }
    }
}

/**
 * ファイルを開くイベントを処理（安全版）
 */
async function handleOpenFileEventSafe(filePath) {
    try {
        console.log('📁 Processing file open event:', filePath);
        
        // ファイルパスの妥当性をチェック
        if (window.__TAURI__ && window.__TAURI__.core) {
            const isValid = await window.__TAURI__.core.invoke('validate_file_path', { path: filePath });
            
            if (isValid) {
                console.log('✅ Valid file path, opening file');
                await openFileFromPathSafe(filePath);
            } else {
                console.error('❌ Invalid file path:', filePath);
                showFileErrorMessage(t('messages.openError', { error: 'Invalid file path' }));
            }
        }
    } catch (error) {
        console.error('❌ Failed to handle file open event:', error);
        showFileErrorMessage(t('messages.openError', { error: error.message }));
    }
}

/**
 * パスからファイルを開く共通処理（安全版）
 */
async function openFileFromPathSafe(filePath) {
    try {
        console.log('📖 Opening file from path:', filePath);
        
        let content;
        
        if (window.__TAURI__ && window.__TAURI__.fs) {
            console.log('📖 Using Tauri fs API to read file');
            content = await window.__TAURI__.fs.readTextFile(filePath);
        } else if (window.__TAURI__ && window.__TAURI__.core) {
            console.log('📖 Using Tauri invoke to read file');
            content = await window.__TAURI__.core.invoke('read_file', { path: filePath });
        } else {
            throw new Error(t('messages.tauriOnly'));
        }
        
        console.log(`📖 File content loaded: ${content.length} characters`);
        
        // エディタに設定してアンドゥスタックを完全リセット
        const editorElement = document.getElementById('editor');
        if (editorElement) {
            console.log('📝 Setting content in editor...');
            
            // エディタの状態を更新
            editorElement.value = content;
            
            // DOM更新イベントを安全に発火
            try {
                editorElement.dispatchEvent(new Event('input', { bubbles: true }));
            } catch (eventError) {
                console.warn('⚠️ Failed to dispatch input event:', eventError);
            }
            
            console.log('📝 Updating global state');
            setCurrentFilePath(filePath);
            setIsModified(false);
            setCurrentContent(content);
            
            // アンドゥスタックを完全リセット
            console.log('📝 Resetting undo/redo stacks');
            const { undoStack, redoStack } = await import('./globals.js');
            undoStack.length = 0;
            redoStack.length = 0;
            
            // ファイル内容で初期化
            console.log('📝 Initializing undo stack');
            initializeUndoStack();
            
            console.log('📝 Updating UI');
            updateLineNumbers();
            updateStatus();
            
            // タイトル更新
            console.log('🏷️ Updating window title');
            await updateWindowTitle();
            
            console.log('✅ File opened successfully:', filePath);
            
            // エディタにフォーカスを設定
            setTimeout(() => {
                console.log('📝 Setting focus to editor');
                editorElement.focus();
                editorElement.setSelectionRange(0, 0);
            }, 100);
            
        } else {
            console.error('❌ Editor element not found');
            throw new Error('Editor element not found');
        }
    } catch (error) {
        console.error('❌ Failed to open file from path:', error);
        showFileErrorMessage(t('messages.openError', { error: error.message }));
    }
}

/**
 * ファイルエラーメッセージを表示（安全版）
 */
function showFileErrorMessage(message) {
    try {
        console.error('📢 Showing error message:', message);
        alert(message);
    } catch (error) {
        console.error('❌ Failed to show error message:', error);
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
 * ステータスバーの多言語化
 */
function updateStatusBarI18n() {
    const cursorPosition = document.getElementById('cursor-position');
    const charCount = document.getElementById('char-count');
    
    if (cursorPosition) {
        cursorPosition.textContent = `${t('statusBar.line')}: 1, ${t('statusBar.column')}: 1`;
    }
    
    if (charCount) {
        charCount.textContent = `${t('statusBar.charCount')}: 0`;
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
    });
}

/**
 * アプリケーション初期化（Tauri 2.5専用版）
 */
export async function initializeApp() {
    console.log('🚀 Starting app initialization (Tauri 2.5)...');
    
    try {
        // グローバル変数の初期化
        initializeGlobalState();
        
        // 多言語化システムの初期化
        console.log('🌐 Initializing i18n system...');
        const i18nSuccess = await initializeI18n();
        if (!i18nSuccess) {
            console.error('❌ Failed to initialize i18n system');
        }
        
        await initializeTauri();
        
        const editorElement = document.getElementById('editor');
        if (!editorElement) {
            console.error('❌ Editor element not found');
            return;
        }
        
        console.log('✅ Editor element found, setting up...');
        setEditor(editorElement);
        
        // エディタの初期設定
        setCurrentContent(editorElement.value);
        initializeUndoStack();
        
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
        
        // 初期タイトル設定
        console.log('🏷️ Setting initial window title...');
        await updateWindowTitle();
        
        // 起動時のファイル処理
        await handleStartupFile();
        
        // カーソルを1行目1列目に設定
        editorElement.setSelectionRange(0, 0);
        editorElement.focus();
        
        console.log('🎯 App initialization completed successfully (Tauri 2.5)');
        console.log('🗂️ Drag and drop functionality ready');
        console.log('🔗 File association support ready');
        console.log('🍎 Build and install .app to test Dock icon drop');
    } catch (error) {
        console.error('❌ App initialization failed:', error);
    }
}

/**
 * ステータス更新時の多言語化対応
 */
export function updateStatusI18n(line, column, charCount) {
    try {
        const cursorPosition = document.getElementById('cursor-position');
        const charCountElement = document.getElementById('char-count');
        
        if (cursorPosition) {
            cursorPosition.textContent = `${t('statusBar.line')}: ${line}, ${t('statusBar.column')}: ${column}`;
        }
        
        if (charCountElement) {
            charCountElement.textContent = `${t('statusBar.charCount')}: ${charCount}`;
        }
    } catch (error) {
        console.error('❌ Failed to update status i18n:', error);
    }
}