/*
 * =====================================================
 * Sert Editor - アプリケーション初期化（多言語化対応版）
 * ドラッグアンドドロップ・ファイル関連付け対応
 * =====================================================
 */

import { setEditor, setCurrentContent, setTauriInvoke, setCurrentFilePath, setIsModified } from './globals.js';
import { initializeUndoStack } from './undo-redo.js';
import { updateLineNumbers, updateStatus, updateWindowTitle } from './ui-updater.js';
import { setupEventListeners, setupDropZoneEvents } from './event-listeners.js';
import { exitApp } from './app-exit.js';
import { initializeI18n, t, updateElementText } from './locales.js';
import { createLanguageSwitcher } from './language-switcher.js';

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
            
            // ドラッグアンドドロップイベントの設定
            if (window.__TAURI__.event) {
                console.log('🗂️ Setting up file drop event listener');
                await window.__TAURI__.event.listen('file-dropped', (event) => {
                    console.log('📂 File dropped:', event.payload);
                    handleDroppedFile(event.payload);
                });
                console.log('✅ File drop event listener set up');
            }
            
            // Tauri APIs の確認
            console.log('Tauri.fs available:', !!window.__TAURI__.fs);
            console.log('Tauri.dialog available:', !!window.__TAURI__.dialog);
            console.log('Tauri.clipboard available:', !!window.__TAURI__.clipboard);
            console.log('Tauri.window available:', !!window.__TAURI__.window);
            console.log('Tauri.event available:', !!window.__TAURI__.event);
            
        } else {
            console.log('Tauri core not available');
        }
    } catch (error) {
        console.error('Tauri API initialization failed:', error);
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
                await openFileFromPath(startupFilePath);
            } else {
                console.log('📄 No startup file specified');
            }
        }
    } catch (error) {
        console.error('❌ Failed to handle startup file:', error);
    }
}

/**
 * ドロップされたファイルを処理
 */
async function handleDroppedFile(filePath) {
    try {
        console.log('📁 Processing dropped file:', filePath);
        
        // ファイルパスの妥当性をチェック
        if (window.__TAURI__ && window.__TAURI__.core) {
            const isValid = await window.__TAURI__.core.invoke('validate_file_path', { path: filePath });
            
            if (isValid) {
                console.log('✅ Valid file path, opening file');
                await openFileFromPath(filePath);
                
                // ファイル情報をログ出力
                try {
                    const fileInfo = await window.__TAURI__.core.invoke('get_file_info', { path: filePath });
                    console.log('📋 File info:', fileInfo);
                } catch (infoError) {
                    console.warn('⚠️ Failed to get file info:', infoError);
                }
            } else {
                console.error('❌ Invalid file path:', filePath);
                showFileErrorMessage(t('messages.openError', { error: 'Invalid file path' }));
            }
        }
    } catch (error) {
        console.error('❌ Failed to handle dropped file:', error);
        showFileErrorMessage(t('messages.openError', { error: error.message }));
    }
}

/**
 * パスからファイルを開く共通処理
 */
async function openFileFromPath(filePath) {
    try {
        console.log('📖 Opening file from path:', filePath);
        
        // 変更がある場合の確認処理は省略（ドロップ時は新しいファイルを直接開く）
        let content;
        
        if (window.__TAURI__ && window.__TAURI__.fs) {
            content = await window.__TAURI__.fs.readTextFile(filePath);
        } else if (window.__TAURI__ && window.__TAURI__.core) {
            content = await window.__TAURI__.core.invoke('read_file', { path: filePath });
        } else {
            throw new Error(t('messages.tauriOnly'));
        }
        
        // エディタに設定してアンドゥスタックを完全リセット
        const editorElement = document.getElementById('editor');
        if (editorElement) {
            editorElement.value = content;
            setCurrentFilePath(filePath);
            setIsModified(false);
            setCurrentContent(content);
            
            // アンドゥスタックを完全リセット
            const { undoStack, redoStack } = await import('./globals.js');
            undoStack.length = 0;
            redoStack.length = 0;
            
            // ファイル内容で初期化
            initializeUndoStack();
            updateLineNumbers();
            updateStatus();
            
            // タイトル更新
            console.log('🏷️ Updating title for opened file...');
            await updateWindowTitle();
            
            console.log('✅ File opened successfully:', filePath);
            
            // エディタにフォーカスを設定
            editorElement.focus();
        }
    } catch (error) {
        console.error('❌ Failed to open file from path:', error);
        showFileErrorMessage(t('messages.openError', { error: error.message }));
    }
}

/**
 * ファイルエラーメッセージを表示
 */
function showFileErrorMessage(message) {
    try {
        // シンプルなアラート表示（必要に応じてカスタムダイアログに変更可能）
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
 * ドロップゾーンの視覚的フィードバックを設定
 */
function setupDropZoneVisualFeedback() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    // ドラッグエンター・オーバー時のクラス追加
    container.addEventListener('dragenter', (e) => {
        e.preventDefault();
        container.classList.add('drag-over');
        console.log('📂 Drag enter on container');
    });
    
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        container.classList.add('drag-over');
    });
    
    container.addEventListener('dragleave', (e) => {
        // 子要素への移動でない場合のみクラスを削除
        if (!container.contains(e.relatedTarget)) {
            container.classList.remove('drag-over');
            console.log('📂 Drag leave container');
        }
    });
    
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        container.classList.remove('drag-over');
        console.log('📂 Drop on container - Tauri will handle file processing');
    });
    
    console.log('✅ Drop zone visual feedback set up');
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
    
    // イベントリスナーを設定
    setupEventListeners();
    
    // ドロップゾーンの視覚的フィードバックを設定
    setupDropZoneVisualFeedback();
    
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
    
    console.log('🎯 App initialization completed');
    console.log('🗂️ Drag and drop functionality ready');
    console.log('🔗 File association support ready');
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