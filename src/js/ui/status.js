/*
 * =====================================================
 * Sert Editor - ステータス更新機能
 * 行番号、ステータスバー等のUI更新を管理
 * =====================================================
 */

import { editor } from '../core/state.js';

/**
 * 行番号の更新
 */
export function updateLineNumbers() {
    const lineNumbers = document.getElementById('line-numbers');
    if (!lineNumbers || !editor) return;
    
    const lines = editor.value.split('\n');
    const lineCount = lines.length;
    
    let lineNumbersContent = '';
    for (let i = 1; i <= lineCount; i++) {
        lineNumbersContent += i + '\n';
    }
    
    lineNumbers.textContent = lineNumbersContent;
}

/**
 * 行番号とエディタのスクロール同期
 */
export function syncScroll() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers && editor) {
        lineNumbers.scrollTop = editor.scrollTop;
    }
}

/**
 * ステータスバーの更新
 */
export function updateStatus() {
    if (!editor) return;
    
    const cursorPosition = document.getElementById('cursor-position');
    const charCount = document.getElementById('char-count');
    
    if (cursorPosition) {
        const cursorPos = editor.selectionStart;
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const lines = textBeforeCursor.split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        
        cursorPosition.textContent = `行: ${line}, 列: ${column}`;
    }
    
    if (charCount) {
        charCount.textContent = `総文字数: ${editor.value.length}`;
    }
}

/**
 * ファイルの変更状態を更新
 */
export async function updateModifiedState() {
    const { undoStack, setIsModified, editor } = await import('../core/state.js');
    
    if (!editor) return;
    
    const originalContent = undoStack.length > 0 ? undoStack[0].content : '';
    const modified = (editor.value !== originalContent);
    setIsModified(modified);
}