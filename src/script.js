/*
 * =====================================================
 * Sert Editor - メインJavaScriptファイル Part 1
 * グローバル変数定義とアプリケーション初期化
 * =====================================================
 */

// =====================================================
// グローバル変数の定義
// =====================================================

// DOM要素の参照
let editor;

// ファイル管理関連
let currentFilePath = null;      // 現在開いているファイルのパス
let isModified = false;          // ファイルが変更されているかのフラグ
let currentContent = '';         // 現在のエディタ内容（比較用）

// アンドゥ・リドゥ機能関連
let undoStack = [];              // アンドゥ用の履歴スタック
let redoStack = [];              // リドゥ用の履歴スタック
let maxUndoStackSize = 50;       // 履歴の最大保存数
let isUndoRedoOperation = false; // アンドゥ・リドゥ操作中フラグ

// IME（日本語入力）対応関連
let isComposing = false;         // IME変換中フラグ
let compositionStartContent = '';
let compositionStartCursor = 0;
let justFinishedComposition = false;

// クリップボード操作関連
let lastSelectionStart = 0;
let lastSelectionEnd = 0;
let lastOperationType = null;    // 'copy', 'cut', null

// Tauri API関連
let tauriInvoke = null;          // Tauri invoke関数の参照

// =====================================================
// アプリケーション初期化
// =====================================================

/**
 * Tauri APIの初期化
 * ウィンドウクローズイベントの設定も行う
 */
async function initializeTauri() {
    try {
        if (window.__TAURI__ && window.__TAURI__.core) {
            tauriInvoke = window.__TAURI__.core.invoke;
            
            // ウィンドウクローズイベントの設定
            if (window.__TAURI__.window) {
                const { getCurrentWindow } = window.__TAURI__.window;
                const currentWindow = getCurrentWindow();
                
                await currentWindow.onCloseRequested(async (event) => {
                    event.preventDefault();
                    await exitApp();
                });
            }
        }
    } catch (error) {
        console.log('Tauri API初期化失敗:', error);
    }
}

/**
 * ページ読み込み時の初期化処理
 */
window.addEventListener('DOMContentLoaded', async () => {
    await initializeTauri();
    
    editor = document.getElementById('editor');
    if (!editor) {
        console.error('エディタ要素が見つかりません');
        return;
    }
    
    // エディタの初期設定
    currentContent = editor.value;
    initializeUndoStack();
    updateLineNumbers();
    updateStatus();
    setupEventListeners();
    
    // カーソルを1行目1列目に設定
    editor.setSelectionRange(0, 0);
    editor.focus();
});

// =====================================================
// イベントリスナーの設定
// =====================================================

/**
 * エディタのイベントリスナーを設定
 */
function setupEventListeners() {
    // テキスト入力関連
    editor.addEventListener('input', handleInput);
    editor.addEventListener('keydown', handleKeydown);
    
    // スクロール・フォーカス関連
    editor.addEventListener('scroll', syncScroll);
    editor.addEventListener('click', updateStatus);
    editor.addEventListener('keyup', updateStatus);
    
    // IME（日本語入力）関連
    editor.addEventListener('compositionstart', handleCompositionStart);
    editor.addEventListener('compositionend', handleCompositionEnd);
    editor.addEventListener('compositionupdate', handleCompositionUpdate);
    
    // メニュー制御
    document.addEventListener('click', handleGlobalClick);
}

// =====================================================
// IME（日本語入力）処理
// =====================================================

/**
 * IME変換開始時の処理
 */
function handleCompositionStart(e) {
    isComposing = true;
    justFinishedComposition = false;
    
    compositionStartContent = editor.value;
    compositionStartCursor = editor.selectionStart;
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
    isComposing = false;
    
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
            
            currentContent = newContent;
            
            if (!isModified) {
                isModified = true;
            }
            
            redoStack = [];
            updateLineNumbers();
            updateStatus();
            
            // IME確定直後フラグを設定
            justFinishedComposition = true;
            
            // 少し時間をおいてフラグをリセット
            setTimeout(() => {
                justFinishedComposition = false;
            }, 100);
        }
    }, 10);
}

// =====================================================
// テキスト入力処理
// =====================================================

/**
 * テキスト入力時の処理
 * アンドゥ履歴の管理と画面更新を行う
 */
