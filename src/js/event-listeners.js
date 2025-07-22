/*
 * =====================================================
 * Vinsert Editor - イベントリスナー設定（現在行ハイライト対応版）
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
    clearLineNumberCache,
    updateCurrentLineHighlight,
    isLineHighlightEnabled
} from './ui-updater.js';
import { handleCompositionStart, handleCompositionEnd, handleCompositionUpdate } from './ime-handler.js';
import { handleGlobalClick, handleMenuEscape } from './menu-controller.js';
import { onKeyEvent, centerCurrentLine, isTypewriterModeEnabled, onWindowResize } from './typewriter-mode.js';

// デバウンス用のタイマー
let resizeTimer = null;
let scrollTimer = null;
let highlightTimer = null;

/**
 * デバウンス付きハイライト更新
 */
function updateHighlightDebounced(delay = 10) {
    if (!isLineHighlightEnabled()) return;
    
    if (highlightTimer) {
        clearTimeout(highlightTimer);
    }
    
    highlightTimer = setTimeout(() => {
        updateCurrentLineHighlight();
    }, delay);
}

/**
 * エディタのイベントリスナーを設定
 */
export function setupEventListeners() {
    console.log('Setting up event listeners with line highlight support...');
    
    // テキスト入力関連（ハイライト対応）
    editor.addEventListener('input', (e) => {
        handleInput(e);
        
        // 現在行ハイライトを更新
        updateHighlightDebounced(15);
        
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
    
    // キーボード入力関連（ハイライト対応）
    editor.addEventListener('keydown', (e) => {
        // 通常のキーダウン処理
        handleKeydown(e);
        
        // ナビゲーションキーの場合はハイライトを即座に更新
        const navigationKeys = [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Home', 'End', 'PageUp', 'PageDown'
        ];
        
        if (navigationKeys.includes(e.key)) {
            updateHighlightDebounced(5); // 高速更新
        }
        
        // タイプライターモード用のキーイベント処理
        onKeyEvent(e);
    });
    
    // キーアップイベント（ナビゲーション後のハイライト更新）
    editor.addEventListener('keyup', (e) => {
        // 矢印キー、Page Up/Down、Home/Endなどのナビゲーションキーの場合
        const navigationKeys = [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Home', 'End', 'PageUp', 'PageDown'
        ];
        
        if (navigationKeys.includes(e.key)) {
            updateStatusWithTypewriter();
            updateHighlightDebounced(5); // 即座にハイライト更新
            
            // ナビゲーションキーでのタイプライターモード適用
            if (isTypewriterModeEnabled()) {
                setTimeout(() => {
                    centerCurrentLine();
                }, 10);
            }
        } else {
            updateStatus();
            updateHighlightDebounced(10);
        }
    });
    
    // スクロール関連（ハイライト同期対応）
    editor.addEventListener('scroll', (e) => {
        // 即座に行番号同期
        syncScroll();
        
        // ハイライト位置更新
        updateHighlightDebounced(20);
        
        // デバウンス処理でタイプライターモードの調整
        if (scrollTimer) {
            clearTimeout(scrollTimer);
        }
        
        scrollTimer = setTimeout(() => {
            handleScrollEvent();
        }, 50);
    });
    
    // カーソル移動関連（ハイライト対応強化）
    editor.addEventListener('click', (e) => {
        updateStatusWithTypewriter();
        
        // クリック後にハイライト更新
        updateHighlightDebounced(5);
        
        // クリック後にタイプライターモード適用
        if (isTypewriterModeEnabled()) {
            setTimeout(() => {
                centerCurrentLine();
            }, 10);
        }
    });
    
    // マウス操作関連（ハイライト対応）
    editor.addEventListener('mouseup', (e) => {
        updateStatusWithTypewriter();
        
        // マウス選択終了後にハイライト更新
        updateHighlightDebounced(5);
        
        // マウス選択終了後にタイプライターモード適用
        if (isTypewriterModeEnabled()) {
            setTimeout(() => {
                centerCurrentLine();
            }, 10);
        }
    });
    
    // ドラッグ終了時（ハイライト対応）
    editor.addEventListener('dragend', (e) => {
        setTimeout(() => {
            updateStatusWithTypewriter();
            updateHighlightDebounced(10);
            
            if (isTypewriterModeEnabled()) {
                centerCurrentLine();
            }
        }, 50);
    });
    
    // フォーカス取得時（ハイライト対応）
    editor.addEventListener('focus', () => {
        setTimeout(() => {
            updateStatusWithTypewriter();
            updateHighlightDebounced(10);
            
            if (isTypewriterModeEnabled()) {
                centerCurrentLine();
            }
        }, 10);
    });
    
    // フォーカス失去時（ハイライト非表示）
    editor.addEventListener('blur', () => {
        // フォーカスを失った時はハイライトを一時的に薄くする
        const highlightElement = document.querySelector('.current-line-highlight');
        const highlightNumbers = document.querySelector('.current-line-highlight-numbers');
        
        if (highlightElement) {
            highlightElement.style.opacity = '0.3';
        }
        if (highlightNumbers) {
            highlightNumbers.style.opacity = '0.3';
        }
    });
    
    // フォーカス再取得時（ハイライト復活）
    editor.addEventListener('focus', () => {
        const highlightElement = document.querySelector('.current-line-highlight');
        const highlightNumbers = document.querySelector('.current-line-highlight-numbers');
        
        if (highlightElement) {
            highlightElement.style.opacity = '1';
        }
        if (highlightNumbers) {
            highlightNumbers.style.opacity = '1';
        }
    });
    
    // 選択範囲変更時の詳細監視（ハイライト対応強化）
    let lastSelectionStart = 0;
    let lastSelectionEnd = 0;
    
    function checkSelectionChange() {
        if (editor.selectionStart !== lastSelectionStart || editor.selectionEnd !== lastSelectionEnd) {
            lastSelectionStart = editor.selectionStart;
            lastSelectionEnd = editor.selectionEnd;
            
            // 選択範囲が変わった場合のハイライト更新
            updateHighlightDebounced(5);
            
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
    
    // IME（日本語入力）関連（ハイライト対応）
    editor.addEventListener('compositionstart', (e) => {
        handleCompositionStart(e);
        // IME開始時はハイライト更新を一時停止
    });
    
    editor.addEventListener('compositionend', (e) => {
        handleCompositionEnd(e);
        // IME終了時にハイライト更新
        setTimeout(() => {
            updateHighlightDebounced(10);
        }, 15);
    });
    
    editor.addEventListener('compositionupdate', handleCompositionUpdate);
    
    // メニュー制御
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleMenuEscape);
    
    // ウィンドウリサイズイベント（ハイライト再計算対応）
    window.addEventListener('resize', () => {
        // デバウンス処理
        if (resizeTimer) {
            clearTimeout(resizeTimer);
        }
        
        resizeTimer = setTimeout(() => {
            console.log('🔄 Window resized, updating editor layout...');
            handleEditorResize();
            
            // ハイライト位置を再計算
            if (isLineHighlightEnabled()) {
                setTimeout(() => {
                    updateCurrentLineHighlight();
                }, 100);
            }
            
            // タイプライターモード用のリサイズ処理
            if (isTypewriterModeEnabled()) {
                onWindowResize();
            }
        }, 250);
    });
    
    // ResizeObserver でエディタコンテナのサイズ変更を監視（ハイライト対応）
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
                        
                        // ハイライト位置を再計算
                        if (isLineHighlightEnabled()) {
                            setTimeout(() => {
                                updateCurrentLineHighlight();
                            }, 50);
                        }
                        
                        // タイプライターモード用のリサイズ処理
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
    
    // MutationObserver でエディタのスタイル変更を監視（ハイライト対応）
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
                    
                    // スタイル変更時にハイライト位置も再計算
                    if (isLineHighlightEnabled()) {
                        updateCurrentLineHighlight();
                    }
                    
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
        
        // 初期ハイライト設定
        if (isLineHighlightEnabled()) {
            updateCurrentLineHighlight();
        }
        
        console.log('🔗 Initial sync completed with line highlight support');
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
                
                // ハイライトのデバッグ情報も表示
                if (isLineHighlightEnabled() && diff > 5) {
                    console.log('🎨 Highlight update triggered by scroll drift');
                    updateCurrentLineHighlight();
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
    
    console.log('✅ Event listeners set up successfully with line highlight and typewriter mode support');
}

/**
 * 強制的なスクロール同期（緊急時用）
 */
export function forceScrollSync() {
    console.log('🚨 Force scroll sync requested');
    syncScroll();
    
    // ハイライト位置も強制更新
    if (isLineHighlightEnabled()) {
        updateCurrentLineHighlight();
    }
    
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
    console.log('- Line highlight enabled:', isLineHighlightEnabled());
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
    
    // ハイライト要素の状態をチェック
    const highlightElement = document.querySelector('.current-line-highlight');
    const highlightNumbers = document.querySelector('.current-line-highlight-numbers');
    
    console.log('- Highlight element:', highlightElement ? 'Found' : 'Not found');
    console.log('- Highlight numbers element:', highlightNumbers ? 'Found' : 'Not found');
    
    if (highlightElement) {
        console.log('- Highlight element style:', {
            display: highlightElement.style.display,
            top: highlightElement.style.top,
            height: highlightElement.style.height,
            opacity: highlightElement.style.opacity
        });
    }
}