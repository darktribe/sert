/*
 * =====================================================
 * Vinsert Editor - メインエントリーポイント（行ハイライト・大量行数対応版）
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
import { 
    toggleLineHighlight, 
    isLineHighlightEnabled, 
    updateCurrentLineHighlight,
    debugScrollSync 
} from './js/ui-updater.js';

import { exitApp } from './js/app-exit.js';
import { createLanguageSwitcher, removeLanguageSwitcher, reinitializeLanguageSwitcher } from './js/language-switcher.js';
import { changeLanguage, getCurrentLanguage, getAvailableLanguages } from './js/locales.js';

// グローバル関数をウィンドウオブジェクトに登録（HTMLから呼び出せるようにするため）
console.log('🔧 Registering global functions with new features...');

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

// タイプライターモード機能
window.toggleTypewriterMode = toggleTypewriterMode;
window.showTypewriterSettingsDialog = showTypewriterSettingsDialog;
window.centerCurrentLine = centerCurrentLine;

// 行ハイライト機能（新機能）
window.toggleLineHighlight = toggleLineHighlight;
window.isLineHighlightEnabled = isLineHighlightEnabled;

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

// フォント設定関数
console.log('🎨 Font functions:');
console.log('window.showFontSettingsDialog:', typeof window.showFontSettingsDialog);
console.log('window.showFontSizeInputDialog:', typeof window.showFontSizeInputDialog);

// 行ハイライト機能（新機能ログ）
console.log('🎨 Line highlight functions:');
console.log('window.toggleLineHighlight:', typeof window.toggleLineHighlight);
console.log('window.isLineHighlightEnabled:', typeof window.isLineHighlightEnabled);

// タイプライターモード関数
console.log('📝 Typewriter mode functions:');
console.log('window.toggleTypewriterMode:', typeof window.toggleTypewriterMode);
console.log('window.showTypewriterSettingsDialog:', typeof window.showTypewriterSettingsDialog);

// 言語切り替え関数
console.log('🌐 Language functions:');
console.log('window.createLanguageSwitcher:', typeof window.createLanguageSwitcher);
console.log('window.changeLanguage:', typeof window.changeLanguage);

// ======================================================
// 新機能のテスト用デバッグ関数
// ======================================================

// 行ハイライト機能のテスト（修正版）
window.testLineHighlight = function() {
    console.log('🧪 Testing line highlight feature...');
    console.log('Current state:', window.isLineHighlightEnabled());
    
    // 切り替えテスト
    console.log('Toggling line highlight...');
    window.toggleLineHighlight();
    
    setTimeout(() => {
        console.log('New state:', window.isLineHighlightEnabled());
        
        // テスト用のテキストを追加
        const editor = document.getElementById('editor');
        if (editor) {
            editor.value = `Line 1: Short line
Line 2: This is a medium length line that should demonstrate the highlight feature.
Line 3: This is a very long line that will definitely wrap to multiple visual lines when displayed in a narrow editor window, creating several visual lines from one logical line.
Line 4: Another short line
Line 5: Final test line`;
            
            // カーソルを3行目に移動
            const lines = editor.value.split('\n');
            const targetPosition = lines[0].length + lines[1].length + 2; // +2 for newlines
            editor.setSelectionRange(targetPosition, targetPosition);
            editor.focus();
            
            console.log('Test text added and cursor moved to line 3');
        }
        
        console.log('✅ Line highlight test completed');
    }, 1000);
};

// ハイライト位置のデバッグ
window.debugHighlight = function() {
    console.log('🐛 Debugging highlight position...');
    
    const editor = document.getElementById('editor');
    if (!editor) {
        console.error('Editor not found');
        return;
    }
    
    console.log('Editor info:', {
        cursorPosition: editor.selectionStart,
        currentLine: editor.value.substring(0, editor.selectionStart).split('\n').length,
        totalLines: editor.value.split('\n').length,
        editorHeight: editor.clientHeight,
        scrollTop: editor.scrollTop
    });
    
    // ハイライト要素の状態を確認
    const highlight = document.querySelector('.current-line-highlight');
    const highlightNumbers = document.querySelector('.current-line-highlight-numbers');
    
    console.log('Highlight elements:', {
        editorHighlight: highlight ? {
            display: highlight.style.display,
            top: highlight.style.top,
            height: highlight.style.height,
            left: highlight.style.left,
            right: highlight.style.right
        } : 'Not found',
        numbersHighlight: highlightNumbers ? {
            display: highlightNumbers.style.display,
            top: highlightNumbers.style.top,
            height: highlightNumbers.style.height
        } : 'Not found'
    });
    
    // 手動でハイライト更新をトリガー
    import('./js/ui-updater.js').then(module => {
        module.updateCurrentLineHighlight();
        console.log('Manual highlight update triggered');
    });
};

// 大量行数テスト
window.testLargeFile = function() {
    console.log('🧪 Testing large file handling...');
    const editor = document.getElementById('editor');
    if (editor) {
        // 1000行のテストファイルを作成
        const lines = [];
        for (let i = 1; i <= 1000; i++) {
            lines.push(`Line ${i}: This is a test line with some content to test word wrapping functionality.`);
        }
        
        editor.value = lines.join('\n');
        editor.setSelectionRange(0, 0);
        editor.focus();
        
        console.log('Generated 1000 line test file');
        console.log('✅ Large file test completed');
    }
};

// 超大量行数テスト（10,000行）
window.testVeryLargeFile = function() {
    console.log('🧪 Testing very large file (10,000 lines)...');
    const editor = document.getElementById('editor');
    if (editor) {
        const lines = [];
        for (let i = 1; i <= 10000; i++) {
            if (i % 1000 === 0) {
                console.log(`Generating line ${i}...`);
            }
            lines.push(`Line ${i}: Test content for performance testing.`);
        }
        
        editor.value = lines.join('\n');
        editor.setSelectionRange(0, 0);
        editor.focus();
        
        console.log('Generated 10,000 line test file');
        console.log('✅ Very large file test completed');
    }
};

// 極大量行数テスト（100,000行）- 注意: 時間がかかります
window.testExtremelyLargeFile = function() {
    console.log('🧪 Testing extremely large file (100,000 lines) - This may take a while...');
    const editor = document.getElementById('editor');
    if (editor) {
        const lines = [];
        for (let i = 1; i <= 100000; i++) {
            if (i % 10000 === 0) {
                console.log(`Generating line ${i}...`);
            }
            lines.push(`Line ${i}: Performance test.`);
        }
        
        console.log('Setting editor content...');
        editor.value = lines.join('\n');
        editor.setSelectionRange(0, 0);
        editor.focus();
        
        console.log('Generated 100,000 line test file');
        console.log('✅ Extremely large file test completed');
    }
};

// 行番号幅テスト
window.testLineNumberWidth = function() {
    console.log('🧪 Testing line number width adjustment...');
    
    const tests = [
        { lines: 999, expected: '50px' },
        { lines: 1000, expected: '65px' },
        { lines: 9999, expected: '65px' },
        { lines: 10000, expected: '80px' },
        { lines: 99999, expected: '80px' },
        { lines: 100000, expected: '95px' }
    ];
    
    const editor = document.getElementById('editor');
    const lineNumbers = document.getElementById('line-numbers');
    
    if (editor && lineNumbers) {
        tests.forEach(test => {
            // テスト用のファイルを生成
            const lines = [];
            for (let i = 1; i <= test.lines; i++) {
                lines.push(`Line ${i}`);
            }
            
            editor.value = lines.join('\n');
            
            // 行番号を更新（実際の関数を呼び出し）
            import('./js/ui-updater.js').then(module => {
                module.updateLineNumbers();
                
                setTimeout(() => {
                    const actualWidth = lineNumbers.style.width;
                    console.log(`${test.lines} lines: expected ${test.expected}, actual ${actualWidth}`);
                }, 100);
            });
        });
        
        console.log('✅ Line number width test completed');
    }
};

// パフォーマンステスト
window.testPerformance = function() {
    console.log('🧪 Running performance tests...');
    
    const tests = [
        { name: 'Small file (100 lines)', lines: 100 },
        { name: 'Medium file (1,000 lines)', lines: 1000 },
        { name: 'Large file (10,000 lines)', lines: 10000 },
        { name: 'Very large file (50,000 lines)', lines: 50000 }
    ];
    
    const editor = document.getElementById('editor');
    if (!editor) return;
    
    tests.forEach((test, index) => {
        setTimeout(() => {
            console.log(`🏃 Running ${test.name}...`);
            const startTime = performance.now();
            
            // テストファイル生成
            const lines = [];
            for (let i = 1; i <= test.lines; i++) {
                lines.push(`Line ${i}: Test content with some text to measure performance.`);
            }
            
            editor.value = lines.join('\n');
            
            // 行番号更新の時間を測定
            import('./js/ui-updater.js').then(module => {
                const updateStartTime = performance.now();
                module.updateLineNumbers();
                const updateEndTime = performance.now();
                
                const totalTime = updateEndTime - startTime;
                const updateTime = updateEndTime - updateStartTime;
                
                console.log(`${test.name}: Total ${totalTime.toFixed(2)}ms, Update ${updateTime.toFixed(2)}ms`);
                
                if (index === tests.length - 1) {
                    console.log('✅ Performance tests completed');
                }
            });
        }, index * 2000); // 2秒間隔で実行
    });
};

// 統合テスト
window.runAllTests = function() {
    console.log('🧪 Running all tests...');
    
    // 順番に実行
    window.testLineHighlight();
    
    setTimeout(() => {
        window.testLineNumberWidth();
    }, 2000);
    
    setTimeout(() => {
        window.testLargeFile();
    }, 4000);
    
    setTimeout(() => {
        window.testPerformance();
    }, 6000);
    
    console.log('All tests scheduled');
};

// 既存のテスト関数も維持
window.testFontSizeInput = function() {
    console.log('🧪 Testing font size input dialog...');
    try {
        window.showFontSizeInputDialog();
        console.log('✅ showFontSizeInputDialog test completed');
    } catch (error) {
        console.error('❌ showFontSizeInputDialog test failed:', error);
    }
};

window.testTypewriterMode = function() {
    console.log('🧪 Testing typewriter mode...');
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

/**
 * ページ読み込み時の初期化処理
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM loaded, starting enhanced initialization...');
    
    await initializeApp();
    
    console.log('🎯 Enhanced app ready! New features available:');
    console.log('- window.toggleLineHighlight(): 現在行ハイライトのON/OFF');
    console.log('- window.testLineHighlight(): 行ハイライト機能テスト（テスト用文章付き）');
    console.log('- window.debugHighlight(): ハイライト位置の詳細デバッグ');
    console.log('- window.testLargeFile(): 1,000行ファイルテスト');
    console.log('- window.testVeryLargeFile(): 10,000行ファイルテスト');
    console.log('- window.testExtremelyLargeFile(): 100,000行ファイルテスト');
    console.log('- window.testLineNumberWidth(): 行番号幅調整テスト');
    console.log('- window.testPerformance(): パフォーマンステスト');
    console.log('- window.runAllTests(): 全テスト実行');
    
    console.log('📊 大量行数対応:');
    console.log('  - 1-999行: 50px幅');
    console.log('  - 1,000-9,999行: 65px幅');
    console.log('  - 10,000-99,999行: 80px幅');
    console.log('  - 100,000行以上: 95px幅');
    
    console.log('🎨 行ハイライト機能（修正版）:');
    console.log('  - 表示メニューから切り替え可能');
    console.log('  - 現在のカーソル行のみハイライト表示');
    console.log('  - ワードラップした行全体をカバー');
    console.log('  - 設定は自動保存される');
    console.log('  - テーマ対応（CSS変数で色を制御）');
});

/**
 * 追加の初期化確認（フォールバック）
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await initializeApp();
    });
} else {
    initializeApp();
}

// さらなるフォールバック: 少し遅延させてグローバル関数を再登録
setTimeout(() => {
    console.log('🔄 Fallback: Re-registering enhanced global functions...');
    
    // 基本機能
    window.saveFile = saveFile;
    window.newFile = newFile;
    window.openFile = openFile;
    window.saveAsFile = saveAsFile;
    window.showSearchDialog = showSearchDialog;
    window.showReplaceDialog = showReplaceDialog;
    
    // フォント機能
    window.showFontSettingsDialog = showFontSettingsDialog;
    window.showFontSizeInputDialog = showFontSizeInputDialog;
    window.increaseFontSize = increaseFontSize;
    window.decreaseFontSize = decreaseFontSize;
    
    // タイプライター機能
    window.toggleTypewriterMode = toggleTypewriterMode;
    window.showTypewriterSettingsDialog = showTypewriterSettingsDialog;
    window.centerCurrentLine = centerCurrentLine;
    
    // 行ハイライト機能（新機能）
    window.toggleLineHighlight = toggleLineHighlight;
    window.isLineHighlightEnabled = isLineHighlightEnabled;
    
    // 言語切り替え機能
    window.changeLanguage = changeLanguage;
    window.createLanguageSwitcher = createLanguageSwitcher;
    
    console.log('✅ Enhanced fallback registration complete');
    console.log('✅ All features ready including line highlight and large file support');
}, 1000);