function handleInput(e) {
    // アンドゥ・リドゥ操作中は履歴作成をスキップ
    if (isUndoRedoOperation) {
        isUndoRedoOperation = false;
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
        currentContent = editor.value;
        updateLineNumbers();
        updateStatus();
        return;
    }
    
    const newContent = editor.value;
    const cursorPosition = editor.selectionStart;
    
    if (newContent !== currentContent) {
        if (!isModified) {
            isModified = true;
        }
        
        const contentLengthDiff = newContent.length - currentContent.length;
        const previousCursorPosition = cursorPosition - contentLengthDiff;
        
        saveToUndoStack(currentContent, previousCursorPosition);
        currentContent = newContent;
        redoStack = [];
    }
    
    updateLineNumbers();
    updateStatus();
}

// =====================================================
// キーボードショートカット処理
// =====================================================

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
    
    // ファイル保存 (Ctrl/Cmd+S)
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
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
    
    // 名前を付けて保存 (Ctrl/Cmd+Shift+S)
    if ((e.metaKey || e.ctrlKey) && e.key === 's' && e.shiftKey) {
        e.preventDefault();
        await saveAsFile();
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
        copy();
        return;
    }
    
    // 切り取り (Ctrl/Cmd+X)
    if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
        cut();
        return;
    }
    
    // 貼り付け (Ctrl/Cmd+V)
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        paste();
        return;
    }
}

// =====================================================
// アンドゥ・リドゥ機能
// =====================================================

/**
 * アンドゥスタックの初期化
 */
