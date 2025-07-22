/*
 * =====================================================
 * Vinsert Editor - メインエントリーポイント（タイプライターモード対応版）
 * =====================================================
 */

import { initializeApp } from './js/app-init.js';
import { toggleMenu } from './js/menu-controller.js';
import { newFile, openFile, saveFile, saveAsFile } from './js/file-operations.js';
import { undo, redo } from './js/undo-redo.js';
import { copy, cut, paste, selectAll } from './js/edit-operations.js';
import { showSearchDialog, showReplaceDialog, findNext, findPrevious } from './js/search-replace.js';
import { showFontSettingsDialog, showFontSizeInputDialog, increaseFontSize, decreaseFontSize } from './js/font-settings.js';
import { toggleTypewriterMode, showTypewriterSettingsDialog, centerCurrentLine, onWindowResize, debugTypewriterState } from './js/typewriter-mode.js';

import { exitApp } from './js/app-exit.js';
import { createLanguageSwitcher, removeLanguageSwitcher, reinitializeLanguageSwitcher } from './js/language-switcher.js';
import { changeLanguage, getCurrentLanguage, getAvailableLanguages } from './js/locales.js';

// グローバル関数をウィンドウオブジェクトに登録（HTMLから呼び出せるようにするため）
console.log('🔧 Registering global functions...');

// 基本機能
window.toggleMenu = toggleMenu;
window.newFile = newFile;
window.openFile = openFile;
window.saveFile = saveFile;
window.saveAsFile = saveAsFile;
window.undo = undo;
window.redo = redo;
window.copy = copy;
window.cut = cut;
window.paste = paste;
window.selectAll = selectAll;
window.showSearchDialog = showSearchDialog;
window.showReplaceDialog = showReplaceDialog;
window.exitApp = exitApp;

// フォント設定機能
window.showFontSettingsDialog = showFontSettingsDialog;
window.showFontSizeInputDialog = showFontSizeInputDialog;
window.increaseFontSize = increaseFontSize;
window.decreaseFontSize = decreaseFontSize;

// タイプライターモード機能（新機能追加）
window.toggleTypewriterMode = toggleTypewriterMode;
window.showTypewriterSettingsDialog = showTypewriterSettingsDialog;
window.centerCurrentLine = centerCurrentLine;

// 言語切り替え機能
window.createLanguageSwitcher = createLanguageSwitcher;
window.removeLanguageSwitcher = removeLanguageSwitcher;
window.reinitializeLanguageSwitcher = reinitializeLanguageSwitcher;
window.changeLanguage = changeLanguage;
window.getCurrentLanguage = getCurrentLanguage;
window.getAvailableLanguages = getAvailableLanguages;

// グローバル関数の登録確認とデバッグ
console.log('📋 Global functions registered:');
console.log('window.toggleMenu:', typeof window.toggleMenu);
console.log('window.saveFile:', typeof window.saveFile);
console.log('window.saveAsFile:', typeof window.saveAsFile);
console.log('window.newFile:', typeof window.newFile);
console.log('window.openFile:', typeof window.openFile);
console.log('window.undo:', typeof window.undo);
console.log('window.redo:', typeof window.redo);
console.log('window.copy:', typeof window.copy);
console.log('window.cut:', typeof window.cut);
console.log('window.paste:', typeof window.paste);
console.log('window.selectAll:', typeof window.selectAll);
console.log('window.showSearchDialog:', typeof window.showSearchDialog);
console.log('window.showReplaceDialog:', typeof window.showReplaceDialog);
console.log('window.exitApp:', typeof window.exitApp);

// フォント設定関数
console.log('🎨 Font functions:');
console.log('window.showFontSettingsDialog:', typeof window.showFontSettingsDialog);
console.log('window.showFontSizeInputDialog:', typeof window.showFontSizeInputDialog);
console.log('window.increaseFontSize:', typeof window.increaseFontSize);
console.log('window.decreaseFontSize:', typeof window.decreaseFontSize);

// タイプライターモード関数（新機能）
console.log('📝 Typewriter mode functions:');
console.log('window.toggleTypewriterMode:', typeof window.toggleTypewriterMode);
console.log('window.showTypewriterSettingsDialog:', typeof window.showTypewriterSettingsDialog);
console.log('window.centerCurrentLine:', typeof window.centerCurrentLine);

// 言語切り替え関数
console.log('🌐 Language functions:');
console.log('window.createLanguageSwitcher:', typeof window.createLanguageSwitcher);
console.log('window.changeLanguage:', typeof window.changeLanguage);
console.log('window.getCurrentLanguage:', typeof window.getCurrentLanguage);
console.log('window.getAvailableLanguages:', typeof window.getAvailableLanguages);

