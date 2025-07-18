/*
 * =====================================================
 * Vinsert Editor - キーボードショートカット処理（Tab入力対応版）
 * =====================================================
 */

import { editor } from './globals.js';
import { exitApp } from './app-exit.js';
import { saveFile, newFile, openFile, saveAsFile } from './file-operations.js';
import { undo, redo } from './undo-redo.js';
import { selectAll, copy, cut, paste } from './edit-operations.js';
import { showSearchDialog, showReplaceDialog, findNext, findPrevious } from './search-replace.js';
import { updateStatus } from './ui-updater.js';

/**
 * キーボードイベントの処理
 * 各種ショートカットキーを処理する
 */
export async function handleKeydown(e) {
    console.log('Key pressed:', e.key, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey);
    
    // ===== Tab キー入力処理 =====
    if (e.key === 'Tab') {
        e.preventDefault();
        
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const value = editor.value;
        
        if (e.shiftKey) {
            // Shift+Tab: インデント削除（行頭のタブまたは4つのスペースを削除）
            handleShiftTab(start, end, value);
        } else {
            // Tab: タブ文字またはスペース4つを挿入
            handleTab(start, end, value);
        }
        
        return;
    }
    
    // アプリ終了ショートカット (Ctrl/Cmd+Q, Ctrl/Cmd+W)
    if ((e.metaKey || e.ctrlKey) && (e.key === 'q' || e.key === 'w')) {
        e.preventDefault();
        console.log('Exit shortcut pressed');
        await exitApp();
        return;
    }
    
    // ファイル上書き保存 (Ctrl/Cmd+S)
    if ((e.metaKey || e.ctrlKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        console.log('Save shortcut pressed');
        await saveFile();
        return;
    }
    
    // 名前を付けて保存 (Ctrl/Cmd+Shift+S)
    if ((e.metaKey || e.ctrlKey) && e.key === 's' && e.shiftKey) {
        e.preventDefault();
        console.log('Save As shortcut pressed');
        await saveAsFile();
        return;
    }
    
    // リドゥ (Ctrl/Cmd+Y または Ctrl/Cmd+Shift+Z)
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        console.log('Redo shortcut pressed');
        redo();
        return;
    }
    
    // アンドゥ (Ctrl/Cmd+Z)
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        console.log('Undo shortcut pressed');
        undo();
        return;
    }
    
    // 検索 (Ctrl/Cmd+F)
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        console.log('Search shortcut pressed');
        showSearchDialog();
        return;
    }
    
    // 置換 (Ctrl/Cmd+H)
    if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        console.log('Replace shortcut pressed');
        showReplaceDialog();
        return;
    }
    
    // 次を検索 (F3 または Ctrl/Cmd+G)
    if (e.key === 'F3' || ((e.metaKey || e.ctrlKey) && e.key === 'g' && !e.shiftKey)) {
        e.preventDefault();
        console.log('Find next shortcut pressed');
        findNext();
        return;
    }
    
    // 前を検索 (Shift+F3 または Ctrl/Cmd+Shift+G)
    if ((e.key === 'F3' && e.shiftKey) || ((e.metaKey || e.ctrlKey) && e.key === 'g' && e.shiftKey)) {
        e.preventDefault();
        console.log('Find previous shortcut pressed');
        findPrevious();
        return;
    }
    
    // Homeキー処理
    if (e.key === 'Home') {
        e.preventDefault();
        
        if (e.metaKey || e.ctrlKey) {
            // ファイルの先頭へ (Ctrl/Cmd+Home)
            editor.setSelectionRange(0, 0);
            editor.scrollTop = 0;
        } else {
            // 行の先頭へ (Home)
            const cursorPos = editor.selectionStart;
            const textBeforeCursor = editor.value.substring(0, cursorPos);
            const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
            const lineStart = lastNewlineIndex + 1;
            editor.setSelectionRange(lineStart, lineStart);
        }
        
        setTimeout(() => updateStatus(), 0);
        return;
    }
    
    // Endキー処理
    if (e.key === 'End') {
        e.preventDefault();
        
        if (e.metaKey || e.ctrlKey) {
            // ファイルの末尾へ (Ctrl/Cmd+End)
            const textLength = editor.value.length;
            editor.setSelectionRange(textLength, textLength);
            editor.scrollTop = editor.scrollHeight;
        } else {
            // 行の末尾へ (End)
            const cursorPos = editor.selectionStart;
            const textAfterCursor = editor.value.substring(cursorPos);
            const nextNewlineIndex = textAfterCursor.indexOf('\n');
            const lineEnd = nextNewlineIndex === -1 ? 
                editor.value.length : 
                cursorPos + nextNewlineIndex;
            editor.setSelectionRange(lineEnd, lineEnd);
        }
        
        setTimeout(() => updateStatus(), 0);
        return;
    }
    
    // 新規作成 (Ctrl/Cmd+N)
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        console.log('New file shortcut pressed');
        await newFile();
        return;
    }
    
    // ファイルを開く (Ctrl/Cmd+O)
    if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        console.log('Open file shortcut pressed');
        await openFile();
        return;
    }
    
    // 全選択 (Ctrl/Cmd+A)
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        console.log('Select all shortcut pressed');
        selectAll();
        return;
    }
    
    // コピー (Ctrl/Cmd+C)
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        console.log('Copy shortcut pressed');
        copy();
        return;
    }
    
    // 切り取り (Ctrl/Cmd+X)
    if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
        e.preventDefault();
        console.log('Cut shortcut pressed');
        cut();
        return;
    }
    
    // 貼り付け (Ctrl/Cmd+V)
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        console.log('Paste shortcut pressed');
        paste();
        return;
    }
}

