/*
 * =====================================================
 * Vinsert Editor - IME（日本語入力）処理（真のタイプライターモード対応版）
 * =====================================================
 */

import { 
    editor, 
    isModified, 
    setIsModified,
    undoStack, 
    redoStack, 
    maxUndoStackSize, 
    currentContent, 
    setCurrentContent,
    compositionStartContent,
    setIsComposing,
    setCompositionStartContent,
    setCompositionStartCursor,
    setJustFinishedComposition
} from './globals.js';
import { updateLineNumbers, updateStatus } from './ui-updater.js';
import { onCompositionStart, onCompositionEnd, onInputEvent } from './typewriter-mode.js';

/**
 * IME変換開始時の処理
 */
export function handleCompositionStart(e) {
    setIsComposing(true);
    setJustFinishedComposition(false);
    
    setCompositionStartContent(editor.value);
    setCompositionStartCursor(editor.selectionStart);
    
    // タイプライターモードにIME開始を通知
    onCompositionStart();
    
    console.log('📝 IME composition started at position:', editor.selectionStart);
}

/**
 * IME変換中の処理
 */
export function handleCompositionUpdate(e) {
    console.log('📝 IME composition updating:', e.data);
    
    // 変換中でもタイプライターモードを適用（行が変わった場合）
    setTimeout(() => {
        onInputEvent();
    }, 5);
}

/**
 * IME変換終了時の処理
 * 確定されたテキストをアンドゥ履歴に保存
 */
export function handleCompositionEnd(e) {
    setIsComposing(false);
    
    console.log('📝 IME composition ended with data:', e.data);
    
    // タイプライターモードにIME終了を通知
    onCompositionEnd();
    
    setTimeout(() => {
        const newContent = editor.value;
        const cursorPosition = editor.selectionStart;
        
        if (newContent !== compositionStartContent) {
            // IME確定による変更があった場合、確定後の状態を履歴に保存
            const confirmedState = {
                content: newContent,
                cursorPosition: cursorPosition,
                timestamp: Date.now()
            };
            
            // 重複チェック：最後の履歴と同じでなければ追加
            if (undoStack.length === 0 || undoStack[undoStack.length - 1].content !== newContent) {
                undoStack.push(confirmedState);
                
                // スタックサイズの制限
                if (undoStack.length > maxUndoStackSize) {
                    undoStack.shift();
                }
            }
            
            setCurrentContent(newContent);
            
            if (!isModified) {
                setIsModified(true);
            }
            
            redoStack.length = 0;
            updateLineNumbers();
            updateStatus();
            
            // IME確定直後フラグを設定
            setJustFinishedComposition(true);
            
            // 少し時間をおいてフラグをリセット
            setTimeout(() => {
                setJustFinishedComposition(false);
            }, 100);
            
            console.log('📝 IME composition confirmed and saved to history');
        } else {
            console.log('📝 IME composition cancelled or no change');
        }
    }, 10);
}