/*
 * =====================================================
 * Sert Editor - 編集操作
 * コピー、切り取り、貼り付け、全選択等の編集機能
 * =====================================================
 */

import { 
    editor, undoStack, redoStack, maxUndoStackSize,
    lastSelectionStart, lastSelectionEnd, lastOperationType,
    setLastSelection, setLastOperationType, setCurrentContent, setIsModified
} from '../core/state.js';
import { updateLineNumbers, updateStatus } from '../ui/status.js';
import { closeAllMenus } from '../ui/menu.js';
import { writeToClipboard, readFromClipboard } from '../utils/tauri.js';

/**
 * テキストのコピー
 */
export async function copy() {
    if (!editor) return;
    
    try {
        const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
        
        if (selectedText) {
            // 選択範囲を保存
            setLastSelection(editor.selectionStart, editor.selectionEnd);
            setLastOperationType('copy');
            
            // クリップボードに書き込み
            await writeToClipboard(selectedText);
        } else {
            setLastOperationType(null);
        }
    } catch (error) {
        console.error('コピーに失敗:', error);
        setLastOperationType('copy');
    }
    
    closeAllMenus();
    
    // エディタにフォーカスを戻し、選択範囲を維持
    setTimeout(() => {
        editor.focus();
        if (lastOperationType === 'copy') {
            editor.setSelectionRange(lastSelectionStart, lastSelectionEnd);
        }
    }, 10);
}

/**
 * テキストの切り取り
 */
export async function cut() {
    if (!editor) return;
    
    // カット操作前の状態を履歴に保存
    const beforeCutState = {
        content: editor.value,
        cursorPosition: editor.selectionStart,
        timestamp: Date.now()
    };
    
    // 重複チェック：最後の履歴と同じでなければ追加
    if (undoStack.length === 0 || undoStack[undoStack.length - 1].content !== beforeCutState.content) {
        undoStack.push(beforeCutState);
        
        // スタックサイズの制限
        if (undoStack.length > maxUndoStackSize) {
            undoStack.shift();
        }
    }
    
    try {
        const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
        
        if (selectedText) {
            // 選択範囲を保存
            setLastSelection(editor.selectionStart, editor.selectionEnd);
            setLastOperationType('cut');
            
            // クリップボードにコピー
            await writeToClipboard(selectedText);
            
            // 選択されたテキストを削除
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const newValue = editor.value.substring(0, start) + editor.value.substring(end);
            
            editor.value = newValue;
            editor.setSelectionRange(start, start);
            
            // カット後の位置を保存
            setLastSelection(start, start);
            
            // カット後の状態を履歴に保存
            const afterCutState = {
                content: editor.value,
                cursorPosition: start,
                timestamp: Date.now()
            };
            
            // 重複チェック：最後の履歴と同じでなければ追加
            if (undoStack.length === 0 || undoStack[undoStack.length - 1].content !== afterCutState.content) {
                undoStack.push(afterCutState);
                
                // スタックサイズの制限
                if (undoStack.length > maxUndoStackSize) {
                    undoStack.shift();
                }
                
                // currentContentも更新
                setCurrentContent(afterCutState.content);
                
                // リドゥスタックをクリア
                redoStack.length = 0;
                
                setIsModified(true);
            }
            
            updateLineNumbers();
            updateStatus();
            
            console.log('Cut successful:', selectedText.length, 'characters');
            
        } else {
            setLastOperationType(null);
        }
    } catch (error) {
        console.error('切り取りに失敗:', error);
        setLastOperationType(null);
    }
    
    closeAllMenus();
    
    // エディタにフォーカスを戻し、カーソル位置を設定
    setTimeout(() => {
        editor.focus();
        if (lastOperationType === 'cut') {
            editor.setSelectionRange(lastSelectionStart, lastSelectionStart);
        }
    }, 10);
}

/**
 * テキストの貼り付け
 */
export async function paste() {
    if (!editor) return;
    
    console.log('Paste function called');
    
    // ペースト操作前の状態を履歴に保存
    const beforePasteState = {
        content: editor.value,
        cursorPosition: editor.selectionStart,
        timestamp: Date.now()
    };
    
    // 重複チェック：最後の履歴と同じでなければ追加
    if (undoStack.length === 0 || undoStack[undoStack.length - 1].content !== beforePasteState.content) {
        undoStack.push(beforePasteState);
        
        // スタックサイズの制限
        if (undoStack.length > maxUndoStackSize) {
            undoStack.shift();
        }
    }
    
    try {
        const clipboardText = await readFromClipboard();
        console.log('Clipboard text read:', clipboardText ? clipboardText.length : 0, 'characters');
        
        if (clipboardText) {
            // 貼り付け位置を決定
            let pasteStart, pasteEnd;
            
            if (lastOperationType === 'copy' && lastSelectionStart !== undefined && lastSelectionEnd !== undefined) {
                // コピー後の貼り付け：元の選択範囲に貼り付け
                pasteStart = lastSelectionStart;
                pasteEnd = lastSelectionEnd;
                console.log('Paste mode: after copy, position:', pasteStart, '-', pasteEnd);
            } else if (lastOperationType === 'cut' && lastSelectionStart !== undefined) {
                // カット後の貼り付け：カット位置に貼り付け
                pasteStart = lastSelectionStart;
                pasteEnd = lastSelectionStart;
                console.log('Paste mode: after cut, position:', pasteStart);
            } else {
                // 通常の貼り付け：現在のカーソル位置または選択範囲
                pasteStart = editor.selectionStart;
                pasteEnd = editor.selectionEnd;
                console.log('Paste mode: normal, position:', pasteStart, '-', pasteEnd);
            }
            
            // テキストを挿入
            const newValue = editor.value.substring(0, pasteStart) + clipboardText + editor.value.substring(pasteEnd);
            editor.value = newValue;
            
            // カーソル位置を挿入したテキストの末尾に設定
            const newCursorPosition = pasteStart + clipboardText.length;
            editor.setSelectionRange(newCursorPosition, newCursorPosition);
            
            // 操作タイプをクリア
            setLastOperationType(null);
            
            // ペースト後の状態を履歴に保存
            const afterPasteState = {
                content: editor.value,
                cursorPosition: newCursorPosition,
                timestamp: Date.now()
            };
            
            // 重複チェック：最後の履歴と同じでなければ追加
            if (undoStack.length === 0 || undoStack[undoStack.length - 1].content !== afterPasteState.content) {
                undoStack.push(afterPasteState);
                
                // スタックサイズの制限
                if (undoStack.length > maxUndoStackSize) {
                    undoStack.shift();
                }
                
                // currentContentも更新
                setCurrentContent(afterPasteState.content);
                
                // リドゥスタックをクリア
                redoStack.length = 0;
                
                setIsModified(true);
            }
            
            updateLineNumbers();
            updateStatus();
            
            console.log('Paste successful:', clipboardText.length, 'characters');
        }
        
    } catch (error) {
        console.error('貼り付けに失敗:', error);
        // Tauri環境での貼り付けエラーは通常発生しないため、
        // フォールバック処理は行わない（二重貼り付けを防ぐため）
    }
    
    closeAllMenus();
    
    // エディタにフォーカスを戻す
    setTimeout(() => {
        editor.focus();
    }, 10);
    
    console.log('Paste function completed');
}

/**
 * 全選択
 */
export function selectAll() {
    if (!editor) return;
    
    editor.select();
    closeAllMenus();
}