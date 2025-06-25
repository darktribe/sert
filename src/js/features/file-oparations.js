/*
 * =====================================================
 * Sert Editor - ファイル操作
 * ファイルの新規作成、開く、保存、終了処理
 * =====================================================
 */

import { 
    editor, currentFilePath, isModified, 
    setCurrentFilePath, setIsModified, setCurrentContent,
    exitApp, setExitAppRunning
} from '../core/state.js';
import { updateLineNumbers, updateStatus } from '../ui/status.js';
import { closeAllMenus } from '../ui/menu.js';
import { initializeUndoStack } from './undo-redo.js';
import { showNewFileDialog, showOpenFileDialog, showExitDialog } from '../ui/dialogs.js';
import { openFileDialog, saveFileDialog, readFile, writeFile, exitApplication } from '../utils/tauri.js';

/**
 * 新規ファイル作成
 * 変更がある場合は保存確認ダイアログを表示
 */
export async function newFile() {
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
    setCurrentFilePath(null);
    setIsModified(false);
    setCurrentContent('');
    
    // ファイル内容で初期化
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
export async function openFile() {
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
    const filePath = await openFileDialog();
    
    if (filePath) {
        const content = await readFile(filePath);
        
        // エディタに設定してアンドゥスタックを完全リセット
        editor.value = content;
        setCurrentFilePath(filePath);
        setIsModified(false);
        setCurrentContent(content);
        
        // ファイル内容で初期化
        initializeUndoStack();
        updateLineNumbers();
        updateStatus();
    }
}

/**
 * ファイル保存
 */
export async function saveFile() {
    try {
        if (currentFilePath) {
            await writeFile(currentFilePath, editor.value);
            
            setIsModified(false);
            setCurrentContent(editor.value);
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
export async function saveAsFile() {
    try {
        const filePath = await saveFileDialog();
        
        if (filePath) {
            await writeFile(filePath, editor.value);
            
            setCurrentFilePath(filePath);
            setIsModified(false);
            setCurrentContent(editor.value);
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
        await writeFile(currentFilePath, editor.value);
        
        setIsModified(false);
        setCurrentContent(editor.value);
    } else {
        throw new Error('新規ファイルのため保存できません。先に「名前を付けて保存」を実行してください。');
    }
}

/**
 * 新規作成前専用の「名前を付けて保存」処理
 */
async function saveAsFileForNew() {
    try {
        const filePath = await saveFileDialog("ファイルを保存してから新規作成");
        
        if (filePath) {
            await writeFile(filePath, editor.value);
            
            setCurrentFilePath(filePath);
            setIsModified(false);
            setCurrentContent(editor.value);
            
            return true; // 保存成功
        } else {
            return false; // 保存キャンセル
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
        await writeFile(currentFilePath, editor.value);
        
        setIsModified(false);
        setCurrentContent(editor.value);
    } else {
        throw new Error('新規ファイルのため保存できません。先に「名前を付けて保存」を実行してください。');
    }
}

/**
 * ファイルを開く前専用の「名前を付けて保存」処理
 */
async function saveAsFileForOpen() {
    try {
        const filePath = await saveFileDialog("ファイルを保存してから開く");
        
        if (filePath) {
            await writeFile(filePath, editor.value);
            
            setCurrentFilePath(filePath);
            setIsModified(false);
            setCurrentContent(editor.value);
            
            return true;
        } else {
            return false;
        }
    } catch (error) {
        throw error;
    }
}

/**
 * アプリケーション終了
 * 変更がある場合は保存確認ダイアログを表示
 */
export async function exitApp() {
    if (exitApp.isRunning) {
        return;
    }
    
    setExitAppRunning(true);
    
    try {
        if (isModified) {
            setExitAppRunning(false);
            
            const choice = await showExitDialog();
            
            setExitAppRunning(true);
            
            if (choice === 'saveAndExit') {
                try {
                    if (currentFilePath) {
                        await saveFileBeforeExit();
                        await exitApplication();
                    } else {
                        const saveSuccess = await saveAsFileForExit();
                        
                        if (saveSuccess) {
                            await exitApplication();
                        } else {
                            setExitAppRunning(false);
                            return;
                        }
                    }
                } catch (error) {
                    alert('保存に失敗しました: ' + error.message + '\n終了をキャンセルします。');
                    setExitAppRunning(false);
                    return;
                }
            } else if (choice === 'exitWithoutSaving') {
                await exitApplication();
            } else if (choice === 'cancel') {
                setExitAppRunning(false);
                return;
            }
        } else {
            await exitApplication();
        }
    } catch (error) {
        setExitAppRunning(false);
    }
}

/**
 * 終了前の保存処理
 */
async function saveFileBeforeExit() {
    if (currentFilePath) {
        await writeFile(currentFilePath, editor.value);
        
        setIsModified(false);
        setCurrentContent(editor.value);
    } else {
        throw new Error('新規ファイルのため保存できません。先に「名前を付けて保存」を実行してください。');
    }
}

/**
 * 終了前専用の「名前を付けて保存」処理
 */
async function saveAsFileForExit() {
    try {
        const filePath = await saveFileDialog("ファイルを保存");
        
        if (filePath) {
            await writeFile(filePath, editor.value);
            
            setCurrentFilePath(filePath);
            setIsModified(false);
            setCurrentContent(editor.value);
            
            return true;
        } else {
            return false;
        }
    } catch (error) {
        throw error;
    }
}