/*
 * =====================================================
 * Sert Editor - グローバル変数定義（同期安全版）
 * =====================================================
 */

// DOM要素の参照
export let editor;
export function setEditor(element) {
    editor = element;
    console.log('📝 Editor element set:', !!editor);
}

// ファイル管理関連
export let currentFilePath = null;
export let isModified = false;
export let currentContent = '';

export function setCurrentFilePath(path) {
    currentFilePath = path;
    console.log('📁 Current file path set:', path);
}

export function setIsModified(modified) {
    isModified = modified;
    // グローバルwindowオブジェクトも同期（Rust側から参照可能）
    if (typeof window !== 'undefined') {
        window.isModified = modified;
        console.log('📝 Global isModified synchronized:', modified);
    }
}

export function setCurrentContent(content) {
    currentContent = content;
    console.log('📄 Current content length set:', content.length);
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
    console.log('🔧 Tauri invoke function set:', !!invoke);
}

// グローバル状態の初期化（安全版）
export function initializeGlobalState() {
    // 安全にグローバル変数を初期化
    if (typeof window !== 'undefined') {
        window.isModified = false;
        console.log('🌐 Global state initialized safely');
    }
}