/**
 * Tab キー処理: タブ文字またはスペースを挿入
 */
function handleTab(start, end, value) {
    // タブ文字を挿入（スペース4つにしたい場合は '    ' に変更）
    const tabCharacter = '\t';
    
    if (start === end) {
        // カーソル位置にタブを挿入
        const newValue = value.substring(0, start) + tabCharacter + value.substring(end);
        editor.value = newValue;
        editor.setSelectionRange(start + tabCharacter.length, start + tabCharacter.length);
    } else {
        // 選択範囲を削除してタブを挿入
        const newValue = value.substring(0, start) + tabCharacter + value.substring(end);
        editor.value = newValue;
        editor.setSelectionRange(start + tabCharacter.length, start + tabCharacter.length);
    }
    
    // 画面更新（イベントを発火）
    editor.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Shift+Tab 処理: インデント削除
 */
function handleShiftTab(start, end, value) {
    if (start !== end) {
        // 複数行が選択されている場合：各行のインデントを削除
        handleMultiLineUnindent(start, end, value);
        return;
    }
    
    // 単一行の場合：カーソル位置の前のタブまたはスペースを削除
    const textBeforeCursor = value.substring(0, start);
    const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
    const lineStart = lastNewlineIndex + 1;
    const lineBeforeCursor = textBeforeCursor.substring(lineStart);
    
    let charsToRemove = 0;
    
    // 直前にタブがある場合
    if (lineBeforeCursor.endsWith('\t')) {
        charsToRemove = 1;
    }
    // 直前に4つのスペースがある場合
    else if (lineBeforeCursor.endsWith('    ')) {
        charsToRemove = 4;
    }
    // 直前に1-3つのスペースがある場合（行頭からのスペースのみ）
    else {
        const spacesMatch = lineBeforeCursor.match(/^( {1,3})$/);
        if (spacesMatch) {
            charsToRemove = spacesMatch[1].length;
        }
    }
    
    if (charsToRemove > 0) {
        const newValue = value.substring(0, start - charsToRemove) + value.substring(end);
        editor.value = newValue;
        editor.setSelectionRange(start - charsToRemove, start - charsToRemove);
        
        // 画面更新（イベントを発火）
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

/**
 * 複数行のインデント削除処理
 */
function handleMultiLineUnindent(start, end, value) {
    const textBeforeStart = value.substring(0, start);
    const selectedText = value.substring(start, end);
    const textAfterEnd = value.substring(end);
    
    // 選択範囲の最初の行の開始位置を取得
    const lastNewlineBeforeStart = textBeforeStart.lastIndexOf('\n');
    const selectionStart = lastNewlineBeforeStart + 1;
    
    // 選択範囲を含む全テキストを取得
    const fullSelectedText = value.substring(selectionStart, end);
    const lines = fullSelectedText.split('\n');
    
    let newLines = [];
    let totalRemovedChars = 0;
    
    lines.forEach((line, index) => {
        let removedChars = 0;
        let newLine = line;
        
        // 各行の先頭のタブまたはスペースを削除
        if (line.startsWith('\t')) {
            newLine = line.substring(1);
            removedChars = 1;
        } else if (line.startsWith('    ')) {
            newLine = line.substring(4);
            removedChars = 4;
        } else if (line.match(/^ {1,3}/)) {
            const spacesMatch = line.match(/^( {1,3})/);
            if (spacesMatch) {
                newLine = line.substring(spacesMatch[1].length);
                removedChars = spacesMatch[1].length;
            }
        }
        
        newLines.push(newLine);
        
        // 最初の行以外の場合、削除された文字数を合計に追加
        if (index > 0) {
            totalRemovedChars += removedChars;
        }
    });
    
    const newSelectedText = newLines.join('\n');
    const newValue = value.substring(0, selectionStart) + newSelectedText + textAfterEnd;
    
    editor.value = newValue;
    
    // 選択範囲を更新
    const newStart = start;
    const newEnd = end - totalRemovedChars;
    editor.setSelectionRange(newStart, newEnd);
    
    // 画面更新（イベントを発火）
    editor.dispatchEvent(new Event('input', { bubbles: true }));
}