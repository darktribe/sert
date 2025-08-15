/*
 * =====================================================
 * Vinsert Editor - 編集操作（コピー・切り取り・貼り付け）公式プラグイン対応版
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
 * テキストのコピー（公式プラグイン対応版）
 */
export async function copy() {
    console.log('🔧 Copy operation started');
    
    try {
        const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
        
        if (!selectedText) {
            console.log('⚠️ No text selected for copy');
            setLastOperationType(null);
            closeAllMenus();
            return;
        }
        
        console.log('📋 Copying text:', selectedText.length, 'characters');
        
        // 選択範囲を保存
        setLastSelection(editor.selectionStart, editor.selectionEnd);
        setLastOperationType('copy');
        
        let copySuccess = false;
        
        // 方法1: 公式Tauriクリップボードプラグイン（最優先）
        if (window.__TAURI__ && window.__TAURI_PLUGIN_CLIPBOARD_MANAGER__) {
            try {
                console.log('🔧 Trying official Tauri clipboard plugin');
                const { writeText } = window.__TAURI_PLUGIN_CLIPBOARD_MANAGER__;
                await writeText(selectedText);
                copySuccess = true;
                console.log('✅ Official Tauri clipboard plugin successful');
            } catch (error) {
                console.warn('⚠️ Official Tauri clipboard plugin failed:', error);
            }
        }
        
        // 方法2: 標準Tauriクリップボード API
        if (!copySuccess && window.__TAURI__ && window.__TAURI__.writeText) {
            try {
                console.log('🔧 Trying standard Tauri clipboard API');
                await window.__TAURI__.writeText(selectedText);
                copySuccess = true;
                console.log('✅ Standard Tauri clipboard API successful');
            } catch (error) {
                console.warn('⚠️ Standard Tauri clipboard API failed:', error);
            }
        }
        
        // 方法3: カスタムTauriコマンド（フォールバック）
        if (!copySuccess && tauriInvoke) {
            try {
                console.log('🔧 Trying custom Tauri command (fallback)');
                await tauriInvoke('write_clipboard', { text: selectedText });
                copySuccess = true;
                console.log('✅ Custom Tauri command successful');
            } catch (error) {
                console.warn('⚠️ Custom Tauri command failed:', error);
            }
        }
        
        // 方法4: ブラウザAPI（最後の手段）
        if (!copySuccess && navigator.clipboard) {
            try {
                console.log('🔧 Trying browser clipboard API');
                await navigator.clipboard.writeText(selectedText);
                copySuccess = true;
                console.log('✅ Browser clipboard API successful');
            } catch (error) {
                console.warn('⚠️ Browser clipboard API failed:', error);
            }
        }
        
        // 方法5: execCommand（最後の手段）
        if (!copySuccess) {
            try {
                console.log('🔧 Trying execCommand fallback');
                // 一時的に選択範囲を復元
                editor.focus();
                editor.setSelectionRange(editor.selectionStart, editor.selectionEnd);
                const success = document.execCommand('copy');
                if (success) {
                    copySuccess = true;
                    console.log('✅ execCommand copy successful');
                } else {
                    console.warn('⚠️ execCommand copy failed');
                }
            } catch (error) {
                console.error('❌ execCommand error:', error);
            }
        }
        
        if (!copySuccess) {
            console.error('❌ All copy methods failed');
            showCopyError();
        } else {
            console.log('✅ Copy operation completed successfully');
        }
        
    } catch (error) {
        console.error('❌ Copy operation error:', error);
        setLastOperationType(null);
        showCopyError();
    }
    
    closeAllMenus();
    
    // エディタにフォーカスを戻し、選択範囲を維持
    setTimeout(() => {
        try {
            editor.focus();
            if (lastOperationType === 'copy') {
                editor.setSelectionRange(lastSelectionStart, lastSelectionEnd);
            }
        } catch (error) {
            console.warn('⚠️ Failed to restore focus/selection:', error);
        }
    }, 10);
}

/**
 * テキストの切り取り（公式プラグイン対応版）
 */
