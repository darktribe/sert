// グローバル変数の初期化
let editor;
let currentFilePath = null;
let isModified = false;
let currentContent = '';
let undoStack = [];
let redoStack = [];
let maxUndoStackSize = 50;
let isUndoRedoOperation = false;
let isComposing = false;
let compositionStartContent = '';
let compositionStartCursor = 0;
let justFinishedComposition = false;

// Tauri invoke関数の初期化
let tauriInvoke = null;

// 選択範囲とカーソル位置を保存するグローバル変数
let lastSelectionStart = 0;
let lastSelectionEnd = 0;
let lastOperationType = null; // 'copy', 'cut', null

// Tauri API初期化
async function initializeTauri() {
    try {
        if (window.__TAURI__ && window.__TAURI__.core) {
            tauriInvoke = window.__TAURI__.core.invoke;
            
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

// ページ読み込み時の初期化
window.addEventListener('DOMContentLoaded', async () => {
    await initializeTauri();
    
    editor = document.getElementById('editor');
    if (!editor) {
        console.error('エディタ要素が見つかりません');
        return;
    }
    
    currentContent = editor.value;
    initializeUndoStack();
    updateLineNumbers();
    updateStatus();
    setupEventListeners();
    
    // カーソルを1行目1列目に設定
    editor.setSelectionRange(0, 0);
    editor.focus();
});

// イベントリスナーの設定
function setupEventListeners() {
    editor.addEventListener('input', handleInput);
    editor.addEventListener('keydown', handleKeydown);
    editor.addEventListener('scroll', syncScroll);
    editor.addEventListener('click', updateStatus);
    editor.addEventListener('keyup', updateStatus);
    
    editor.addEventListener('compositionstart', handleCompositionStart);
    editor.addEventListener('compositionend', handleCompositionEnd);
    editor.addEventListener('compositionupdate', handleCompositionUpdate);
    
    document.addEventListener('click', handleGlobalClick);
}

// IMEイベントハンドラー（修正版）
function handleCompositionStart(e) {
    isComposing = true;
    justFinishedComposition = false;
    
    compositionStartContent = editor.value;
    compositionStartCursor = editor.selectionStart;
}

function handleCompositionUpdate(e) {
    // IME変換中の処理
}

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

// 入力処理（修正版）
function handleInput(e) {
    if (isUndoRedoOperation) {
        isUndoRedoOperation = false;
        updateLineNumbers();
        updateStatus();
        return;
    }
    
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

// アンドゥスタックに状態を保存
function saveToUndoStack(content = null, cursorPos = null) {
    const state = {
        content: content !== null ? content : currentContent,
        cursorPosition: cursorPos !== null ? cursorPos : editor.selectionStart,
        timestamp: Date.now()
    };
    
    if (undoStack.length > 0) {
        const lastState = undoStack[undoStack.length - 1];
        if (lastState.content === state.content && lastState.cursorPosition === state.cursorPosition) {
            return;
        }
    }
    
    undoStack.push(state);
    
    if (undoStack.length > maxUndoStackSize) {
        undoStack.shift();
    }
}

// 初期状態をアンドゥスタックに保存（修正版）
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
    
    console.log('アンドゥスタック初期化:', JSON.stringify(currentContent));
}
// キーボードイベント処理
async function handleKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'q' || e.key === 'w')) {
        e.preventDefault();
        await exitApp();
        return;
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        await saveFile();
        return;
    }
    
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
    }
    
    if (e.key === 'Home') {
        e.preventDefault();
        
        if (e.metaKey || e.ctrlKey) {
            editor.setSelectionRange(0, 0);
            editor.scrollTop = 0;
        } else {
            const cursorPos = editor.selectionStart;
            const textBeforeCursor = editor.value.substring(0, cursorPos);
            const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
            const lineStart = lastNewlineIndex + 1;
            editor.setSelectionRange(lineStart, lineStart);
        }
        
        setTimeout(() => updateStatus(), 0);
        return;
    }
    
    if (e.key === 'End') {
        e.preventDefault();
        
        if (e.metaKey || e.ctrlKey) {
            const textLength = editor.value.length;
            editor.setSelectionRange(textLength, textLength);
            editor.scrollTop = editor.scrollHeight;
        } else {
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
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        await newFile();
        return;
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        await openFile();
        return;
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 's' && e.shiftKey) {
        e.preventDefault();
        await saveAsFile();
        return;
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        copy();
        return;
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
        cut();
        return;
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        paste();
        return;
    }
}

