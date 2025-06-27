/*
 * =====================================================
 * Sert Editor - メインエントリーポイント
 * =====================================================
 */

import { initializeApp } from './js/app-init.js';
import { toggleMenu } from './js/menu-controller.js';
import { newFile, openFile, saveFile, saveAsFile } from './js/file-operations.js';
import { undo, redo } from './js/undo-redo.js';
import { copy, cut, paste, selectAll } from './js/edit-operations.js';
import { exitApp } from './js/app-exit.js';

// グローバル関数をウィンドウオブジェクトに登録（HTMLから呼び出せるようにするため）
console.log('🔧 Registering global functions...');

window.toggleMenu = toggleMenu;
window.newFile = newFile;
window.openFile = openFile;
window.saveFile = saveFile;
window.saveAsFile = saveAsFile;
window.undo = undo;
window.redo = redo;
window.copy = copy;
window.cut = cut;
window.paste = paste;
window.selectAll = selectAll;
window.exitApp = exitApp;

// グローバル関数の登録確認とデバッグ
console.log('📋 Global functions registered:');
console.log('window.toggleMenu:', typeof window.toggleMenu);
console.log('window.saveFile:', typeof window.saveFile);
console.log('window.saveAsFile:', typeof window.saveAsFile);
console.log('window.newFile:', typeof window.newFile);
console.log('window.openFile:', typeof window.openFile);
console.log('window.undo:', typeof window.undo);
console.log('window.redo:', typeof window.redo);
console.log('window.copy:', typeof window.copy);
console.log('window.cut:', typeof window.cut);
console.log('window.paste:', typeof window.paste);
console.log('window.selectAll:', typeof window.selectAll);
console.log('window.exitApp:', typeof window.exitApp);

// 保存機能のテスト用デバッグ関数を追加
window.testSaveFile = async function() {
    console.log('🧪 Testing saveFile function...');
    console.log('saveFile function:', window.saveFile);
    try {
        await window.saveFile();
        console.log('✅ saveFile test completed');
    } catch (error) {
        console.error('❌ saveFile test failed:', error);
    }
};

/**
 * ページ読み込み時の初期化処理
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM loaded, starting initialization...');
    
    // グローバル関数が正しく登録されているかさらに確認
    console.log('🔍 Final check - window.saveFile:', typeof window.saveFile);
    
    await initializeApp();
    
    console.log('🎯 App ready! Global functions available:');
    console.log('- window.saveFile():', typeof window.saveFile);
    console.log('- window.newFile():', typeof window.newFile);
    console.log('- window.openFile():', typeof window.openFile);
});

/**
 * 追加の初期化確認（フォールバック）
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('📄 DOM loaded via readyState check...');
        console.log('🔍 Backup check - window.saveFile:', typeof window.saveFile);
        await initializeApp();
    });
} else {
    console.log('📄 DOM already loaded, initializing immediately...');
    console.log('🔍 Immediate check - window.saveFile:', typeof window.saveFile);
    initializeApp();
}

// さらなるフォールバック: 少し遅延させてグローバル関数を再登録
setTimeout(() => {
    console.log('🔄 Fallback: Re-registering global functions...');
    
    window.saveFile = saveFile;
    window.newFile = newFile;
    window.openFile = openFile;
    window.saveAsFile = saveAsFile;
    
    console.log('✅ Fallback registration complete - window.saveFile:', typeof window.saveFile);
}, 1000);