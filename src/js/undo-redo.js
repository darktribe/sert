/*
 * =====================================================
 * Sert Editor - アンドゥ・リドゥ機能
 * =====================================================
 */

import { 
    editor, 
    undoStack, 
    redoStack, 
    maxUndoStackSize, 
    currentContent, 
    setCurrentContent,
    setIsUndoRedoOperation,
    setIsModified
} from './globals.js';
import { updateLineNumbers, updateStatus } from './ui-updater.js';
import { closeAllMenus } from './menu-controller.js';

/**
 * アンドゥスタックの初期化
 */
export function initializeUndoStack() {
    undoStack.length = 0;
    redoStack.length = 0;
    setCurrentContent(editor.value);
    
    // 初期状態を履歴に保存
    const initialState = {
        content: currentContent,
        cursorPosition: 0,
        timestamp: Date.now()
    };
    undoStack.push(initialState);
}

/**
 * アンドゥスタックに状態を保存
 */
export function saveToUndoStack(content = null, cursorPos = null) {
    const state = {
        content: content !== null ? content : currentContent,
        cursorPosition: cursorPos !== null ? cursorPos : editor.selectionStart,
        timestamp: Date.now()
    };
    
    // 重複チェック
    if (undoStack.length > 0) {
        const lastState = undoStack[undoStack.length - 1];
        if (lastState.content === state.content && lastState.cursorPosition === state.cursorPosition) {
            return;
        }
    }
    
    undoStack.push(state);
    
    // スタックサイズの制限
    if (undoStack.length > maxUndoStackSize) {
        undoStack.shift();
    }
}

/**
 * アンドゥ操作
 */
export function undo() {
    if (undoStack.length <= 1) {
        return;
    }
    
    // 現在の状態をリドゥスタックに保存
    const currentState = {
        content: editor.value,
        cursorPosition: editor.selectionStart,
        timestamp: Date.now()
    };
    redoStack.push(currentState);
    
    // アンドゥスタックから最新の状態を削除
    undoStack.pop();
    
    // 一つ前の状態を取得
    const previousState = undoStack[undoStack.length - 1];
    
    if (previousState) {
        setIsUndoRedoOperation(true);
        
        editor.value = previousState.content;
        setCurrentContent(previousState.content);
        
        requestAnimationFrame(() => {
            const pos = Math.min(previousState.cursorPosition, editor.value.length);
            editor.setSelectionRange(pos, pos);
            editor.focus();
        });
        
        updateModifiedState();
        updateLineNumbers();
        updateStatus();
    }
    
    closeAllMenus();
}

/**
 * リドゥ操作
 */
export function redo() {
    if (redoStack.length === 0) {
        return;
    }
    
    // リドゥスタックから状態を取得
    const nextState = redoStack.pop();
    
    if (nextState) {
        // 復元する状態をアンドゥスタックに追加
        undoStack.push(nextState);
        
        setIsUndoRedoOperation(true);
        
        editor.value = nextState.content;
        setCurrentContent(nextState.content);
        
        requestAnimationFrame(() => {
            const pos = Math.min(nextState.cursorPosition, editor.value.length);
            editor.setSelectionRange(pos, pos);
            editor.focus();
        });
        
        updateModifiedState();
        updateLineNumbers();
        updateStatus();
    }
    
    closeAllMenus();
}

/**
 * ファイルの変更状態を更新
 */
function updateModifiedState() {
    const originalContent = undoStack.length > 0 ? undoStack[0].content : '';
    setIsModified(editor.value !== originalContent);
}