function initializeUndoStack() {
    undoStack = [];
    redoStack = [];
    currentContent = editor.value;
    
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
function saveToUndoStack(content = null, cursorPos = null) {
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
function undo() {
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
        isUndoRedoOperation = true;
        
        editor.value = previousState.content;
        currentContent = previousState.content;
        
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
function redo() {
    if (redoStack.length === 0) {
        return;
    }
    
    // リドゥスタックから状態を取得
    const nextState = redoStack.pop();
    
    if (nextState) {
        // 復元する状態をアンドゥスタックに追加
        undoStack.push(nextState);
        
        isUndoRedoOperation = true;
        
        editor.value = nextState.content;
        currentContent = nextState.content;
        
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
    isModified = (editor.value !== originalContent);
}

// =====================================================
// UI更新機能
// =====================================================

/**
 * 行番号の更新
 */
function updateLineNumbers() {
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
function syncScroll() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) {
        lineNumbers.scrollTop = editor.scrollTop;
    }
}

/**
 * ステータスバーの更新
 */
function updateStatus() {
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

// =====================================================
// メニュー制御
// =====================================================

/**
 * ドロップダウンメニューの表示/非表示切り替え
 */
function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    
    closeAllMenus();
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

/**
 * すべてのメニューを閉じる
 */
function closeAllMenus() {
    const menus = document.querySelectorAll('.dropdown-menu');
    menus.forEach(menu => {
        menu.style.display = 'none';
    });
}

/**
 * メニュー外クリック時の処理
 */
function handleGlobalClick(e) {
    if (!e.target.closest('.menu-item')) {
        closeAllMenus();
    }
}

// =====================================================
// ファイル操作
// =====================================================

/**
 * 新規ファイル作成
 * 変更がある場合は保存確認ダイアログを表示
 */
async function newFile() {
    // 変更がある場合の確認
    if (isModified) {
        const choice = await showNewFileDialog();
        
        if (choice === 'saveAndNew') {
            try {
                if (currentFilePath) {
                    await saveFileBeforeNew();
                } else {
                    const saveSuccess = await saveAsFileForNew();
                    
                    if (!saveSuccess) {
                        closeAllMenus();
                        return;
                    }
                }
            } catch (error) {
                console.error('保存に失敗しました:', error);
                alert('保存に失敗しました: ' + error.message + '\n新規作成をキャンセルします。');
                closeAllMenus();
                return;
            }
        } else if (choice === 'cancel') {
            closeAllMenus();
            return;
        }
    }
    
    // エディタを完全にリセット
    editor.value = '';
    currentFilePath = null;
    isModified = false;
    currentContent = '';
    
    // アンドゥ・リドゥスタックを完全にクリア
    undoStack = [];
    redoStack = [];
    
    // 空の状態で初期化
    initializeUndoStack();
    updateLineNumbers();
    updateStatus();
    
    // カーソルを1行目1列目に設定
    editor.setSelectionRange(0, 0);
    editor.focus();
    
    closeAllMenus();
}

/**
 * ファイルを開く
 * 変更がある場合は保存確認ダイアログを表示
 */
async function openFile() {
    try {
        if (isModified) {
            const choice = await showOpenFileDialog();
            
            if (choice === 'saveAndOpen') {
                try {
                    if (currentFilePath) {
                        await saveFileBeforeOpen();
                    } else {
                        const saveSuccess = await saveAsFileForOpen();
                        if (!saveSuccess) {
                            closeAllMenus();
                            return;
                        }
                    }
                } catch (error) {
                    alert('保存に失敗しました: ' + error.message + '\nファイルを開く処理をキャンセルします。');
                    closeAllMenus();
                    return;
                }
            } else if (choice === 'cancel') {
                closeAllMenus();
                return;
            }
        }
        
        await showFileOpenDialog();
        
    } catch (error) {
        alert('ファイルを開くことができませんでした: ' + error.message);
    }
    
    closeAllMenus();
}

/**
 * ファイルオープンダイアログの表示
 */
async function showFileOpenDialog() {
    if (window.__TAURI__ && window.__TAURI__.dialog) {
        const filePath = await window.__TAURI__.dialog.open({
            title: "ファイルを開く",
            multiple: false,
            filters: [
                { name: 'テキストファイル', extensions: ['txt', 'md', 'rs', 'js', 'html', 'css', 'json', 'xml', 'py'] },
                { name: 'すべてのファイル', extensions: ['*'] }
            ]
        });
        
        if (filePath) {
            let content;
            if (window.__TAURI__ && window.__TAURI__.fs) {
                content = await window.__TAURI__.fs.readTextFile(filePath);
            } else {
                content = await tauriInvoke('read_file', { path: filePath });
            }
            
            // エディタに設定してアンドゥスタックを完全リセット
            editor.value = content;
            currentFilePath = filePath;
            isModified = false;
            currentContent = content;
            
            // アンドゥ・リドゥスタックを完全にクリア
            undoStack = [];
            redoStack = [];
            
            // ファイル内容で初期化
            initializeUndoStack();
            updateLineNumbers();
            updateStatus();
        }
    } else {
        alert('ファイルオープン機能はTauriアプリでのみ利用可能です');
    }
}

/**
 * ファイル保存
 */
async function saveFile() {
    try {
        if (currentFilePath) {
            if (window.__TAURI__ && window.__TAURI__.fs) {
                await window.__TAURI__.fs.writeTextFile(currentFilePath, editor.value);
            } else {
                await tauriInvoke('write_file', { 
                    path: currentFilePath, 
                    content: editor.value 
                });
            }
            
            isModified = false;
            currentContent = editor.value;
        } else {
            await saveAsFile();
            return;
        }
    } catch (error) {
        alert('ファイルを保存できませんでした: ' + error.message);
    }
    
    closeAllMenus();
}

/**
 * 名前を付けて保存
 */
async function saveAsFile() {
    try {
        if (window.__TAURI__ && window.__TAURI__.dialog) {
            const filePath = await window.__TAURI__.dialog.save({
                title: "名前を付けて保存",
                filters: [
                    { name: 'テキストファイル', extensions: ['txt'] },
                    { name: 'Markdownファイル', extensions: ['md'] },
                    { name: 'すべてのファイル', extensions: ['*'] }
                ]
            });
            
            if (filePath) {
                if (window.__TAURI__ && window.__TAURI__.fs) {
                    await window.__TAURI__.fs.writeTextFile(filePath, editor.value);
                } else {
                    await tauriInvoke('write_file', { 
                        path: filePath, 
                        content: editor.value 
                    });
                }
                
                currentFilePath = filePath;
                isModified = false;
                currentContent = editor.value;
            }
        } else {
            alert('ファイル保存機能はTauriアプリでのみ利用可能です');
        }
    } catch (error) {
        alert('ファイルを保存できませんでした: ' + error.message);
    }
    
    closeAllMenus();
}

/**
 * 新規作成前の保存処理（上書き保存）
 */
async function saveFileBeforeNew() {
    if (currentFilePath) {
        if (window.__TAURI__ && window.__TAURI__.fs) {
            await window.__TAURI__.fs.writeTextFile(currentFilePath, editor.value);
        } else if (tauriInvoke) {
            await tauriInvoke('write_file', { 
                path: currentFilePath, 
                content: editor.value 
            });
        } else {
            throw new Error('Tauriアプリでのみ利用可能です');
        }
        
        isModified = false;
        currentContent = editor.value;
    } else {
        throw new Error('新規ファイルのため保存できません。先に「名前を付けて保存」を実行してください。');
    }
}

/**
 * 新規作成前専用の「名前を付けて保存」処理
 */
async function saveAsFileForNew() {
    try {
        if (window.__TAURI__ && window.__TAURI__.dialog) {
            const filePath = await window.__TAURI__.dialog.save({
                title: "ファイルを保存してから新規作成",
                filters: [
                    { name: 'テキストファイル', extensions: ['txt'] },
                    { name: 'Markdownファイル', extensions: ['md'] },
                    { name: 'すべてのファイル', extensions: ['*'] }
                ]
            });
            
            if (filePath) {
                if (window.__TAURI__ && window.__TAURI__.fs) {
                    await window.__TAURI__.fs.writeTextFile(filePath, editor.value);
                } else {
                    await tauriInvoke('write_file', { 
                        path: filePath, 
                        content: editor.value 
                    });
                }
                
                currentFilePath = filePath;
                isModified = false;
                currentContent = editor.value;
                
                return true; // 保存成功
            } else {
                return false; // 保存キャンセル
            }
        } else {
            throw new Error('ファイル保存機能はTauriアプリでのみ利用可能です');
        }
    } catch (error) {
        throw error;
    }
}

/**
 * ファイルを開く前の保存処理
 */
async function saveFileBeforeOpen() {
    if (currentFilePath) {
        if (window.__TAURI__ && window.__TAURI__.fs) {
            await window.__TAURI__.fs.writeTextFile(currentFilePath, editor.value);
        } else if (tauriInvoke) {
            await tauriInvoke('write_file', { 
                path: currentFilePath, 
                content: editor.value 
            });
        } else {
            throw new Error('Tauriアプリでのみ利用可能です');
        }
        
        isModified = false;
        currentContent = editor.value;
    } else {
        throw new Error('新規ファイルのため保存できません。先に「名前を付けて保存」を実行してください。');
    }
}

/**
 * ファイルを開く前専用の「名前を付けて保存」処理
 */
async function saveAsFileForOpen() {
    try {
        if (window.__TAURI__ && window.__TAURI__.dialog) {
            const filePath = await window.__TAURI__.dialog.save({
                title: "ファイルを保存してから開く",
                filters: [
                    { name: 'テキストファイル', extensions: ['txt'] },
                    { name: 'Markdownファイル', extensions: ['md'] },
                    { name: 'すべてのファイル', extensions: ['*'] }
                ]
            });
            
            if (filePath) {
                if (window.__TAURI__ && window.__TAURI__.fs) {
                    await window.__TAURI__.fs.writeTextFile(filePath, editor.value);
                } else {
                    await tauriInvoke('write_file', { 
                        path: filePath, 
                        content: editor.value 
                    });
                }
                
                currentFilePath = filePath;
                isModified = false;
                currentContent = editor.value;
                
                return true;
            } else {
                return false;
            }
        } else {
            throw new Error('ファイル保存機能はTauriアプリでのみ利用可能です');
        }
    } catch (error) {
        throw error;
    }
}

// =====================================================
// 編集操作（コピー・切り取り・貼り付け）
// =====================================================

/**
 * テキストのコピー
 */
async function copy() {
    try {
        const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
        
        if (selectedText) {
            // 選択範囲を保存
            lastSelectionStart = editor.selectionStart;
            lastSelectionEnd = editor.selectionEnd;
            lastOperationType = 'copy';
            
            // Tauri環境でのクリップボード書き込み
            if (window.__TAURI__ && window.__TAURI__.clipboard) {
                await window.__TAURI__.clipboard.writeText(selectedText);
            } else if (tauriInvoke) {
                // フォールバック: Rustコマンドを使用
                await tauriInvoke('write_clipboard', { text: selectedText });
            } else {
                // 最後の手段: navigator.clipboard
                await navigator.clipboard.writeText(selectedText);
            }
        } else {
            lastOperationType = null;
        }
    } catch (error) {
        console.error('コピーに失敗:', error);
        // エラーが発生した場合、ブラウザのデフォルト動作にフォールバック
        document.execCommand('copy');
        lastOperationType = 'copy';
    }
    
    closeAllMenus();
    
    // エディタにフォーカスを戻し、選択範囲を維持
    setTimeout(() => {
        editor.focus();
        if (lastOperationType === 'copy') {
            editor.setSelectionRange(lastSelectionStart, lastSelectionEnd);
        }
    }, 10);
}

/**
 * テキストの切り取り
 */
async function cut() {
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
        const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
        
        if (selectedText) {
            // 選択範囲を保存
            lastSelectionStart = editor.selectionStart;
            lastSelectionEnd = editor.selectionEnd;
            lastOperationType = 'cut';
            
            // クリップボードにコピー
            if (window.__TAURI__ && window.__TAURI__.clipboard) {
                await window.__TAURI__.clipboard.writeText(selectedText);
            } else if (tauriInvoke) {
                await tauriInvoke('write_clipboard', { text: selectedText });
            } else {
                await navigator.clipboard.writeText(selectedText);
            }
            
            // 選択されたテキストを削除
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const newValue = editor.value.substring(0, start) + editor.value.substring(end);
            
            editor.value = newValue;
            editor.setSelectionRange(start, start);
            
            // カット後の位置を保存
            lastSelectionStart = start;
            lastSelectionEnd = start;
            
            // カット後の状態を履歴に保存
            const afterCutState = {
                content: editor.value,
                cursorPosition: start,
                timestamp: Date.now()
            };
            
            // 重複チェック：最後の履歴と同じでなければ追加
            if (undoStack.length === 0 || undoStack[undoStack.length - 1].content !== afterCutState.content) {
                undoStack.push(afterCutState);
                
                // スタックサイズの制限
                if (undoStack.length > maxUndoStackSize) {
                    undoStack.shift();
                }
                
                // currentContentも更新
                currentContent = afterCutState.content;
                
                // リドゥスタックをクリア
                redoStack = [];
                
                if (!isModified) {
                    isModified = true;
                }
            }
            
            updateLineNumbers();
            updateStatus();
            
        } else {
            lastOperationType = null;
        }
    } catch (error) {
        console.error('切り取りに失敗:', error);
        // エラーが発生した場合、ブラウザのデフォルト動作にフォールバック
        document.execCommand('cut');
        lastOperationType = 'cut';
        
        // カット後の状態確認と履歴保存（フォールバック用）
        setTimeout(() => {
            const afterCutState = {
                content: editor.value,
                cursorPosition: editor.selectionStart,
                timestamp: Date.now()
            };
            
            if (afterCutState.content !== beforeCutState.content) {
                if (undoStack.length === 0 || undoStack[undoStack.length - 1].content !== afterCutState.content) {
                    undoStack.push(afterCutState);
                    
                    if (undoStack.length > maxUndoStackSize) {
                        undoStack.shift();
                    }
                    
                    currentContent = afterCutState.content;
                    redoStack = [];
                    
                    if (!isModified) {
                        isModified = true;
                    }
                }
            }
            
            updateLineNumbers();
            updateStatus();
        }, 10);
    }
    
    closeAllMenus();
    
    // エディタにフォーカスを戻し、カーソル位置を設定
    setTimeout(() => {
        editor.focus();
        if (lastOperationType === 'cut') {
            editor.setSelectionRange(lastSelectionStart, lastSelectionStart);
        }
    }, 10);
}

/**
 * テキストの貼り付け
 */
async function paste() {
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
        
        // クリップボードからテキストを取得
        if (window.__TAURI__ && window.__TAURI__.clipboard) {
            clipboardText = await window.__TAURI__.clipboard.readText();
        } else if (tauriInvoke) {
            clipboardText = await tauriInvoke('read_clipboard');
        } else {
            clipboardText = await navigator.clipboard.readText();
        }
        
        if (clipboardText) {
            // 貼り付け位置を決定
            let pasteStart, pasteEnd;
            
            if (lastOperationType === 'copy' && lastSelectionStart !== undefined && lastSelectionEnd !== undefined) {
                // コピー後の貼り付け：元の選択範囲に貼り付け
                pasteStart = lastSelectionStart;
                pasteEnd = lastSelectionEnd;
            } else if (lastOperationType === 'cut' && lastSelectionStart !== undefined) {
                // カット後の貼り付け：カット位置に貼り付け
                pasteStart = lastSelectionStart;
                pasteEnd = lastSelectionStart;
            } else {
                // 通常の貼り付け：現在のカーソル位置または選択範囲
                pasteStart = editor.selectionStart;
                pasteEnd = editor.selectionEnd;
            }
            
            // テキストを挿入
            const newValue = editor.value.substring(0, pasteStart) + clipboardText + editor.value.substring(pasteEnd);
            editor.value = newValue;
            
            // カーソル位置を挿入したテキストの末尾に設定
            const newCursorPosition = pasteStart + clipboardText.length;
            editor.setSelectionRange(newCursorPosition, newCursorPosition);
            
            // 操作タイプをクリア
            lastOperationType = null;
            
            // ペースト後の状態を履歴に保存
            const afterPasteState = {
                content: editor.value,
                cursorPosition: newCursorPosition,
                timestamp: Date.now()
            };
            
            // 重複チェック：最後の履歴と同じでなければ追加
            if (undoStack.length === 0 || undoStack[undoStack.length - 1].content !== afterPasteState.content) {
                undoStack.push(afterPasteState);
                
                // スタックサイズの制限
                if (undoStack.length > maxUndoStackSize) {
                    undoStack.shift();
                }
                
                // currentContentも更新
                currentContent = afterPasteState.content;
                
                // リドゥスタックをクリア
                redoStack = [];
                
                if (!isModified) {
                    isModified = true;
                }
            }
            
            updateLineNumbers();
            updateStatus();
        }
        
    } catch (error) {
        console.error('貼り付けに失敗:', error);
        
        // エラーが発生した場合、ブラウザのデフォルト動作にフォールバック
        try {
            document.execCommand('paste');
            
            // フォールバック用のペースト後状態確認
            setTimeout(() => {
                const afterPasteState = {
                    content: editor.value,
                    cursorPosition: editor.selectionStart,
                    timestamp: Date.now()
                };
                
                if (afterPasteState.content !== beforePasteState.content) {
                    if (undoStack.length === 0 || undoStack[undoStack.length - 1].content !== afterPasteState.content) {
                        undoStack.push(afterPasteState);
                        
                        if (undoStack.length > maxUndoStackSize) {
                            undoStack.shift();
                        }
                        
                        currentContent = afterPasteState.content;
                        redoStack = [];
                        
                        if (!isModified) {
                            isModified = true;
                        }
                    }
                }
                
                updateLineNumbers();
                updateStatus();
            }, 10);
        } catch (fallbackError) {
            console.error('フォールバックの貼り付けも失敗:', fallbackError);
        }
    }
    
    closeAllMenus();
    
    // エディタにフォーカスを戻す
    setTimeout(() => {
        editor.focus();
    }, 10);
}

/**
 * 全選択
 */
function selectAll() {
    editor.select();
    closeAllMenus();
}

// =====================================================
// アプリケーション終了処理
// =====================================================

/**
 * アプリケーション終了
 * 変更がある場合は保存確認ダイアログを表示
 */
async function exitApp() {
    if (exitApp.isRunning) {
        return;
    }
    
    exitApp.isRunning = true;
    
    try {
        if (isModified) {
            exitApp.isRunning = false;
            
            const choice = await showExitDialog();
            
            exitApp.isRunning = true;
            
            if (choice === 'saveAndExit') {
                try {
                    if (currentFilePath) {
                        await saveFileBeforeExit();
                        await tauriInvoke('exit_app');
                    } else {
                        const saveSuccess = await saveAsFileForExit();
                        
                        if (saveSuccess) {
                            await tauriInvoke('exit_app');
                        } else {
                            exitApp.isRunning = false;
                            return;
                        }
                    }
                } catch (error) {
                    alert('保存に失敗しました: ' + error.message + '\n終了をキャンセルします。');
                    exitApp.isRunning = false;
                    return;
                }
            } else if (choice === 'exitWithoutSaving') {
                await tauriInvoke('exit_app');
            } else if (choice === 'cancel') {
                exitApp.isRunning = false;
                return;
            }
        } else {
            await tauriInvoke('exit_app');
        }
    } catch (error) {
        exitApp.isRunning = false;
    }
}

/**
 * 終了前の保存処理
 */
async function saveFileBeforeExit() {
    if (currentFilePath) {
        if (window.__TAURI__ && window.__TAURI__.fs) {
            await window.__TAURI__.fs.writeTextFile(currentFilePath, editor.value);
        } else if (tauriInvoke) {
            await tauriInvoke('write_file', { 
                path: currentFilePath, 
                content: editor.value 
            });
        } else {
            throw new Error('Tauriアプリでのみ利用可能です');
        }
        
        isModified = false;
        currentContent = editor.value;
    } else {
        throw new Error('新規ファイルのため保存できません。先に「名前を付けて保存」を実行してください。');
    }
}

/**
 * 終了前専用の「名前を付けて保存」処理
 */
async function saveAsFileForExit() {
    try {
        if (window.__TAURI__ && window.__TAURI__.dialog) {
            const filePath = await window.__TAURI__.dialog.save({
                title: "ファイルを保存",
                filters: [
                    { name: 'テキストファイル', extensions: ['txt'] },
                    { name: 'Markdownファイル', extensions: ['md'] },
                    { name: 'すべてのファイル', extensions: ['*'] }
                ]
            });
            
            if (filePath) {
                if (window.__TAURI__ && window.__TAURI__.fs) {
                    await window.__TAURI__.fs.writeTextFile(filePath, editor.value);
                } else {
                    await tauriInvoke('write_file', { 
                        path: filePath, 
                        content: editor.value 
                    });
                }
                
                currentFilePath = filePath;
                isModified = false;
                currentContent = editor.value;
                
                return true;
            } else {
                return false;
            }
        } else {
            throw new Error('ファイル保存機能はTauriアプリでのみ利用可能です');
        }
    } catch (error) {
        throw error;
    }
}

// =====================================================
// 確認ダイアログ表示
// =====================================================

/**
 * 新規作成確認ダイアログを表示（キーボードナビゲーション対応）
 */
async function showNewFileDialog() {
    return new Promise((resolve) => {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'new-file-dialog-overlay';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background-color: #2d2d30;
            border: 1px solid #3e3e40;
            border-radius: 6px;
            padding: 20px;
            min-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            color: #d4d4d4;
        `;
        
        dialog.innerHTML = `
            <div style="margin-bottom: 16px; font-size: 16px; font-weight: bold;">
                内容に変更があります
            </div>
            <div style="margin-bottom: 20px; color: #cccccc;">
                保存せずに新規作成すると、変更内容は失われます。
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="save-and-new-btn" tabindex="1" style="
                    background-color: #0e639c;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">保存して新規作成</button>
                <button id="new-without-saving-btn" tabindex="2" style="
                    background-color: #d14949;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">保存せずに新規作成</button>
                <button id="cancel-new-btn" tabindex="3" style="
                    background-color: #5a5a5a;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">キャンセル</button>
            </div>
        `;
        
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // ダイアログの共通処理を呼び出し
        setupDialogNavigation(dialogOverlay, ['save-and-new-btn', 'new-without-saving-btn', 'cancel-new-btn'], 
            ['saveAndNew', 'newWithoutSaving', 'cancel'], resolve);
    });
}

/**
 * ファイルを開く確認ダイアログを表示（キーボードナビゲーション対応）
 */
async function showOpenFileDialog() {
    return new Promise((resolve) => {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'open-file-dialog-overlay';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background-color: #2d2d30;
            border: 1px solid #3e3e40;
            border-radius: 6px;
            padding: 20px;
            min-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            color: #d4d4d4;
        `;
        
        dialog.innerHTML = `
            <div style="margin-bottom: 16px; font-size: 16px; font-weight: bold;">
                内容に変更があります
            </div>
            <div style="margin-bottom: 20px; color: #cccccc;">
                保存せずにファイルを開くと、変更内容は失われます。
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="save-and-open-btn" tabindex="1" style="
                    background-color: #0e639c;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">保存してから開く</button>
                <button id="open-without-saving-btn" tabindex="2" style="
                    background-color: #d14949;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">保存せずに開く</button>
                <button id="cancel-open-btn" tabindex="3" style="
                    background-color: #5a5a5a;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">キャンセル</button>
            </div>
        `;
        
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // ダイアログの共通処理を呼び出し
        setupDialogNavigation(dialogOverlay, ['save-and-open-btn', 'open-without-saving-btn', 'cancel-open-btn'], 
            ['saveAndOpen', 'openWithoutSaving', 'cancel'], resolve);
    });
}

/**
 * 終了確認ダイアログを表示（キーボードナビゲーション対応）
 */
async function showExitDialog() {
    return new Promise((resolve) => {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'exit-dialog-overlay';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background-color: #2d2d30;
            border: 1px solid #3e3e40;
            border-radius: 6px;
            padding: 20px;
            min-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            color: #d4d4d4;
        `;
        
        dialog.innerHTML = `
            <div style="margin-bottom: 16px; font-size: 16px; font-weight: bold;">
                内容に変更があります
            </div>
            <div style="margin-bottom: 20px; color: #cccccc;">
                保存せずに終了すると、変更内容は失われます。
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="save-and-exit-btn" tabindex="1" style="
                    background-color: #0e639c;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">保存して終了</button>
                <button id="exit-without-saving-btn" tabindex="2" style="
                    background-color: #d14949;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">保存せずに終了</button>
                <button id="cancel-exit-btn" tabindex="3" style="
                    background-color: #5a5a5a;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">キャンセル</button>
            </div>
        `;
        
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // ダイアログの共通処理を呼び出し
        setupDialogNavigation(dialogOverlay, ['save-and-exit-btn', 'exit-without-saving-btn', 'cancel-exit-btn'], 
            ['saveAndExit', 'exitWithoutSaving', 'cancel'], resolve);
    });
}

/**
 * ダイアログの共通キーボードナビゲーション処理
 */
function setupDialogNavigation(dialogOverlay, buttonIds, returnValues, resolve) {
    const buttons = buttonIds.map(id => document.getElementById(id));
    let currentButtonIndex = 2; // デフォルトで「キャンセル」を選択
    
    // フォーカススタイルを適用する関数
    function updateFocus() {
        buttons.forEach((btn, index) => {
            if (index === currentButtonIndex) {
                btn.style.boxShadow = '0 0 0 2px #0078d4';
                btn.style.outline = '2px solid #0078d4';
                btn.focus();
            } else {
                btn.style.boxShadow = 'none';
                btn.style.outline = 'none';
            }
        });
    }
    
    // 初期フォーカスを設定
    updateFocus();
    
    // ダイアログ終了処理
    function closeDialog(choice) {
        document.body.removeChild(dialogOverlay);
        document.removeEventListener('keydown', handleDialogKeyDown);
        setTimeout(() => editor.focus(), 0);
        resolve(choice);
    }
    
    // キーボードイベントハンドラー
    function handleDialogKeyDown(e) {
        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                currentButtonIndex = (currentButtonIndex - 1 + buttons.length) % buttons.length;
                updateFocus();
                break;
                
            case 'ArrowRight':
            case 'ArrowDown':
            case 'Tab':
                e.preventDefault();
                if (e.shiftKey && e.key === 'Tab') {
                    currentButtonIndex = (currentButtonIndex - 1 + buttons.length) % buttons.length;
                } else {
                    currentButtonIndex = (currentButtonIndex + 1) % buttons.length;
                }
                updateFocus();
                break;
                
            case 'Enter':
            case ' ':
                e.preventDefault();
                closeDialog(returnValues[currentButtonIndex]);
                break;
                
            case 'Escape':
                e.preventDefault();
                closeDialog('cancel');
                break;
        }
    }
    
    // ボタンクリックイベントの設定
    buttons.forEach((btn, index) => {
        btn.addEventListener('click', () => closeDialog(returnValues[index]));
    });
    
    // マウスホバーでフォーカス更新
    buttons.forEach((btn, index) => {
        btn.addEventListener('mouseenter', () => {
            currentButtonIndex = index;
            updateFocus();
        });
    });
    
    // キーボードイベントリスナーを追加
    document.addEventListener('keydown', handleDialogKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeDialog('cancel');
        }
    });
}

// =====================================================
// 使用されていない関数のクリーンアップ完了
// 
// 削除された不要な関数:
// - menuUndo, menuRedo, menuCut, menuCopy, menuPaste, menuSelectAll
//   (直接undo(), redo()等を呼び出すため不要)
// - hideContextMenu (コンテキストメニュー未実装のため不要)
// - read_file_content, write_file_content (重複のため削除)
// 
// 整理されたコード構造:
// 1. グローバル変数定義
// 2. アプリケーション初期化
// 3. イベントリスナー設定
// 4. IME処理
// 5. テキスト入力処理
// 6. キーボードショートカット処理
// 7. アンドゥ・リドゥ機能
// 8. UI更新機能
// 9. メニュー制御
// 10. ファイル操作
// 11. 編集操作（コピー・切り取り・貼り付け）
// 12. アプリケーション終了処理
// 13. 確認ダイアログ表示
// 
// 共通化された機能:
// - setupDialogNavigation関数でダイアログの重複コードを統合
// =====================================================