/*
 * =====================================================
 * Sert Editor - エディタ機能
 * テキスト入力、IME処理、キーボードショートカット
 * =====================================================
 */

import { 
    editor, isComposing, compositionStartContent, compositionStartCursor,
    justFinishedComposition, isUndoRedoOperation, currentContent, isModified,
    setIsComposing, setCompositionStartContent, setCompositionStartCursor,
    setJustFinishedComposition, setIsUndoRedoOperation, setCurrentContent, setIsModified,
    undoStack, redoStack, maxUndoStackSize
} from '../core/state.js';
import { updateLineNumbers, updateStatus, syncScroll } from '../ui/status.js';
import { saveToUndoStack, undo, redo } from './undo-redo.js';
import { newFile, openFile, saveFile, saveAsFile, exitApp } from './file-operations.js';
import { copy, cut, paste, selectAll } from './edit-operations.js';

/**
 * エディタのイベントリスナーを設定
 */
export function setupEditorEvents() {
    if (!editor) return;
    
    // テキスト入力関連
    editor.addEventListener('input', handleInput);
    // キーボードイベントをcaptureフェーズでキャッチして優先処理
    editor.addEventListener('keydown', handleKeydown, true);
    
    // スクロール・フォーカス関連
    editor.addEventListener('scroll', syncScroll);
    editor.addEventListener('click', updateStatus);
    editor.addEventListener('keyup', updateStatus);
    
    // IME（日本語入力）関連
    editor.addEventListener('compositionstart', handleCompositionStart);
    editor.addEventListener('compositionend', handleCompositionEnd);
    editor.addEventListener('compositionupdate', handleCompositionUpdate);
    
    // ブラウザのデフォルトのコピー・貼り付けを完全に無効化
    editor.addEventListener('copy', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }, true);
    
    editor.addEventListener('cut', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }, true);
    
    editor.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }, true);
}

/**
 * IME変換開始時の処理
 */
function handleCompositionStart(e) {
    setIsComposing(true);
    setJustFinishedComposition(false);
    
    setCompositionStartContent(editor.value);
    setCompositionStartCursor(editor.selectionStart);
}

/**
 * IME変換中の処理
 */
function handleCompositionUpdate(e) {
    // 変換中の表示更新
}

/**
 * IME変換終了時の処理
 * 確定されたテキストをアンドゥ履歴に保存
 */
function handleCompositionEnd(e) {
    setIsComposing(false);
    
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
        }
    }, 10);
}

/**
 * テキスト入力時の処理
 * アンドゥ履歴の管理と画面更新を行う
 */
function handleInput(e) {
    // アンドゥ・リドゥ操作中は履歴作成をスキップ
    if (isUndoRedoOperation) {
        setIsUndoRedoOperation(false);
        updateLineNumbers();
        updateStatus();
        return;
    }
    
    // IME変換中は履歴作成をスキップ
    if (isComposing) {
        updateLineNumbers();
        updateStatus();
        return;
    }
    
    // IME確定直後の入力は履歴作成をスキップ
    if (justFinishedComposition) {
        setCurrentContent(editor.value);
        updateLineNumbers();
        updateStatus();
        return;
    }
    
    const newContent = editor.value;
    const cursorPosition = editor.selectionStart;
    
    if (newContent !== currentContent) {
        if (!isModified) {
            setIsModified(true);
        }
        
        const contentLengthDiff = newContent.length - currentContent.length;
        const previousCursorPosition = cursorPosition - contentLengthDiff;
        
        saveToUndoStack(currentContent, previousCursorPosition);
        setCurrentContent(newContent);
        redoStack.length = 0;
    }
    
    updateLineNumbers();
    updateStatus();
}

/**
 * キーボードイベントの処理
 * 各種ショートカットキーを処理する
 */
async function handleKeydown(e) {
    // アプリ終了ショートカット (Ctrl/Cmd+Q, Ctrl/Cmd+W)
    if ((e.metaKey || e.ctrlKey) && (e.key === 'q' || e.key === 'w')) {
        e.preventDefault();
        await exitApp();
        return;
    }
    
    // 名前を付けて保存 (Ctrl/Cmd+Shift+S) - 先に判定する必要がある
    if ((e.metaKey || e.ctrlKey) && e.key === 's' && e.shiftKey) {
        e.preventDefault();
        await saveAsFile();
        return;
    }
    
    // ファイル保存 (Ctrl/Cmd+S)
    if ((e.metaKey || e.ctrlKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        await saveFile();
        return;
    }
    
    // リドゥ (Ctrl/Cmd+Y または Ctrl/Cmd+Shift+Z)
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
    }
    
    // アンドゥ (Ctrl/Cmd+Z)
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
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
        await newFile();
        return;
    }
    
    // ファイルを開く (Ctrl/Cmd+O)
    if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        await openFile();
        return;
    }
    
    // 全選択 (Ctrl/Cmd+A)
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
    }
    
    // コピー (Ctrl/Cmd+C)
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        await copy();
        return;
    }
    
    // 切り取り (Ctrl/Cmd+X)
    if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        await cut();
        return;
    }
    
    // 貼り付け (Ctrl/Cmd+V)
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        await paste();
        return;
    }
}