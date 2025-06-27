/*
 * =====================================================
 * Sert Editor - アプリケーション終了処理（多言語化対応版）
 * =====================================================
 */

import { 
    isModified, 
    currentFilePath, 
    setIsModified,
    setCurrentContent,
    setCurrentFilePath,
    editor,
    tauriInvoke
} from './globals.js';
import { showExitDialog } from './dialog-utils.js';
import { updateWindowTitle } from './ui-updater.js';
import { t } from './locales.js';

// グローバルフラグを削除し、ローカル変数で管理
let isExitInProgress = false;

/**
 * アプリケーション終了
 * 変更がある場合は保存確認ダイアログを表示
 */
export async function exitApp() {
    console.log('🚪 exitApp called, isExitInProgress:', isExitInProgress);
    
    // 既に終了処理中の場合は無視
    if (isExitInProgress) {
        console.log('⚠️ Exit already in progress, ignoring call');
        return;
    }
    
    isExitInProgress = true;
    console.log('🚪 Exit process started');
    
    try {
        if (isModified) {
            console.log('📝 File is modified, showing exit dialog');
            
            const choice = await showExitDialog();
            console.log('🚪 Exit dialog choice:', choice);
            
            if (choice === 'saveAndExit') {
                try {
                    console.log('💾 Saving before exit...');
                    if (currentFilePath) {
                        await saveFileBeforeExit();
                        console.log('💾 File saved, calling Tauri exit');
                        await tauriInvoke('exit_app');
                    } else {
                        console.log('💾 No file path, showing save dialog');
                        const saveSuccess = await saveAsFileForExit();
                        
                        if (saveSuccess) {
                            console.log('💾 File saved via save dialog, calling Tauri exit');
                            await tauriInvoke('exit_app');
                        } else {
                            console.log('❌ Save cancelled, exit cancelled');
                            isExitInProgress = false;
                            return;
                        }
                    }
                } catch (error) {
                    console.error('❌ Save before exit failed:', error);
                    alert(t('messages.saveError', { error: error.message }) + '\n' + t('messages.saveCancelExit'));
                    isExitInProgress = false;
                    return;
                }
            } else if (choice === 'exitWithoutSaving') {
                console.log('🚪 Exit without saving');
                await tauriInvoke('exit_app');
            } else if (choice === 'cancel') {
                console.log('❌ Exit cancelled by user');
                isExitInProgress = false;
                return;
            }
        } else {
            console.log('🚪 No modifications, exiting directly');
            await tauriInvoke('exit_app');
        }
    } catch (error) {
        console.error('❌ exitApp error:', error);
        isExitInProgress = false;
        
        // エラー時はウィンドウを強制クローズ
        try {
            if (window.__TAURI__ && window.__TAURI__.window) {
                const { getCurrentWindow } = window.__TAURI__.window;
                const currentWindow = getCurrentWindow();
                await currentWindow.close();
            }
        } catch (closeError) {
            console.error('❌ Force close also failed:', closeError);
        }
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
            throw new Error(t('messages.tauriOnly'));
        }
        
        setIsModified(false);
        setCurrentContent(editor.value);
    } else {
        throw new Error(t('messages.newFileError'));
    }
}

/**
 * 終了前専用の「名前を付けて保存」処理
 */
async function saveAsFileForExit() {
    try {
        if (window.__TAURI__ && window.__TAURI__.dialog) {
            const filePath = await window.__TAURI__.dialog.save({
                title: t('dialogs.fileDialog.saveBeforeExitTitle'),
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
                console.log('🏷️ Updating title for file saved before exit...');
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