// アンドゥ・リドゥ機能（デバッグ強化版）
function undo() {
    console.log('=== UNDO 開始 ===');
    console.log('アンドゥスタック長:', undoStack.length);
    console.log('現在のスタック内容:');
    undoStack.forEach((state, index) => {
        console.log(`  [${index}] "${state.content}" (カーソル: ${state.cursorPosition})`);
    });
    
    if (undoStack.length <= 1) {
        console.log('アンドゥ不可: スタックが空または初期状態のみ');
        return;
    }
    
    // 現在の状態をリドゥスタックに保存
    const currentState = {
        content: editor.value,
        cursorPosition: editor.selectionStart,
        timestamp: Date.now()
    };
    redoStack.push(currentState);
    console.log('現在の状態をリドゥスタックに保存:', JSON.stringify(currentState.content));
    
    // アンドゥスタックから最新の状態を削除
    const removedState = undoStack.pop();
    console.log('削除された状態:', JSON.stringify(removedState.content));
    
    // 一つ前の状態を取得
    const previousState = undoStack[undoStack.length - 1];
    console.log('復元する状態:', JSON.stringify(previousState.content));
    
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
    
    console.log('=== UNDO 完了 ===');
    closeAllMenus();
    hideContextMenu();
}

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
    hideContextMenu();
}

// 変更状態を更新する関数
function updateModifiedState() {
    const originalContent = undoStack.length > 0 ? undoStack[0].content : '';
    isModified = (editor.value !== originalContent);
}

// UI更新関数
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

function syncScroll() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) {
        lineNumbers.scrollTop = editor.scrollTop;
    }
}

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

// 編集メニュー項目の関数（既存の関数を呼び出すだけ）
function menuUndo() {
    console.log('📝 メニューから「もとに戻す」を実行');
    undo();
}

function menuRedo() {
    console.log('📝 メニューから「やりなおし」を実行');
    redo();
}

function menuCut() {
    console.log('✂️ メニューから「切り取り」を実行');
    cut();
}

function menuCopy() {
    console.log('📋 メニューから「コピー」を実行');
    copy();
}

function menuPaste() {
    console.log('📋 メニューから「貼り付け」を実行');
    paste();
}

function menuSelectAll() {
    console.log('🔄 メニューから「すべて選択」を実行');
    selectAll();
}

// メニュー関連の処理
function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    
    closeAllMenus();
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function closeAllMenus() {
    const menus = document.querySelectorAll('.dropdown-menu');
    menus.forEach(menu => {
        menu.style.display = 'none';
    });
}

function hideContextMenu() {
    // コンテキストメニューがあれば非表示にする
}

