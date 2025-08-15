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
    editor.addEventListener('input', (e) => {
        handleInput(e);
        // 行番号を強制的に更新（折り返し変更を即座に反映）
        setTimeout(() => {
            try {
                updateLineNumbers();
                updateLineHighlight();
            } catch (error) {
                console.warn('⚠️ Failed to update line numbers:', error);
            }
        }, 0);
    });
    
    editor.addEventListener('scroll', () => {
        syncScroll();
        updateLineHighlight();
        // 空白文字可視化マーカーの更新（即座同期版）
        try {
            updateWhitespaceMarkersOnScroll();
        } catch (error) {
            // エラーは無視（オプション機能のため）
            console.warn('⚠️ Whitespace marker update failed on scroll:', error);
        }
    }, { passive: true });
    
    editor.addEventListener('click', () => {
        updateStatus();
        updateLineHighlight();
    });
    
    editor.addEventListener('keyup', () => {
        updateStatus();
        updateLineHighlight();
        // キー入力後も行番号を更新（テキスト変更による折り返し変更を反映）
        try {
            updateLineNumbers();
        } catch (error) {
            console.warn('⚠️ Failed to update line numbers on keyup:', error);
        }
    });
    
    // IME関連
    editor.addEventListener('compositionstart', handleCompositionStart);
    editor.addEventListener('compositionend', handleCompositionEnd);
    editor.addEventListener('compositionupdate', handleCompositionUpdate);
    
    // メニュー制御
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleMenuEscape);
    
    // マウスホイールスクロール時の空白文字マーカー更新
    editor.addEventListener('wheel', () => {
        try {
            // ホイールスクロール後に空白文字マーカーを更新
            setTimeout(() => {
                updateWhitespaceMarkersIfNeeded();
            }, 16); // 1フレーム後に更新
        } catch (error) {
            console.warn('⚠️ Whitespace marker update failed on wheel scroll:', error);
        }
    }, { passive: true });
    
    // エディタのサイズ変更時（ウィンドウリサイズなど）に行番号を更新
    try {
        const resizeObserver = new ResizeObserver(() => {
            console.log('Editor resized, updating line numbers');
            setTimeout(() => {
                try {
                    updateLineNumbers();
                    updateLineHighlight();
                } catch (error) {
                    console.warn('⚠️ Failed to update on resize:', error);
                }
            }, 100);
        });
        resizeObserver.observe(editor);
    } catch (error) {
        console.warn('⚠️ ResizeObserver not available:', error);
    }
    
    console.log('✅ Event listeners set up successfully');
}

/**
 * 空白文字マーカーの更新（必要時のみ）
 */
async function updateWhitespaceMarkersIfNeeded() {
    try {
        const module = await import('./whitespace-visualizer.js');
        if (module && module.updateWhitespaceMarkersOnScroll) {
            module.updateWhitespaceMarkersOnScroll();
        }
    } catch (error) {
        // 空白文字可視化機能が無効な場合は何もしない
    }
}