/*
 * =====================================================
 * Vinsert Editor - メインエントリーポイント（ダイアログドラッグ修正版）
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
import { showThemeDialog, showLanguageSettingsDialog } from './js/theme-manager.js';
import { toggleTypewriterMode } from './js/typewriter-mode.js';

console.log('🔧 Registering global functions...');

// グローバル関数を登録
window.toggleMenu = toggleMenu;
window.newFile = newFile;
window.openFile = openFile;
window.saveFile = saveFile;
window.saveAsFile = saveAsFile;
window.exitApp = exitApp;
window.undo = undo;
window.redo = redo;
window.copy = copy;
window.cut = cut;
window.paste = paste;
window.selectAll = selectAll;
window.showSearchDialog = showSearchDialog;
window.showReplaceDialog = showReplaceDialog;
window.showAboutDialog = showAboutDialog;
window.showFontSettingsDialog = showFontSettingsDialog;
window.showFontSizeInputDialog = showFontSizeInputDialog;
window.increaseFontSize = increaseFontSize;
window.decreaseFontSize = decreaseFontSize;
window.toggleLineHighlight = toggleLineHighlight;
window.showThemeDialog = showThemeDialog;
window.showLanguageSettingsDialog = showLanguageSettingsDialog;
window.toggleTypewriterMode = toggleTypewriterMode;

// タブサイズ調整機能（デバッグ用）
window.debugTabSize = async function() {
    try {
        const { getCurrentTabSize, setCustomTabSize } = await import('./js/font-settings.js');
        const current = getCurrentTabSize();
        console.log('📏 Current tab-size:', current);
        
        const newSize = prompt(`現在のタブサイズ: ${current}\n新しいタブサイズを入力してください (1-16):`, current);
        if (newSize && !isNaN(newSize)) {
            setCustomTabSize(parseInt(newSize));
        }
    } catch (error) {
        console.warn('⚠️ Debug tab size not available:', error);
    }
};

// 空白文字可視化機能
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

// 空白文字可視化のスクロール更新をグローバルに登録
window.updateWhitespaceMarkersOnScroll = async function() {
    try {
        const { updateWhitespaceMarkersOnScroll } = await import('./js/whitespace-visualizer.js');
        updateWhitespaceMarkersOnScroll();
    } catch (error) {
        console.warn('⚠️ Whitespace scroll update not available:', error);
    }
};

console.log('✅ Global functions registered');

// ダイアログドラッグシステムの初期化（修正版）
async function loadDialogDragSystem() {
    try {
        console.log('🖱️ Loading dialog drag system...');
        
        // ダイアログドラッグシステムを動的にインポート
        const dragModule = await import('./js/dialog-drag-system.js');
        
        // 少し遅延してから初期化（DOM準備完了を待つ）
        setTimeout(() => {
            try {
                // 自動初期化を実行
                dragModule.initializeDialogDragSystem();
                
                // グローバル関数として登録（デバッグ用）
                window.enableDialogDrag = dragModule.enableDialogDrag;
                window.disableDialogDrag = dragModule.disableDialogDrag;
                window.makeDialogDraggable = dragModule.makeDialogDraggable;
                
                console.log('✅ Dialog drag system loaded and initialized');
                
                // 手動で特定のダイアログをチェック（テスト用）
                window.testDialogDrag = function() {
                    const dialogs = document.querySelectorAll('.search-dialog');
                    console.log('🔍 Found dialogs:', dialogs.length);
                    dialogs.forEach((dialog, index) => {
                        console.log(`Dialog ${index}:`, dialog.className);
                        dragModule.enableDialogDrag(dialog);
                    });
                };
                
            } catch (initError) {
                console.error('❌ Dialog drag system initialization failed:', initError);
            }
        }, 500);
        
        return true;
    } catch (error) {
        console.error('❌ Dialog drag system failed to load:', error);
        console.log('🔄 Application will continue without drag functionality');
        return false;
    }
}

// 拡張機能システムの遅延読み込み
async function loadExtensionSystem() {
    try {
        const { initializeExtensionSystem, showExtensionSettingsDialog, openAppFolder } = await import('./js/extension-manager.js');
        
        window.showExtensionSettingsDialog = showExtensionSettingsDialog;
        window.openAppFolder = openAppFolder;
        
        await initializeExtensionSystem();
        console.log('✅ Extension system loaded');
    } catch (error) {
        console.error('❌ Extension system failed:', error);
        window.showExtensionSettingsDialog = () => alert('拡張機能システムが利用できません');
        window.openAppFolder = () => alert('アプリフォルダ機能が利用できません');
    }
}

// イベントリスナーの設定
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // メニューアイテム
    document.querySelectorAll('.menu-item[data-menu]').forEach(item => {
        const menuId = item.getAttribute('data-menu');
        if (menuId) {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`Menu clicked: ${menuId}`);
                window.toggleMenu(menuId);
            });
        }
    });
    
    // メニューオプション
    document.querySelectorAll('.menu-option[data-action]').forEach(option => {
        const actionName = option.getAttribute('data-action');
        if (actionName) {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`Action clicked: ${actionName}`);
                
                if (window[actionName] && typeof window[actionName] === 'function') {
                    // ダイアログを開く関数の場合は、少し遅延してからドラッグ機能を適用
                    if (actionName.includes('Dialog') || actionName.includes('show')) {
                        window[actionName]();
                        
                        // ダイアログが表示された後にドラッグ機能を適用
                        setTimeout(async () => {
                            try {
                                const dragModule = await import('./js/dialog-drag-system.js');
                                const newDialogs = document.querySelectorAll('.search-dialog, [class*="dialog"]:not([class*="overlay"])');
                                newDialogs.forEach(dialog => {
                                    dragModule.enableDialogDrag(dialog);
                                });
                            } catch (error) {
                                console.warn('⚠️ Could not apply drag to new dialog:', error);
                            }
                        }, 300);
                    } else {
                        window[actionName]();
                    }
                } else {
                    console.error(`Function not found: ${actionName}`);
                }
            });
        }
    });
    
    console.log('✅ Event listeners setup complete');
}

// アプリケーション初期化
async function startApp() {
    console.log('🚀 Starting application...');
    
    try {
        // アプリケーション初期化
        await initializeApp();
        
        // DOM準備完了まで待機
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // イベントリスナー設定
        setupEventListeners();
        
        // ダイアログドラッグシステムの初期化
        console.log('🖱️ Initializing dialog drag functionality...');
        await loadDialogDragSystem();
        
        // 拡張機能システム初期化
        await loadExtensionSystem();
        
        console.log('🎯 Application ready!');
        console.log('');
        console.log('💡 新機能:');
        console.log('  🖱️ ダイアログドラッグ機能: 全てのダイアログをドラッグして移動できます');
        console.log('  🐍 Python環境判定表示: コンソールに詳細な環境情報が表示されます');
        console.log('  🔧 デバッグ機能: window.testDialogDrag() でダイアログテストが可能');
        console.log('');
        
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
    }
}

// DOM読み込み完了時の処理
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}

console.log('📋 Main.js loaded with enhanced drag functionality');