function handleGlobalClick(e) {
    if (!e.target.closest('.menu-item')) {
        closeAllMenus();
    }
}
// ファイル操作
async function newFile() {
    console.log('📄 新規作成が選択されました');
    
    // 変更がある場合の確認
    if (isModified) {
        console.log('📝 変更があります - 確認ダイアログを表示');
        const choice = await showNewFileDialog();
        console.log('🔍 ダイアログの選択結果:', choice);
        
        if (choice === 'saveAndNew') {
            console.log('💾 === 保存して新規作成処理開始 ===');
            try {
                // ファイルの状態に応じて保存処理を分岐
                if (currentFilePath) {
                    // 既存ファイルの場合は上書き保存
                    console.log('📝 既存ファイルを上書き保存してから新規作成:', currentFilePath);
                    await saveFileBeforeNew();
                    console.log('✅ 上書き保存完了、新規作成を実行');
                } else {
                    // 新規ファイルの場合は「名前を付けて保存」
                    console.log('🆕 新規ファイルのため、名前を付けて保存してから新規作成');
                    const saveSuccess = await saveAsFileForNew();
                    
                    if (!saveSuccess) {
                        console.log('❌ 保存がキャンセルされたため、新規作成もキャンセルします');
                        closeAllMenus();
                        hideContextMenu();
                        return;
                    }
                }
            } catch (error) {
                console.error('❌ 保存に失敗しました:', error);
                alert('保存に失敗しました: ' + error.message + '\n新規作成をキャンセルします。');
                closeAllMenus();
                hideContextMenu();
                return;
            }
        } else if (choice === 'newWithoutSaving') {
            console.log('🚫 保存せずに新規作成します');
            // そのまま続行
        } else if (choice === 'cancel') {
            console.log('❌ 新規作成がキャンセルされました');
            closeAllMenus();
            hideContextMenu();
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
    
    console.log('✅ 新規ファイルを作成しました');
    closeAllMenus();
    hideContextMenu();
}

// 新規作成前の保存処理（上書き保存）
async function saveFileBeforeNew() {
    console.log('🚪 新規作成前の保存処理を実行中...');
    
    if (currentFilePath) {
        // 既存ファイルの上書き保存
        console.log('📝 既存ファイルを上書き保存:', currentFilePath);
        
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
        console.log('✅ 新規作成前の保存完了:', currentFilePath);
    } else {
        // ファイルパスがない場合はエラー
        console.log('❌ 新規ファイルのため、名前を付けて保存が必要');
        throw new Error('新規ファイルのため保存できません。先に「名前を付けて保存」を実行してください。');
    }
}

// 新規作成前専用の「名前を付けて保存」処理
async function saveAsFileForNew() {
    console.log('💾 === saveAsFileForNew() 開始 ===');
    
    try {
        console.log('🔍 保存ダイアログを表示中...');
        
        // Tauri v2.5のJavaScript API を直接使用
        if (window.__TAURI__ && window.__TAURI__.dialog) {
            console.log('📋 Tauri Dialog API を使用します');
            
            // 保存ダイアログを表示
            const filePath = await window.__TAURI__.dialog.save({
                title: "ファイルを保存してから新規作成",
                filters: [
                    { name: 'テキストファイル', extensions: ['txt'] },
                    { name: 'Markdownファイル', extensions: ['md'] },
                    { name: 'すべてのファイル', extensions: ['*'] }
                ]
            });
            
            if (filePath) {
                console.log('📂 保存先が選択されました:', filePath);
                
                // ファイルを保存
                if (window.__TAURI__ && window.__TAURI__.fs) {
                    await window.__TAURI__.fs.writeTextFile(filePath, editor.value);
                } else {
                    // フォールバック: Rustコマンドを使用
                    await tauriInvoke('write_file', { 
                        path: filePath, 
                        content: editor.value 
                    });
                }
                
                // 現在のファイルパスを更新
                currentFilePath = filePath;
                isModified = false;
                currentContent = editor.value;
                
                console.log('✅ 新規作成前の保存完了:', filePath);
                return true; // 保存成功
            } else {
                console.log('❌ 保存ダイアログがキャンセルされました');
                return false; // 保存キャンセル
            }
        } else {
            console.error('❌ Tauri Dialog API が利用できません');
            throw new Error('ファイル保存機能はTauriアプリでのみ利用可能です');
        }
    } catch (error) {
        console.error('❌ saveAsFileForNew() でエラー発生:', error);
        throw error;
    }
}

// 新規作成確認ダイアログを表示（キーボードナビゲーション対応版）
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
        
        // ボタン要素を取得
        const saveBtn = document.getElementById('save-and-new-btn');
        const newBtn = document.getElementById('new-without-saving-btn');
        const cancelBtn = document.getElementById('cancel-new-btn');
        const buttons = [saveBtn, newBtn, cancelBtn];
        
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
                        // Shift+Tab で逆方向
                        currentButtonIndex = (currentButtonIndex - 1 + buttons.length) % buttons.length;
                    } else {
                        // Tab / 矢印キーで順方向
                        currentButtonIndex = (currentButtonIndex + 1) % buttons.length;
                    }
                    updateFocus();
                    break;
                    
                case 'Enter':
                case ' ': // スペースキー
                    e.preventDefault();
                    if (currentButtonIndex === 0) {
                        closeDialog('saveAndNew');
                    } else if (currentButtonIndex === 1) {
                        closeDialog('newWithoutSaving');
                    } else if (currentButtonIndex === 2) {
                        closeDialog('cancel');
                    }
                    break;
                    
                case 'Escape':
                    e.preventDefault();
                    closeDialog('cancel');
                    break;
            }
        }
        
        // ボタンクリックイベントの設定
        saveBtn.addEventListener('click', () => closeDialog('saveAndNew'));
        newBtn.addEventListener('click', () => closeDialog('newWithoutSaving'));
        cancelBtn.addEventListener('click', () => closeDialog('cancel'));
        
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
    });
}
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
                            hideContextMenu();
                            return;
                        }
                    }
                } catch (error) {
                    alert('保存に失敗しました: ' + error.message + '\nファイルを開く処理をキャンセルします。');
                    closeAllMenus();
                    hideContextMenu();
                    return;
                }
            } else if (choice === 'cancel') {
                closeAllMenus();
                hideContextMenu();
                return;
            }
        }
        
        await showFileOpenDialog();
        
    } catch (error) {
        alert('ファイルを開くことができませんでした: ' + error.message);
    }
    
    closeAllMenus();
    hideContextMenu();
}

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
            
            console.log('ファイルを開きました - アンドゥスタック初期化完了:', filePath);
        }
    } else {
        alert('ファイルオープン機能はTauriアプリでのみ利用可能です');
    }
}

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
    hideContextMenu();
}

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
    hideContextMenu();
}

