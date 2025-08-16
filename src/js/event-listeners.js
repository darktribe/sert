/*
 * =====================================================
 * Vinsert Editor - イベントリスナー設定（ログ出力削減版）
 * =====================================================
 */

import { editor } from './globals.js';
import { handleInput } from './input-handler.js';
import { handleKeydown } from './keyboard-shortcuts.js';
import { updateLineNumbers, syncScroll, updateLineHighlight, updateStatus } from './ui-updater.js';
import { handleCompositionStart, handleCompositionEnd, handleCompositionUpdate } from './ime-handler.js';
import { handleGlobalClick, handleMenuEscape } from './menu-controller.js';

// デバッグモードフラグ（必要時のみログ出力）
const DEBUG_MODE = false;

/**
 * エディタのイベントリスナーを設定
 */
export function setupEventListeners() {
    if (DEBUG_MODE) console.log('Setting up event listeners...');
    
    if (!editor) {
        console.error('❌ Editor element not available');
        return;
    }
    
    // キーボードイベントを最優先で設定
    editor.addEventListener('keydown', handleKeydown, true);
    if (DEBUG_MODE) console.log('✅ Keydown listener added (capture=true)');
    
    // 他のイベントリスナー
    editor.addEventListener('input', (e) => {
        handleInput(e);
        // 行番号を強制的に更新（折り返し変更を即座に反映）
        setTimeout(() => {
            try {
                updateLineNumbers();
                updateLineHighlight();
            } catch (error) {
                if (DEBUG_MODE) console.warn('⚠️ Failed to update line numbers:', error);
            }
        }, 0);
    });
    
    editor.addEventListener('scroll', () => {
        // スクロール時は即座に更新
        syncScroll();
        updateLineHighlight();
        
        // 空白文字可視化マーカーの更新
        try {
            import('./whitespace-visualizer.js').then(module => {
                if (module && module.updateWhitespaceMarkersOnScroll) {
                    module.updateWhitespaceMarkersOnScroll();
                }
            });
        } catch (error) {
            if (DEBUG_MODE) console.warn('⚠️ Whitespace marker update failed on scroll:', error);
        }
    }, { passive: true });
    
    // カーソル移動やキー操作でのスクロール同期（即座実行）
    editor.addEventListener('keydown', (e) => {
        // 矢印キーやPageUp/PageDownなどのスクロールを伴うキー
        const scrollKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'];
        if (scrollKeys.includes(e.key)) {
            // 次のフレームで即座に同期
            requestAnimationFrame(() => {
                syncScroll();
                updateLineHighlight();
            });
        }
    });
    
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
            if (DEBUG_MODE) console.warn('⚠️ Failed to update line numbers on keyup:', error);
        }
    });
    
    // IME関連
    editor.addEventListener('compositionstart', handleCompositionStart);
    editor.addEventListener('compositionend', handleCompositionEnd);
    editor.addEventListener('compositionupdate', handleCompositionUpdate);
    
    // メニュー制御
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleMenuEscape);
    
    // マウスホイールスクロール時の即座更新
    editor.addEventListener('wheel', (e) => {
        // マウスホイール直後に即座更新
        requestAnimationFrame(() => {
            try {
                if (DEBUG_MODE) console.log('🖱️ Mouse wheel detected, updating all elements');
                syncScroll();
                // updateLineHighlight(); // マウスホイール時は行ハイライト更新しない
                
                // 空白文字マーカーを強制的に更新
                if (window.updateWhitespaceMarkersOnScroll) {
                    window.updateWhitespaceMarkersOnScroll();
                } else {
                    import('./whitespace-visualizer.js').then(module => {
                        if (module && module.updateWhitespaceMarkersOnScroll) {
                            module.updateWhitespaceMarkersOnScroll();
                        }
                    });
                }
                
                if (DEBUG_MODE) console.log('🖱️ Mouse wheel scroll updated completely');
            } catch (error) {
                if (DEBUG_MODE) console.warn('⚠️ Mouse wheel update failed:', error);
            }
        });
    }, { passive: true });
    
    // エディタのサイズ変更時（ウィンドウリサイズなど）に行番号を更新
    try {
        const resizeObserver = new ResizeObserver(() => {
            if (DEBUG_MODE) console.log('Editor resized, updating line numbers');
            setTimeout(() => {
                try {
                    updateLineNumbers();
                    updateLineHighlight();
                } catch (error) {
                    if (DEBUG_MODE) console.warn('⚠️ Failed to update on resize:', error);
                }
            }, 100);
        });
        resizeObserver.observe(editor);
    } catch (error) {
        if (DEBUG_MODE) console.warn('⚠️ ResizeObserver not available:', error);
    }
    
    if (DEBUG_MODE) console.log('✅ Event listeners set up successfully');
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