/*
 * =====================================================
 * Vinsert Editor - メインエントリーポイント（修正版）
 * =====================================================
 */

// 基本機能のインポート
import { initializeApp } from './js/app-init.js';
import { toggleMenu } from './js/menu-controller.js';
import { newFile, openFile, saveFile, saveAsFile } from './js/file-operations.js';
import { undo, redo } from './js/undo-redo.js';
import { copy, cut, paste, selectAll } from './js/edit-operations.js';
import { showSearchDialog, showReplaceDialog } from './js/search-replace.js';
import { showAboutDialog } from './js/dialog-utils.js';
import { showFontSettingsDialog, showFontSizeInputDialog, increaseFontSize, decreaseFontSize } from './js/font-settings.js';
import { exitApp } from './js/app-exit.js';
import { toggleLineHighlight } from './js/line-highlight.js';
// 空白文字可視化機能（遅延読み込み）
import { showThemeDialog, showLanguageSettingsDialog } from './js/theme-manager.js';
import { toggleTypewriterMode, initTypewriterMode } from './js/typewriter-mode.js';

// グローバル関数を即座に登録
console.log('🔧 Registering core global functions...');

// メニュー関連
window.toggleMenu = toggleMenu;

// ファイル操作
window.newFile = newFile;
window.openFile = openFile;
window.saveFile = saveFile;
window.saveAsFile = saveAsFile;
window.exitApp = exitApp;

// 編集操作
window.undo = undo;
window.redo = redo;
window.copy = copy;
window.cut = cut;
window.paste = paste;
window.selectAll = selectAll;

// 検索・置換
window.showSearchDialog = showSearchDialog;
window.showReplaceDialog = showReplaceDialog;

// アバウト
window.showAboutDialog = showAboutDialog;

// 表示・フォント
window.showFontSettingsDialog = showFontSettingsDialog;
window.showFontSizeInputDialog = showFontSizeInputDialog;
window.increaseFontSize = increaseFontSize;
window.decreaseFontSize = decreaseFontSize;
window.toggleLineHighlight = toggleLineHighlight;
// 空白文字可視化機能（動的読み込み）
window.toggleWhitespaceVisualization = async function() {
    try {
        const { toggleWhitespaceVisualization } = await import('./js/whitespace-visualizer.js');
        toggleWhitespaceVisualization();
    } catch (error) {
        console.warn('⚠️ Whitespace visualization not available:', error);
    }
};

window.showWhitespaceVisualizationDialog = async function() {
    try {
        const { showWhitespaceVisualizationDialog } = await import('./js/whitespace-visualizer.js');
        showWhitespaceVisualizationDialog();
    } catch (error) {
        console.warn('⚠️ Whitespace visualization dialog not available:', error);
    }
};
window.showWhitespaceVisualizationDialog = showWhitespaceVisualizationDialog;
window.toggleTypewriterMode = toggleTypewriterMode;

// テーマ・言語
window.showThemeDialog = showThemeDialog;
window.showLanguageSettingsDialog = showLanguageSettingsDialog;

console.log('✅ Core functions registered');

// 拡張機能の遅延読み込み
async function loadExtensionFunctions() {
    try {
        const { initializeExtensionSystem, showExtensionSettingsDialog, openAppFolder } = await import('./js/extension-manager.js');
        
        window.showExtensionSettingsDialog = showExtensionSettingsDialog;
        window.openAppFolder = openAppFolder;
        
        // 拡張機能システム初期化
        const extensionInitialized = await initializeExtensionSystem();
        if (extensionInitialized) {
            console.log('✅ Extension system initialized successfully');
        } else {
            console.log('⚠️ Extension system running in limited mode');
        }
    } catch (error) {
        console.error('❌ Extension system loading failed:', error);
        // フォールバック関数を設定
        window.showExtensionSettingsDialog = () => alert('拡張機能システムが利用できません');
        window.openAppFolder = () => alert('アプリフォルダ機能が利用できません');
    }
}

/**
 * 動的イベントリスナーの設定（修正版）
 */