// 編集操作
// コピー機能（改善版）
async function copy() {
    console.log('📋 コピー');
    
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
                console.log('📋 Tauriクリップボードにコピー完了:', selectedText);
            } else if (tauriInvoke) {
                // フォールバック: Rustコマンドを使用
                await tauriInvoke('write_clipboard', { text: selectedText });
                console.log('📋 Rustコマンドでクリップボードにコピー完了:', selectedText);
            } else {
                // 最後の手段: navigator.clipboard（ユーザージェスチャーが必要）
                await navigator.clipboard.writeText(selectedText);
                console.log('📋 navigator.clipboardでコピー完了:', selectedText);
            }
        } else {
            console.log('📋 選択されたテキストがありません');
            lastOperationType = null;
        }
    } catch (error) {
        console.error('📋 コピーに失敗:', error);
        // エラーが発生した場合、ブラウザのデフォルト動作にフォールバック
        document.execCommand('copy');
        lastOperationType = 'copy';
    }
    
    closeAllMenus();
    hideContextMenu();
    
    // エディタにフォーカスを戻し、選択範囲を維持
    setTimeout(() => {
        editor.focus();
        if (lastOperationType === 'copy') {
            editor.setSelectionRange(lastSelectionStart, lastSelectionEnd);
        }
    }, 10);
}

// 切り取り機能（改善版）
async function cut() {
    console.log('✂️ 切り取り');
    
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
        
        console.log('カット前の状態を履歴に保存:', JSON.stringify(beforeCutState.content));
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
                console.log('✂️ Tauriクリップボードにカット内容をコピー:', selectedText);
            } else if (tauriInvoke) {
                // フォールバック: Rustコマンドを使用
                await tauriInvoke('write_clipboard', { text: selectedText });
                console.log('✂️ Rustコマンドでクリップボードにカット内容をコピー:', selectedText);
            } else {
                // 最後の手段: navigator.clipboard
                await navigator.clipboard.writeText(selectedText);
                console.log('✂️ navigator.clipboardでカット内容をコピー:', selectedText);
            }
            
            // 選択されたテキストを削除
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const newValue = editor.value.substring(0, start) + editor.value.substring(end);
            
            editor.value = newValue;
            editor.setSelectionRange(start, start);
            
            // カット後の位置を保存（貼り付け用）
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
                
                console.log('カット後の状態を履歴に保存:', JSON.stringify(afterCutState.content));
                
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
            console.log('✂️ 選択されたテキストがありません');
            lastOperationType = null;
        }
    } catch (error) {
        console.error('✂️ 切り取りに失敗:', error);
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
    hideContextMenu();
    
    // エディタにフォーカスを戻し、カーソル位置を設定
    setTimeout(() => {
        editor.focus();
        if (lastOperationType === 'cut') {
            editor.setSelectionRange(lastSelectionStart, lastSelectionStart);
        }
    }, 10);
}

// 貼り付け機能（改善版）
async function paste() {
    console.log('📋 貼り付け');
    
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
        
        console.log('ペースト前の状態を履歴に保存:', JSON.stringify(beforePasteState.content));
    }
    
    try {
        let clipboardText = '';
        
        // クリップボードからテキストを取得
        if (window.__TAURI__ && window.__TAURI__.clipboard) {
            clipboardText = await window.__TAURI__.clipboard.readText();
            console.log('📋 Tauriクリップボードから読み込み:', clipboardText);
        } else if (tauriInvoke) {
            // フォールバック: Rustコマンドを使用
            clipboardText = await tauriInvoke('read_clipboard');
            console.log('📋 Rustコマンドでクリップボードから読み込み:', clipboardText);
        } else {
            // 最後の手段: navigator.clipboard
            clipboardText = await navigator.clipboard.readText();
            console.log('📋 navigator.clipboardで読み込み:', clipboardText);
        }
        
        if (clipboardText) {
            // 貼り付け位置を決定
            let pasteStart, pasteEnd;
            
            if (lastOperationType === 'copy' && lastSelectionStart !== undefined && lastSelectionEnd !== undefined) {
                // コピー後の貼り付け：元の選択範囲に貼り付け
                pasteStart = lastSelectionStart;
                pasteEnd = lastSelectionEnd;
                console.log('📋 コピー後の貼り付け: 位置', pasteStart, 'から', pasteEnd, 'に貼り付け');
            } else if (lastOperationType === 'cut' && lastSelectionStart !== undefined) {
                // カット後の貼り付け：カット位置に貼り付け
                pasteStart = lastSelectionStart;
                pasteEnd = lastSelectionStart;
                console.log('📋 カット後の貼り付け: 位置', pasteStart, 'に貼り付け');
            } else {
                // 通常の貼り付け：現在のカーソル位置または選択範囲
                pasteStart = editor.selectionStart;
                pasteEnd = editor.selectionEnd;
                console.log('📋 通常の貼り付け: 位置', pasteStart, 'から', pasteEnd, 'に貼り付け');
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
                
                console.log('ペースト後の状態を履歴に保存:', JSON.stringify(afterPasteState.content));
                
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
            
            console.log('📋 貼り付け完了:', clipboardText.length + '文字');
        } else {
            console.log('📋 クリップボードが空です');
        }
        
    } catch (error) {
        console.error('📋 貼り付けに失敗:', error);
        
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
            
            console.log('📋 フォールバックの貼り付けを実行');
        } catch (fallbackError) {
            console.error('📋 フォールバックの貼り付けも失敗:', fallbackError);
        }
    }
    
    closeAllMenus();
    hideContextMenu();
    
    // エディタにフォーカスを戻す
    setTimeout(() => {
        editor.focus();
    }, 10);
}

