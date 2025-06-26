/*
 * =====================================================
 * Sert Editor - イベントリスナー設定
 * =====================================================
 */

import { editor } from './globals.js';
import { handleInput } from './input-handler.js';
import { handleKeydown } from './keyboard-shortcuts.js';
import { syncScroll, updateStatus } from './ui-updater.js';
import { handleCompositionStart, handleCompositionEnd, handleCompositionUpdate } from './ime-handler.js';
import { handleGlobalClick, handleMenuEscape } from './menu-controller.js';

/**
 * エディタのイベントリスナーを設定
 */
export function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // テキスト入力関連
    editor.addEventListener('input', handleInput);
    editor.addEventListener('keydown', handleKeydown);
    
    // スクロール・フォーカス関連
    editor.addEventListener('scroll', syncScroll);
    editor.addEventListener('click', updateStatus);
    editor.addEventListener('keyup', updateStatus);
    
    // IME（日本語入力）関連
    editor.addEventListener('compositionstart', handleCompositionStart);
    editor.addEventListener('compositionend', handleCompositionEnd);
    editor.addEventListener('compositionupdate', handleCompositionUpdate);
    
    // メニュー制御
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleMenuEscape);
    
    console.log('Event listeners set up successfully');
}