function setupDynamicEventListeners() {
    console.log('🔧 Setting up dynamic event listeners for production build...');
    
    const menuItems = document.querySelectorAll('.menu-item[data-menu]');
    menuItems.forEach(item => {
        const menuId = item.getAttribute('data-menu');
        if (menuId) {
            // 既存のイベントリスナーを削除してから追加
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            newItem.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                console.log(`🔧 Toggling menu: ${menuId}`);
                if (window.toggleMenu && typeof window.toggleMenu === 'function') {
                    // 少し遅延させてからメニューを開く
                    setTimeout(() => {
                        window.toggleMenu(menuId);
                    }, 10);
                } else {
                    console.error('❌ toggleMenu function not found');
                }
            }, { once: false, passive: false });
            
            console.log(`✅ Added menu toggle listener for: ${menuId}`);
        }
    });
    
    // メニューオプション（data-action属性）のイベントリスナー設定
    const menuOptions = document.querySelectorAll('.menu-option[data-action]');
    console.log(`🔍 Found ${menuOptions.length} menu options with data-action`);
    
    menuOptions.forEach((option, index) => {
        const actionName = option.getAttribute('data-action');
        if (actionName) {
            console.log(`🔧 Setting up listener ${index + 1}: ${actionName}`);
            
            const clickHandler = (e) => {
                console.log(`🎯 MENU OPTION CLICKED: ${actionName}`);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                console.log(`🔧 Executing action: ${actionName}`);
                console.log(`🔍 Function exists: ${typeof window[actionName]}`);
                
                // グローバル関数を実行
                if (window[actionName] && typeof window[actionName] === 'function') {
                    try {
                        console.log(`⚡ Calling ${actionName}()`);
                        window[actionName]();
                        console.log(`✅ Successfully executed: ${actionName}`);
                    } catch (error) {
                        console.error(`❌ Error executing ${actionName}:`, error);
                    }
                } else {
                    console.error(`❌ Function not found: ${actionName}`);
                    console.log('🔍 Available window functions:', 
                        Object.keys(window).filter(key => 
                            typeof window[key] === 'function' && 
                            !key.startsWith('_') && 
                            !key.includes('webkit') &&
                            !key.includes('chrome')
                        ).slice(0, 20)
                    );
                }
            };
            
            // メインのクリックイベントリスナーを追加
            option.addEventListener('click', clickHandler);
            
            // デバッグ用：要素にマウスオーバーした時のログ
            option.addEventListener('mouseenter', () => {
                console.log(`🖱️ Mouse over: ${actionName}`);
            });
            
            // CSS確認用
            const computedStyle = window.getComputedStyle(option);
            console.log(`🎨 ${actionName} - pointer-events: ${computedStyle.pointerEvents}, z-index: ${computedStyle.zIndex}`);
            
            console.log(`✅ Added action listener for: ${actionName}`);
        }
    });
    
    // 全体的なクリックイベントの監視（デバッグ用）
    document.addEventListener('click', (e) => {
        console.log(`🖱️ Document click detected:`, e.target);
        if (e.target.closest('.menu-option')) {
            console.log(`🎯 Click on menu option detected:`, e.target.closest('.menu-option'));
        }
    }, true);
    
    console.log(`✅ Dynamic event listeners setup complete (${menuItems.length} menus, ${menuOptions.length} options)`);
}

