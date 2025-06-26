/*
 * =====================================================
 * Sert Editor - アプリケーション終了処理
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

/**
 * アプリケーション終了
 * 変更がある場合は保存確認ダイアログを表示
 */
export async function exitApp() {
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