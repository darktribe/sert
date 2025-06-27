/*
 * =====================================================
 * Sert Editor - 検索・置換機能（大文字小文字区別対応）
 * 修正版：正規表現の行の開始・終了、キャプチャグループ、エラーハンドリングを修正
 * =====================================================
 */

import { 
    editor, 
    isModified, 
    setIsModified,
    currentContent, 
    setCurrentContent,
    undoStack,
    redoStack,
    maxUndoStackSize
} from './globals.js';
import { saveToUndoStack } from './undo-redo.js';
import { closeAllMenus } from './menu-controller.js';
import { updateLineNumbers, updateStatus } from './ui-updater.js';

// 検索状態管理
let searchState = {
    searchText: '',
    replaceText: '',
    isRegex: false,
    isCaseSensitive: false, // 追加：大文字小文字を区別するかのフラグ
    matches: [],
    currentMatchIndex: -1,
    lastSearchText: '',
    isSearchDialogOpen: false,
    isReplaceDialogOpen: false
};

/**
 * 検索ダイアログを表示
 */
export function showSearchDialog() {
    console.log('🔍 Opening search dialog');
    closeAllMenus();
    
    if (searchState.isSearchDialogOpen || searchState.isReplaceDialogOpen) {
        console.log('Dialog already open, ignoring');
        return;
    }
    
    searchState.isSearchDialogOpen = true;
    createSearchDialog();
}

/**
 * 置換ダイアログを表示
 */
export function showReplaceDialog() {
    console.log('🔄 Opening replace dialog');
    closeAllMenus();
    
    if (searchState.isSearchDialogOpen || searchState.isReplaceDialogOpen) {
        console.log('Dialog already open, ignoring');
        return;
    }
    
    searchState.isReplaceDialogOpen = true;
    createReplaceDialog();
}

/**
 * 次の検索結果へ移動
 */
export function findNext() {
    if (searchState.matches.length === 0) {
        console.log('No search results available');
        return;
    }
    
    searchState.currentMatchIndex = (searchState.currentMatchIndex + 1) % searchState.matches.length;
    highlightCurrentMatch();
    updateResultDisplay();
    closeAllMenus();
}

/**
 * 前の検索結果へ移動
 */
export function findPrevious() {
    if (searchState.matches.length === 0) {
        console.log('No search results available');
        return;
    }
    
    searchState.currentMatchIndex = searchState.currentMatchIndex <= 0 
        ? searchState.matches.length - 1 
        : searchState.currentMatchIndex - 1;
    highlightCurrentMatch();
    updateResultDisplay();
    closeAllMenus();
}

/**
 * 検索ダイアログの作成
 */
function createSearchDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'search-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog';
    
    dialog.innerHTML = `
        <div class="search-dialog-header">検索</div>
        <div class="search-dialog-content">
            <div class="search-input-group">
                <label for="search-text-input">検索文字:</label>
                <input type="text" id="search-text-input" class="search-input" placeholder="検索する文字列を入力" value="${searchState.searchText}">
            </div>
            
            <div class="search-checkbox-group">
                <label class="search-checkbox-label">
                    <input type="checkbox" id="search-regex-checkbox" ${searchState.isRegex ? 'checked' : ''}>
                    正規表現
                </label>
                <label class="search-checkbox-label">
                    <input type="checkbox" id="search-case-checkbox" ${searchState.isCaseSensitive ? 'checked' : ''}>
                    大文字小文字を区別
                </label>
            </div>
            
            <div class="search-result-display" id="search-result-display">
                結果: 0件
            </div>
            
            <div class="search-button-group">
                <button id="search-search-btn" class="search-button search-button-primary">検索</button>
                <button id="search-next-btn" class="search-button" disabled>次へ</button>
                <button id="search-prev-btn" class="search-button" disabled>前へ</button>
                <button id="search-clear-btn" class="search-button">クリア</button>
                <button id="search-close-btn" class="search-button search-button-cancel">閉じる</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    setupSearchDialogEvents(dialogOverlay);
    
    // 検索文字にフォーカスを設定
    setTimeout(() => {
        const searchInput = document.getElementById('search-text-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }, 100);
}

/**
 * 置換ダイアログの作成
 */
function createReplaceDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'replace-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog replace-dialog';
    
    dialog.innerHTML = `
        <div class="search-dialog-header">置換</div>
        <div class="search-dialog-content">
            <div class="search-input-group">
                <label for="replace-search-input">置換するテキスト:</label>
                <input type="text" id="replace-search-input" class="search-input" placeholder="置換するテキストを入力" value="${searchState.searchText}">
            </div>
            
            <div class="search-input-group">
                <label for="replace-replace-input">置換後のテキスト:</label>
                <input type="text" id="replace-replace-input" class="search-input" placeholder="置換後のテキストを入力" value="${searchState.replaceText}">
            </div>
            
            <div class="search-checkbox-group">
                <label class="search-checkbox-label">
                    <input type="checkbox" id="replace-regex-checkbox" ${searchState.isRegex ? 'checked' : ''}>
                    正規表現
                </label>
                <label class="search-checkbox-label">
                    <input type="checkbox" id="replace-case-checkbox" ${searchState.isCaseSensitive ? 'checked' : ''}>
                    大文字小文字を区別
                </label>
            </div>
            
            <div class="search-result-display" id="replace-result-display">
                結果: 0件
            </div>
            
            <div class="search-button-group">
                <button id="replace-search-btn" class="search-button search-button-primary">検索</button>
                <button id="replace-replace-btn" class="search-button search-button-warning" disabled>置換</button>
                <button id="replace-next-btn" class="search-button" disabled>次へ</button>
                <button id="replace-prev-btn" class="search-button" disabled>前へ</button>
                <button id="replace-all-btn" class="search-button search-button-danger" disabled>すべて置換</button>
                <button id="replace-clear-btn" class="search-button">クリア</button>
                <button id="replace-close-btn" class="search-button search-button-cancel">閉じる</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    setupReplaceDialogEvents(dialogOverlay);
    
    // 検索文字にフォーカスを設定
    setTimeout(() => {
        const searchInput = document.getElementById('replace-search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }, 100);
}

/**
 * 検索ダイアログのイベント設定
 */
function setupSearchDialogEvents(dialogOverlay) {
    const searchInput = document.getElementById('search-text-input');
    const regexCheckbox = document.getElementById('search-regex-checkbox');
    const caseCheckbox = document.getElementById('search-case-checkbox'); // 追加
    const searchBtn = document.getElementById('search-search-btn');
    const nextBtn = document.getElementById('search-next-btn');
    const prevBtn = document.getElementById('search-prev-btn');
    const clearBtn = document.getElementById('search-clear-btn');
    const closeBtn = document.getElementById('search-close-btn');
    
    // 検索ボタン
    searchBtn.addEventListener('click', () => performSearch());
    
    // 次へ・前へボタン
    nextBtn.addEventListener('click', () => findNext());
    prevBtn.addEventListener('click', () => findPrevious());
    
    // クリアボタン
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        regexCheckbox.checked = false;
        caseCheckbox.checked = false; // 追加
        clearSearch();
        updateSearchResultDisplay('search-result-display', 0, -1);
        updateSearchButtons('search', false);
        searchInput.focus();
    });
    
    // 閉じるボタン
    closeBtn.addEventListener('click', () => closeSearchDialog(dialogOverlay));
    
    // Enterキーで検索実行
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeSearchDialog(dialogOverlay);
        }
    });
    
    // オーバーレイクリックで閉じる
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeSearchDialog(dialogOverlay);
        }
    });
    
    // 検索実行関数
    function performSearch() {
        const searchText = searchInput.value.trim();
        const isRegex = regexCheckbox.checked;
        const isCaseSensitive = caseCheckbox.checked; // 追加
        
        if (!searchText) {
            showMessage('検索する文字列を入力して下さい');
            return;
        }
        
        searchState.searchText = searchText;
        searchState.isRegex = isRegex;
        searchState.isCaseSensitive = isCaseSensitive; // 追加
        
        const result = executeSearch(searchText, isRegex, isCaseSensitive); // 引数追加
        
        if (result.success) {
            if (result.matchCount === 0) {
                showMessage('検索結果：0件');
            } else {
                updateSearchButtons('search', true);
            }
        }
        // エラーの場合は executeSearch 内で showMessage が呼ばれる
    }
}

/**
 * 置換ダイアログのイベント設定
 */
