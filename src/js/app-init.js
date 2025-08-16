/*
 * =====================================================
 * Vinsert Editor - アプリケーション初期化（Python環境判定修正・ログ削減版）
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
import { loadLineHighlightSetting, loadWhitespaceVisualizationSetting } from './globals.js';
import { initializeLineHighlight } from './line-highlight.js';
import { initializeThemeSystem } from './theme-manager.js';
import { initTypewriterMode } from './typewriter-mode.js';

// デバッグモードフラグ
const DEBUG_MODE = false;

/**
 * アプリ起動時にPython環境を判定してコンソールに表示（修正版）
 */
async function checkPythonEnvironmentOnStartup() {
    console.log('🐍 Python環境を確認中...');
    
    try {
        // Tauri環境チェック
        if (!window.__TAURI__ || !window.__TAURI__.core) {
            console.warn('⚠️ Tauri環境が利用できません');
            console.log('🔍 これは通常、開発環境またはブラウザ上での実行を意味します');
            return;
        }
        
        console.log('📡 Tauri経由でPython環境情報を取得中...');
        
        // Python環境情報を取得
        const pythonInfo = await window.__TAURI__.core.invoke('get_python_info');
        
        if (DEBUG_MODE) {
            console.log('🔍 取得したPython情報（生データ）:', pythonInfo);
        }
        
        // 組み込みPython判定（複数パターンで検出）
        const isEmbedded = 
            pythonInfo.includes('EMBEDDED') || 
            pythonInfo.includes('組み込みPython') ||
            pythonInfo.includes('🔗 EMBEDDED') ||
            pythonInfo.includes('アプリケーション組み込み') ||
            pythonInfo.includes('python-standalone') ||
            pythonInfo.includes('python-build-standalone');
        
        console.log('🎯 組み込み判定結果:', isEmbedded);
        
        // 明確な環境判定表示
        console.log('\n' + '='.repeat(80));
        console.log('🐍 PYTHON環境検出結果');
        console.log('='.repeat(80));
        
        if (isEmbedded) {
            console.log('🟢 【組み込みPython環境】でアプリが動作中');
            console.log('   ✓ アプリケーション内蔵のPython環境を使用');
            console.log('   ✓ ユーザーのPython環境に依存しない独立動作');
            console.log('   ✓ 拡張機能は組み込み環境で実行');
            console.log('   ✓ 配布時にPython環境を含めて配布可能');
        } else {
            console.log('🔵 【ユーザー環境Python】でアプリが動作中');
            console.log('   ✓ システムまたはユーザーインストールのPython環境を使用');
            console.log('   ✓ 拡張機能はユーザー環境のライブラリを利用可能');
            console.log('   ✓ ユーザーのPython環境に依存');
            console.log('   ⚠️ ユーザーがPythonをアンインストールすると動作しなくなる可能性');
        }
        
        console.log('='.repeat(80));
        console.log('');
        
        // 詳細情報を折りたたみ可能な形式で表示
        console.groupCollapsed('📋 Python環境詳細情報 (クリックして展開)');
        console.log(pythonInfo);
        console.groupEnd();
        
        // 開発者向け詳細診断も実行
        try {
            console.groupCollapsed('🔧 開発者向け詳細診断 (クリックして展開)');
            const debugInfo = await window.__TAURI__.core.invoke('debug_python_environment');
            console.log(debugInfo);
            console.groupEnd();
        } catch (debugError) {
            console.warn('⚠️ 詳細診断の実行に失敗:', debugError);
        }
        
        // 基本的なPythonテストも実行
        try {
            const testResult = await window.__TAURI__.core.invoke('test_python');
            console.log('✅ Python基本動作テスト:', testResult);
        } catch (testError) {
            console.error('❌ Python基本動作テスト失敗:', testError);
        }
        
    } catch (error) {
        console.error('❌ Python環境の判定に失敗:', error);
        console.log('🔧 エラー詳細:', error.message || error);
        console.log('💡 トラブルシューティング:');
        console.log('   1. Pythonが正しくインストールされているか確認');
        console.log('   2. アプリケーションがTauri環境で実行されているか確認');
        console.log('   3. 必要に応じてアプリケーションを再起動');
        
        // フォールバック情報
        console.log('🔍 フォールバック情報:');
        console.log('   - Platform:', navigator.platform);
        console.log('   - User Agent:', navigator.userAgent);
        console.log('   - Tauri Available:', !!window.__TAURI__);
        console.log('   - Tauri Core Available:', !!(window.__TAURI__ && window.__TAURI__.core));
    }
}

