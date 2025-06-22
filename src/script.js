// Tauriのインポート
const { invoke } = window.__TAURI__.core;
const { open, save } = window.__TAURI__.plugin.dialog;
const { readTextFile, writeTextFile } = window.__TAURI__.plugin.fs;

// グローバル変数
let currentFilePath = null;
let isModified = false;
let undoStack = [];
let redoStack = [];
let currentContent = '';

// DOM要素の取得
const editor = document.getElementById('editor');
const lineNumbers = document.getElementById('line-numbers');
const cursorPosition = document.getElementById('cursor-position');
const charCount = document.getElementById('char-count');

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeEditor();
    setupEventListeners();
    updateLineNumbers();
    updateStatus();
});

// エディタの初期化
function initializeEditor() {
    editor.addEventListener('input', handleInput);
    editor.addEventListener('keydown', handleKeydown);
    editor.addEventListener('scroll', syncScroll);
    editor.addEventListener('selectionchange', updateStatus);
    
    // カーソル位置の更新
    setInterval(updateStatus, 100);
}

// イベントリスナーの設定
function setupEventListeners() {
    // メニューの外側をクリックしたときにメニューを閉じる
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.menu-item')) {
            closeAllMenus();
        }
    });
}

// 入力処理
function handleInput(e) {
    isModified = true;
    updateLineNumbers();
    updateStatus();
    
    // アンドゥスタックに追加
    if (currentContent !== editor.value) {
        undoStack.push(currentContent);
        redoStack = []; // リドゥスタックをクリア
        if (undoStack.length > 100) {
            undoStack.shift(); // 100件以上は古いものを削除
        }
        currentContent = editor.value;
    }
}

// キーボードショートカット処理
function handleKeydown(e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
    
    if (ctrlKey) {
        switch (e.key.toLowerCase()) {
            case 'a':
                e.preventDefault();
                selectAll();
                break;
            case 'c':
                e.preventDefault();
                copy();
                break;
            case 'x':
                e.preventDefault();
                cut();
                break;
            case 'v':
                e.preventDefault();
                paste();
                break;
            case 'z':
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                break;
            case 'y':
                e.preventDefault();
                redo();
                break;
            case 's':
                e.preventDefault();
                saveFile();
                break;
            case 'q':
                e.preventDefault();
                exitApp();
                break;
        }
    }
    
    // Home/End キーの処理
    if (e.key === 'Home') {
        if (ctrlKey) {
            e.preventDefault();
            editor.setSelectionRange(0, 0);
        } else {
            // 現在行の先頭に移動
            e.preventDefault();
            const cursorPos = editor.selectionStart;
            const textBeforeCursor = editor.value.substring(0, cursorPos);
            const lastNewlineIndex = textBeforeCursor.lastIndexOf('\\n');
            const lineStart = lastNewlineIndex + 1;
            editor.setSelectionRange(lineStart, lineStart);
        }
    } else if (e.key === 'End') {
        if (ctrlKey) {
            e.preventDefault();
            const textLength = editor.value.length;
            editor.setSelectionRange(textLength, textLength);
        } else {
            // 現在行の末尾に移動
            e.preventDefault();
            const cursorPos = editor.selectionStart;
            const textAfterCursor = editor.value.substring(cursorPos);
            const nextNewlineIndex = textAfterCursor.indexOf('\\n');
            const lineEnd = nextNewlineIndex === -1 ? editor.value.length : cursorPos + nextNewlineIndex;
            editor.setSelectionRange(lineEnd, lineEnd);
        }
    }
}

// 行番号の更新
function updateLineNumbers() {
    const lines = editor.value.split('\\n');
    const lineNumbersText = lines.map((_, index) => index + 1).join('\\n');
    lineNumbers.textContent = lineNumbersText;
}

// スクロール同期
function syncScroll() {
    lineNumbers.scrollTop = editor.scrollTop;
}

// ステータスの更新
function updateStatus() {
    const cursorPos = editor.selectionStart;
    const textBeforeCursor = editor.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\\n');
    const currentLine = lines.length;
    const currentColumn = lines[lines.length - 1].length + 1;
    
    cursorPosition.textContent = `行: ${currentLine}, 列: ${currentColumn}`;
    charCount.textContent = `総文字数: ${editor.value.length}`;
}