export async function cut() {
    console.log('🔧 Cut operation started');
    
    const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
    
    if (!selectedText) {
        console.log('⚠️ No text selected for cut');
        closeAllMenus();
        return;
    }
    
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
        console.log('✂️ Cutting text:', selectedText.length, 'characters');
        
        // 選択範囲を保存
        setLastSelection(editor.selectionStart, editor.selectionEnd);
        setLastOperationType('cut');
        
        let cutSuccess = false;
        
        // まずクリップボードにコピー
        // 方法1: 公式Tauriクリップボードプラグイン（最優先）
        if (window.__TAURI__ && window.__TAURI_PLUGIN_CLIPBOARD_MANAGER__) {
            try {
                console.log('🔧 Trying official Tauri clipboard plugin for cut');
                const { writeText } = window.__TAURI_PLUGIN_CLIPBOARD_MANAGER__;
                await writeText(selectedText);
                cutSuccess = true;
                console.log('✅ Official Tauri clipboard plugin successful for cut');
            } catch (error) {
                console.warn('⚠️ Official Tauri clipboard plugin failed for cut:', error);
            }
        }
        
        // 方法2: 標準Tauriクリップボード API
        if (!cutSuccess && window.__TAURI__ && window.__TAURI__.writeText) {
            try {
                console.log('🔧 Trying standard Tauri clipboard API for cut');
                await window.__TAURI__.writeText(selectedText);
                cutSuccess = true;
                console.log('✅ Standard Tauri clipboard API successful for cut');
            } catch (error) {
                console.warn('⚠️ Standard Tauri clipboard API failed for cut:', error);
            }
        }
        
        // 方法3: カスタムTauriコマンド（フォールバック）
        if (!cutSuccess && tauriInvoke) {
            try {
                console.log('🔧 Trying custom Tauri command for cut');
                await tauriInvoke('write_clipboard', { text: selectedText });
                cutSuccess = true;
                console.log('✅ Custom Tauri command successful for cut');
            } catch (error) {
                console.warn('⚠️ Custom Tauri command failed for cut:', error);
            }
        }
        
        // 方法4: ブラウザAPI
        if (!cutSuccess && navigator.clipboard) {
            try {
                console.log('🔧 Trying browser clipboard API for cut');
                await navigator.clipboard.writeText(selectedText);
                cutSuccess = true;
                console.log('✅ Browser clipboard API successful for cut');
            } catch (error) {
                console.warn('⚠️ Browser clipboard API failed for cut:', error);
            }
        }
        
        // 方法5: execCommand（最後の手段）
        if (!cutSuccess) {
            try {
                console.log('🔧 Trying execCommand fallback for cut');
                editor.focus();
                editor.setSelectionRange(editor.selectionStart, editor.selectionEnd);
                const success = document.execCommand('cut');
                if (success) {
                    cutSuccess = true;
                    console.log('✅ execCommand cut successful');
                    
                    // execCommandが成功した場合、テキストは既に削除されているので、
                    // 状態を更新して終了
                    const afterCutState = {
                        content: editor.value,
                        cursorPosition: editor.selectionStart,
                        timestamp: Date.now()
                    };
                    
                    if (afterCutState.content !== beforeCutState.content) {
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
                    
                    updateLineNumbers();
                    updateStatus();
                    closeAllMenus();
                    return;
                } else {
                    console.warn('⚠️ execCommand cut failed');
                }
            } catch (error) {
                console.error('❌ execCommand error for cut:', error);
            }
        }
        
        // クリップボードへのコピーが成功した場合、手動でテキストを削除
        if (cutSuccess) {
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
            
            undoStack.push(afterCutState);
            if (undoStack.length > maxUndoStackSize) {
                undoStack.shift();
            }
            
            setCurrentContent(afterCutState.content);
            redoStack.length = 0;
            
            if (!isModified) {
                setIsModified(true);
            }
            
            updateLineNumbers();
            updateStatus();
            
            console.log('✅ Cut operation completed successfully');
        } else {
            console.error('❌ All cut methods failed');
            showCutError();
        }
        
    } catch (error) {
        console.error('❌ Cut operation error:', error);
        setLastOperationType(null);
        showCutError();
    }
    
    closeAllMenus();
    
    // エディタにフォーカスを戻す
    setTimeout(() => {
        try {
            editor.focus();
            if (lastOperationType === 'cut') {
                editor.setSelectionRange(lastSelectionStart, lastSelectionStart);
            }
        } catch (error) {
            console.warn('⚠️ Failed to restore focus after cut:', error);
        }
    }, 10);
}

/**
 * テキストの貼り付け（公式プラグイン対応版）
 */
