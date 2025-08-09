/*
 * =====================================================
 * Vinsert Editor - メインエントリーポイント（デバッグ強化版）
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
 * 動的イベントリスナーの設定（デバッグ強化版）
 */
function setupDynamicEventListeners() {
    console.log('🔧 Setting up dynamic event listeners for production build...');
    
    // メニュー項目（data-menu属性）のイベントリスナー設定
    const menuItems = document.querySelectorAll('.menu-item[data-menu]');
    menuItems.forEach(item => {
        const menuId = item.getAttribute('data-menu');
        if (menuId) {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🔧 Toggling menu: ${menuId}`);
                if (window.toggleMenu && typeof window.toggleMenu === 'function') {
                    window.toggleMenu(menuId);
                } else {
                    console.error('❌ toggleMenu function not found');
                }
            });
            console.log(`✅ Added menu toggle listener for: ${menuId}`);
        }
    });
    
    // メニューオプション（data-action属性）のイベントリスナー設定（強化版）
    const menuOptions = document.querySelectorAll('.menu-option[data-action]');
    console.log(`🔍 Found ${menuOptions.length} menu options with data-action`);
    
    menuOptions.forEach((option, index) => {
        const actionName = option.getAttribute('data-action');
        if (actionName) {
            console.log(`🔧 Setting up listener ${index + 1}: ${actionName}`);
            
            // イベントリスナーを追加（強化版）
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
            
            // 複数のイベントに対応
            option.addEventListener('click', clickHandler, true); // キャプチャフェーズ
            option.addEventListener('click', clickHandler, false); // バブリングフェーズ
            
            // タッチイベントにも対応
            option.addEventListener('touchend', clickHandler, true);
            
            // デバッグ用：要素にマウスオーバーした時のログ
            option.addEventListener('mouseenter', () => {
                console.log(`🖱️ Mouse over: ${actionName}`);
            });
            
            // CSS確認用
            const computedStyle = window.getComputedStyle(option);
            console.log(`🎨 ${actionName} - pointer-events: ${computedStyle.pointerEvents}, z-index: ${computedStyle.zIndex}`);
            
            console.log(`✅ Added enhanced action listener for: ${actionName}`);
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
 * ページ読み込み時の初期化処理
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM loaded, starting initialization...');
    
    // アプリケーションの初期化
    await initializeApp();
    
    // 少し遅延してからイベントリスナーを設定
    setTimeout(() => {
        setupDynamicEventListeners();
    }, 500);
    
    // 拡張機能の遅延初期化
    await loadExtensionFunctions();
    
    // タイプライターモードの初期化
    initTypewriterMode();
    
    console.log('🎯 App ready!');
});

// フォールバック初期化
if (document.readyState !== 'loading') {
    console.log('📄 DOM already loaded, initializing immediately...');
    initializeApp().then(async () => {
        setTimeout(() => {
            setupDynamicEventListeners();
        }, 500);
        await loadExtensionFunctions();
        initTypewriterMode();
    });
}

console.log('📋 Main.js loaded successfully');