/**
 * ページ読み込み時の初期化処理（修正版）
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM loaded, starting initialization...');
    
    // アプリケーションの初期化
    await initializeApp();
    
    // 起動完了後にもPython環境を確認表示（確実性のため）
    setTimeout(async () => {
        try {
            if (window.__TAURI__ && window.__TAURI__.core && window.checkPythonEnvironment) {
                console.log('🔄 起動完了 - Python環境最終確認:');
                const envType = await window.getPythonType();
                if (envType === 'EMBEDDED') {
                    console.log('🟢 最終確認: 組み込みPython環境で動作中');
                } else if (envType === 'SYSTEM') {
                    console.log('🔵 最終確認: ユーザー環境Python環境で動作中');
                } else {
                    console.log('🔴 最終確認: Python環境判定が不明');
                }
            }
        } catch (error) {
            console.log('⚠️ 起動後Python環境確認でエラー:', error);
        }
    }, 1000);
    
    // DOM要素が確実に準備されるまで少し待機
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // イベントリスナーを設定
    setupDynamicEventListeners();
    
    // 拡張機能の遅延初期化
    await loadExtensionFunctions();
    
    // タイプライターモードの初期化（最後に実行、追加の遅延付き）
    console.log('🖥️ Starting typewriter mode initialization...');
    setTimeout(() => {
        initTypewriterMode();
    }, 500); // DOM完全準備後に実行
    
    console.log('🎯 App ready!');
});

// フォールバック初期化（修正版）
if (document.readyState !== 'loading') {
    console.log('📄 DOM already loaded, initializing immediately...');
    initializeApp().then(async () => {
        // DOM要素が確実に準備されるまで待機
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setupDynamicEventListeners();
        await loadExtensionFunctions();
        
        // タイプライターモードの初期化（フォールバック）
        console.log('🖥️ Starting typewriter mode initialization (fallback)...');
        try {
            const { initTypewriterMode } = await import('./js/typewriter-mode.js');
            setTimeout(() => {
                initTypewriterMode();
            }, 300);
        } catch (error) {
            console.error('❌ Typewriter mode initialization failed (fallback):', error);
        }
    });
}

// =====================================================
// 開発者コンソール用デバッグ関数
// =====================================================

/**
 * 開発者コンソールから Python環境を確認する関数
 * ブラウザの開発者コンソールで window.checkPythonEnvironment() を実行
 */
window.checkPythonEnvironment = async function() {
    console.log('🔍 Python環境を確認中...');
    
    try {
        // 既存のTauriコマンドを利用してPython環境情報を取得
        const pythonInfo = window.__TAURI__ && window.__TAURI__.core 
            ? await window.__TAURI__.core.invoke('get_python_info')
            : 'Tauri環境が利用できません';
        
        console.log('\n' + '='.repeat(60));
        console.log('🐍 PYTHON環境診断結果');
        console.log('='.repeat(60));
        console.log(pythonInfo);
        console.log('='.repeat(60) + '\n');
        
        // 組み込みPython かどうかの簡単な判定結果も表示
        const isEmbedded = pythonInfo.includes('EMBEDDED') || pythonInfo.includes('組み込みPython');
        
        if (isEmbedded) {
            console.log('🟢 結論: 組み込みPython を使用中');
            console.log('   → アプリ内蔵のPython環境で動作しています');
            console.log('   → ユーザーのPython環境に依存しません');
        } else {
            console.log('🔵 結論: ユーザー環境のPython を使用中');
            console.log('   → システムまたはユーザーがインストールしたPython');
            console.log('   → 拡張機能はユーザー環境のライブラリを利用可能');
        }
        
        return pythonInfo;
        
    } catch (error) {
        console.error('❌ Python環境の確認に失敗:', error);
        console.log('💡 以下を確認してください:');
        console.log('   1. Tauri環境で実行されているか');
        console.log('   2. Python統合機能が正常に初期化されているか');
        return null;
    }
};

/**
 * 簡易版Python環境確認（戻り値のみ）
 */
window.getPythonType = async function() {
    try {
        const info = await window.__TAURI__.core.invoke('get_python_info');
        const isEmbedded = info.includes('EMBEDDED') || info.includes('組み込みPython');
        return isEmbedded ? 'EMBEDDED' : 'SYSTEM';
    } catch (error) {
        console.error('Python type detection failed:', error);
        return 'UNKNOWN';
    }
};

/**
 * 開発者向け詳細診断（Rust側の詳細情報）
 */
window.debugPythonEnvironment = async function() {
    console.log('🔍 Python環境詳細診断を実行中...');
    
    try {
        const debugInfo = await window.__TAURI__.core.invoke('debug_python_environment');
        
        console.log('\n' + debugInfo + '\n');
        
        return debugInfo;
        
    } catch (error) {
        console.error('❌ 詳細診断に失敗:', error);
        console.log('💡 debug_python_environment コマンドが登録されていない可能性があります');
        return null;
    }
};

// 起動時に利用方法をコンソールに表示
console.log('\n🔧 開発者向けPython環境確認機能が利用可能です:');
console.log('   window.checkPythonEnvironment() - 詳細情報表示');
console.log('   window.getPythonType() - 簡易判定（EMBEDDED/SYSTEM）');
console.log('   window.debugPythonEnvironment() - 詳細診断情報\n');

console.log('📋 Main.js loaded successfully');