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
    updateStatus();
    // 最下段での改行チェック
    checkBottomLineNewline();
    console.log('=== END INPUT EVENT ===');
}

/**
 * 最下段での改行時の自動スクロール
 */
/**
 * 最下段での改行時の自動スクロール
 */
/**
 * 最下段での改行時の自動スクロール
 */
function checkBottomLineNewline() {
    try {
        const lines = editor.value.split('\n');
        const totalLines = lines.length;
        
        // 前回の行数と比較（改行が発生したかチェック）
        if (!editor._lastLineCount) {
            editor._lastLineCount = totalLines;
            return;
        }
        
        const lineIncreased = totalLines > editor._lastLineCount;
        editor._lastLineCount = totalLines;
        
        if (lineIncreased) {
            // 改行後に自動スクロール調整
            requestAnimationFrame(() => {
                const cursorPos = editor.selectionStart;
                const textBeforeCursor = editor.value.substring(0, cursorPos);
                const currentLine = textBeforeCursor.split('\n').length;
                
                // 現在のカーソル行の位置を計算
                const computedStyle = getComputedStyle(editor);
                const lineHeight = parseFloat(computedStyle.lineHeight);
                const paddingTop = parseFloat(computedStyle.paddingTop);
                const statusBarHeight = 24;
                
                const cursorLineTop = paddingTop + (currentLine - 1) * lineHeight;
                const cursorLineBottom = cursorLineTop + lineHeight;
                
                // 表示領域の下端（ステータスバーを除く）
                const visibleBottom = editor.scrollTop + editor.clientHeight - statusBarHeight - 10;
                
                // カーソル行がステータスバーにかかる場合は上にスクロール
                if (cursorLineBottom > visibleBottom) {
                    const newScrollTop = cursorLineBottom - editor.clientHeight + statusBarHeight + 20;
                    editor.scrollTop = Math.max(0, newScrollTop);
                    syncScroll();
                    console.log('📜 Auto-scrolled for new line visibility:', editor.scrollTop);
                }
            });
        }
    } catch (error) {
        console.warn('⚠️ Bottom line newline check failed:', error);
    }
}