// メニュー関連の関数
function toggleMenu(menuId) {
    closeAllMenus();
    const menu = document.getElementById(menuId);
    menu.classList.toggle('show');
}

function closeAllMenus() {
    const menus = document.querySelectorAll('.dropdown-menu');
    menus.forEach(menu => menu.classList.remove('show'));
}

// ファイル操作関数
async function newFile() {
    if (isModified) {
        const shouldContinue = await confirmUnsavedChanges();
        if (!shouldContinue) return;
    }
    
    editor.value = '';
    currentFilePath = null;
    isModified = false;
    currentContent = '';
    undoStack = [];
    redoStack = [];
    updateLineNumbers();
    updateStatus();
    closeAllMenus();
}

async function openFile() {
    if (isModified) {
        const shouldContinue = await confirmUnsavedChanges();
        if (!shouldContinue) return;
    }
    
    try {
        const filePath = await open({
            multiple: false,
            filters: [{
                name: 'Text Files',
                extensions: ['txt', 'md', 'js', 'ts', 'html', 'css', 'json', 'py', 'rs']
            }]
        });
        
        if (filePath) {
            const content = await readTextFile(filePath);
            editor.value = content;
            currentFilePath = filePath;
            isModified = false;
            currentContent = content;
            undoStack = [];
            redoStack = [];
            updateLineNumbers();
            updateStatus();
        }
    } catch (error) {
        alert('ファイルを開けませんでした: ' + error);
    }
    closeAllMenus();
}

async function saveFile() {
    if (!currentFilePath) {
        await saveAsFile();
        return;
    }
    
    try {
        await writeTextFile(currentFilePath, editor.value);
        isModified = false;
        currentContent = editor.value;
    } catch (error) {
        alert('ファイルを保存できませんでした: ' + error);
    }
    closeAllMenus();
}

async function saveAsFile() {
    try {
        const filePath = await save({
            filters: [{
                name: 'Text Files',
                extensions: ['txt', 'md', 'js', 'ts', 'html', 'css', 'json', 'py', 'rs']
            }]
        });
        
        if (filePath) {
            await writeTextFile(filePath, editor.value);
            currentFilePath = filePath;
            isModified = false;
            currentContent = editor.value;
        }
    } catch (error) {
        alert('ファイルを保存できませんでした: ' + error);
    }
    closeAllMenus();
}

// 編集操作関数
function undo() {
    if (undoStack.length > 0) {
        redoStack.push(editor.value);
        const previousContent = undoStack.pop();
        editor.value = previousContent;
        currentContent = previousContent;
        updateLineNumbers();
        updateStatus();
    }
    closeAllMenus();
}

function redo() {
    if (redoStack.length > 0) {
        undoStack.push(editor.value);
        const nextContent = redoStack.pop();
        editor.value = nextContent;
        currentContent = nextContent;
        updateLineNumbers();
        updateStatus();
    }
    closeAllMenus();
}

function cut() {
    const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
    if (selectedText) {
        navigator.clipboard.writeText(selectedText);
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + editor.value.substring(end);
        editor.setSelectionRange(start, start);
        isModified = true;
        updateLineNumbers();
        updateStatus();
    }
    closeAllMenus();
}

function copy() {
    const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
    if (selectedText) {
        navigator.clipboard.writeText(selectedText);
    }
    closeAllMenus();
}

async function paste() {
    try {
        const text = await navigator.clipboard.readText();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + text + editor.value.substring(end);
        editor.setSelectionRange(start + text.length, start + text.length);
        isModified = true;
        updateLineNumbers();
        updateStatus();
    } catch (error) {
        console.error('クリップボードからの読み取りに失敗しました:', error);
    }
    closeAllMenus();
}

function selectAll() {
    editor.select();
    closeAllMenus();
}

// アプリ終了
async function exitApp() {
    if (isModified) {
        const shouldContinue = await confirmUnsavedChanges();
        if (!shouldContinue) return;
    }
    
    await invoke('exit_app');
    closeAllMenus();
}

// 未保存の変更確認
async function confirmUnsavedChanges() {
    return confirm('内容に変更があります。本当に続行しますか？');
}