// 新機能のテスト用デバッグ関数を追加
window.testFontSizeInput = function() {
    console.log('🧪 Testing font size input dialog...');
    console.log('showFontSizeInputDialog function:', window.showFontSizeInputDialog);
    try {
        window.showFontSizeInputDialog();
        console.log('✅ showFontSizeInputDialog test completed');
    } catch (error) {
        console.error('❌ showFontSizeInputDialog test failed:', error);
    }
};

// タイプライターモードのテスト用デバッグ関数を追加（新機能）
window.testTypewriterMode = function() {
    console.log('🧪 Testing typewriter mode...');
    console.log('toggleTypewriterMode function:', window.toggleTypewriterMode);
    console.log('showTypewriterSettingsDialog function:', window.showTypewriterSettingsDialog);
    console.log('centerCurrentLine function:', window.centerCurrentLine);
    
    try {
        console.log('📝 Testing toggle...');
        window.toggleTypewriterMode();
        console.log('✅ toggleTypewriterMode test completed');
        
        setTimeout(() => {
            console.log('📝 Testing settings dialog...');
            window.showTypewriterSettingsDialog();
            console.log('✅ showTypewriterSettingsDialog test completed');
        }, 1000);
    } catch (error) {
        console.error('❌ typewriter mode test failed:', error);
    }
};

// Tab機能のテスト用デバッグ関数を追加
window.testTabFeature = function() {
    console.log('🧪 Testing Tab feature...');
    console.log('エディタでTabキーを押してみてください。');
    console.log('- Tab: インデント追加');
    console.log('- Shift+Tab: インデント削除');
    console.log('- 複数行選択してShift+Tab: 選択行全体のインデント削除');
    
    const editor = document.getElementById('editor');
    if (editor) {
        editor.focus();
        console.log('✅ エディタにフォーカスを設定しました');
    }
};

// 保存機能のテスト用デバッグ関数を追加
window.testSaveFile = async function() {
    console.log('🧪 Testing saveFile function...');
    console.log('saveFile function:', window.saveFile);
    try {
        await window.saveFile();
        console.log('✅ saveFile test completed');
    } catch (error) {
        console.error('❌ saveFile test failed:', error);
    }
};

// 検索機能のテスト用デバッグ関数を追加
window.testSearchDialog = function() {
    console.log('🧪 Testing search dialog function...');
    console.log('showSearchDialog function:', window.showSearchDialog);
    try {
        window.showSearchDialog();
        console.log('✅ showSearchDialog test completed');
    } catch (error) {
        console.error('❌ showSearchDialog test failed:', error);
    }
};

// フォント設定テスト用デバッグ関数を追加
window.testFontSettings = function() {
    console.log('🧪 Testing font settings...');
    console.log('showFontSettingsDialog function:', window.showFontSettingsDialog);
    try {
        window.showFontSettingsDialog();
        console.log('✅ showFontSettingsDialog test completed');
    } catch (error) {
        console.error('❌ showFontSettingsDialog test failed:', error);
    }
};

// 言語切り替えテスト用デバッグ関数を追加
window.testLanguageSwitching = async function() {
    console.log('🧪 Testing language switching...');
    const languages = window.getAvailableLanguages();
    console.log('Available languages:', languages);
    
    for (const lang of languages) {
        console.log(`🌐 Testing switch to ${lang.name} (${lang.code})`);
        try {
            const success = await window.changeLanguage(lang.code);
            console.log(`✅ Switch to ${lang.code}:`, success);
            
            // 少し待機して次の言語へ
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`❌ Failed to switch to ${lang.code}:`, error);
        }
    }
    
    console.log('🧪 Language switching test completed');
};

