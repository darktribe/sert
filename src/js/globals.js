/*
 * =====================================================
 * Vinsert Editor - グローバル変数定義
 * =====================================================
 */

// DOM要素の参照
export let editor;
export function setEditor(element) {
    editor = element;
}

// ファイル管理関連
export let currentFilePath = null;
export let isModified = false;
export let currentContent = '';

export function setCurrentFilePath(path) {
    currentFilePath = path;
}

export function setIsModified(modified) {
    isModified = modified;
}

export function setCurrentContent(content) {
    currentContent = content;
}

// アンドゥ・リドゥ機能関連
export let undoStack = [];
export let redoStack = [];
export let maxUndoStackSize = 50;
export let isUndoRedoOperation = false;

export function setIsUndoRedoOperation(value) {
    isUndoRedoOperation = value;
}

// IME（日本語入力）対応関連
export let isComposing = false;
export let compositionStartContent = '';
export let compositionStartCursor = 0;
export let justFinishedComposition = false;

export function setIsComposing(value) {
    isComposing = value;
}

export function setCompositionStartContent(content) {
    compositionStartContent = content;
}

export function setCompositionStartCursor(cursor) {
    compositionStartCursor = cursor;
}

export function setJustFinishedComposition(value) {
    justFinishedComposition = value;
}

// クリップボード操作関連
export let lastSelectionStart = 0;
export let lastSelectionEnd = 0;
export let lastOperationType = null;

export function setLastSelection(start, end) {
    lastSelectionStart = start;
    lastSelectionEnd = end;
}

export function setLastOperationType(type) {
    lastOperationType = type;
}

// Tauri API関連
export let tauriInvoke = null;

export function setTauriInvoke(invoke) {
    tauriInvoke = invoke;
}

// 行ハイライト機能関連
export let isLineHighlightEnabled = true;  // デフォルトで有効
export let currentHighlightedLine = -1;

export function setIsLineHighlightEnabled(enabled) {
    isLineHighlightEnabled = enabled;
    // ローカルストレージに保存
    try {
        localStorage.setItem('sert-line-highlight', enabled ? 'true' : 'false');
    } catch (error) {
        console.warn('Could not save line highlight setting:', error);
    }
}

export function setCurrentHighlightedLine(lineNumber) {
    currentHighlightedLine = lineNumber;
}

// 行ハイライト設定を読み込む関数
export function loadLineHighlightSetting() {
    try {
        const saved = localStorage.getItem('sert-line-highlight');
        if (saved !== null) {
            isLineHighlightEnabled = saved === 'true';
        }
    } catch (error) {
        console.warn('Could not load line highlight setting:', error);
    }
}