function setupReplaceDialogEvents(dialogOverlay) {
    const searchInput = document.getElementById('replace-search-input');
    const replaceInput = document.getElementById('replace-replace-input');
    const regexCheckbox = document.getElementById('replace-regex-checkbox');
    const caseCheckbox = document.getElementById('replace-case-checkbox'); // 追加
    const searchBtn = document.getElementById('replace-search-btn');
    const replaceBtn = document.getElementById('replace-replace-btn');
    const nextBtn = document.getElementById('replace-next-btn');
    const prevBtn = document.getElementById('replace-prev-btn');
    const replaceAllBtn = document.getElementById('replace-all-btn');
    const clearBtn = document.getElementById('replace-clear-btn');
    const closeBtn = document.getElementById('replace-close-btn');
    
    // 検索ボタン
    searchBtn.addEventListener('click', () => performReplaceSearch());
    
    // 置換ボタン
    replaceBtn.addEventListener('click', () => performSingleReplace());
    
    // 次へ・前へボタン
    nextBtn.addEventListener('click', () => findNext());
    prevBtn.addEventListener('click', () => findPrevious());
    
    // すべて置換ボタン
    replaceAllBtn.addEventListener('click', () => performReplaceAll());
    
    // クリアボタン
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        replaceInput.value = '';
        regexCheckbox.checked = false;
        caseCheckbox.checked = false; // 追加
        clearSearch();
        updateSearchResultDisplay('replace-result-display', 0, -1);
        updateSearchButtons('replace', false);
        searchInput.focus();
    });
    
    // 閉じるボタン
    closeBtn.addEventListener('click', () => closeReplaceDialog(dialogOverlay));
    
    // Enterキーで検索実行
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performReplaceSearch();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeReplaceDialog(dialogOverlay);
        }
    });
    
    replaceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performReplaceSearch();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeReplaceDialog(dialogOverlay);
        }
    });
    
    // オーバーレイクリックで閉じる
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeReplaceDialog(dialogOverlay);
        }
    });
    
    // 検索実行関数
    function performReplaceSearch() {
        const searchText = searchInput.value.trim();
        const replaceText = replaceInput.value;
        const isRegex = regexCheckbox.checked;
        const isCaseSensitive = caseCheckbox.checked; // 追加
        
        if (!searchText || replaceText === '') {
            showMessage('置換するテキストと置換後のテキストを入力して下さい');
            return;
        }
        
        searchState.searchText = searchText;
        searchState.replaceText = replaceText;
        searchState.isRegex = isRegex;
        searchState.isCaseSensitive = isCaseSensitive; // 追加
        
        const result = executeSearch(searchText, isRegex, isCaseSensitive); // 引数追加
        
        if (result.success) {
            if (result.matchCount === 0) {
                showMessage('検索結果：0件');
            } else {
                updateSearchButtons('replace', true);
            }
        }
        // エラーの場合は executeSearch 内で showMessage が呼ばれる
    }
    
    // 単一置換実行
    function performSingleReplace() {
        if (searchState.currentMatchIndex === -1 || searchState.matches.length === 0) {
            showMessage('置換する対象が選択されていません。次へ・前へで選択して下さい');
            return;
        }
        
        performReplace();
    }
    
    // 全置換実行
    function performReplaceAll() {
        if (searchState.matches.length === 0) {
            showMessage('置換する対象がありません');
            return;
        }
        
        const replaceCount = performReplaceAllMatches();
        showMessage(`全${replaceCount}件を置換しました`);
    }
}

/**
 * 検索を実行（大文字小文字区別対応、正規表現修正版）
 */
function executeSearch(searchText, isRegex, isCaseSensitive) {
    try {
        clearSearch();
        
        const content = editor.value;
        searchState.matches = [];
        
        if (isRegex) {
            // 正規表現検索：大文字小文字区別フラグ + 複数行フラグ（^$対応）
            const flags = isCaseSensitive ? 'gm' : 'gim';
            const regex = new RegExp(searchText, flags);
            let match;
            while ((match = regex.exec(content)) !== null) {
                searchState.matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    fullMatch: match // キャプチャグループ用に完全なマッチ情報を保存
                });
                
                // 無限ループ防止
                if (match[0].length === 0) {
                    regex.lastIndex++;
                }
            }
        } else {
            // 通常検索：大文字小文字区別フラグに応じて処理を分ける
            let searchTarget, contentTarget;
            
            if (isCaseSensitive) {
                // 大文字小文字を区別する場合：そのまま検索
                searchTarget = searchText;
                contentTarget = content;
            } else {
                // 大文字小文字を区別しない場合：小文字に変換して検索
                searchTarget = searchText.toLowerCase();
                contentTarget = content.toLowerCase();
            }
            
            let index = 0;
            while ((index = contentTarget.indexOf(searchTarget, index)) !== -1) {
                searchState.matches.push({
                    start: index,
                    end: index + searchText.length,
                    text: content.substring(index, index + searchText.length),
                    fullMatch: null // 通常検索ではキャプチャグループなし
                });
                index++;
            }
        }
        
        const matchCount = searchState.matches.length;
        
        if (matchCount > 0) {
            searchState.currentMatchIndex = 0;
            highlightCurrentMatch();
        }
        
        updateResultDisplay();
        
        return { success: true, matchCount: matchCount };
        
    } catch (error) {
        console.error('Search error:', error);
        // エラーメッセージを表示する前に検索状態をクリア
        clearSearch();
        updateResultDisplay();
        
        // エラーメッセージを表示
        setTimeout(() => {
            showMessage('正規表現に問題があります。正規表現でなくその文字自体を検索したい場合、正規表現のチェックを外して下さい。');
        }, 100);
        
        return { success: false, matchCount: 0 };
    }
}