/**
 * ページ読み込み時の初期化処理
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM loaded, starting initialization...');
    
    // グローバル関数が正しく登録されているかさらに確認
    console.log('🔍 Final check - window.saveFile:', typeof window.saveFile);
    console.log('🔍 Final check - window.showSearchDialog:', typeof window.showSearchDialog);
    console.log('🔍 Final check - window.showFontSettingsDialog:', typeof window.showFontSettingsDialog);
    console.log('🔍 Final check - window.showFontSizeInputDialog:', typeof window.showFontSizeInputDialog);
    console.log('🔍 Final check - window.toggleTypewriterMode:', typeof window.toggleTypewriterMode);
    console.log('🔍 Final check - window.showTypewriterSettingsDialog:', typeof window.showTypewriterSettingsDialog);
    console.log('🔍 Final check - window.changeLanguage:', typeof window.changeLanguage);
    
    await initializeApp();
    
    console.log('🎯 App ready! Global functions available:');
    console.log('- window.saveFile():', typeof window.saveFile);
    console.log('- window.newFile():', typeof window.newFile);
    console.log('- window.openFile():', typeof window.openFile);
    console.log('- window.showSearchDialog():', typeof window.showSearchDialog);
    console.log('- window.showReplaceDialog():', typeof window.showReplaceDialog);
    console.log('- window.showFontSettingsDialog():', typeof window.showFontSettingsDialog);
    console.log('- window.showFontSizeInputDialog():', typeof window.showFontSizeInputDialog);
    console.log('- window.toggleTypewriterMode():', typeof window.toggleTypewriterMode);
    console.log('- window.showTypewriterSettingsDialog():', typeof window.showTypewriterSettingsDialog);
    console.log('- window.changeLanguage():', typeof window.changeLanguage);
    console.log('- window.testLanguageSwitching():', typeof window.testLanguageSwitching);
    console.log('- window.testFontSettings():', typeof window.testFontSettings);
    console.log('- window.testFontSizeInput():', typeof window.testFontSizeInput);
    console.log('- window.testTypewriterMode():', typeof window.testTypewriterMode);
    console.log('- window.testTabFeature():', typeof window.testTabFeature);
});

/**
 * 追加の初期化確認（フォールバック）
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('📄 DOM loaded via readyState check...');
        console.log('🔍 Backup check - window.saveFile:', typeof window.saveFile);
        console.log('🔍 Backup check - window.showSearchDialog:', typeof window.showSearchDialog);
        console.log('🔍 Backup check - window.showFontSettingsDialog:', typeof window.showFontSettingsDialog);
        console.log('🔍 Backup check - window.showFontSizeInputDialog:', typeof window.showFontSizeInputDialog);
        console.log('🔍 Backup check - window.toggleTypewriterMode:', typeof window.toggleTypewriterMode);
        console.log('🔍 Backup check - window.showTypewriterSettingsDialog:', typeof window.showTypewriterSettingsDialog);
        console.log('🔍 Backup check - window.changeLanguage:', typeof window.changeLanguage);
        await initializeApp();
    });
} else {
    console.log('📄 DOM already loaded, initializing immediately...');
    console.log('🔍 Immediate check - window.saveFile:', typeof window.saveFile);
    console.log('🔍 Immediate check - window.showSearchDialog:', typeof window.showSearchDialog);
    console.log('🔍 Immediate check - window.showFontSettingsDialog:', typeof window.showFontSettingsDialog);
    console.log('🔍 Immediate check - window.showFontSizeInputDialog:', typeof window.showFontSizeInputDialog);
    console.log('🔍 Immediate check - window.toggleTypewriterMode:', typeof window.toggleTypewriterMode);
    console.log('🔍 Immediate check - window.showTypewriterSettingsDialog:', typeof window.showTypewriterSettingsDialog);
    console.log('🔍 Immediate check - window.changeLanguage:', typeof window.changeLanguage);
    initializeApp();
}

// さらなるフォールバック: 少し遅延させてグローバル関数を再登録
setTimeout(() => {
    console.log('🔄 Fallback: Re-registering global functions...');
    
    window.saveFile = saveFile;
    window.newFile = newFile;
    window.openFile = openFile;
    window.saveAsFile = saveAsFile;
    window.showSearchDialog = showSearchDialog;
    window.showReplaceDialog = showReplaceDialog;
    window.showFontSettingsDialog = showFontSettingsDialog;
    window.showFontSizeInputDialog = showFontSizeInputDialog;
    window.increaseFontSize = increaseFontSize;
    window.decreaseFontSize = decreaseFontSize;
    window.toggleTypewriterMode = toggleTypewriterMode;
    window.showTypewriterSettingsDialog = showTypewriterSettingsDialog;
    window.centerCurrentLine = centerCurrentLine;
    window.changeLanguage = changeLanguage;
    window.createLanguageSwitcher = createLanguageSwitcher;
    
    console.log('✅ Fallback registration complete - window.saveFile:', typeof window.saveFile);
    console.log('✅ Fallback registration complete - window.showSearchDialog:', typeof window.showSearchDialog);
    console.log('✅ Fallback registration complete - window.showFontSettingsDialog:', typeof window.showFontSettingsDialog);
    console.log('✅ Fallback registration complete - window.showFontSizeInputDialog:', typeof window.showFontSizeInputDialog);
    console.log('✅ Fallback registration complete - window.toggleTypewriterMode:', typeof window.toggleTypewriterMode);
    console.log('✅ Fallback registration complete - window.showTypewriterSettingsDialog:', typeof window.showTypewriterSettingsDialog);
    console.log('✅ Fallback registration complete - window.changeLanguage:', typeof window.changeLanguage);
}, 1000);

// ======================================================
// 行番号デバッグ関数（main.jsに追加するコード）
// ======================================================

// デバッグ用関数をインポート
import { testLineNumberCalculation, updateLineNumbersWithDebug, debugScrollSync } from './js/ui-updater.js';

// デバッグ関数をグローバルに登録
window.testLineNumbers = function() {
    console.log('🧪 Testing line number display...');
    
    const editor = document.getElementById('editor');
    if (!editor) {
        console.error('❌ Editor not found');
        return;
    }
    
    console.log('📊 Current editor content:');
    console.log('Text length:', editor.value.length);
    console.log('Physical lines:', editor.value.split('\n').length);
    console.log('Content preview:', JSON.stringify(editor.value.substring(0, 100)) + '...');
    
    // 詳細なデバッグ実行
    testLineNumberCalculation();
};

window.debugLineNumbers = function() {
    console.log('🐛 Debugging line numbers...');
    updateLineNumbersWithDebug();
};

window.toggleDebugMode = function() {
    const container = document.querySelector('.editor-container');
    if (container) {
        container.classList.toggle('debug-line-numbers');
        container.classList.toggle('debug-line-highlight');
        console.log('🐛 Debug mode toggled');
    }
};

window.testLongLine = function() {
    console.log('🧪 Testing with long line...');
    const editor = document.getElementById('editor');
    if (editor) {
        // 長い行を作成してテスト
        const longText = 'This is a very long line that should wrap multiple times when the window is not wide enough to display it all in one line. '.repeat(5);
        editor.value = `First line\n${longText}\nThird line\nFourth line`;
        
        // 行番号を更新
        setTimeout(() => {
            updateLineNumbersWithDebug();
        }, 100);
    }
};

window.testMultipleWraps = function() {
    console.log('🧪 Testing multiple wrapping lines...');
    const editor = document.getElementById('editor');
    if (editor) {
        const shortLine = 'Short line';
        const mediumLine = 'This is a medium length line that might wrap once or twice depending on window size.';
        const longLine = 'This is a very very very long line that will definitely wrap multiple times when displayed in the editor window, creating several visual lines from one logical line.';
        const veryLongLine = 'Extremely long line: ' + 'word '.repeat(50);
        
        editor.value = [
            shortLine,
            mediumLine,
            longLine,
            shortLine,
            veryLongLine,
            shortLine,
            'Final line'
        ].join('\n');
        
        // カーソルを先頭に配置
        editor.setSelectionRange(0, 0);
        editor.focus();
        
        // 行番号を更新
        setTimeout(() => {
            updateLineNumbersWithDebug();
            debugScrollSync();
        }, 100);
    }
};

window.measureLineHeight = function() {
    console.log('📏 Measuring line height...');
    const editor = document.getElementById('editor');
    const lineNumbers = document.getElementById('line-numbers');
    
    if (editor && lineNumbers) {
        const editorStyle = getComputedStyle(editor);
        const lineNumberStyle = getComputedStyle(lineNumbers);
        
        console.log('📊 Editor measurements:', {
            fontSize: editorStyle.fontSize,
            lineHeight: editorStyle.lineHeight,
            fontFamily: editorStyle.fontFamily,
            clientWidth: editor.clientWidth,
            scrollWidth: editor.scrollWidth,
            paddingLeft: editorStyle.paddingLeft,
            paddingRight: editorStyle.paddingRight
        });
        
        console.log('📊 Line numbers measurements:', {
            fontSize: lineNumberStyle.fontSize,
            lineHeight: lineNumberStyle.lineHeight,
            fontFamily: lineNumberStyle.fontFamily,
            width: lineNumbers.offsetWidth
        });
        
        // 実際の行の高さを測定
        const testDiv = document.createElement('div');
        testDiv.style.cssText = `
            position: absolute;
            visibility: hidden;
            top: -9999px;
            left: -9999px;
            font-family: ${editorStyle.fontFamily};
            font-size: ${editorStyle.fontSize};
            line-height: ${editorStyle.lineHeight};
            white-space: pre;
        `;
        testDiv.textContent = 'Test line';
        document.body.appendChild(testDiv);
        
        const measuredHeight = testDiv.offsetHeight;
        document.body.removeChild(testDiv);
        
        console.log('📊 Measured single line height:', measuredHeight + 'px');
    }
};

// 使用方法をコンソールに表示
console.log('🔧 Line number debug functions available:');
console.log('- window.testLineNumbers() : 基本的なテスト');
console.log('- window.debugLineNumbers() : 詳細デバッグ');
console.log('- window.toggleDebugMode() : デバッグ表示のON/OFF');
console.log('- window.testLongLine() : 長い行でのテスト');
console.log('- window.testMultipleWraps() : 複数の折り返し行でのテスト');
console.log('- window.measureLineHeight() : 行の高さ測定');