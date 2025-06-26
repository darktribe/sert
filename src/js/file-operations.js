/*
 * =====================================================
 * Sert Editor - ファイル操作
 * =====================================================
 */

import { 
    editor, 
    currentFilePath, 
    setCurrentFilePath,
    isModified, 
    setIsModified,
    currentContent, 
    setCurrentContent,
    undoStack, 
    redoStack,
    tauriInvoke
} from './globals.js';
import { initializeUndoStack } from './undo-redo.js';
import { updateLineNumbers, updateStatus } from './ui-updater.js';
import { closeAllMenus } from './menu-controller.js';
import { showNewFileDialog, showOpenFileDialog } from './dialog-utils.js';

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
        } else if (choice === 'newWithoutSaving') {
            // 保存せずに新規作成（何もしない）
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
    
    // アンドゥ・リドゥスタックを完全にクリア
    undoStack.length = 0;
    redoStack.length = 0;
    
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
export async function openFile() {
    try {
        console.log('Opening file, isModified:', isModified);
        
        if (isModified) {
            console.log('File is modified, showing dialog');
            const choice = await showOpenFileDialog();
            console.log('Dialog choice:', choice);
            
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
            } else if (choice === 'openWithoutSaving') {
                // 保存せずにファイルを開く（何もしない）
            } else if (choice === 'cancel') {
                closeAllMenus();
                return;
            }
        }
        
        await showFileOpenDialog();
        
    } catch (error) {
        console.error('File open error:', error);
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
            setCurrentFilePath(filePath);
            setIsModified(false);
            setCurrentContent(content);
            
            // アンドゥ・リドゥスタックを完全にクリア
            undoStack.length = 0;
            redoStack.length = 0;
            
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
export async function saveFile() {
    console.log('saveFile called');
    console.log('currentFilePath:', currentFilePath);
    console.log('isModified:', isModified);
    
    try {
        if (currentFilePath) {
            console.log('Saving to existing file:', currentFilePath);
            
            if (window.__TAURI__ && window.__TAURI__.fs) {
                console.log('Using Tauri fs API');
                await window.__TAURI__.fs.writeTextFile(currentFilePath, editor.value);
                console.log('File saved successfully with Tauri fs');
            } else if (tauriInvoke) {
                console.log('Using Tauri invoke');
                await tauriInvoke('write_file', { 
                    path: currentFilePath, 
                    content: editor.value 
                });
                console.log('File saved successfully with Tauri invoke');
            } else {
                console.error('No Tauri API available');
                alert('ファイル保存機能はTauriアプリでのみ利用可能です');
                closeAllMenus();
                return;
            }
            
            setIsModified(false);
            setCurrentContent(editor.value);
            console.log('File save completed, isModified set to false');
            
        } else {
            console.log('No current file path, calling saveAsFile');
            await saveAsFile();
            return;
        }
    } catch (error) {
        console.error('Save file error:', error);
        alert('ファイルを保存できませんでした: ' + error.message);
    }
    
    closeAllMenus();
}

/**
 * 名前を付けて保存
 */
export async function saveAsFile() {
    console.log('saveAsFile called');
    
    try {
        if (window.__TAURI__ && window.__TAURI__.dialog) {
            console.log('Tauri dialog API available, showing save dialog');
            
            const filePath = await window.__TAURI__.dialog.save({
                title: "名前を付けて保存",
                filters: [
                    { name: 'テキストファイル', extensions: ['txt'] },
                    { name: 'Markdownファイル', extensions: ['md'] },
                    { name: 'すべてのファイル', extensions: ['*'] }
                ]
            });
            
            console.log('Save dialog result:', filePath);
            
            if (filePath) {
                console.log('User selected file path:', filePath);
                
                if (window.__TAURI__ && window.__TAURI__.fs) {
                    console.log('Using Tauri fs API for saveAs');
                    await window.__TAURI__.fs.writeTextFile(filePath, editor.value);
                    console.log('File saved successfully with Tauri fs');
                } else if (tauriInvoke) {
                    console.log('Using Tauri invoke for saveAs');
                    await tauriInvoke('write_file', { 
                        path: filePath, 
                        content: editor.value 
                    });
                    console.log('File saved successfully with Tauri invoke');
                } else {
                    console.error('No Tauri API available for file writing');
                    alert('ファイル保存機能はTauriアプリでのみ利用可能です');
                    closeAllMenus();
                    return;
                }
                
                setCurrentFilePath(filePath);
                setIsModified(false);
                setCurrentContent(editor.value);
                console.log('SaveAs completed, currentFilePath set to:', filePath);
            } else {
                console.log('User cancelled save dialog');
            }
        } else {
            console.error('Tauri dialog API not available');
            alert('ファイル保存機能はTauriアプリでのみ利用可能です');
        }
    } catch (error) {
        console.error('SaveAs error:', error);
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
                
                setCurrentFilePath(filePath);
                setIsModified(false);
                setCurrentContent(editor.value);
                
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
                
                setCurrentFilePath(filePath);
                setIsModified(false);
                setCurrentContent(editor.value);
                
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