/**
 * Tauri APIの初期化
 * ウィンドウクローズイベントの設定も行う
 */
async function initializeTauri() {
    try {
        if (DEBUG_MODE) console.log('Initializing Tauri...');
        if (DEBUG_MODE) console.log('window.__TAURI__:', typeof window.__TAURI__);
        
        if (window.__TAURI__ && window.__TAURI__.core) {
            if (DEBUG_MODE) console.log('Tauri core found, setting up invoke');
            setTauriInvoke(window.__TAURI__.core.invoke);
            if (DEBUG_MODE) console.log('Tauri invoke set up successfully');
            
            // ウィンドウクローズイベントの設定
            if (window.__TAURI__.window) {
                if (DEBUG_MODE) console.log('Setting up window close handler');
                const { getCurrentWindow } = window.__TAURI__.window;
                const currentWindow = getCurrentWindow();
                
                await currentWindow.onCloseRequested(async (event) => {
                    if (DEBUG_MODE) console.log('🚪 Window close requested via X button');
                    event.preventDefault();
                    
                    // 直接exitAppを呼び出し（フラグ管理や遅延を削除）
                    try {
                        if (DEBUG_MODE) console.log('🚪 Calling exitApp from window close event');
                        await exitApp();
                    } catch (error) {
                        console.error('❌ Window close exitApp failed:', error);
                        // エラー時は強制終了
                        await currentWindow.close();
                    }
                });
                if (DEBUG_MODE) console.log('Window close handler set up');
                
                // ウィンドウリサイズ・最大化イベントのハンドリングを追加
                try {
                    // 最大化/復元イベントを監視
                    await currentWindow.onResized(() => {
                        if (DEBUG_MODE) console.log('🔄 Window resized, forcing layout recalculation');
                        // レイアウト再計算を強制実行
                        requestAnimationFrame(() => {
                            const container = document.querySelector('.container');
                            if (container) {
                                container.style.height = '100%';
                                container.style.width = '100%';
                            }
                            
                            // UIコンポーネントの更新も実行
                            try {
                                import('./ui-updater.js').then(module => {
                                    if (module.updateLineNumbers) module.updateLineNumbers();
                                    if (module.updateStatus) module.updateStatus();
                                });
                            } catch (error) {
                                if (DEBUG_MODE) console.warn('⚠️ UI update failed on resize:', error);
                            }
                        });
                    });
                    
                    if (DEBUG_MODE) console.log('✅ Window resize handler set up');
                } catch (resizeError) {
                    if (DEBUG_MODE) console.warn('⚠️ Could not set up resize handler:', resizeError);
                }
            }
            
            // Tauri APIs の確認
            if (DEBUG_MODE) {
                console.log('Tauri.fs available:', !!window.__TAURI__.fs);
                console.log('Tauri.dialog available:', !!window.__TAURI__.dialog);
                console.log('Tauri.clipboard available:', !!window.__TAURI__.clipboard);
                console.log('Tauri.window available:', !!window.__TAURI__.window);
            }
            
        } else {
            if (DEBUG_MODE) console.log('Tauri core not available');
        }
    } catch (error) {
        console.error('Tauri API initialization failed:', error);
    }
}

/**
 * UIの多言語化を適用
 */
