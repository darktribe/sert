/*
 * =====================================================
 * Vinsert Editor - 編集操作（コピー・切り取り・貼り付け）
 * =====================================================
 */

import { 
    editor, 
    lastSelectionStart, 
    lastSelectionEnd, 
    lastOperationType,
    setLastSelection,
    setLastOperationType,
    undoStack,
    redoStack,
    maxUndoStackSize,
    currentContent,
    setCurrentContent,
    isModified,
    setIsModified,
    tauriInvoke
} from './globals.js';
import { closeAllMenus } from './menu-controller.js';
import { updateLineNumbers, updateStatus } from './ui-updater.js';

/**
 * テキストのコピー
 */
export async function copy() {
    try {
        const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
        
        if (selectedText) {
            // 選択範囲を保存
            setLastSelection(editor.selectionStart, editor.selectionEnd);
            setLastOperationType('copy');
            
            // Tauri環境でのクリップボード書き込み
            if (window.__TAURI__ && window.__TAURI__.clipboard) {
                await window.__TAURI__.clipboard.writeText(selectedText);
            } else if (tauriInvoke) {
                // フォールバック: Rustコマンドを使用
                await tauriInvoke('write_clipboard', { text: selectedText });
            } else {
                // 最後の手段: navigator.clipboard
                await navigator.clipboard.writeText(selectedText);
            }
        } else {
            setLastOperationType(null);
        }
    } catch (error) {
        console.error('Copy failed:', error);
        // エラーが発生した場合、ブラウザのデフォルト動作にフォールバック
        document.execCommand('copy');
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
            if (window.__TAURI__ && window.__TAURI__.clipboard) {
                await window.__TAURI__.clipboard.writeText(selectedText);
            } else if (tauriInvoke) {
                await tauriInvoke('write_clipboard', { text: selectedText });
            } else {
                await navigator.clipboard.writeText(selectedText);
            }
            
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
                
                if (!isModified) {
                    setIsModified(true);
                }
            }
            
            updateLineNumbers();
            updateStatus();
            
        } else {
            setLastOperationType(null);
        }
    } catch (error) {
        console.error('Cut failed:', error);
        // エラーが発生した場合、ブラウザのデフォルト動作にフォールバック
        document.execCommand('cut');
        setLastOperationType('cut');
        
        // カット後の状態確認と履歴保存（フォールバック用）
        setTimeout(() => {
            const afterCutState = {
                content: editor.value,
                cursorPosition: editor.selectionStart,
                timestamp: Date.now()
            };
            
            if (afterCutState.content !== beforeCutState.content) {
                if (undoStack.length === 0 || undoStack[undoStack.length - 1].content !== afterCutState.content) {
                    undoStack.push(afterCutState);
                    
                    if (undoStack.length > maxUndoStackSize) {
                        undoStack.shift();
                    }
                    
                    setCurrentContent(afterCutState.content);
                    redoStack.length = 0;
                    
                    if (!isModified) {
                        setIsModified(true);
                    }
                }
            }
            
            updateLineNumbers();
            updateStatus();
        }, 10);
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
        let clipboardText = '';
        
        // クリップボードから読み取り
        if (window.__TAURI__ && window.__TAURI__.clipboard) {
            clipboardText = await window.__TAURI__.clipboard.readText();
        } else if (tauriInvoke) {
            clipboardText = await tauriInvoke('read_clipboard');
        } else {
            clipboardText = await navigator.clipboard.readText();
        }
        
        if (clipboardText) {
            // 貼り付け位置は常に現在のカーソル位置または選択範囲
            const pasteStart = editor.selectionStart;
            const pasteEnd = editor.selectionEnd;
            
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
                
                if (!isModified) {
                    setIsModified(true);
                }
            }
            
            updateLineNumbers();
            updateStatus();
        }
        
    } catch (error) {
        console.error('Paste failed:', error);
        // フォールバック: ブラウザのデフォルト動作
        document.execCommand('paste');
        
        // execCommand後の状態を履歴に保存
        setTimeout(() => {
            const afterPasteState = {
                content: editor.value,
                cursorPosition: editor.selectionStart,
                timestamp: Date.now()
            };
            
            if (afterPasteState.content !== beforePasteState.content) {
                undoStack.push(afterPasteState);
                if (undoStack.length > maxUndoStackSize) {
                    undoStack.shift();
                }
                setCurrentContent(afterPasteState.content);
                redoStack.length = 0;
                if (!isModified) {
                    setIsModified(true);
                }
            }
            
            updateLineNumbers();
            updateStatus();
        }, 10);
    }
    
    closeAllMenus();
    
    // エディタにフォーカスを戻す
    setTimeout(() => {
        editor.focus();
    }, 10);
}

/**
 * 全選択
 */
export function selectAll() {
    editor.select();
    closeAllMenus();
}