function selectAll() {
    editor.select();
    closeAllMenus();
    hideContextMenu();
}

// アプリ終了処理
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

// ダイアログ表示関数
// ファイルを開く確認ダイアログを表示（キーボードナビゲーション対応版）
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
        
        // ボタン要素を取得
        const saveBtn = document.getElementById('save-and-open-btn');
        const openBtn = document.getElementById('open-without-saving-btn');
        const cancelBtn = document.getElementById('cancel-open-btn');
        const buttons = [saveBtn, openBtn, cancelBtn];
        
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
                        // Shift+Tab で逆方向
                        currentButtonIndex = (currentButtonIndex - 1 + buttons.length) % buttons.length;
                    } else {
                        // Tab / 矢印キーで順方向
                        currentButtonIndex = (currentButtonIndex + 1) % buttons.length;
                    }
                    updateFocus();
                    break;
                    
                case 'Enter':
                case ' ': // スペースキー
                    e.preventDefault();
                    if (currentButtonIndex === 0) {
                        closeDialog('saveAndOpen');
                    } else if (currentButtonIndex === 1) {
                        closeDialog('openWithoutSaving');
                    } else if (currentButtonIndex === 2) {
                        closeDialog('cancel');
                    }
                    break;
                    
                case 'Escape':
                    e.preventDefault();
                    closeDialog('cancel');
                    break;
            }
        }
        
        // ボタンクリックイベントの設定
        saveBtn.addEventListener('click', () => closeDialog('saveAndOpen'));
        openBtn.addEventListener('click', () => closeDialog('openWithoutSaving'));
        cancelBtn.addEventListener('click', () => closeDialog('cancel'));
        
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
    });
}

// 終了確認ダイアログを表示（キーボードナビゲーション対応版）
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
        
        // ボタン要素を取得
        const saveBtn = document.getElementById('save-and-exit-btn');
        const exitBtn = document.getElementById('exit-without-saving-btn');
        const cancelBtn = document.getElementById('cancel-exit-btn');
        const buttons = [saveBtn, exitBtn, cancelBtn];
        
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
                        // Shift+Tab で逆方向
                        currentButtonIndex = (currentButtonIndex - 1 + buttons.length) % buttons.length;
                    } else {
                        // Tab / 矢印キーで順方向
                        currentButtonIndex = (currentButtonIndex + 1) % buttons.length;
                    }
                    updateFocus();
                    break;
                    
                case 'Enter':
                case ' ': // スペースキー
                    e.preventDefault();
                    if (currentButtonIndex === 0) {
                        closeDialog('saveAndExit');
                    } else if (currentButtonIndex === 1) {
                        closeDialog('exitWithoutSaving');
                    } else if (currentButtonIndex === 2) {
                        closeDialog('cancel');
                    }
                    break;
                    
                case 'Escape':
                    e.preventDefault();
                    closeDialog('cancel');
                    break;
            }
        }
        
        // ボタンクリックイベントの設定
        saveBtn.addEventListener('click', () => closeDialog('saveAndExit'));
        exitBtn.addEventListener('click', () => closeDialog('exitWithoutSaving'));
        cancelBtn.addEventListener('click', () => closeDialog('cancel'));
        
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
    });
}