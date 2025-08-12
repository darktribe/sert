/*
 * =====================================================
 * Vinsert Editor - イベントリスナー設定
 * =====================================================
 */

import { editor } from './globals.js';
import { handleInput } from './input-handler.js';
import { handleKeydown } from './keyboard-shortcuts.js';
import { syncScroll, updateStatus, updateLineHighlight } from './ui-updater.js';
import { handleCompositionStart, handleCompositionEnd, handleCompositionUpdate } from './ime-handler.js';
import { handleGlobalClick, handleMenuEscape } from './menu-controller.js';

/**
 * エディタのイベントリスナーを設定
 */
export function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    if (!editor) {
        console.error('❌ Editor element not available');
        return;
    }
    
    // キーボードイベントを最優先で設定
    editor.addEventListener('keydown', handleKeydown, true);
    console.log('✅ Keydown listener added (capture=true)');
    
    // 他のイベントリスナー
    editor.addEventListener('input', handleInput);
    editor.addEventListener('scroll', () => {
        syncScroll();
        updateLineHighlight();
        updateWhitespaceMarkersOnScroll();
    });
    editor.addEventListener('click', updateStatus);
    editor.addEventListener('keyup', updateStatus);
    
    // IME関連
    editor.addEventListener('compositionstart', handleCompositionStart);
    editor.addEventListener('compositionend', handleCompositionEnd);
    editor.addEventListener('compositionupdate', handleCompositionUpdate);
    
    // メニュー制御
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleMenuEscape);
    
    console.log('✅ Event listeners set up successfully');
}