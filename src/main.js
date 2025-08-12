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
import { showThemeDialog, showLanguageSettingsDialog } from './js/theme-manager.js';
import { toggleTypewriterMode } from './js/typewriter-mode.js';
import { toggleWhitespaceVisualization, showWhitespaceVisualizationDialog } from './js/whitespace-visualizer.js';

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
window.toggleWhitespaceVisualization = toggleWhitespaceVisualization;
window.showWhitespaceVisualizationDialog = showWhitespaceVisualizationDialog;



console.log('✅ Global functions registered');

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
                    window[actionName]();
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
        
        // 拡張機能システム初期化
        await loadExtensionSystem();
        
        console.log('🎯 Application ready!');
        
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

console.log('📋 Main.js loaded');