/*
 * =====================================================
 * Sert Editor - 状態管理モジュール
 * グローバル変数とアプリケーション状態を管理
 * =====================================================
 */

// =====================================================
// DOM要素の参照
// =====================================================
export let editor = null;

export function setEditor(element) {
    editor = element;
}

// =====================================================
// ファイル管理関連
// =====================================================
export let currentFilePath = null;      // 現在開いているファイルのパス
export let isModified = false;          // ファイルが変更されているかのフラグ
export let currentContent = '';         // 現在のエディタ内容（比較用）

export function setCurrentFilePath(path) {
    currentFilePath = path;
}

export function setIsModified(modified) {
    isModified = modified;
}

export function setCurrentContent(content) {
    currentContent = content;
}

// =====================================================
// アンドゥ・リドゥ機能関連
// =====================================================
export let undoStack = [];              // アンドゥ用の履歴スタック
export let redoStack = [];              // リドゥ用の履歴スタック
export const maxUndoStackSize = 50;     // 履歴の最大保存数
export let isUndoRedoOperation = false; // アンドゥ・リドゥ操作中フラグ

export function setUndoStack(stack) {
    undoStack = stack;
}

export function setRedoStack(stack) {
    redoStack = stack;
}

export function setIsUndoRedoOperation(isOperation) {
    isUndoRedoOperation = isOperation;
}

// =====================================================
// IME（日本語入力）対応関連
// =====================================================
export let isComposing = false;         // IME変換中フラグ
export let compositionStartContent = '';
export let compositionStartCursor = 0;
export let justFinishedComposition = false;

export function setIsComposing(composing) {
    isComposing = composing;
}

export function setCompositionStartContent(content) {
    compositionStartContent = content;
}

export function setCompositionStartCursor(cursor) {
    compositionStartCursor = cursor;
}

export function setJustFinishedComposition(finished) {
    justFinishedComposition = finished;
}

// =====================================================
// クリップボード操作関連
// =====================================================
export let lastSelectionStart = 0;
export let lastSelectionEnd = 0;
export let lastOperationType = null;    // 'copy', 'cut', null

export function setLastSelection(start, end) {
    lastSelectionStart = start;
    lastSelectionEnd = end;
}

export function setLastOperationType(type) {
    lastOperationType = type;
}

// =====================================================
// Tauri API関連
// =====================================================
export let tauriInvoke = null;          // Tauri invoke関数の参照

export function setTauriInvoke(invoke) {
    tauriInvoke = invoke;
}

// =====================================================
// アプリケーション制御関連
// =====================================================
export const exitApp = { isRunning: false };

export function setExitAppRunning(running) {
    exitApp.isRunning = running;
}