/**
 * 現在の一致をハイライト
 */
function highlightCurrentMatch() {
    if (searchState.currentMatchIndex >= 0 && searchState.currentMatchIndex < searchState.matches.length) {
        const match = searchState.matches[searchState.currentMatchIndex];
        editor.setSelectionRange(match.start, match.end);
        editor.focus();
        
        // スクロールして表示
        const lineHeight = parseInt(getComputedStyle(editor).lineHeight);
        const editorRect = editor.getBoundingClientRect();
        const textBeforeMatch = editor.value.substring(0, match.start);
        const lineNumber = textBeforeMatch.split('\n').length;
        const scrollTop = (lineNumber - 1) * lineHeight - editorRect.height / 2;
        
        editor.scrollTop = Math.max(0, scrollTop);
    }
}

/**
 * 結果表示を更新
 */
function updateResultDisplay() {
    const matchCount = searchState.matches.length;
    const currentIndex = searchState.currentMatchIndex;
    
    if (searchState.isSearchDialogOpen) {
        updateSearchResultDisplay('search-result-display', matchCount, currentIndex);
    }
    
    if (searchState.isReplaceDialogOpen) {
        updateSearchResultDisplay('replace-result-display', matchCount, currentIndex);
    }
}

/**
 * 検索結果表示を更新
 */
function updateSearchResultDisplay(elementId, matchCount, currentIndex) {
    const resultDisplay = document.getElementById(elementId);
    if (!resultDisplay) return;
    
    if (matchCount === 0) {
        resultDisplay.textContent = '結果: 0件';
    } else {
        resultDisplay.textContent = `結果: ${matchCount}件 ${currentIndex + 1}/${matchCount}`;
    }
}

/**
 * 検索ボタンの状態を更新
 */
function updateSearchButtons(dialogType, hasResults) {
    const prefix = dialogType === 'search' ? 'search' : 'replace';
    
    const nextBtn = document.getElementById(`${prefix}-next-btn`);
    const prevBtn = document.getElementById(`${prefix}-prev-btn`);
    
    if (nextBtn) nextBtn.disabled = !hasResults;
    if (prevBtn) prevBtn.disabled = !hasResults;
    
    if (dialogType === 'replace') {
        const replaceBtn = document.getElementById('replace-replace-btn');
        const replaceAllBtn = document.getElementById('replace-all-btn');
        
        if (replaceBtn) replaceBtn.disabled = !hasResults;
        if (replaceAllBtn) replaceAllBtn.disabled = !hasResults;
    }
}

/**
 * 単一置換を実行（正規表現キャプチャグループ対応）
 */
function performReplace() {
    if (searchState.currentMatchIndex === -1 || searchState.matches.length === 0) {
        return;
    }
    
    // アンドゥ用に現在の状態を保存
    saveToUndoStack();
    
    const match = searchState.matches[searchState.currentMatchIndex];
    const content = editor.value;
    let newContent;
    
    if (searchState.isRegex && match.fullMatch) {
        // 正規表現の場合：キャプチャグループを展開して置換
        const matchText = match.text;
        let replacementText = searchState.replaceText;
        
        // $1, $2, ... を対応するキャプチャグループで置換
        if (match.fullMatch.length > 1) {
            for (let i = 1; i < match.fullMatch.length; i++) {
                const captureGroup = match.fullMatch[i] || '';
                replacementText = replacementText.replace(new RegExp('\\$' + i, 'g'), captureGroup);
            }
        }
        
        // $0 は全体のマッチで置換
        replacementText = replacementText.replace(/\$0/g, matchText);
        
        newContent = content.substring(0, match.start) + 
                    replacementText + 
                    content.substring(match.end);
    } else {
        // 通常の置換
        newContent = content.substring(0, match.start) + 
                    searchState.replaceText + 
                    content.substring(match.end);
    }
    
    editor.value = newContent;
    setCurrentContent(newContent);
    
    if (!isModified) {
        setIsModified(true);
    }
    
    // リドゥスタックをクリア
    redoStack.length = 0;
    
    updateLineNumbers();
    updateStatus();
    
    // 置換後に再検索
    const result = executeSearch(searchState.searchText, searchState.isRegex, searchState.isCaseSensitive);
    updateSearchButtons('replace', result.success && result.matchCount > 0);
}