function applyI18nToUI() {
    if (DEBUG_MODE) console.log('🌐 Applying i18n to UI...');
    
    try {
        // data-i18n属性を持つ要素を更新
        const i18nElements = document.querySelectorAll('[data-i18n]');
        if (DEBUG_MODE) console.log(`🔍 Found ${i18nElements.length} elements with data-i18n`);
        
        i18nElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                const translatedText = t(key);
                element.textContent = translatedText;
                if (DEBUG_MODE) console.log(`🌐 Updated element: ${key} -> ${translatedText}`);
            }
        });
        
        // data-i18n-placeholder属性を持つ要素のplaceholderを更新
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        if (DEBUG_MODE) console.log(`🔍 Found ${placeholderElements.length} elements with data-i18n-placeholder`);
        
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (key) {
                const translatedText = t(key);
                element.placeholder = translatedText;
                if (DEBUG_MODE) console.log(`🌐 Updated placeholder: ${key} -> ${translatedText}`);
            }
        });
        
        // ステータスバーの初期化
        updateStatusBarI18n();
        
        if (DEBUG_MODE) console.log('✅ UI i18n applied successfully');
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
        if (DEBUG_MODE) console.log('🌐 Language changed event received, updating UI...');
        if (DEBUG_MODE) console.log('🎯 New language:', event.detail?.language);
        
        // UI更新を実行
        applyI18nToUI();
        
        // 言語切り替えUIの状態も更新
        import('./language-switcher.js').then(module => {
            module.updateLanguageSwitcherState();
        });
        
        // フォントサイズ表示も更新
        updateFontSizeDisplay();
        
        if (DEBUG_MODE) console.log('✅ UI updated for new language');
    });
}

/**
 * アプリケーション初期化（修正版）
 */
export async function initializeApp() {
    console.log('🚀 Starting app initialization...');
    
    // 多言語化システムの初期化（日本語固定）
    console.log('🌐 Initializing i18n system...');
    await initializeI18n();
    
    // 外部言語ファイルシステムの初期化（localeフォルダ作成）
    console.log('📁 Initializing external language file system...');
    try {
        const localesModule = await import('./locales.js');
        if (localesModule.tryExternalFileSystem) {
            await localesModule.tryExternalFileSystem();
            console.log('✅ External language file system initialized');
        }
    } catch (error) {
        console.warn('⚠️ External language file system initialization failed:', error);
        // エラーが発生しても続行（フォールバックシステムを使用）
    }
    
    // Tauri API初期化
    await initializeTauri();
    
    // Python環境判定（修正版）
    console.log('🐍 ===== PYTHON環境判定開始 =====');
    await checkPythonEnvironmentOnStartup();
    console.log('🐍 ===== PYTHON環境判定完了 =====');
    
    // エディタ要素の取得
    const editorElement = document.getElementById('editor');
    if (!editorElement) {
        console.error('❌ Editor element not found');
        return;
    }
    
    setEditor(editorElement);
    setCurrentContent(editorElement.value);
    initializeUndoStack();
    
    // 基本設定の初期化
    loadFontSettings();
    loadLineHighlightSetting();
    initializeLineHighlight();
    
    // 空白文字可視化の初期化
    console.log('👁️ Initializing whitespace visualization...');
    try {
        loadWhitespaceVisualizationSetting();
        const whitespaceModule = await import('./whitespace-visualizer.js');
        whitespaceModule.initializeWhitespaceVisualization();
        console.log('✅ Whitespace visualization initialized');
    } catch (error) {
        console.warn('⚠️ Whitespace visualization failed:', error);
    }
    
    // テーマシステム初期化
    try {
        await initializeThemeSystem();
    } catch (error) {
        console.warn('⚠️ Theme system failed:', error);
    }
    
    // タイプライターモード初期化
    try {
        initTypewriterMode();
    } catch (error) {
        console.warn('⚠️ Typewriter mode failed:', error);
    }
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // 言語変更イベントリスナー
    setupLanguageChangeListener();
    
    // UI の多言語化適用
    applyI18nToUI();
    
    // 初期UI更新
    updateLineNumbers();
    updateStatus();
    updateFontSizeDisplay();
    await updateWindowTitle();
    
    // エディタにフォーカス
    editorElement.setSelectionRange(0, 0);
    editorElement.focus();
    
    console.log('✅ App initialization completed');
    
    // 機能説明（ログ削減のため簡略化）
    if (DEBUG_MODE) {
        console.log('🔧 Tab機能が有効になりました:');
        console.log('  - Tab: インデント追加（タブ文字挿入）');
        console.log('  - Shift+Tab: インデント削除');
        console.log('  - 複数行選択してShift+Tab: 選択行全体のインデント削除');
        console.log('🎨 フォントサイズ表示機能が有効になりました:');
        console.log('  - ステータスバーに現在のフォントサイズが表示されます');
        console.log('  - 表示メニュー > フォントサイズ指定で直接数値入力できます');
        console.log('🖥️ タイプライターモード機能が有効になりました:');
        console.log('  - 表示メニュー > タイプライターモードで設定の切り替えができます');
    }
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