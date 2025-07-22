/*
 * =====================================================
 * Vinsert Editor - イベントリスナー設定（真のタイプライターモード対応版）
 * =====================================================
 */

import { editor } from './globals.js';
import { handleInput } from './input-handler.js';
import { handleKeydown } from './keyboard-shortcuts.js';
import { syncScroll, updateStatus, updateStatusWithTypewriter } from './ui-updater.js';
import { handleCompositionStart, handleCompositionEnd, handleCompositionUpdate } from './ime-handler.js';
import { handleGlobalClick, handleMenuEscape } from './menu-controller.js';
import { onKeyEvent, centerCurrentLine } from './typewriter-mode.js';

/**
 * エディタのイベントリスナーを設定
 */
export function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // テキスト入力関連
    editor.addEventListener('input', handleInput);
    
    // キーボード入力関連（タイプライターモード対応）
    editor.addEventListener('keydown', (e) => {
        // 通常のキーダウン処理
        handleKeydown(e);
        
        // タイプライターモード用のキーイベント処理
        onKeyEvent(e);
    });
    
    // スクロール・フォーカス関連
    editor.addEventListener('scroll', syncScroll);
    
    // カーソル移動関連（タイプライターモード対応強化）
    editor.addEventListener('click', (e) => {
        updateStatusWithTypewriter();
        
        // クリック後にタイプライターモード適用
        setTimeout(() => {
            centerCurrentLine();
        }, 10);
    });
    
    editor.addEventListener('keyup', (e) => {
        // 矢印キー、Page Up/Down、Home/Endなどのナビゲーションキーの場合
        const navigationKeys = [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Home', 'End', 'PageUp', 'PageDown'
        ];
        
        if (navigationKeys.includes(e.key)) {
            updateStatusWithTypewriter();
            
            // ナビゲーションキーでのタイプライターモード適用
            setTimeout(() => {
                centerCurrentLine();
            }, 10);
        } else {
            updateStatus();
        }
    });
    
    // マウス操作関連
    editor.addEventListener('mouseup', (e) => {
        updateStatusWithTypewriter();
        
        // マウス選択終了後にタイプライターモード適用
        setTimeout(() => {
            centerCurrentLine();
        }, 10);
    });
    
    // ドラッグ終了時
    editor.addEventListener('dragend', (e) => {
        setTimeout(() => {
            updateStatusWithTypewriter();
            centerCurrentLine();
        }, 50);
    });
    
    // フォーカス取得時
    editor.addEventListener('focus', () => {
        setTimeout(() => {
            updateStatusWithTypewriter();
            centerCurrentLine();
        }, 10);
    });
    
    // 選択範囲変更時（独自実装）
    let lastSelectionStart = 0;
    let lastSelectionEnd = 0;
    
    function checkSelectionChange() {
        if (editor.selectionStart !== lastSelectionStart || editor.selectionEnd !== lastSelectionEnd) {
            lastSelectionStart = editor.selectionStart;
            lastSelectionEnd = editor.selectionEnd;
            
            // 選択範囲が変わった場合のタイプライターモード適用
            setTimeout(() => {
                centerCurrentLine();
            }, 10);
        }
        
        // 定期的にチェック（アクティブ時のみ）
        if (document.activeElement === editor) {
            requestAnimationFrame(checkSelectionChange);
        }
    }
    
    editor.addEventListener('focus', () => {
        checkSelectionChange();
    });
    
    // IME（日本語入力）関連
    editor.addEventListener('compositionstart', handleCompositionStart);
    editor.addEventListener('compositionend', handleCompositionEnd);
    editor.addEventListener('compositionupdate', handleCompositionUpdate);
    
    // メニュー制御
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleMenuEscape);
    
    console.log('Event listeners set up successfully with typewriter mode support');
}