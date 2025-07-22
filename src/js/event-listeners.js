/*
 * =====================================================
 * Vinsert Editor - イベントリスナー設定（行番号同期強化・ワードラップ対応版）
 * =====================================================
 */

import { editor } from './globals.js';
import { handleInput } from './input-handler.js';
import { handleKeydown } from './keyboard-shortcuts.js';
import { 
    syncScroll, 
    updateStatus, 
    updateStatusWithTypewriter, 
    handleScrollEvent,
    handleEditorResize,
    forceSyncLineNumbers,
    clearLineNumberCache
} from './ui-updater.js';
import { handleCompositionStart, handleCompositionEnd, handleCompositionUpdate } from './ime-handler.js';
import { handleGlobalClick, handleMenuEscape } from './menu-controller.js';
import { onKeyEvent, centerCurrentLine, isTypewriterModeEnabled, onWindowResize } from './typewriter-mode.js';

// デバウンス用のタイマー
let resizeTimer = null;
let scrollTimer = null;

/**
 * エディタのイベントリスナーを設定
 */
export function setupEventListeners() {
    console.log('Setting up event listeners with enhanced scroll sync...');
    
    // テキスト入力関連（より詳細な監視）
    editor.addEventListener('input', (e) => {
        handleInput(e);
        
        // タイプライターモードのための追加監視
        if (isTypewriterModeEnabled()) {
            // 入力の種類に応じて遅延を調整
            let delay = 10;
            
            if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') {
                delay = 5; // 改行は即座に
            } else if (e.inputType === 'insertText' || e.inputType === 'insertCompositionText') {
                delay = 15; // 通常入力は少し遅延
            } else if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') {
                delay = 20; // 削除は少し多めに遅延
            }
            
            setTimeout(() => {
                centerCurrentLine();
            }, delay);
        }
    });
    
    // キーボード入力関連（タイプライターモード対応）
    editor.addEventListener('keydown', (e) => {
        // 通常のキーダウン処理
        handleKeydown(e);
        
        // タイプライターモード用のキーイベント処理
        onKeyEvent(e);
    });
    
    // スクロール関連（強化版）
    editor.addEventListener('scroll', (e) => {
        // 即座に行番号同期
        syncScroll();
        
        // デバウンス処理でタイプライターモードの調整
        if (scrollTimer) {
            clearTimeout(scrollTimer);
        }
        
        scrollTimer = setTimeout(() => {
            handleScrollEvent();
        }, 50);
    });
    
    // カーソル移動関連（タイプライターモード対応強化）
    editor.addEventListener('click', (e) => {
        updateStatusWithTypewriter();
        
        // クリック後にタイプライターモード適用
        if (isTypewriterModeEnabled()) {
            setTimeout(() => {
                centerCurrentLine();
            }, 10);
        }
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
            if (isTypewriterModeEnabled()) {
                setTimeout(() => {
                    centerCurrentLine();
                }, 10);
            }
        } else {
            updateStatus();
        }
    });
    
    // マウス操作関連
    editor.addEventListener('mouseup', (e) => {
        updateStatusWithTypewriter();
        
        // マウス選択終了後にタイプライターモード適用
        if (isTypewriterModeEnabled()) {
            setTimeout(() => {
                centerCurrentLine();
            }, 10);
        }
    });
    
    // ドラッグ終了時
    editor.addEventListener('dragend', (e) => {
        setTimeout(() => {
            updateStatusWithTypewriter();
            if (isTypewriterModeEnabled()) {
                centerCurrentLine();
            }
        }, 50);
    });
    
    // フォーカス取得時
    editor.addEventListener('focus', () => {
        setTimeout(() => {
            updateStatusWithTypewriter();
            if (isTypewriterModeEnabled()) {
                centerCurrentLine();
            }
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
            if (isTypewriterModeEnabled()) {
                setTimeout(() => {
                    centerCurrentLine();
                }, 10);
            }
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
    
    // ウィンドウリサイズイベント（エディタのサイズ変更対応）
    window.addEventListener('resize', () => {
        // デバウンス処理
        if (resizeTimer) {
            clearTimeout(resizeTimer);
        }
        
        resizeTimer = setTimeout(() => {
            console.log('🔄 Window resized, updating editor layout...');
            handleEditorResize();
            
            // タイプライターモード用のリサイズ処理を追加
            if (isTypewriterModeEnabled()) {
                onWindowResize();
            }
        }, 250);
    });
    
    // ResizeObserver でエディタコンテナのサイズ変更を監視
    if (window.ResizeObserver) {
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    console.log('📏 Editor container resized:', entry.contentRect);
                    
                    // デバウンス処理
                    if (resizeTimer) {
                        clearTimeout(resizeTimer);
                    }
                    
                    resizeTimer = setTimeout(() => {
                        handleEditorResize();
                        
                        // タイプライターモード用のリサイズ処理を追加
                        if (isTypewriterModeEnabled()) {
                            onWindowResize();
                        }
                    }, 200);
                }
            });
            
            resizeObserver.observe(editorContainer);
            console.log('👀 ResizeObserver attached to editor container');
        }
    }
    
    // MutationObserver でエディタのスタイル変更を監視（フォント変更など）
    if (window.MutationObserver) {
        const mutationObserver = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    console.log('🎨 Editor style changed');
                    shouldUpdate = true;
                }
            });
            
            if (shouldUpdate) {
                setTimeout(() => {
                    forceSyncLineNumbers();
                    if (isTypewriterModeEnabled()) {
                        centerCurrentLine();
                    }
                }, 50);
            }
        });
        
        mutationObserver.observe(editor, {
            attributes: true,
            attributeFilter: ['style']
        });
        
        console.log('👀 MutationObserver attached to editor');
    }
    
    // 初期同期を実行
    setTimeout(() => {
        syncScroll();
        updateStatus();
        console.log('🔗 Initial scroll sync completed');
    }, 100);
    
    // デバッグ用：定期的なスクロール同期チェック（開発時のみ）
    let debugInterval = null;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        debugInterval = setInterval(() => {
            const lineNumbers = document.getElementById('line-numbers');
            if (lineNumbers && editor) {
                const diff = Math.abs(editor.scrollTop - lineNumbers.scrollTop);
                if (diff > 2) { // 2px以上のずれがある場合
                    console.warn('⚠️ Scroll sync drift detected:', diff);
                    syncScroll();
                }
                
                // タイプライターモードのデバッグ情報も表示
                if (isTypewriterModeEnabled() && diff > 5) {
                    import('./typewriter-mode.js').then(module => {
                        module.debugTypewriterState();
                    });
                }
            }
        }, 2000); // 2秒ごとにチェック
        
        // ページアンロード時にインターバルをクリア
        window.addEventListener('beforeunload', () => {
            if (debugInterval) {
                clearInterval(debugInterval);
            }
        });
    }
    
    console.log('✅ Event listeners set up successfully with enhanced typewriter mode support');
}

/**
 * 強制的なスクロール同期（緊急時用）
 */
export function forceScrollSync() {
    console.log('🚨 Force scroll sync requested');
    syncScroll();
    
    if (isTypewriterModeEnabled()) {
        setTimeout(() => {
            centerCurrentLine();
        }, 50);
    }
}

/**
 * イベントリスナーのデバッグ情報を表示
 */
export function debugEventListeners() {
    console.log('🐛 Event listeners debug info:');
    console.log('- Editor:', editor ? 'Found' : 'Not found');
    console.log('- Line numbers element:', document.getElementById('line-numbers') ? 'Found' : 'Not found');
    console.log('- Typewriter mode enabled:', isTypewriterModeEnabled());
    console.log('- Current scroll position:', editor ? editor.scrollTop : 'N/A');
    
    // 現在のスクロール同期状態をチェック
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers && editor) {
        const diff = Math.abs(editor.scrollTop - lineNumbers.scrollTop);
        console.log('- Scroll sync difference:', diff);
        
        if (diff > 5) {
            console.warn('⚠️ Large scroll sync difference detected!');
            forceScrollSync();
        }
    }
}