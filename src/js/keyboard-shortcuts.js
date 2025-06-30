/*
 * =====================================================
 * Vinsert Editor - キーボードショートカット処理
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