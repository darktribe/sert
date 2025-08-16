/**
 * =====================================================
 * Vinsert Editor - テキスト入力処理
 * =====================================================
 */
import {
    editor,
    isUndoRedoOperation,
    setIsUndoRedoOperation,
    isComposing,
    justFinishedComposition,
    currentContent,
    setCurrentContent,
    isModified,
    setIsModified,
    redoStack
} from './globals.js';
import { saveToUndoStack } from './undo-redo.js';
import { updateLineNumbers, updateStatus } from './ui-updater.js';
import { syncScroll } from './ui-updater.js';

/**
 * 空白文字可視化マーカーを必要に応じて更新
 */
async function updateWhitespaceMarkersIfNeeded() {
    try {
        const module = await import('./whitespace-visualizer.js');
        if (module && module.updateWhitespaceMarkers) {
            module.updateWhitespaceMarkers();
        }
    } catch (error) {
        // 空白文字可視化機能が無効な場合は何もしない（エラーログは出さない）
    }
}

/**
 * テキスト入力時の処理
 * アンドゥ履歴の管理と画面更新を行う
 */
export function handleInput(e) {
    console.log('=== INPUT EVENT ===');
    console.log('Input type:', e.inputType);
    console.log('Current content before update:', JSON.stringify(currentContent));
    console.log('New editor content:', JSON.stringify(editor.value));
    
    // アンドゥ・リドゥ操作中は履歴作成をスキップ
    if (isUndoRedoOperation) {
        console.log('Skipping history - undo/redo operation');
        setIsUndoRedoOperation(false);
        updateLineNumbers();
        updateStatus();
        updateWhitespaceMarkersIfNeeded();
    
        // 空白文字可視化マーカーも更新
        updateWhitespaceMarkersIfNeeded();
        return;
    }

    // IME変換中は履歴作成をスキップ
    if (isComposing) {
        console.log('Skipping history - IME composing');
        updateLineNumbers();
        updateStatus();
        updateWhitespaceMarkersIfNeeded();
        return;
    }

    // IME確定直後の入力は履歴作成をスキップ
    if (justFinishedComposition) {
        console.log('Skipping history - just finished IME composition');
        setCurrentContent(editor.value);
        updateLineNumbers();
        updateStatus();
        updateWhitespaceMarkersIfNeeded();
        return;
    }

    const newContent = editor.value;
    const cursorPosition = editor.selectionStart;
    
    console.log('Content comparison:', {
        oldLength: currentContent.length,
        newLength: newContent.length,
        changed: newContent !== currentContent
    });

    if (newContent !== currentContent) {
        if (!isModified) {
            setIsModified(true);
        }

        // 【重要】変更後の内容を履歴に保存（空白も含む）
        console.log('=== SAVING TO HISTORY ===');
        console.log('Saving new content to history:', JSON.stringify(newContent));
        console.log('Cursor position:', cursorPosition);
        
        saveToUndoStack(newContent, cursorPosition);
        setCurrentContent(newContent);
        
        // リドゥスタックをクリア
        redoStack.length = 0;
        console.log('Redo stack cleared');
    } else {
        console.log('Content unchanged, not saving to history');
    }

    updateLineNumbers();
    // ステータス更新
    updateStatus();
    
    // 改行検知を直接行う
    checkNewlineAndHighlight(event);
    console.log('=== END INPUT EVENT ===');
}

/**
 * 改行検知と行ハイライト更新
 */
function checkNewlineAndHighlight(event) {
    try {
        // Enterキーによる改行を直接検知
        if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph') {
            console.log('🆕 Line break detected via input event');
            
            // 改行直後のカーソル位置を確認
            setTimeout(() => {
                const cursorPos = editor.selectionStart;
                const textBeforeCursor = editor.value.substring(0, cursorPos);
                const currentLine = textBeforeCursor.split('\n').length;
                const totalLines = editor.value.split('\n').length;
                
                console.log(`🎯 After line break: cursor at position ${cursorPos}, line ${currentLine}, total lines: ${totalLines}`);
                
                // 行番号と行ハイライトを更新
                updateLineNumbers();
                updateLineHighlight();
                
                // 自動スクロール判定
                if (totalLines > 3) {
                    setTimeout(() => {
                        const lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
                        const statusBarHeight = 24;
                        const bottomMargin = statusBarHeight + lineHeight;
                        
                        const contentHeight = editor.scrollHeight;
                        const visibleHeight = editor.clientHeight;
                        const currentScroll = editor.scrollTop;
                        
                        const maxVisibleContent = currentScroll + visibleHeight - bottomMargin;
                        
                        if (contentHeight > maxVisibleContent) {
                            const newScrollTop = currentScroll + lineHeight;
                            const maxScrollTop = contentHeight - visibleHeight + bottomMargin;
                            
                            editor.scrollTop = Math.min(newScrollTop, maxScrollTop);
                            syncScroll();
                            console.log('📜 Auto-scrolled for new line:', editor.scrollTop);
                            
                            // スクロール後に確実に行ハイライトを更新
                            setTimeout(() => {
                                console.log('🔄 Updating highlight after auto-scroll');
                                updateLineHighlight();
                            }, 100);
                        }
                    }, 50);
                }
            }, 10);
        }
    } catch (error) {
        console.warn('⚠️ Newline check failed:', error);
    }
}