export async function paste() {
    console.log('🔧 Paste operation started');
    
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
        let pasteSuccess = false;
        
        // 方法1: 公式Tauriクリップボードプラグイン（最優先）
        if (window.__TAURI__ && window.__TAURI_PLUGIN_CLIPBOARD_MANAGER__) {
            try {
                console.log('🔧 Trying official Tauri clipboard plugin for paste');
                const { readText } = window.__TAURI_PLUGIN_CLIPBOARD_MANAGER__;
                clipboardText = await readText() || '';
                pasteSuccess = true;
                console.log('✅ Official Tauri clipboard plugin successful for paste, text length:', clipboardText.length);
            } catch (error) {
                console.warn('⚠️ Official Tauri clipboard plugin failed for paste:', error);
            }
        }
        
        // 方法2: 標準Tauriクリップボード API
        if (!pasteSuccess && window.__TAURI__ && window.__TAURI__.readText) {
            try {
                console.log('🔧 Trying standard Tauri clipboard API for paste');
                clipboardText = await window.__TAURI__.readText() || '';
                pasteSuccess = true;
                console.log('✅ Standard Tauri clipboard API successful for paste, text length:', clipboardText.length);
            } catch (error) {
                console.warn('⚠️ Standard Tauri clipboard API failed for paste:', error);
            }
        }
        
        // 方法3: カスタムTauriコマンド（フォールバック）
        if (!pasteSuccess && tauriInvoke) {
            try {
                console.log('🔧 Trying custom Tauri command for paste');
                clipboardText = await tauriInvoke('read_clipboard') || '';
                pasteSuccess = true;
                console.log('✅ Custom Tauri command successful for paste, text length:', clipboardText.length);
            } catch (error) {
                console.warn('⚠️ Custom Tauri command failed for paste:', error);
            }
        }
        
        // 方法4: ブラウザAPI
        if (!pasteSuccess && navigator.clipboard) {
            try {
                console.log('🔧 Trying browser clipboard API for paste');
                clipboardText = await navigator.clipboard.readText() || '';
                pasteSuccess = true;
                console.log('✅ Browser clipboard API successful for paste, text length:', clipboardText.length);
            } catch (error) {
                console.warn('⚠️ Browser clipboard API failed for paste:', error);
            }
        }
        
        // 方法5: execCommand（最後の手段）
        if (!pasteSuccess) {
            try {
                console.log('🔧 Trying execCommand fallback for paste');
                editor.focus();
                const success = document.execCommand('paste');
                if (success) {
                    pasteSuccess = true;
                    console.log('✅ execCommand paste successful');
                    
                    // execCommandが成功した場合、テキストは既に挿入されているので、
                    // 状態を更新して終了
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
                    
                    closeAllMenus();
                    return;
                } else {
                    console.warn('⚠️ execCommand paste failed');
                }
            } catch (error) {
                console.error('❌ execCommand error for paste:', error);
            }
        }
        
        // クリップボードからの読み取りが成功した場合、手動でテキストを挿入
        if (pasteSuccess && clipboardText) {
            console.log('📋 Pasting text manually:', clipboardText.length, 'characters');
            
            // 貼り付け位置は現在のカーソル位置または選択範囲
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
            
            undoStack.push(afterPasteState);
            if (undoStack.length > maxUndoStackSize) {
                undoStack.shift();
            }
            
            setCurrentContent(afterPasteState.content);
            redoStack.length = 0;
            
            if (!isModified) {
                setIsModified(true);
            }
            
            updateLineNumbers();
            updateStatus();
            
            console.log('✅ Paste operation completed successfully');
        } else if (pasteSuccess && !clipboardText) {
            console.log('⚠️ Clipboard is empty');
            showPasteEmptyError();
        } else {
            console.error('❌ All paste methods failed');
            showPasteError();
        }
        
    } catch (error) {
        console.error('❌ Paste operation error:', error);
        showPasteError();
    }
    
    closeAllMenus();
    
    // エディタにフォーカスを戻す
    setTimeout(() => {
        try {
            editor.focus();
        } catch (error) {
            console.warn('⚠️ Failed to restore focus after paste:', error);
        }
    }, 10);
}

/**
 * 全選択
 */
export function selectAll() {
    try {
        console.log('🔧 Select all operation');
        editor.select();
        closeAllMenus();
        console.log('✅ Select all completed');
    } catch (error) {
        console.error('❌ Select all error:', error);
    }
}

/**
 * エラーメッセージ表示（非透明ウィンドウ対応版）
 */
function showCopyError() {
    // コンソールエラーログのみ（UIアラートは透明ウィンドウの原因になる可能性がある）
    console.error('💔 コピー操作が失敗しました。以下を確認してください：');
    console.error('   1. アプリケーションにクリップボードアクセス権限があるか');
    console.error('   2. セキュリティソフトがクリップボードアクセスをブロックしていないか');
    console.error('   3. 他のアプリケーションがクリップボードを使用していないか');
}

function showCutError() {
    console.error('💔 切り取り操作が失敗しました。以下を確認してください：');
    console.error('   1. アプリケーションにクリップボードアクセス権限があるか');
    console.error('   2. セキュリティソフトがクリップボードアクセスをブロックしていないか');
    console.error('   3. 他のアプリケーションがクリップボードを使用していないか');
}

function showPasteError() {
    console.error('💔 貼り付け操作が失敗しました。以下を確認してください：');
    console.error('   1. アプリケーションにクリップボードアクセス権限があるか');
    console.error('   2. セキュリティソフトがクリップボードアクセスをブロックしていないか');
    console.error('   3. 他のアプリケーションがクリップボードを使用していないか');
}

function showPasteEmptyError() {
    console.log('📋 クリップボードが空です。先にテキストをコピーしてください。');
}