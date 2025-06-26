/*
 * =====================================================
 * Sert Editor - UI更新機能
 * =====================================================
 */

import { editor } from './globals.js';

/**
 * 行番号の更新
 */
export function updateLineNumbers() {
    const lineNumbers = document.getElementById('line-numbers');
    if (!lineNumbers) return;
    
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
    if (lineNumbers) {
        lineNumbers.scrollTop = editor.scrollTop;
    }
}

/**
 * ステータスバーの更新
 */
export function updateStatus() {
    const cursorPosition = document.getElementById('cursor-position');
    const charCount = document.getElementById('char-count');
    const fileEncoding = document.getElementById('file-encoding');
    
    if (cursorPosition) {
        const cursorPos = editor.selectionStart;
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const lines = textBeforeCursor.split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        
        cursorPosition.textContent = `行: ${line}, 列: ${column}`;
    }
    
    if (fileEncoding) {
        fileEncoding.textContent = 'UTF-8';
    }
    
    if (charCount) {
        charCount.textContent = `総文字数: ${editor.value.length}`;
    }
}