/**
 * 全置換を実行（正規表現キャプチャグループ対応）
 */
function performReplaceAllMatches() {
    if (searchState.matches.length === 0) {
        return 0;
    }
    
    // アンドゥ用に現在の状態を保存
    saveToUndoStack();
    
    const content = editor.value;
    let newContent = content;
    let replaceCount = 0;
    
    if (searchState.isRegex) {
        // 正規表現の場合：String.replace()でキャプチャグループを活用
        try {
            const flags = searchState.isCaseSensitive ? 'gm' : 'gim';
            const regex = new RegExp(searchState.searchText, flags);
            
            newContent = content.replace(regex, searchState.replaceText);
            
            // 置換回数を計算（元のマッチ数を使用）
            replaceCount = searchState.matches.length;
        } catch (error) {
            console.error('Replace all error:', error);
            showMessage('正規表現に問題があります。正規表現でなくその文字自体を検索したい場合、正規表現のチェックを外して下さい。');
            return 0;
        }
    } else {
        // 通常検索の場合：後ろから置換して位置がずれないようにする
        for (let i = searchState.matches.length - 1; i >= 0; i--) {
            const match = searchState.matches[i];
            newContent = newContent.substring(0, match.start) + 
                        searchState.replaceText + 
                        newContent.substring(match.end);
            replaceCount++;
        }
    }
    
    editor.value = newContent;
    setCurrentContent(newContent);
    
    if (!isModified) {
        setIsModified(true);
    }
    
    // リドゥスタックをクリア
    redoStack.length = 0;
    
    updateLineNumbers();
    updateStatus();
    
    // 置換後に再検索
    clearSearch();
    const result = executeSearch(searchState.searchText, searchState.isRegex, searchState.isCaseSensitive);
    updateSearchButtons('replace', result.success && result.matchCount > 0);
    
    return replaceCount;
}

/**
 * 検索をクリア
 */
function clearSearch() {
    searchState.matches = [];
    searchState.currentMatchIndex = -1;
}

/**
 * 検索ダイアログを閉じる
 */
function closeSearchDialog(dialogOverlay) {
    clearSearch();
    searchState.isSearchDialogOpen = false;
    document.body.removeChild(dialogOverlay);
    
    setTimeout(() => {
        if (editor && editor.focus) {
            editor.focus();
        }
    }, 100);
}

/**
 * 置換ダイアログを閉じる
 */
function closeReplaceDialog(dialogOverlay) {
    clearSearch();
    searchState.isReplaceDialogOpen = false;
    document.body.removeChild(dialogOverlay);
    
    setTimeout(() => {
        if (editor && editor.focus) {
            editor.focus();
        }
    }, 100);
}

/**
 * メッセージダイアログを表示（修正版：重複表示防止）
 */
function showMessage(message) {
    // 既存のメッセージダイアログがあれば削除
    const existingDialog = document.querySelector('.message-dialog-overlay');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    return new Promise((resolve) => {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'search-dialog-overlay message-dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'search-dialog message-dialog';
        
        dialog.innerHTML = `
            <div class="search-dialog-header">メッセージ</div>
            <div class="search-dialog-content">
                <div class="message-text">${message}</div>
                <div class="search-button-group">
                    <button id="message-ok-btn" class="search-button search-button-primary">OK</button>
                </div>
            </div>
        `;
        
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        const okBtn = document.getElementById('message-ok-btn');
        
        function closeMessageDialog() {
            try {
                document.body.removeChild(dialogOverlay);
            } catch (e) {
                // ダイアログが既に削除されている場合のエラーを無視
            }
            document.removeEventListener('keydown', handleMessageKeyDown);
            resolve();
        }
        
        okBtn.addEventListener('click', closeMessageDialog);
        
        // Enterキーでも閉じる
        function handleMessageKeyDown(e) {
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                closeMessageDialog();
            }
        }
        
        document.addEventListener('keydown', handleMessageKeyDown);
        
        setTimeout(() => okBtn.focus(), 100);
    });
}