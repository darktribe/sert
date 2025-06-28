/*
 * =====================================================
 * Sert Editor - ファイル操作（多言語化対応版）
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
import { updateLineNumbers, updateStatus, updateWindowTitle } from './ui-updater.js';
import { closeAllMenus } from './menu-controller.js';
import { showNewFileDialog, showOpenFileDialog } from './dialog-utils.js';
import { t } from './locales.js';

/**
 * 新規ファイル作成
 * 変更がある場合は保存確認ダイアログを表示
 */
export async function newFile() {
    console.log('📄 Starting new file creation...');
    
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
                console.error('Save failed:', error);
                alert(t('messages.saveError', { error: error.message }) + '\n' + t('messages.saveCancelNew'));
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
    
    // タイトル更新を追加
    console.log('🏷️ Updating title for new file...');
    await updateWindowTitle();
    
    // カーソルを1行目1列目に設定
    editor.setSelectionRange(0, 0);
    editor.focus();
    
    closeAllMenus();
    console.log('✅ New file creation completed');
}

/**
 * ファイルを開く
 * 変更がある場合は保存確認ダイアログを表示
 */
export async function openFile() {
    try {
        console.log('📂 Opening file, isModified:', isModified);
        
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
                    console.error('Save failed:', error);
                    alert(t('messages.saveError', { error: error.message }) + '\n' + t('messages.saveCancelOpen'));
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
        alert(t('messages.openError', { error: error.message }));
    }
    
    closeAllMenus();
}

/**
 * ファイルオープンダイアログの表示
 */
async function showFileOpenDialog() {
    if (window.__TAURI__ && window.__TAURI__.dialog) {
        const filePath = await window.__TAURI__.dialog.open({
            title: t('dialogs.fileDialog.openTitle'),
            multiple: false,
            filters: [
                { 
                    name: t('dialogs.fileFilters.textFiles'), 
                    extensions: ['txt', 'md', 'rs', 'js', 'html', 'css', 'json', 'xml', 'py'] 
                },
                { 
                    name: t('dialogs.fileFilters.allFiles'), 
                    extensions: ['*'] 
                }
            ]
        });
        
        if (filePath) {
            console.log('📂 Opening file:', filePath);
            
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
            
            // タイトル更新を追加
            console.log('🏷️ Updating title for opened file...');
            await updateWindowTitle();
            
            console.log('✅ File opened successfully:', filePath);
        }
    } else {
        alert(t('messages.tauriOnly'));
    }
}

/**
 * ファイル保存
 */
export async function saveFile() {
    console.log('💾 saveFile called');
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
                alert(t('messages.tauriOnly'));
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
        alert(t('messages.saveError', { error: error.message }));
    }
    
    closeAllMenus();
}

/**
 * 名前を付けて保存
 */
export async function saveAsFile() {
    console.log('💾 saveAsFile called');
    
    try {
        if (window.__TAURI__ && window.__TAURI__.dialog) {
            console.log('Tauri dialog API available, showing save dialog');
            
            const filePath = await window.__TAURI__.dialog.save({
                title: t('dialogs.fileDialog.saveTitle'),
                filters: [
                    { 
                        name: t('dialogs.fileFilters.textFiles'), 
                        extensions: ['txt'] 
                    },
                    { 
                        name: t('dialogs.fileFilters.markdownFiles'), 
                        extensions: ['md'] 
                    },
                    { 
                        name: t('dialogs.fileFilters.allFiles'), 
                        extensions: ['*'] 
                    }
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
                    alert(t('messages.tauriOnly'));
                    closeAllMenus();
                    return;
                }
                
                setCurrentFilePath(filePath);
                setIsModified(false);
                setCurrentContent(editor.value);
                
                // タイトル更新を追加
                console.log('🏷️ Updating title for saved file...');
                await updateWindowTitle();
                
                console.log('SaveAs completed, currentFilePath set to:', filePath);
            } else {
                console.log('User cancelled save dialog');
            }
        } else {
            console.error('Tauri dialog API not available');
            alert(t('messages.tauriOnly'));
        }
    } catch (error) {
        console.error('Save As error:', error);
        alert(t('messages.saveError', { error: error.message }));
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
            throw new Error(t('messages.tauriOnly'));
        }
        
        setIsModified(false);
        setCurrentContent(editor.value);
    } else {
        throw new Error(t('messages.newFileError'));
    }
}

/**
 * 新規作成前専用の「名前を付けて保存」処理
 */
async function saveAsFileForNew() {
    try {
        if (window.__TAURI__ && window.__TAURI__.dialog) {
            const filePath = await window.__TAURI__.dialog.save({
                title: t('dialogs.fileDialog.saveBeforeNewTitle'),
                filters: [
                    { 
                        name: t('dialogs.fileFilters.textFiles'), 
                        extensions: ['txt'] 
                    },
                    { 
                        name: t('dialogs.fileFilters.markdownFiles'), 
                        extensions: ['md'] 
                    },
                    { 
                        name: t('dialogs.fileFilters.allFiles'), 
                        extensions: ['*'] 
                    }
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
                
                // タイトル更新を追加
                console.log('🏷️ Updating title for file saved before new...');
                await updateWindowTitle();
                
                return true; // 保存成功
            } else {
                return false; // 保存キャンセル
            }
        } else {
            throw new Error(t('messages.tauriOnly'));
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
            throw new Error(t('messages.tauriOnly'));
        }
        
        setIsModified(false);
        setCurrentContent(editor.value);
    } else {
        throw new Error(t('messages.newFileError'));
    }
}

/**
 * ファイルを開く前専用の「名前を付けて保存」処理
 */
async function saveAsFileForOpen() {
    try {
        if (window.__TAURI__ && window.__TAURI__.dialog) {
            const filePath = await window.__TAURI__.dialog.save({
                title: t('dialogs.fileDialog.saveBeforeOpenTitle'),
                filters: [
                    { 
                        name: t('dialogs.fileFilters.textFiles'), 
                        extensions: ['txt'] 
                    },
                    { 
                        name: t('dialogs.fileFilters.markdownFiles'), 
                        extensions: ['md'] 
                    },
                    { 
                        name: t('dialogs.fileFilters.allFiles'), 
                        extensions: ['*'] 
                    }
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
                
                // タイトル更新を追加
                console.log('🏷️ Updating title for file saved before open...');
                await updateWindowTitle();
                
                return true;
            } else {
                return false;
            }
        } else {
            throw new Error(t('messages.tauriOnly'));
        }
    } catch (error) {
        throw error;
    }
}