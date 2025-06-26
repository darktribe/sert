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

// グローバル関数の登録確認
console.log('Global functions registered:');
console.log('window.saveFile:', typeof window.saveFile);
console.log('window.saveAsFile:', typeof window.saveAsFile);
console.log('window.newFile:', typeof window.newFile);
console.log('window.openFile:', typeof window.openFile);

/**
 * ページ読み込み時の初期化処理
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, starting initialization...');
    await initializeApp();
});

/**
 * 追加の初期化確認
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('DOM loaded via readyState check...');
        await initializeApp();
    });
} else {
    console.log('DOM already loaded, initializing immediately...');
    initializeApp();
}