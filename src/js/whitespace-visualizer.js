/*
 * =====================================================
 * Vinsert Editor - 空白文字可視化機能（完全版）
 * =====================================================
 */

import { 
    editor, 
    whitespaceVisualization, 
    setWhitespaceVisualization 
} from './globals.js';
import { closeAllMenus } from './menu-controller.js';
import { t } from './locales.js';

// 可視化マーカーのコンテナ
let markersContainer = null;
let updateScheduled = false;

// デバッグモード
const DEBUG_MODE = false;

/**
 * 空白文字可視化のオン・オフを切り替える
 */
export function toggleWhitespaceVisualization() {
    const newState = !whitespaceVisualization.enabled;
    setWhitespaceVisualization({ enabled: newState });
    
    console.log(`👁️ Whitespace visualization ${newState ? 'enabled' : 'disabled'}`);
    
    // メニューアイテムのチェック状態を更新
    updateWhitespaceVisualizationMenuState(newState);
    
    if (!newState) {
        // 可視化を無効にした場合は、既存のマーカーを削除
        removeAllMarkers();
    } else {
        // 可視化を有効にした場合は、マーカーを表示
        setTimeout(() => {
            updateWhitespaceMarkers();
        }, 100);
    }
    
    closeAllMenus();
}

/**
 * メニューアイテムのチェック状態を更新
 */
export function updateWhitespaceVisualizationMenuState(enabled) {
    const menuOption = document.getElementById('whitespace-visualization-menu-option');
    if (menuOption) {
        const checkmark = menuOption.querySelector('.menu-checkmark');
        if (checkmark) {
            checkmark.style.visibility = enabled ? 'visible' : 'hidden';
        }
    }
}

/**
 * 空白文字可視化設定を初期化
 */
export function initializeWhitespaceVisualization() {
    console.log('👁️ Initializing whitespace visualization...');
    
    // マーカーコンテナを作成
    createMarkersContainer();
    
    // メニューの初期状態を設定
    updateWhitespaceVisualizationMenuState(whitespaceVisualization.enabled);
    
    // 可視化が有効な場合は初期マーカーを設定
    if (whitespaceVisualization.enabled) {
        setTimeout(() => {
            updateWhitespaceMarkers();
        }, 200);
    }
    
    console.log('✅ Whitespace visualization initialized:', whitespaceVisualization);
}

/**
 * マーカーコンテナを作成
 */
function createMarkersContainer() {
    // 既存のコンテナがあれば削除
    if (markersContainer) {
        markersContainer.remove();
        markersContainer = null;
    }
    
    const editorContainer = document.querySelector('.editor-container');
    if (!editorContainer) {
        console.error('❌ Editor container not found for whitespace markers');
        return;
    }
    
    markersContainer = document.createElement('div');
    markersContainer.className = 'whitespace-markers-container';
    markersContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 5;
        overflow: hidden;
    `;
    
    editorContainer.appendChild(markersContainer);
    console.log('✅ Whitespace markers container created');
}

/**
 * すべてのマーカーを削除
 */
function removeAllMarkers() {
    if (markersContainer) {
        markersContainer.innerHTML = '';
    }
}

/**
 * 空白文字マーカーを更新
 */
export function updateWhitespaceMarkers() {
    // 可視化が無効な場合は何もしない
    if (!whitespaceVisualization.enabled || !editor || !markersContainer) {
        return;
    }
    
    // 重複する更新リクエストを防ぐ
    if (updateScheduled) {
        return;
    }
    
    updateScheduled = true;
    
    // 次のフレームで実行
    requestAnimationFrame(() => {
        try {
            performWhitespaceMarkersUpdate();
        } catch (error) {
            console.error('❌ Error updating whitespace markers:', error);
        } finally {
            updateScheduled = false;
        }
    });
}

/**
 * 実際のマーカー更新処理
 */
function performWhitespaceMarkersUpdate() {
    // 既存のマーカーをクリア
    removeAllMarkers();
    
    const content = editor.value;
    if (!content) {
        return;
    }
    
    try {
        if (DEBUG_MODE) console.log('👁️ Starting whitespace markers update');
        
        // エディタのスタイル情報を取得
        const computedStyle = window.getComputedStyle(editor);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        
        // タイプライターモードの検出と実際のpadding値を取得
        const isTypewriterMode = editor.style.paddingTop && parseFloat(editor.style.paddingTop) > 20;
        const actualPaddingTop = parseFloat(editor.style.paddingTop) || parseFloat(computedStyle.paddingTop);
        
        // 行番号エリアの幅を取得
        const lineNumbers = document.getElementById('line-numbers');
        const lineNumbersWidth = lineNumbers ? lineNumbers.offsetWidth : 0;
        
        // スクロール位置を取得
        const scrollTop = editor.scrollTop;
        const scrollLeft = editor.scrollLeft;
        
        // 行ごとに処理
        const lines = content.split('\n');
        
        if (DEBUG_MODE) console.log(`👁️ Processing ${lines.length} lines, typewriter mode: ${isTypewriterMode}`);
        
        let currentTop = actualPaddingTop;
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            // 行の高さを計算（折り返しを考慮）
            const lineDisplayHeight = calculateLineDisplayHeight(line);
            
            // 表示位置を計算
            const displayY = currentTop - scrollTop;
            
            if (DEBUG_MODE) console.log(`👁️ Line ${lineIndex}: top=${currentTop}, displayY=${displayY}, height=${lineDisplayHeight}`);
            
            // 表示範囲の判定（少し余裕を持たせる）
            if (displayY > -lineDisplayHeight && displayY < editor.clientHeight + lineDisplayHeight) {
                // 行内の文字を処理
                processLineCharacters(line, lineIndex, displayY, lineDisplayHeight, lineNumbersWidth, paddingLeft, scrollLeft);
            }
            
            currentTop += lineDisplayHeight;
        }
        
        if (DEBUG_MODE) console.log('👁️ Whitespace markers update completed');
        
    } catch (error) {
        console.error('❌ Error in performWhitespaceMarkersUpdate:', error);
        removeAllMarkers();
    }
}

/**
 * 行の表示高さを計算（折り返しを考慮）
 */
function calculateLineDisplayHeight(line) {
    if (!line || line.length === 0) {
        // 空行の場合は標準の行高さ
        const computedStyle = window.getComputedStyle(editor);
        return parseFloat(computedStyle.lineHeight);
    }
    
    try {
        // 測定用要素を作成
        const measurer = document.createElement('div');
        const computedStyle = window.getComputedStyle(editor);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
            padding: 0;
            margin: 0;
            border: none;
            width: ${editorWidth}px;
        `;
        
        document.body.appendChild(measurer);
        measurer.textContent = line;
        const height = measurer.offsetHeight;
        document.body.removeChild(measurer);
        
        return Math.max(height, parseFloat(computedStyle.lineHeight));
        
    } catch (error) {
        console.warn('⚠️ Line height calculation failed:', error);
        const computedStyle = window.getComputedStyle(editor);
        return parseFloat(computedStyle.lineHeight);
    }
}

/**
 * 行内の文字を処理して空白文字マーカーを作成
 */
function processLineCharacters(line, lineIndex, displayY, lineHeight, lineNumbersWidth, paddingLeft, scrollLeft) {
    let currentX = 0; // 行内での現在のX位置
    
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        let markerType = null;
        let charWidth = 0;
        
        // 空白文字の種類を判定
        if (char === '\u3000' && whitespaceVisualization.showFullWidthSpace) {
            // 全角スペース
            markerType = 'fullwidth-space';
            charWidth = measureCharacterWidth('\u3000');
        } else if (char === ' ' && whitespaceVisualization.showHalfWidthSpace) {
            // 半角スペース
            markerType = 'halfwidth-space';
            charWidth = measureCharacterWidth(' ');
        } else if (char === '\t' && whitespaceVisualization.showTab) {
            // タブ文字
            markerType = 'tab';
            charWidth = calculateTabWidth(currentX);
        } else {
            // 通常の文字の幅を加算
            charWidth = measureCharacterWidth(char);
        }
        
        // マーカーを作成
        if (markerType) {
            const markerX = paddingLeft + lineNumbersWidth + currentX - scrollLeft;
            const markerY = displayY;
            
            // 画面内に表示される範囲のみマーカーを作成
            if (markerX > -100 && markerX < editor.clientWidth + 100) {
                createWhitespaceMarker(markerType, markerX, markerY, charWidth, lineHeight);
                if (DEBUG_MODE) console.log(`👁️ Created marker ${markerType} at line ${lineIndex}, x=${markerX}, y=${markerY}, width=${charWidth}`);
            }
        }
        
        // 次の文字位置へ移動
        currentX += charWidth;
    }
}

/*
 * =====================================================
 * Vinsert Editor - 空白文字可視化機能（完全版）
 * =====================================================
 */

import { 
    editor, 
    whitespaceVisualization, 
    setWhitespaceVisualization 
} from './globals.js';
import { closeAllMenus } from './menu-controller.js';
import { t } from './locales.js';

// 可視化マーカーのコンテナ
let markersContainer = null;
let updateScheduled = false;

// デバッグモード
const DEBUG_MODE = false;

/**
 * 空白文字可視化のオン・オフを切り替える
 */
export function toggleWhitespaceVisualization() {
    const newState = !whitespaceVisualization.enabled;
    setWhitespaceVisualization({ enabled: newState });
    
    console.log(`👁️ Whitespace visualization ${newState ? 'enabled' : 'disabled'}`);
    
    // メニューアイテムのチェック状態を更新
    updateWhitespaceVisualizationMenuState(newState);
    
    if (!newState) {
        // 可視化を無効にした場合は、既存のマーカーを削除
        removeAllMarkers();
    } else {
        // 可視化を有効にした場合は、マーカーを表示
        setTimeout(() => {
            updateWhitespaceMarkers();
        }, 100);
    }
    
    closeAllMenus();
}

/**
 * メニューアイテムのチェック状態を更新
 */
export function updateWhitespaceVisualizationMenuState(enabled) {
    const menuOption = document.getElementById('whitespace-visualization-menu-option');
    if (menuOption) {
        const checkmark = menuOption.querySelector('.menu-checkmark');
        if (checkmark) {
            checkmark.style.visibility = enabled ? 'visible' : 'hidden';
        }
    }
}

/**
 * 空白文字可視化設定を初期化
 */
export function initializeWhitespaceVisualization() {
    console.log('👁️ Initializing whitespace visualization...');
    
    // マーカーコンテナを作成
    createMarkersContainer();
    
    // メニューの初期状態を設定
    updateWhitespaceVisualizationMenuState(whitespaceVisualization.enabled);
    
    // 可視化が有効な場合は初期マーカーを設定
    if (whitespaceVisualization.enabled) {
        setTimeout(() => {
            updateWhitespaceMarkers();
        }, 200);
    }
    
    console.log('✅ Whitespace visualization initialized:', whitespaceVisualization);
}

/**
 * マーカーコンテナを作成
 */
function createMarkersContainer() {
    // 既存のコンテナがあれば削除
    if (markersContainer) {
        markersContainer.remove();
        markersContainer = null;
    }
    
    const editorContainer = document.querySelector('.editor-container');
    if (!editorContainer) {
        console.error('❌ Editor container not found for whitespace markers');
        return;
    }
    
    markersContainer = document.createElement('div');
    markersContainer.className = 'whitespace-markers-container';
    markersContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 5;
        overflow: hidden;
    `;
    
    editorContainer.appendChild(markersContainer);
    console.log('✅ Whitespace markers container created');
}

/**
 * すべてのマーカーを削除
 */
function removeAllMarkers() {
    if (markersContainer) {
        markersContainer.innerHTML = '';
    }
}

/**
 * 空白文字マーカーを更新
 */
export function updateWhitespaceMarkers() {
    // 可視化が無効な場合は何もしない
    if (!whitespaceVisualization.enabled || !editor || !markersContainer) {
        return;
    }
    
    // 重複する更新リクエストを防ぐ
    if (updateScheduled) {
        return;
    }
    
    updateScheduled = true;
    
    // 次のフレームで実行
    requestAnimationFrame(() => {
        try {
            performWhitespaceMarkersUpdate();
        } catch (error) {
            console.error('❌ Error updating whitespace markers:', error);
        } finally {
            updateScheduled = false;
        }
    });
}

/**
 * 実際のマーカー更新処理
 */
function performWhitespaceMarkersUpdate() {
    // 既存のマーカーをクリア
    removeAllMarkers();
    
    const content = editor.value;
    if (!content) {
        return;
    }
    
    try {
        if (DEBUG_MODE) console.log('👁️ Starting whitespace markers update');
        
        // エディタのスタイル情報を取得
        const computedStyle = window.getComputedStyle(editor);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        
        // タイプライターモードの検出と実際のpadding値を取得
        const isTypewriterMode = editor.style.paddingTop && parseFloat(editor.style.paddingTop) > 20;
        const actualPaddingTop = parseFloat(editor.style.paddingTop) || parseFloat(computedStyle.paddingTop);
        
        // 行番号エリアの幅を取得
        const lineNumbers = document.getElementById('line-numbers');
        const lineNumbersWidth = lineNumbers ? lineNumbers.offsetWidth : 0;
        
        // スクロール位置を取得
        const scrollTop = editor.scrollTop;
        const scrollLeft = editor.scrollLeft;
        
        // 行ごとに処理
        const lines = content.split('\n');
        
        if (DEBUG_MODE) console.log(`👁️ Processing ${lines.length} lines, typewriter mode: ${isTypewriterMode}`);
        
        let currentTop = actualPaddingTop;
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            // 行の高さを計算（折り返しを考慮）
            const lineDisplayHeight = calculateLineDisplayHeight(line);
            
            // 表示位置を計算
            const displayY = currentTop - scrollTop;
            
            if (DEBUG_MODE) console.log(`👁️ Line ${lineIndex}: top=${currentTop}, displayY=${displayY}, height=${lineDisplayHeight}`);
            
            // 表示範囲の判定（少し余裕を持たせる）
            if (displayY > -lineDisplayHeight && displayY < editor.clientHeight + lineDisplayHeight) {
                // 行内の文字を処理
                processLineCharacters(line, lineIndex, displayY, lineDisplayHeight, lineNumbersWidth, paddingLeft, scrollLeft);
            }
            
            currentTop += lineDisplayHeight;
        }
        
        if (DEBUG_MODE) console.log('👁️ Whitespace markers update completed');
        
    } catch (error) {
        console.error('❌ Error in performWhitespaceMarkersUpdate:', error);
        removeAllMarkers();
    }
}

/**
 * 行の表示高さを計算（折り返しを考慮）
 */
function calculateLineDisplayHeight(line) {
    if (!line || line.length === 0) {
        // 空行の場合は標準の行高さ
        const computedStyle = window.getComputedStyle(editor);
        return parseFloat(computedStyle.lineHeight);
    }
    
    try {
        // 測定用要素を作成
        const measurer = document.createElement('div');
        const computedStyle = window.getComputedStyle(editor);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
            padding: 0;
            margin: 0;
            border: none;
            width: ${editorWidth}px;
        `;
        
        document.body.appendChild(measurer);
        measurer.textContent = line;
        const height = measurer.offsetHeight;
        document.body.removeChild(measurer);
        
        return Math.max(height, parseFloat(computedStyle.lineHeight));
        
    } catch (error) {
        console.warn('⚠️ Line height calculation failed:', error);
        const computedStyle = window.getComputedStyle(editor);
        return parseFloat(computedStyle.lineHeight);
    }
}

/**
 * 行内の文字を処理して空白文字マーカーを作成（実測版）
 */
function processLineCharacters(line, lineIndex, displayY, lineHeight, lineNumbersWidth, paddingLeft, scrollLeft) {
    let currentX = 0; // 行内での現在のX位置
    
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        let markerType = null;
        let charWidth = 0;
        
        // 空白文字の種類を判定
        if (char === '\u3000' && whitespaceVisualization.showFullWidthSpace) {
            // 全角スペース
            markerType = 'fullwidth-space';
            charWidth = measureCharacterWidthDirect('\u3000');
        } else if (char === ' ' && whitespaceVisualization.showHalfWidthSpace) {
            // 半角スペース
            markerType = 'halfwidth-space';
            charWidth = measureCharacterWidthDirect(' ');
        } else if (char === '\t' && whitespaceVisualization.showTab) {
            // タブ文字：行の実際のコンテキストを使用して実測
            markerType = 'tab';
            const textBeforeTab = line.substring(0, charIndex);
            charWidth = measureTabWidthInContext(textBeforeTab);
        } else {
            // 通常の文字の幅を加算
            charWidth = measureCharacterWidthDirect(char);
        }
        
        // マーカーを作成
        if (markerType) {
            const markerX = paddingLeft + lineNumbersWidth + currentX - scrollLeft;
            const markerY = displayY;
            
            // 画面内に表示される範囲のみマーカーを作成
            if (markerX > -100 && markerX < editor.clientWidth + 100) {
                createWhitespaceMarker(markerType, markerX, markerY, charWidth, lineHeight);
                if (DEBUG_MODE) console.log(`👁️ Created marker ${markerType} at line ${lineIndex}, x=${markerX}, y=${markerY}, width=${charWidth}`);
            }
        }
        
        // 次の文字位置へ移動
        currentX += charWidth;
    }
}

/**
 * 文字幅を正確に測定（エディタ完全準拠版）
 */
function measureCharacterWidthDirect(char) {
    try {
        const measurer = document.createElement('span');
        const computedStyle = window.getComputedStyle(editor);
        
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            white-space: pre;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
            letter-spacing: ${computedStyle.letterSpacing};
            word-spacing: ${computedStyle.wordSpacing};
            font-variant-numeric: ${computedStyle.fontVariantNumeric};
            font-weight: ${computedStyle.fontWeight};
            font-style: ${computedStyle.fontStyle};
            padding: 0;
            margin: 0;
            border: none;
        `;
        
        document.body.appendChild(measurer);
        measurer.textContent = char;
        const width = measurer.offsetWidth;
        document.body.removeChild(measurer);
        
        return Math.max(width, 1); // 最小1px
        
    } catch (error) {
        console.warn('⚠️ Character width measurement failed:', error);
        return 8; // フォールバック
    }
}

/**
 * 文字幅を測定（互換性のため残す）
 */
function measureCharacterWidth(char) {
    return measureCharacterWidthDirect(char);
}

/**
 * タブ文字の幅を実測で計算（エディタ完全準拠版）
 */
function calculateTabWidth(currentX) {
    try {
        // エディタと完全に同じ条件の測定用要素を作成
        const measurer = document.createElement('div');
        const computedStyle = window.getComputedStyle(editor);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            white-space: pre;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
            letter-spacing: ${computedStyle.letterSpacing};
            word-spacing: ${computedStyle.wordSpacing};
            font-variant-numeric: ${computedStyle.fontVariantNumeric};
            tab-size: ${computedStyle.tabSize};
            -moz-tab-size: ${computedStyle.tabSize};
            -webkit-tab-size: ${computedStyle.tabSize};
            -o-tab-size: ${computedStyle.tabSize};
            width: ${editorWidth}px;
            padding: 0;
            margin: 0;
            border: none;
        `;
        
        document.body.appendChild(measurer);
        
        // currentXに相当するテキストを作成（スペースで近似）
        const spaceWidth = measureCharacterWidthDirect(' ');
        const approximateChars = Math.floor(currentX / spaceWidth);
        const textBeforeTab = ' '.repeat(approximateChars);
        
        // タブを含まない場合の幅を測定
        measurer.textContent = textBeforeTab;
        const widthBefore = measurer.offsetWidth;
        
        // タブを含む場合の幅を測定
        measurer.textContent = textBeforeTab + '\t';
        const widthAfter = measurer.offsetWidth;
        
        document.body.removeChild(measurer);
        
        // タブの実際の幅
        const actualTabWidth = widthAfter - widthBefore;
        
        // 最小値として半角スペース幅を保証
        return Math.max(actualTabWidth, spaceWidth);
        
    } catch (error) {
        console.warn('⚠️ Tab width measurement failed:', error);
        
        // フォールバック: CSS tab-sizeベースの計算
        const spaceWidth = measureCharacterWidthDirect(' ');
        const tabSize = parseInt(getComputedStyle(editor).tabSize) || 4;
        return tabSize * spaceWidth;
    }
}

/**
 * より正確なタブ幅実測（行全体のコンテキストを使用）
 */
function measureTabWidthInContext(lineTextBeforeTab) {
    try {
        // エディタと完全に同じ条件の測定用要素を作成
        const measurer = document.createElement('div');
        const computedStyle = window.getComputedStyle(editor);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            white-space: pre;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
            letter-spacing: ${computedStyle.letterSpacing};
            word-spacing: ${computedStyle.wordSpacing};
            font-variant-numeric: ${computedStyle.fontVariantNumeric};
            tab-size: ${computedStyle.tabSize};
            -moz-tab-size: ${computedStyle.tabSize};
            -webkit-tab-size: ${computedStyle.tabSize};
            -o-tab-size: ${computedStyle.tabSize};
            width: ${editorWidth}px;
            padding: 0;
            margin: 0;
            border: none;
        `;
        
        document.body.appendChild(measurer);
        
        // 実際の行テキストでタブ前の幅を測定
        measurer.textContent = lineTextBeforeTab;
        const widthBefore = measurer.offsetWidth;
        
        // タブを追加した場合の幅を測定
        measurer.textContent = lineTextBeforeTab + '\t';
        const widthAfter = measurer.offsetWidth;
        
        document.body.removeChild(measurer);
        
        // タブの実際の幅
        const actualTabWidth = widthAfter - widthBefore;
        
        console.log(`📏 Tab measurement: text="${lineTextBeforeTab}", before=${widthBefore}px, after=${widthAfter}px, tabWidth=${actualTabWidth}px`);
        
        // 最小値として1pxを保証
        return Math.max(actualTabWidth, 1);
        
    } catch (error) {
        console.warn('⚠️ Tab width context measurement failed:', error);
        return 32; // フォールバック
    }
}

/**
 * 空白文字マーカーを作成
 */
function createWhitespaceMarker(type, x, y, width, height) {
    try {
        // 無効な値の検証
        if (!type || isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
            console.warn('⚠️ Invalid marker parameters:', { type, x, y, width, height });
            return;
        }
        
        // コンテナが存在しない場合はスキップ
        if (!markersContainer || !markersContainer.parentNode) {
            console.warn('⚠️ Markers container not available');
            return;
        }
        
        const marker = document.createElement('div');
        marker.className = `whitespace-marker whitespace-marker-${type}`;
        
        // 基本スタイル
        marker.style.cssText = `
            position: absolute;
            left: ${Math.round(x)}px;
            top: ${Math.round(y)}px;
            width: ${Math.round(width)}px;
            height: ${Math.round(height)}px;
            pointer-events: none;
            z-index: 10;
            box-sizing: border-box;
        `;
        
        // マーカータイプ別のスタイル
        switch (type) {
            case 'fullwidth-space':
                // 全角スペース: 枠線と対角線
                marker.style.border = `1px solid ${whitespaceVisualization.colors.fullWidthSpace}`;
                marker.style.backgroundColor = 'transparent';
                
                // 対角線を追加
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                `;
                svg.setAttribute('viewBox', `0 0 ${Math.round(width)} ${Math.round(height)}`);
                
                const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line1.setAttribute('x1', '2');
                line1.setAttribute('y1', '2');
                line1.setAttribute('x2', (Math.round(width) - 2).toString());
                line1.setAttribute('y2', (Math.round(height) - 2).toString());
                line1.setAttribute('stroke', whitespaceVisualization.colors.fullWidthSpace);
                line1.setAttribute('stroke-width', '1');
                
                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', (Math.round(width) - 2).toString());
                line2.setAttribute('y1', '2');
                line2.setAttribute('x2', '2');
                line2.setAttribute('y2', (Math.round(height) - 2).toString());
                line2.setAttribute('stroke', whitespaceVisualization.colors.fullWidthSpace);
                line2.setAttribute('stroke-width', '1');
                
                svg.appendChild(line1);
                svg.appendChild(line2);
                marker.appendChild(svg);
                break;
                
            case 'halfwidth-space':
                // 半角スペース: 中央のドット
                marker.style.backgroundColor = 'transparent';
                
                const dot = document.createElement('div');
                dot.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 3px;
                    height: 3px;
                    background-color: ${whitespaceVisualization.colors.halfWidthSpace};
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                `;
                marker.appendChild(dot);
                break;
                
            case 'tab':
                // タブ文字: 矢印
                marker.style.backgroundColor = `${whitespaceVisualization.colors.tab}1A`; // 10%透明度
                marker.style.borderBottom = `1px solid ${whitespaceVisualization.colors.tab}80`; // 50%透明度
                
                const arrow = document.createElement('div');
                arrow.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 4px;
                    color: ${whitespaceVisualization.colors.tab};
                    font-size: ${Math.min(16, Math.max(10, Math.round(height * 0.6)))}px;
                    line-height: 1;
                    transform: translateY(-50%);
                    font-family: monospace;
                `;
                arrow.textContent = '→';
                marker.appendChild(arrow);
                break;
                
            default:
                console.warn('⚠️ Unknown marker type:', type);
                return;
        }
        
        markersContainer.appendChild(marker);
        
    } catch (error) {
        console.error('❌ Error creating whitespace marker:', error, { type, x, y, width, height });
    }
}

/**
 * スクロール時のマーカー更新
 */
export function updateWhitespaceMarkersOnScroll() {
    if (!whitespaceVisualization.enabled || !editor || !markersContainer) {
        return;
    }
    
    // スクロール時は即座に更新
    updateWhitespaceMarkers();
}

/**
 * 空白文字可視化設定ダイアログを表示
 */
export function showWhitespaceVisualizationDialog() {
    console.log('👁️ Opening whitespace visualization settings');
    closeAllMenus();
    
    // 既存のダイアログがあれば削除
    const existingDialog = document.getElementById('whitespace-dialog-overlay');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    createWhitespaceVisualizationDialog();
}

/**
 * 空白文字可視化設定ダイアログの作成
 */
function createWhitespaceVisualizationDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'whitespace-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay whitespace-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog whitespace-dialog';
    
    dialog.innerHTML = `
        <div class="search-dialog-header">${t('viewMenu.whitespaceSettings')}</div>
        <div class="search-dialog-content">
            <div class="whitespace-settings-section">
                <div class="search-checkbox-group">
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="ws-enable-checkbox" ${whitespaceVisualization.enabled ? 'checked' : ''}>
                        ${t('whitespace.enable')}
                    </label>
                </div>
                
                <div class="whitespace-color-settings">
                    <h4 style="margin: 16px 0 12px 0; color: #cccccc;">色設定 / Color Settings</h4>
                    
                    <div class="color-setting-group">
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">全角スペース:</label>
                                <input type="color" id="ws-fullwidth-color" value="${whitespaceVisualization.colors.fullWidthSpace}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-fullwidth-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-fullwidth-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-fullwidth-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">半角スペース:</label>
                                <input type="color" id="ws-halfwidth-color" value="${whitespaceVisualization.colors.halfWidthSpace}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-halfwidth-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-halfwidth-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-halfwidth-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">タブ:</label>
                                <input type="color" id="ws-tab-color" value="${whitespaceVisualization.colors.tab}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-tab-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-tab-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-tab-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="whitespace-preview-section">
                    <label style="display: block; margin: 16px 0 8px 0; color: #cccccc;">${t('fonts.preview')}</label>
                    <div class="whitespace-preview">
function example() {
    console.log('Hello');　// 全角スペース
	return 42;    // タブ + 半角スペース
}
                    </div>
                </div>
            </div>
            
            <div class="search-button-group">
                <button id="whitespace-apply-btn" class="search-button search-button-primary">${t('fonts.buttons.apply')}</button>
                <button id="whitespace-cancel-btn" class="search-button search-button-cancel">${t('fonts.buttons.cancel')}</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    setupWhitespaceVisualizationDialogEvents(dialogOverlay);
    
    // 有効/無効チェックボックスにフォーカス
    setTimeout(() => {
        const enableCheckbox = document.getElementById('ws-enable-checkbox');
        if (enableCheckbox) {
            enableCheckbox.focus();
        }
    }, 100);
}

/**
 * 空白文字可視化設定ダイアログのイベント設定
 */
function setupWhitespaceVisualizationDialogEvents(dialogOverlay) {
    const enableCheckbox = document.getElementById('ws-enable-checkbox');
    const applyBtn = document.getElementById('whitespace-apply-btn');
    const cancelBtn = document.getElementById('whitespace-cancel-btn');
    
    // 色設定要素を取得
    const fullwidthColorPicker = document.getElementById('ws-fullwidth-color');
    const halfwidthColorPicker = document.getElementById('ws-halfwidth-color');
    const tabColorPicker = document.getElementById('ws-tab-color');
    
    // RGB入力要素を取得
    const fullwidthRGB = {
        r: document.getElementById('ws-fullwidth-r'),
        g: document.getElementById('ws-fullwidth-g'),
        b: document.getElementById('ws-fullwidth-b')
    };
    const halfwidthRGB = {
        r: document.getElementById('ws-halfwidth-r'),
        g: document.getElementById('ws-halfwidth-g'),
        b: document.getElementById('ws-halfwidth-b')
    };
    const tabRGB = {
        r: document.getElementById('ws-tab-r'),
        g: document.getElementById('ws-tab-g'),
        b: document.getElementById('ws-tab-b')
    };
    
    // 一時的な設定を保存（キャンセル時の復元用）
    const originalSettings = { 
        ...whitespaceVisualization,
        colors: { ...whitespaceVisualization.colors }
    };
    
    // 色とRGB入力の初期化と連動設定
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    function setupColorSync(colorPicker, rgbInputs) {
        // 初期値設定
        const initialRgb = hexToRgb(colorPicker.value);
        if (initialRgb) {
            rgbInputs.r.value = initialRgb.r;
            rgbInputs.g.value = initialRgb.g;
            rgbInputs.b.value = initialRgb.b;
        }
        
        // カラーピッカーからRGB入力へ
        colorPicker.addEventListener('input', () => {
            const rgb = hexToRgb(colorPicker.value);
            if (rgb) {
                rgbInputs.r.value = rgb.r;
                rgbInputs.g.value = rgb.g;
                rgbInputs.b.value = rgb.b;
            }
        });
        
        // RGB入力からカラーピッカーへ
        [rgbInputs.r, rgbInputs.g, rgbInputs.b].forEach(input => {
            input.addEventListener('input', () => {
                const r = parseInt(rgbInputs.r.value) || 0;
                const g = parseInt(rgbInputs.g.value) || 0;
                const b = parseInt(rgbInputs.b.value) || 0;
                colorPicker.value = rgbToHex(
                    Math.max(0, Math.min(255, r)),
                    Math.max(0, Math.min(255, g)),
                    Math.max(0, Math.min(255, b))
                );
            });
        });
    }
    
    // 各色設定の連動を設定
    setupColorSync(fullwidthColorPicker, fullwidthRGB);
    setupColorSync(halfwidthColorPicker, halfwidthRGB);
    setupColorSync(tabColorPicker, tabRGB);
    
    // 適用ボタン
    applyBtn.addEventListener('click', () => {
        const newSettings = {
            enabled: enableCheckbox.checked,
            showFullWidthSpace: true,   // 常に有効
            showHalfWidthSpace: true,   // 常に有効  
            showTab: true,              // 常に有効
            colors: {
                fullWidthSpace: fullwidthColorPicker.value,
                halfWidthSpace: halfwidthColorPicker.value,
                tab: tabColorPicker.value
            }
        };
        
        setWhitespaceVisualization(newSettings);
        updateWhitespaceVisualizationMenuState(newSettings.enabled);
        
        // マーカーコンテナを再作成
        createMarkersContainer();
        
        if (newSettings.enabled) {
            setTimeout(() => {
                updateWhitespaceMarkers();
            }, 100);
        } else {
            removeAllMarkers();
        }
        
        closeWhitespaceVisualizationDialog(dialogOverlay);
        console.log('✅ Whitespace visualization settings applied:', newSettings);
    });
    
    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
        // 元の設定に戻す
        setWhitespaceVisualization(originalSettings);
        closeWhitespaceVisualizationDialog(dialogOverlay);
        console.log('❌ Whitespace visualization settings cancelled');
    });
    
    // ESCキーでキャンセル
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            setWhitespaceVisualization(originalSettings);
            closeWhitespaceVisualizationDialog(dialogOverlay);
        }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            setWhitespaceVisualization(originalSettings);
            closeWhitespaceVisualizationDialog(dialogOverlay);
        }
    });
    
    dialogOverlay.addEventListener('remove', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
}

/**
 * 空白文字可視化設定ダイアログを閉じる
 */
function closeWhitespaceVisualizationDialog(dialogOverlay) {
    try {
        document.body.removeChild(dialogOverlay);
        
        // エディタにフォーカスを戻す
        setTimeout(() => {
            if (editor && editor.focus) {
                editor.focus();
            }
        }, 100);
    } catch (error) {
        console.warn('⚠️ Error closing whitespace visualization dialog:', error);
    }
}

/*
 * =====================================================
 * Vinsert Editor - 空白文字可視化機能（完全版）
 * =====================================================
 *//*
 * =====================================================
 * Vinsert Editor - 空白文字可視化機能（完全修正版）
 * =====================================================
 */

import { 
    editor, 
    whitespaceVisualization, 
    setWhitespaceVisualization 
} from './globals.js';
import { closeAllMenus } from './menu-controller.js';
import { t } from './locales.js';

// 可視化マーカーのコンテナ
let markersContainer = null;
let updateScheduled = false;

// デバッグモード
const DEBUG_MODE = false;

/**
 * 空白文字可視化のオン・オフを切り替える
 */
export function toggleWhitespaceVisualization() {
    const newState = !whitespaceVisualization.enabled;
    setWhitespaceVisualization({ enabled: newState });
    
    console.log(`👁️ Whitespace visualization ${newState ? 'enabled' : 'disabled'}`);
    
    // メニューアイテムのチェック状態を更新
    updateWhitespaceVisualizationMenuState(newState);
    
    if (!newState) {
        // 可視化を無効にした場合は、既存のマーカーを削除
        removeAllMarkers();
    } else {
        // 可視化を有効にした場合は、マーカーを表示
        setTimeout(() => {
            updateWhitespaceMarkers();
        }, 100);
    }
    
    closeAllMenus();
}

/**
 * メニューアイテムのチェック状態を更新
 */
export function updateWhitespaceVisualizationMenuState(enabled) {
    const menuOption = document.getElementById('whitespace-visualization-menu-option');
    if (menuOption) {
        const checkmark = menuOption.querySelector('.menu-checkmark');
        if (checkmark) {
            checkmark.style.visibility = enabled ? 'visible' : 'hidden';
        }
    }
}

/**
 * 空白文字可視化設定を初期化
 */
export function initializeWhitespaceVisualization() {
    console.log('👁️ Initializing whitespace visualization...');
    
    // マーカーコンテナを作成
    createMarkersContainer();
    
    // メニューの初期状態を設定
    updateWhitespaceVisualizationMenuState(whitespaceVisualization.enabled);
    
    // 可視化が有効な場合は初期マーカーを設定
    if (whitespaceVisualization.enabled) {
        setTimeout(() => {
            updateWhitespaceMarkers();
        }, 200);
    }
    
    console.log('✅ Whitespace visualization initialized:', whitespaceVisualization);
}

/**
 * マーカーコンテナを作成
 */
function createMarkersContainer() {
    // 既存のコンテナがあれば削除
    if (markersContainer) {
        markersContainer.remove();
        markersContainer = null;
    }
    
    const editorContainer = document.querySelector('.editor-container');
    if (!editorContainer) {
        console.error('❌ Editor container not found for whitespace markers');
        return;
    }
    
    markersContainer = document.createElement('div');
    markersContainer.className = 'whitespace-markers-container';
    markersContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 5;
        overflow: hidden;
    `;
    
    editorContainer.appendChild(markersContainer);
    console.log('✅ Whitespace markers container created');
}

/**
 * すべてのマーカーを削除
 */
function removeAllMarkers() {
    if (markersContainer) {
        markersContainer.innerHTML = '';
    }
}

/**
 * 空白文字マーカーを更新
 */
export function updateWhitespaceMarkers() {
    // 可視化が無効な場合は何もしない
    if (!whitespaceVisualization.enabled || !editor || !markersContainer) {
        return;
    }
    
    // 重複する更新リクエストを防ぐ
    if (updateScheduled) {
        return;
    }
    
    updateScheduled = true;
    
    // 次のフレームで実行
    requestAnimationFrame(() => {
        try {
            performWhitespaceMarkersUpdate();
        } catch (error) {
            console.error('❌ Error updating whitespace markers:', error);
        } finally {
            updateScheduled = false;
        }
    });
}

/**
 * 実際のマーカー更新処理
 */
function performWhitespaceMarkersUpdate() {
    // 既存のマーカーをクリア
    removeAllMarkers();
    
    const content = editor.value;
    if (!content) {
        return;
    }
    
    try {
        if (DEBUG_MODE) console.log('👁️ Starting whitespace markers update');
        
        // エディタのスタイル情報を取得
        const computedStyle = window.getComputedStyle(editor);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        
        // タイプライターモードの検出と実際のpadding値を取得
        const isTypewriterMode = editor.style.paddingTop && parseFloat(editor.style.paddingTop) > 20;
        const actualPaddingTop = parseFloat(editor.style.paddingTop) || parseFloat(computedStyle.paddingTop);
        
        // 行番号エリアの幅を取得
        const lineNumbers = document.getElementById('line-numbers');
        const lineNumbersWidth = lineNumbers ? lineNumbers.offsetWidth : 0;
        
        // スクロール位置を取得
        const scrollTop = editor.scrollTop;
        const scrollLeft = editor.scrollLeft;
        
        // 行ごとに処理
        const lines = content.split('\n');
        
        if (DEBUG_MODE) console.log(`👁️ Processing ${lines.length} lines, typewriter mode: ${isTypewriterMode}`);
        
        let currentTop = actualPaddingTop;
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            // 行の高さを計算（折り返しを考慮）
            const lineDisplayHeight = calculateLineDisplayHeight(line);
            
            // 表示位置を計算
            const displayY = currentTop - scrollTop;
            
            if (DEBUG_MODE) console.log(`👁️ Line ${lineIndex}: top=${currentTop}, displayY=${displayY}, height=${lineDisplayHeight}`);
            
            // 表示範囲の判定（少し余裕を持たせる）
            if (displayY > -lineDisplayHeight && displayY < editor.clientHeight + lineDisplayHeight) {
                // 行内の文字を処理（実測ベース）
                processLineWithRealMeasurement(line, lineIndex, displayY, lineDisplayHeight, lineNumbersWidth, paddingLeft, scrollLeft);
            }
            
            currentTop += lineDisplayHeight;
        }
        
        if (DEBUG_MODE) console.log('👁️ Whitespace markers update completed');
        
    } catch (error) {
        console.error('❌ Error in performWhitespaceMarkersUpdate:', error);
        removeAllMarkers();
    }
}

/**
 * 行の表示高さを計算（折り返しを考慮）
 */
function calculateLineDisplayHeight(line) {
    if (!line || line.length === 0) {
        // 空行の場合は標準の行高さ
        const computedStyle = window.getComputedStyle(editor);
        return parseFloat(computedStyle.lineHeight);
    }
    
    try {
        // 測定用要素を作成
        const measurer = document.createElement('div');
        const computedStyle = window.getComputedStyle(editor);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
            padding: 0;
            margin: 0;
            border: none;
            width: ${editorWidth}px;
        `;
        
        document.body.appendChild(measurer);
        measurer.textContent = line;
        const height = measurer.offsetHeight;
        document.body.removeChild(measurer);
        
        return Math.max(height, parseFloat(computedStyle.lineHeight));
        
    } catch (error) {
        console.warn('⚠️ Line height calculation failed:', error);
        const computedStyle = window.getComputedStyle(editor);
        return parseFloat(computedStyle.lineHeight);
    }
}

/**
 * 行を実測ベースで処理（エディタ完全準拠）
 */
function processLineWithRealMeasurement(line, lineIndex, displayY, lineHeight, lineNumbersWidth, paddingLeft, scrollLeft) {
    if (!line || line.length === 0) return;
    
    try {
        // エディタと完全に同じ条件の測定用要素を作成
        const measurer = document.createElement('div');
        const computedStyle = window.getComputedStyle(editor);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            white-space: pre;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
            letter-spacing: ${computedStyle.letterSpacing};
            word-spacing: ${computedStyle.wordSpacing};
            font-variant-numeric: ${computedStyle.fontVariantNumeric};
            font-weight: ${computedStyle.fontWeight};
            font-style: ${computedStyle.fontStyle};
            tab-size: ${computedStyle.tabSize};
            -moz-tab-size: ${computedStyle.tabSize};
            -webkit-tab-size: ${computedStyle.tabSize};
            -o-tab-size: ${computedStyle.tabSize};
            width: ${editorWidth}px;
            padding: 0;
            margin: 0;
            border: none;
        `;
        
        document.body.appendChild(measurer);
        
        // 各文字の位置を実測で取得
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            let markerType = null;
            
            // 空白文字の種類を判定
            if (char === '\u3000' && whitespaceVisualization.showFullWidthSpace) {
                markerType = 'fullwidth-space';
            } else if (char === ' ' && whitespaceVisualization.showHalfWidthSpace) {
                markerType = 'halfwidth-space';
            } else if (char === '\t' && whitespaceVisualization.showTab) {
                markerType = 'tab';
            }
            
            // マーカーが必要な場合のみ位置を実測
            if (markerType) {
                // 文字より前の部分の幅を測定
                const textBefore = line.substring(0, charIndex);
                measurer.textContent = textBefore;
                const charX = measurer.offsetWidth;
                
                // 文字を含む部分の幅を測定
                const textIncluding = line.substring(0, charIndex + 1);
                measurer.textContent = textIncluding;
                const endX = measurer.offsetWidth;
                
                const charWidth = endX - charX;
                
                // マーカーを作成
                const markerX = paddingLeft + lineNumbersWidth + charX - scrollLeft;
                const markerY = displayY;
                
                // 画面内に表示される範囲のみマーカーを作成
                if (markerX > -100 && markerX < editor.clientWidth + 100) {
                    createWhitespaceMarker(markerType, markerX, markerY, charWidth, lineHeight);
                    if (DEBUG_MODE) console.log(`👁️ Real measured marker ${markerType} at line ${lineIndex}, char ${charIndex}, x=${markerX}, y=${markerY}, width=${charWidth}`);
                }
            }
        }
        
        document.body.removeChild(measurer);
        
    } catch (error) {
        console.error('❌ Real measurement processing failed:', error);
    }
}

/**
 * 空白文字マーカーを作成
 */
function createWhitespaceMarker(type, x, y, width, height) {
    try {
        // 無効な値の検証
        if (!type || isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
            console.warn('⚠️ Invalid marker parameters:', { type, x, y, width, height });
            return;
        }
        
        // コンテナが存在しない場合はスキップ
        if (!markersContainer || !markersContainer.parentNode) {
            console.warn('⚠️ Markers container not available');
            return;
        }
        
        const marker = document.createElement('div');
        marker.className = `whitespace-marker whitespace-marker-${type}`;
        
        // 基本スタイル
        marker.style.cssText = `
            position: absolute;
            left: ${Math.round(x)}px;
            top: ${Math.round(y)}px;
            width: ${Math.round(width)}px;
            height: ${Math.round(height)}px;
            pointer-events: none;
            z-index: 10;
            box-sizing: border-box;
        `;
        
        // マーカータイプ別のスタイル
        switch (type) {
            case 'fullwidth-space':
                // 全角スペース: 枠線と対角線
                marker.style.border = `1px solid ${whitespaceVisualization.colors.fullWidthSpace}`;
                marker.style.backgroundColor = 'transparent';
                
                // 対角線を追加
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                `;
                svg.setAttribute('viewBox', `0 0 ${Math.round(width)} ${Math.round(height)}`);
                
                const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line1.setAttribute('x1', '2');
                line1.setAttribute('y1', '2');
                line1.setAttribute('x2', (Math.round(width) - 2).toString());
                line1.setAttribute('y2', (Math.round(height) - 2).toString());
                line1.setAttribute('stroke', whitespaceVisualization.colors.fullWidthSpace);
                line1.setAttribute('stroke-width', '1');
                
                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', (Math.round(width) - 2).toString());
                line2.setAttribute('y1', '2');
                line2.setAttribute('x2', '2');
                line2.setAttribute('y2', (Math.round(height) - 2).toString());
                line2.setAttribute('stroke', whitespaceVisualization.colors.fullWidthSpace);
                line2.setAttribute('stroke-width', '1');
                
                svg.appendChild(line1);
                svg.appendChild(line2);
                marker.appendChild(svg);
                break;
                
            case 'halfwidth-space':
                // 半角スペース: 中央のドット
                marker.style.backgroundColor = 'transparent';
                
                const dot = document.createElement('div');
                dot.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 3px;
                    height: 3px;
                    background-color: ${whitespaceVisualization.colors.halfWidthSpace};
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                `;
                marker.appendChild(dot);
                break;
                
            case 'tab':
                // タブ文字: 矢印
                marker.style.backgroundColor = `${whitespaceVisualization.colors.tab}1A`; // 10%透明度
                marker.style.borderBottom = `1px solid ${whitespaceVisualization.colors.tab}80`; // 50%透明度
                
                const arrow = document.createElement('div');
                arrow.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 4px;
                    color: ${whitespaceVisualization.colors.tab};
                    font-size: ${Math.min(16, Math.max(10, Math.round(height * 0.6)))}px;
                    line-height: 1;
                    transform: translateY(-50%);
                    font-family: monospace;
                `;
                arrow.textContent = '→';
                marker.appendChild(arrow);
                break;
                
            default:
                console.warn('⚠️ Unknown marker type:', type);
                return;
        }
        
        markersContainer.appendChild(marker);
        
    } catch (error) {
        console.error('❌ Error creating whitespace marker:', error, { type, x, y, width, height });
    }
}

/**
 * スクロール時のマーカー更新
 */
export function updateWhitespaceMarkersOnScroll() {
    if (!whitespaceVisualization.enabled || !editor || !markersContainer) {
        return;
    }
    
    // スクロール時は即座に更新
    updateWhitespaceMarkers();
}

/**
 * 空白文字可視化設定ダイアログを表示
 */
export function showWhitespaceVisualizationDialog() {
    console.log('👁️ Opening whitespace visualization settings');
    closeAllMenus();
    
    // 既存のダイアログがあれば削除
    const existingDialog = document.getElementById('whitespace-dialog-overlay');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    createWhitespaceVisualizationDialog();
}

/**
 * 空白文字可視化設定ダイアログの作成
 */
function createWhitespaceVisualizationDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'whitespace-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay whitespace-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog whitespace-dialog';
    
    dialog.innerHTML = `
        <div class="search-dialog-header">${t('viewMenu.whitespaceSettings')}</div>
        <div class="search-dialog-content">
            <div class="whitespace-settings-section">
                <div class="search-checkbox-group">
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="ws-enable-checkbox" ${whitespaceVisualization.enabled ? 'checked' : ''}>
                        ${t('whitespace.enable')}
                    </label>
                </div>
                
                <div class="whitespace-color-settings">
                    <h4 style="margin: 16px 0 12px 0; color: #cccccc;">色設定 / Color Settings</h4>
                    
                    <div class="color-setting-group">
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">全角スペース:</label>
                                <input type="color" id="ws-fullwidth-color" value="${whitespaceVisualization.colors.fullWidthSpace}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-fullwidth-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-fullwidth-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-fullwidth-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">半角スペース:</label>
                                <input type="color" id="ws-halfwidth-color" value="${whitespaceVisualization.colors.halfWidthSpace}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-halfwidth-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-halfwidth-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-halfwidth-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">タブ:</label>
                                <input type="color" id="ws-tab-color" value="${whitespaceVisualization.colors.tab}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-tab-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-tab-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-tab-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="whitespace-preview-section">
                    <label style="display: block; margin: 16px 0 8px 0; color: #cccccc;">${t('fonts.preview')}</label>
                    <div class="whitespace-preview">
function example() {
    console.log('Hello');　// 全角スペース
	return 42;    // タブ + 半角スペース
}
                    </div>
                </div>
            </div>
            
            <div class="search-button-group">
                <button id="whitespace-apply-btn" class="search-button search-button-primary">${t('fonts.buttons.apply')}</button>
                <button id="whitespace-cancel-btn" class="search-button search-button-cancel">${t('fonts.buttons.cancel')}</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    setupWhitespaceVisualizationDialogEvents(dialogOverlay);
    
    // 有効/無効チェックボックスにフォーカス
    setTimeout(() => {
        const enableCheckbox = document.getElementById('ws-enable-checkbox');
        if (enableCheckbox) {
            enableCheckbox.focus();
        }
    }, 100);
}

/**
 * 空白文字可視化設定ダイアログのイベント設定
 */
function setupWhitespaceVisualizationDialogEvents(dialogOverlay) {
    const enableCheckbox = document.getElementById('ws-enable-checkbox');
    const applyBtn = document.getElementById('whitespace-apply-btn');
    const cancelBtn = document.getElementById('whitespace-cancel-btn');
    
    // 色設定要素を取得
    const fullwidthColorPicker = document.getElementById('ws-fullwidth-color');
    const halfwidthColorPicker = document.getElementById('ws-halfwidth-color');
    const tabColorPicker = document.getElementById('ws-tab-color');
    
    // RGB入力要素を取得
    const fullwidthRGB = {
        r: document.getElementById('ws-fullwidth-r'),
        g: document.getElementById('ws-fullwidth-g'),
        b: document.getElementById('ws-fullwidth-b')
    };
    const halfwidthRGB = {
        r: document.getElementById('ws-halfwidth-r'),
        g: document.getElementById('ws-halfwidth-g'),
        b: document.getElementById('ws-halfwidth-b')
    };
    const tabRGB = {
        r: document.getElementById('ws-tab-r'),
        g: document.getElementById('ws-tab-g'),
        b: document.getElementById('ws-tab-b')
    };
    
    // 一時的な設定を保存（キャンセル時の復元用）
    const originalSettings = { 
        ...whitespaceVisualization,
        colors: { ...whitespaceVisualization.colors }
    };
    
    // 色とRGB入力の初期化と連動設定
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    function setupColorSync(colorPicker, rgbInputs) {
        // 初期値設定
        const initialRgb = hexToRgb(colorPicker.value);
        if (initialRgb) {
            rgbInputs.r.value = initialRgb.r;
            rgbInputs.g.value = initialRgb.g;
            rgbInputs.b.value = initialRgb.b;
        }
        
        // カラーピッカーからRGB入力へ
        colorPicker.addEventListener('input', () => {
            const rgb = hexToRgb(colorPicker.value);
            if (rgb) {
                rgbInputs.r.value = rgb.r;
                rgbInputs.g.value = rgb.g;
                rgbInputs.b.value = rgb.b;
            }
        });
        
        // RGB入力からカラーピッカーへ
        [rgbInputs.r, rgbInputs.g, rgbInputs.b].forEach(input => {
            input.addEventListener('input', () => {
                const r = parseInt(rgbInputs.r.value) || 0;
                const g = parseInt(rgbInputs.g.value) || 0;
                const b = parseInt(rgbInputs.b.value) || 0;
                colorPicker.value = rgbToHex(
                    Math.max(0, Math.min(255, r)),
                    Math.max(0, Math.min(255, g)),
                    Math.max(0, Math.min(255, b))
                );
            });
        });
    }
    
    // 各色設定の連動を設定
    setupColorSync(fullwidthColorPicker, fullwidthRGB);
    setupColorSync(halfwidthColorPicker, halfwidthRGB);
    setupColorSync(tabColorPicker, tabRGB);
    
    // 適用ボタン
    applyBtn.addEventListener('click', () => {
        const newSettings = {
            enabled: enableCheckbox.checked,
            showFullWidthSpace: true,   // 常に有効
            showHalfWidthSpace: true,   // 常に有効  
            showTab: true,              // 常に有効
            colors: {
                fullWidthSpace: fullwidthColorPicker.value,
                halfWidthSpace: halfwidthColorPicker.value,
                tab: tabColorPicker.value
            }
        };
        
        setWhitespaceVisualization(newSettings);
        updateWhitespaceVisualizationMenuState(newSettings.enabled);
        
        // マーカーコンテナを再作成
        createMarkersContainer();
        
        if (newSettings.enabled) {
            setTimeout(() => {
                updateWhitespaceMarkers();
            }, 100);
        } else {
            removeAllMarkers();
        }
        
        closeWhitespaceVisualizationDialog(dialogOverlay);
        console.log('✅ Whitespace visualization settings applied:', newSettings);
    });
    
    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
        // 元の設定に戻す
        setWhitespaceVisualization(originalSettings);
        closeWhitespaceVisualizationDialog(dialogOverlay);
        console.log('❌ Whitespace visualization settings cancelled');
    });
    
    // ESCキーでキャンセル
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            setWhitespaceVisualization(originalSettings);
            closeWhitespaceVisualizationDialog(dialogOverlay);
        }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            setWhitespaceVisualization(originalSettings);
            closeWhitespaceVisualizationDialog(dialogOverlay);
        }
    });
    
    dialogOverlay.addEventListener('remove', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
}

/**
 * 空白文字可視化設定ダイアログを閉じる
 */
function closeWhitespaceVisualizationDialog(dialogOverlay) {
    try {
        document.body.removeChild(dialogOverlay);
        
        // エディタにフォーカスを戻す
        setTimeout(() => {
            if (editor && editor.focus) {
                editor.focus();
            }
        }, 100);
    } catch (error) {
        console.warn('⚠️ Error closing whitespace visualization dialog:', error);
    }
}

import { 
    editor, 
    whitespaceVisualization, 
    setWhitespaceVisualization 
} from './globals.js';
import { closeAllMenus } from './menu-controller.js';
import { t } from './locales.js';

// 可視化マーカーのコンテナ
let markersContainer = null;
let updateScheduled = false;

// デバッグモード
const DEBUG_MODE = false;

/**
 * 空白文字可視化のオン・オフを切り替える
 */
export function toggleWhitespaceVisualization() {
    const newState = !whitespaceVisualization.enabled;
    setWhitespaceVisualization({ enabled: newState });
    
    console.log(`👁️ Whitespace visualization ${newState ? 'enabled' : 'disabled'}`);
    
    // メニューアイテムのチェック状態を更新
    updateWhitespaceVisualizationMenuState(newState);
    
    if (!newState) {
        // 可視化を無効にした場合は、既存のマーカーを削除
        removeAllMarkers();
    } else {
        // 可視化を有効にした場合は、マーカーを表示
        setTimeout(() => {
            updateWhitespaceMarkers();
        }, 100);
    }
    
    closeAllMenus();
}

/**
 * メニューアイテムのチェック状態を更新
 */
export function updateWhitespaceVisualizationMenuState(enabled) {
    const menuOption = document.getElementById('whitespace-visualization-menu-option');
    if (menuOption) {
        const checkmark = menuOption.querySelector('.menu-checkmark');
        if (checkmark) {
            checkmark.style.visibility = enabled ? 'visible' : 'hidden';
        }
    }
}

/**
 * 空白文字可視化設定を初期化
 */
export function initializeWhitespaceVisualization() {
    console.log('👁️ Initializing whitespace visualization...');
    
    // マーカーコンテナを作成
    createMarkersContainer();
    
    // メニューの初期状態を設定
    updateWhitespaceVisualizationMenuState(whitespaceVisualization.enabled);
    
    // 可視化が有効な場合は初期マーカーを設定
    if (whitespaceVisualization.enabled) {
        setTimeout(() => {
            updateWhitespaceMarkers();
        }, 200);
    }
    
    console.log('✅ Whitespace visualization initialized:', whitespaceVisualization);
}

/**
 * マーカーコンテナを作成
 */
function createMarkersContainer() {
    // 既存のコンテナがあれば削除
    if (markersContainer) {
        markersContainer.remove();
        markersContainer = null;
    }
    
    const editorContainer = document.querySelector('.editor-container');
    if (!editorContainer) {
        console.error('❌ Editor container not found for whitespace markers');
        return;
    }
    
    markersContainer = document.createElement('div');
    markersContainer.className = 'whitespace-markers-container';
    markersContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 5;
        overflow: hidden;
    `;
    
    editorContainer.appendChild(markersContainer);
    console.log('✅ Whitespace markers container created');
}

/**
 * すべてのマーカーを削除
 */
function removeAllMarkers() {
    if (markersContainer) {
        markersContainer.innerHTML = '';
    }
}

/**
 * 空白文字マーカーを更新
 */
export function updateWhitespaceMarkers() {
    // 可視化が無効な場合は何もしない
    if (!whitespaceVisualization.enabled || !editor || !markersContainer) {
        return;
    }
    
    // 重複する更新リクエストを防ぐ
    if (updateScheduled) {
        return;
    }
    
    updateScheduled = true;
    
    // 次のフレームで実行
    requestAnimationFrame(() => {
        try {
            performWhitespaceMarkersUpdate();
        } catch (error) {
            console.error('❌ Error updating whitespace markers:', error);
        } finally {
            updateScheduled = false;
        }
    });
}

/**
 * 実際のマーカー更新処理
 */
function performWhitespaceMarkersUpdate() {
    // 既存のマーカーをクリア
    removeAllMarkers();
    
    const content = editor.value;
    if (!content) {
        return;
    }
    
    try {
        if (DEBUG_MODE) console.log('👁️ Starting whitespace markers update');
        
        // エディタのスタイル情報を取得
        const computedStyle = window.getComputedStyle(editor);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        
        // タイプライターモードの検出と実際のpadding値を取得
        const isTypewriterMode = editor.style.paddingTop && parseFloat(editor.style.paddingTop) > 20;
        const actualPaddingTop = parseFloat(editor.style.paddingTop) || parseFloat(computedStyle.paddingTop);
        
        // 行番号エリアの幅を取得
        const lineNumbers = document.getElementById('line-numbers');
        const lineNumbersWidth = lineNumbers ? lineNumbers.offsetWidth : 0;
        
        // スクロール位置を取得
        const scrollTop = editor.scrollTop;
        const scrollLeft = editor.scrollLeft;
        
        // 行ごとに処理
        const lines = content.split('\n');
        
        if (DEBUG_MODE) console.log(`👁️ Processing ${lines.length} lines, typewriter mode: ${isTypewriterMode}`);
        
        let currentTop = actualPaddingTop;
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            // 行の高さを計算（折り返しを考慮）
            const lineDisplayHeight = calculateLineDisplayHeight(line);
            
            // 表示位置を計算
            const displayY = currentTop - scrollTop;
            
            if (DEBUG_MODE) console.log(`👁️ Line ${lineIndex}: top=${currentTop}, displayY=${displayY}, height=${lineDisplayHeight}`);
            
            // 表示範囲の判定（少し余裕を持たせる）
            if (displayY > -lineDisplayHeight && displayY < editor.clientHeight + lineDisplayHeight) {
                // 行内の文字を処理
                processLineCharacters(line, lineIndex, displayY, lineDisplayHeight, lineNumbersWidth, paddingLeft, scrollLeft);
            }
            
            currentTop += lineDisplayHeight;
        }
        
        if (DEBUG_MODE) console.log('👁️ Whitespace markers update completed');
        
    } catch (error) {
        console.error('❌ Error in performWhitespaceMarkersUpdate:', error);
        removeAllMarkers();
    }
}

/**
 * 行の表示高さを計算（折り返しを考慮）
 */
function calculateLineDisplayHeight(line) {
    if (!line || line.length === 0) {
        // 空行の場合は標準の行高さ
        const computedStyle = window.getComputedStyle(editor);
        return parseFloat(computedStyle.lineHeight);
    }
    
    try {
        // 測定用要素を作成
        const measurer = document.createElement('div');
        const computedStyle = window.getComputedStyle(editor);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
            padding: 0;
            margin: 0;
            border: none;
            width: ${editorWidth}px;
        `;
        
        document.body.appendChild(measurer);
        measurer.textContent = line;
        const height = measurer.offsetHeight;
        document.body.removeChild(measurer);
        
        return Math.max(height, parseFloat(computedStyle.lineHeight));
        
    } catch (error) {
        console.warn('⚠️ Line height calculation failed:', error);
        const computedStyle = window.getComputedStyle(editor);
        return parseFloat(computedStyle.lineHeight);
    }
}

/**
 * 行内の文字を処理して空白文字マーカーを作成
 */
function processLineCharacters(line, lineIndex, displayY, lineHeight, lineNumbersWidth, paddingLeft, scrollLeft) {
    let currentX = 0; // 行内での現在のX位置
    
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        let markerType = null;
        let charWidth = 0;
        
        // 空白文字の種類を判定
        if (char === '\u3000' && whitespaceVisualization.showFullWidthSpace) {
            // 全角スペース
            markerType = 'fullwidth-space';
            charWidth = measureCharacterWidth('\u3000');
        } else if (char === ' ' && whitespaceVisualization.showHalfWidthSpace) {
            // 半角スペース
            markerType = 'halfwidth-space';
            charWidth = measureCharacterWidth(' ');
        } else if (char === '\t' && whitespaceVisualization.showTab) {
            // タブ文字
            markerType = 'tab';
            charWidth = calculateTabWidth(currentX);
        } else {
            // 通常の文字の幅を加算
            charWidth = measureCharacterWidth(char);
        }
        
        // マーカーを作成
        if (markerType) {
            const markerX = paddingLeft + lineNumbersWidth + currentX - scrollLeft;
            const markerY = displayY;
            
            // 画面内に表示される範囲のみマーカーを作成
            if (markerX > -100 && markerX < editor.clientWidth + 100) {
                createWhitespaceMarker(markerType, markerX, markerY, charWidth, lineHeight);
                if (DEBUG_MODE) console.log(`👁️ Created marker ${markerType} at line ${lineIndex}, x=${markerX}, y=${markerY}, width=${charWidth}`);
            }
        }
        
        // 次の文字位置へ移動
        currentX += charWidth;
    }
}

/**
 * 文字幅を測定
 */
function measureCharacterWidth(char) {
    try {
        const measurer = document.createElement('span');
        const computedStyle = window.getComputedStyle(editor);
        
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            white-space: pre;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
        `;
        
        document.body.appendChild(measurer);
        measurer.textContent = char;
        const width = measurer.offsetWidth;
        document.body.removeChild(measurer);
        
        return Math.max(width, 1); // 最小1px
        
    } catch (error) {
        console.warn('⚠️ Character width measurement failed:', error);
        return 8; // フォールバック
    }
}

/**
 * タブ文字の幅を実測で計算（エディタ完全準拠版）
 */
function calculateTabWidth(currentX) {
    try {
        // エディタと完全に同じ条件の測定用要素を作成
        const measurer = document.createElement('div');
        const computedStyle = window.getComputedStyle(editor);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            white-space: pre;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
            letter-spacing: ${computedStyle.letterSpacing};
            word-spacing: ${computedStyle.wordSpacing};
            font-variant-numeric: ${computedStyle.fontVariantNumeric};
            tab-size: ${computedStyle.tabSize};
            -moz-tab-size: ${computedStyle.tabSize};
            -webkit-tab-size: ${computedStyle.tabSize};
            -o-tab-size: ${computedStyle.tabSize};
            width: ${editorWidth}px;
            padding: 0;
            margin: 0;
            border: none;
        `;
        
        document.body.appendChild(measurer);
        
        // currentXに相当するテキストを作成（スペースで近似）
        const spaceWidth = measureCharacterWidthDirect(' ');
        const approximateChars = Math.floor(currentX / spaceWidth);
        const textBeforeTab = ' '.repeat(approximateChars);
        
        // タブを含まない場合の幅を測定
        measurer.textContent = textBeforeTab;
        const widthBefore = measurer.offsetWidth;
        
        // タブを含む場合の幅を測定
        measurer.textContent = textBeforeTab + '\t';
        const widthAfter = measurer.offsetWidth;
        
        document.body.removeChild(measurer);
        
        // タブの実際の幅
        const actualTabWidth = widthAfter - widthBefore;
        
        // 最小値として半角スペース幅を保証
        return Math.max(actualTabWidth, spaceWidth);
        
    } catch (error) {
        console.warn('⚠️ Tab width measurement failed:', error);
        
        // フォールバック: CSS tab-sizeベースの計算
        const spaceWidth = measureCharacterWidthDirect(' ');
        const tabSize = parseInt(getComputedStyle(editor).tabSize) || 4;
        return tabSize * spaceWidth;
    }
}

/**
 * より正確なタブ幅実測（行全体のコンテキストを使用）
 */
function measureTabWidthInContext(lineTextBeforeTab) {
    try {
        // エディタと完全に同じ条件の測定用要素を作成
        const measurer = document.createElement('div');
        const computedStyle = window.getComputedStyle(editor);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            white-space: pre;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
            letter-spacing: ${computedStyle.letterSpacing};
            word-spacing: ${computedStyle.wordSpacing};
            font-variant-numeric: ${computedStyle.fontVariantNumeric};
            tab-size: ${computedStyle.tabSize};
            -moz-tab-size: ${computedStyle.tabSize};
            -webkit-tab-size: ${computedStyle.tabSize};
            -o-tab-size: ${computedStyle.tabSize};
            width: ${editorWidth}px;
            padding: 0;
            margin: 0;
            border: none;
        `;
        
        document.body.appendChild(measurer);
        
        // 実際の行テキストでタブ前の幅を測定
        measurer.textContent = lineTextBeforeTab;
        const widthBefore = measurer.offsetWidth;
        
        // タブを追加した場合の幅を測定
        measurer.textContent = lineTextBeforeTab + '\t';
        const widthAfter = measurer.offsetWidth;
        
        document.body.removeChild(measurer);
        
        // タブの実際の幅
        const actualTabWidth = widthAfter - widthBefore;
        
        console.log(`📏 Tab measurement: text="${lineTextBeforeTab}", before=${widthBefore}px, after=${widthAfter}px, tabWidth=${actualTabWidth}px`);
        
        // 最小値として1pxを保証
        return Math.max(actualTabWidth, 1);
        
    } catch (error) {
        console.warn('⚠️ Tab width context measurement failed:', error);
        return 32; // フォールバック
    }
}

/**
 * 空白文字マーカーを作成
 */
function createWhitespaceMarker(type, x, y, width, height) {
    try {
        // 無効な値の検証
        if (!type || isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
            console.warn('⚠️ Invalid marker parameters:', { type, x, y, width, height });
            return;
        }
        
        // コンテナが存在しない場合はスキップ
        if (!markersContainer || !markersContainer.parentNode) {
            console.warn('⚠️ Markers container not available');
            return;
        }
        
        const marker = document.createElement('div');
        marker.className = `whitespace-marker whitespace-marker-${type}`;
        
        // 基本スタイル
        marker.style.cssText = `
            position: absolute;
            left: ${Math.round(x)}px;
            top: ${Math.round(y)}px;
            width: ${Math.round(width)}px;
            height: ${Math.round(height)}px;
            pointer-events: none;
            z-index: 10;
            box-sizing: border-box;
        `;
        
        // マーカータイプ別のスタイル
        switch (type) {
            case 'fullwidth-space':
                // 全角スペース: 枠線と対角線
                marker.style.border = `1px solid ${whitespaceVisualization.colors.fullWidthSpace}`;
                marker.style.backgroundColor = 'transparent';
                
                // 対角線を追加
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                `;
                svg.setAttribute('viewBox', `0 0 ${Math.round(width)} ${Math.round(height)}`);
                
                const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line1.setAttribute('x1', '2');
                line1.setAttribute('y1', '2');
                line1.setAttribute('x2', (Math.round(width) - 2).toString());
                line1.setAttribute('y2', (Math.round(height) - 2).toString());
                line1.setAttribute('stroke', whitespaceVisualization.colors.fullWidthSpace);
                line1.setAttribute('stroke-width', '1');
                
                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', (Math.round(width) - 2).toString());
                line2.setAttribute('y1', '2');
                line2.setAttribute('x2', '2');
                line2.setAttribute('y2', (Math.round(height) - 2).toString());
                line2.setAttribute('stroke', whitespaceVisualization.colors.fullWidthSpace);
                line2.setAttribute('stroke-width', '1');
                
                svg.appendChild(line1);
                svg.appendChild(line2);
                marker.appendChild(svg);
                break;
                
            case 'halfwidth-space':
                // 半角スペース: 中央のドット
                marker.style.backgroundColor = 'transparent';
                
                const dot = document.createElement('div');
                dot.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 3px;
                    height: 3px;
                    background-color: ${whitespaceVisualization.colors.halfWidthSpace};
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                `;
                marker.appendChild(dot);
                break;
                
            case 'tab':
                // タブ文字: 矢印
                marker.style.backgroundColor = `${whitespaceVisualization.colors.tab}1A`; // 10%透明度
                marker.style.borderBottom = `1px solid ${whitespaceVisualization.colors.tab}80`; // 50%透明度
                
                const arrow = document.createElement('div');
                arrow.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 4px;
                    color: ${whitespaceVisualization.colors.tab};
                    font-size: ${Math.min(16, Math.max(10, Math.round(height * 0.6)))}px;
                    line-height: 1;
                    transform: translateY(-50%);
                    font-family: monospace;
                `;
                arrow.textContent = '→';
                marker.appendChild(arrow);
                break;
                
            default:
                console.warn('⚠️ Unknown marker type:', type);
                return;
        }
        
        markersContainer.appendChild(marker);
        
    } catch (error) {
        console.error('❌ Error creating whitespace marker:', error, { type, x, y, width, height });
    }
}

/**
 * スクロール時のマーカー更新
 */
export function updateWhitespaceMarkersOnScroll() {
    if (!whitespaceVisualization.enabled || !editor || !markersContainer) {
        return;
    }
    
    // スクロール時は即座に更新
    updateWhitespaceMarkers();
}

/**
 * 空白文字可視化設定ダイアログを表示
 */
export function showWhitespaceVisualizationDialog() {
    console.log('👁️ Opening whitespace visualization settings');
    closeAllMenus();
    
    // 既存のダイアログがあれば削除
    const existingDialog = document.getElementById('whitespace-dialog-overlay');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    createWhitespaceVisualizationDialog();
}

/**
 * 空白文字可視化設定ダイアログの作成
 */
function createWhitespaceVisualizationDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'whitespace-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay whitespace-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog whitespace-dialog';
    
    dialog.innerHTML = `
        <div class="search-dialog-header">${t('viewMenu.whitespaceSettings')}</div>
        <div class="search-dialog-content">
            <div class="whitespace-settings-section">
                <div class="search-checkbox-group">
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="ws-enable-checkbox" ${whitespaceVisualization.enabled ? 'checked' : ''}>
                        ${t('whitespace.enable')}
                    </label>
                </div>
                
                <div class="whitespace-color-settings">
                    <h4 style="margin: 16px 0 12px 0; color: #cccccc;">色設定 / Color Settings</h4>
                    
                    <div class="color-setting-group">
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">全角スペース:</label>
                                <input type="color" id="ws-fullwidth-color" value="${whitespaceVisualization.colors.fullWidthSpace}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-fullwidth-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-fullwidth-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-fullwidth-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">半角スペース:</label>
                                <input type="color" id="ws-halfwidth-color" value="${whitespaceVisualization.colors.halfWidthSpace}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-halfwidth-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-halfwidth-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-halfwidth-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">タブ:</label>
                                <input type="color" id="ws-tab-color" value="${whitespaceVisualization.colors.tab}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-tab-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-tab-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-tab-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="whitespace-preview-section">
                    <label style="display: block; margin: 16px 0 8px 0; color: #cccccc;">${t('fonts.preview')}</label>
                    <div class="whitespace-preview">
function example() {
    console.log('Hello');　// 全角スペース
	return 42;    // タブ + 半角スペース
}
                    </div>
                </div>
            </div>
            
            <div class="search-button-group">
                <button id="whitespace-apply-btn" class="search-button search-button-primary">${t('fonts.buttons.apply')}</button>
                <button id="whitespace-cancel-btn" class="search-button search-button-cancel">${t('fonts.buttons.cancel')}</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    setupWhitespaceVisualizationDialogEvents(dialogOverlay);
    
    // 有効/無効チェックボックスにフォーカス
    setTimeout(() => {
        const enableCheckbox = document.getElementById('ws-enable-checkbox');
        if (enableCheckbox) {
            enableCheckbox.focus();
        }
    }, 100);
}

/**
 * 空白文字可視化設定ダイアログのイベント設定
 */
function setupWhitespaceVisualizationDialogEvents(dialogOverlay) {
    const enableCheckbox = document.getElementById('ws-enable-checkbox');
    const applyBtn = document.getElementById('whitespace-apply-btn');
    const cancelBtn = document.getElementById('whitespace-cancel-btn');
    
    // 色設定要素を取得
    const fullwidthColorPicker = document.getElementById('ws-fullwidth-color');
    const halfwidthColorPicker = document.getElementById('ws-halfwidth-color');
    const tabColorPicker = document.getElementById('ws-tab-color');
    
    // RGB入力要素を取得
    const fullwidthRGB = {
        r: document.getElementById('ws-fullwidth-r'),
        g: document.getElementById('ws-fullwidth-g'),
        b: document.getElementById('ws-fullwidth-b')
    };
    const halfwidthRGB = {
        r: document.getElementById('ws-halfwidth-r'),
        g: document.getElementById('ws-halfwidth-g'),
        b: document.getElementById('ws-halfwidth-b')
    };
    const tabRGB = {
        r: document.getElementById('ws-tab-r'),
        g: document.getElementById('ws-tab-g'),
        b: document.getElementById('ws-tab-b')
    };
    
    // 一時的な設定を保存（キャンセル時の復元用）
    const originalSettings = { 
        ...whitespaceVisualization,
        colors: { ...whitespaceVisualization.colors }
    };
    
    // 色とRGB入力の初期化と連動設定
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    function setupColorSync(colorPicker, rgbInputs) {
        // 初期値設定
        const initialRgb = hexToRgb(colorPicker.value);
        if (initialRgb) {
            rgbInputs.r.value = initialRgb.r;
            rgbInputs.g.value = initialRgb.g;
            rgbInputs.b.value = initialRgb.b;
        }
        
        // カラーピッカーからRGB入力へ
        colorPicker.addEventListener('input', () => {
            const rgb = hexToRgb(colorPicker.value);
            if (rgb) {
                rgbInputs.r.value = rgb.r;
                rgbInputs.g.value = rgb.g;
                rgbInputs.b.value = rgb.b;
            }
        });
        
        // RGB入力からカラーピッカーへ
        [rgbInputs.r, rgbInputs.g, rgbInputs.b].forEach(input => {
            input.addEventListener('input', () => {
                const r = parseInt(rgbInputs.r.value) || 0;
                const g = parseInt(rgbInputs.g.value) || 0;
                const b = parseInt(rgbInputs.b.value) || 0;
                colorPicker.value = rgbToHex(
                    Math.max(0, Math.min(255, r)),
                    Math.max(0, Math.min(255, g)),
                    Math.max(0, Math.min(255, b))
                );
            });
        });
    }
    
    // 各色設定の連動を設定
    setupColorSync(fullwidthColorPicker, fullwidthRGB);
    setupColorSync(halfwidthColorPicker, halfwidthRGB);
    setupColorSync(tabColorPicker, tabRGB);
    
    // 適用ボタン
    applyBtn.addEventListener('click', () => {
        const newSettings = {
            enabled: enableCheckbox.checked,
            showFullWidthSpace: true,   // 常に有効
            showHalfWidthSpace: true,   // 常に有効  
            showTab: true,              // 常に有効
            colors: {
                fullWidthSpace: fullwidthColorPicker.value,
                halfWidthSpace: halfwidthColorPicker.value,
                tab: tabColorPicker.value
            }
        };
        
        setWhitespaceVisualization(newSettings);
        updateWhitespaceVisualizationMenuState(newSettings.enabled);
        
        // マーカーコンテナを再作成
        createMarkersContainer();
        
        if (newSettings.enabled) {
            setTimeout(() => {
                updateWhitespaceMarkers();
            }, 100);
        } else {
            removeAllMarkers();
        }
        
        closeWhitespaceVisualizationDialog(dialogOverlay);
        console.log('✅ Whitespace visualization settings applied:', newSettings);
    });
    
    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
        // 元の設定に戻す
        setWhitespaceVisualization(originalSettings);
        closeWhitespaceVisualizationDialog(dialogOverlay);
        console.log('❌ Whitespace visualization settings cancelled');
    });
    
    // ESCキーでキャンセル
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            setWhitespaceVisualization(originalSettings);
            closeWhitespaceVisualizationDialog(dialogOverlay);
        }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            setWhitespaceVisualization(originalSettings);
            closeWhitespaceVisualizationDialog(dialogOverlay);
        }
    });
    
    dialogOverlay.addEventListener('remove', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
}

/**
 * 空白文字可視化設定ダイアログを閉じる
 */
function closeWhitespaceVisualizationDialog(dialogOverlay) {
    try {
        document.body.removeChild(dialogOverlay);
        
        // エディタにフォーカスを戻す
        setTimeout(() => {
            if (editor && editor.focus) {
                editor.focus();
            }
        }, 100);
    } catch (error) {
        console.warn('⚠️ Error closing whitespace visualization dialog:', error);
    }
}

/**
 * 空白文字マーカーを作成
 */
function createWhitespaceMarker(type, x, y, width, height) {
    try {
        // 無効な値の検証
        if (!type || isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
            console.warn('⚠️ Invalid marker parameters:', { type, x, y, width, height });
            return;
        }
        
        // コンテナが存在しない場合はスキップ
        if (!markersContainer || !markersContainer.parentNode) {
            console.warn('⚠️ Markers container not available');
            return;
        }
        
        const marker = document.createElement('div');
        marker.className = `whitespace-marker whitespace-marker-${type}`;
        
        // 基本スタイル
        marker.style.cssText = `
            position: absolute;
            left: ${Math.round(x)}px;
            top: ${Math.round(y)}px;
            width: ${Math.round(width)}px;
            height: ${Math.round(height)}px;
            pointer-events: none;
            z-index: 10;
            box-sizing: border-box;
        `;
        
        // マーカータイプ別のスタイル
        switch (type) {
            case 'fullwidth-space':
                // 全角スペース: 枠線と対角線
                marker.style.border = `1px solid ${whitespaceVisualization.colors.fullWidthSpace}`;
                marker.style.backgroundColor = 'transparent';
                
                // 対角線を追加
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                `;
                svg.setAttribute('viewBox', `0 0 ${Math.round(width)} ${Math.round(height)}`);
                
                const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line1.setAttribute('x1', '2');
                line1.setAttribute('y1', '2');
                line1.setAttribute('x2', (Math.round(width) - 2).toString());
                line1.setAttribute('y2', (Math.round(height) - 2).toString());
                line1.setAttribute('stroke', whitespaceVisualization.colors.fullWidthSpace);
                line1.setAttribute('stroke-width', '1');
                
                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', (Math.round(width) - 2).toString());
                line2.setAttribute('y1', '2');
                line2.setAttribute('x2', '2');
                line2.setAttribute('y2', (Math.round(height) - 2).toString());
                line2.setAttribute('stroke', whitespaceVisualization.colors.fullWidthSpace);
                line2.setAttribute('stroke-width', '1');
                
                svg.appendChild(line1);
                svg.appendChild(line2);
                marker.appendChild(svg);
                break;
                
            case 'halfwidth-space':
                // 半角スペース: 中央のドット
                marker.style.backgroundColor = 'transparent';
                
                const dot = document.createElement('div');
                dot.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 3px;
                    height: 3px;
                    background-color: ${whitespaceVisualization.colors.halfWidthSpace};
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                `;
                marker.appendChild(dot);
                break;
                
            case 'tab':
                // タブ文字: 矢印
                marker.style.backgroundColor = `${whitespaceVisualization.colors.tab}1A`; // 10%透明度
                marker.style.borderBottom = `1px solid ${whitespaceVisualization.colors.tab}80`; // 50%透明度
                
                const arrow = document.createElement('div');
                arrow.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 4px;
                    color: ${whitespaceVisualization.colors.tab};
                    font-size: ${Math.min(16, Math.max(10, Math.round(height * 0.6)))}px;
                    line-height: 1;
                    transform: translateY(-50%);
                    font-family: monospace;
                `;
                arrow.textContent = '→';
                marker.appendChild(arrow);
                break;
                
            default:
                console.warn('⚠️ Unknown marker type:', type);
                return;
        }
        
        markersContainer.appendChild(marker);
        
    } catch (error) {
        console.error('❌ Error creating whitespace marker:', error, { type, x, y, width, height });
    }
}

/**
 * スクロール時のマーカー更新
 */
export function updateWhitespaceMarkersOnScroll() {
    if (!whitespaceVisualization.enabled || !editor || !markersContainer) {
        return;
    }
    
    // スクロール時は即座に更新
    updateWhitespaceMarkers();
}

/**
 * 空白文字可視化設定ダイアログを表示
 */
export function showWhitespaceVisualizationDialog() {
    console.log('👁️ Opening whitespace visualization settings');
    closeAllMenus();
    
    // 既存のダイアログがあれば削除
    const existingDialog = document.getElementById('whitespace-dialog-overlay');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    createWhitespaceVisualizationDialog();
}

/**
 * 空白文字可視化設定ダイアログの作成
 */
function createWhitespaceVisualizationDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'whitespace-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay whitespace-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog whitespace-dialog';
    
    dialog.innerHTML = `
        <div class="search-dialog-header">${t('viewMenu.whitespaceSettings')}</div>
        <div class="search-dialog-content">
            <div class="whitespace-settings-section">
                <div class="search-checkbox-group">
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="ws-enable-checkbox" ${whitespaceVisualization.enabled ? 'checked' : ''}>
                        ${t('whitespace.enable')}
                    </label>
                </div>
                
                <div class="whitespace-color-settings">
                    <h4 style="margin: 16px 0 12px 0; color: #cccccc;">色設定 / Color Settings</h4>
                    
                    <div class="color-setting-group">
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">全角スペース:</label>
                                <input type="color" id="ws-fullwidth-color" value="${whitespaceVisualization.colors.fullWidthSpace}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-fullwidth-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-fullwidth-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-fullwidth-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">半角スペース:</label>
                                <input type="color" id="ws-halfwidth-color" value="${whitespaceVisualization.colors.halfWidthSpace}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-halfwidth-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-halfwidth-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-halfwidth-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">タブ:</label>
                                <input type="color" id="ws-tab-color" value="${whitespaceVisualization.colors.tab}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-tab-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-tab-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-tab-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="whitespace-preview-section">
                    <label style="display: block; margin: 16px 0 8px 0; color: #cccccc;">${t('fonts.preview')}</label>
                    <div class="whitespace-preview">
function example() {
    console.log('Hello');　// 全角スペース
	return 42;    // タブ + 半角スペース
}
                    </div>
                </div>
            </div>
            
            <div class="search-button-group">
                <button id="whitespace-apply-btn" class="search-button search-button-primary">${t('fonts.buttons.apply')}</button>
                <button id="whitespace-cancel-btn" class="search-button search-button-cancel">${t('fonts.buttons.cancel')}</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    setupWhitespaceVisualizationDialogEvents(dialogOverlay);
    
    // 有効/無効チェックボックスにフォーカス
    setTimeout(() => {
        const enableCheckbox = document.getElementById('ws-enable-checkbox');
        if (enableCheckbox) {
            enableCheckbox.focus();
        }
    }, 100);
}

/**
 * 空白文字可視化設定ダイアログのイベント設定
 */
function setupWhitespaceVisualizationDialogEvents(dialogOverlay) {
    const enableCheckbox = document.getElementById('ws-enable-checkbox');
    const applyBtn = document.getElementById('whitespace-apply-btn');
    const cancelBtn = document.getElementById('whitespace-cancel-btn');
    
    // 色設定要素を取得
    const fullwidthColorPicker = document.getElementById('ws-fullwidth-color');
    const halfwidthColorPicker = document.getElementById('ws-halfwidth-color');
    const tabColorPicker = document.getElementById('ws-tab-color');
    
    // RGB入力要素を取得
    const fullwidthRGB = {
        r: document.getElementById('ws-fullwidth-r'),
        g: document.getElementById('ws-fullwidth-g'),
        b: document.getElementById('ws-fullwidth-b')
    };
    const halfwidthRGB = {
        r: document.getElementById('ws-halfwidth-r'),
        g: document.getElementById('ws-halfwidth-g'),
        b: document.getElementById('ws-halfwidth-b')
    };
    const tabRGB = {
        r: document.getElementById('ws-tab-r'),
        g: document.getElementById('ws-tab-g'),
        b: document.getElementById('ws-tab-b')
    };
    
    // 一時的な設定を保存（キャンセル時の復元用）
    const originalSettings = { 
        ...whitespaceVisualization,
        colors: { ...whitespaceVisualization.colors }
    };
    
    // 色とRGB入力の初期化と連動設定
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    function setupColorSync(colorPicker, rgbInputs) {
        // 初期値設定
        const initialRgb = hexToRgb(colorPicker.value);
        if (initialRgb) {
            rgbInputs.r.value = initialRgb.r;
            rgbInputs.g.value = initialRgb.g;
            rgbInputs.b.value = initialRgb.b;
        }
        
        // カラーピッカーからRGB入力へ
        colorPicker.addEventListener('input', () => {
            const rgb = hexToRgb(colorPicker.value);
            if (rgb) {
                rgbInputs.r.value = rgb.r;
                rgbInputs.g.value = rgb.g;
                rgbInputs.b.value = rgb.b;
            }
        });
        
        // RGB入力からカラーピッカーへ
        [rgbInputs.r, rgbInputs.g, rgbInputs.b].forEach(input => {
            input.addEventListener('input', () => {
                const r = parseInt(rgbInputs.r.value) || 0;
                const g = parseInt(rgbInputs.g.value) || 0;
                const b = parseInt(rgbInputs.b.value) || 0;
                colorPicker.value = rgbToHex(
                    Math.max(0, Math.min(255, r)),
                    Math.max(0, Math.min(255, g)),
                    Math.max(0, Math.min(255, b))
                );
            });
        });
    }
    
    // 各色設定の連動を設定
    setupColorSync(fullwidthColorPicker, fullwidthRGB);
    setupColorSync(halfwidthColorPicker, halfwidthRGB);
    setupColorSync(tabColorPicker, tabRGB);
    
    // 適用ボタン
    applyBtn.addEventListener('click', () => {
        const newSettings = {
            enabled: enableCheckbox.checked,
            showFullWidthSpace: true,   // 常に有効
            showHalfWidthSpace: true,   // 常に有効  
            showTab: true,              // 常に有効
            colors: {
                fullWidthSpace: fullwidthColorPicker.value,
                halfWidthSpace: halfwidthColorPicker.value,
                tab: tabColorPicker.value
            }
        };
        
        setWhitespaceVisualization(newSettings);
        updateWhitespaceVisualizationMenuState(newSettings.enabled);
        
        // マーカーコンテナを再作成
        createMarkersContainer();
        
        if (newSettings.enabled) {
            setTimeout(() => {
                updateWhitespaceMarkers();
            }, 100);
        } else {
            removeAllMarkers();
        }
        
        closeWhitespaceVisualizationDialog(dialogOverlay);
        console.log('✅ Whitespace visualization settings applied:', newSettings);
    });
    
    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
        // 元の設定に戻す
        setWhitespaceVisualization(originalSettings);
        closeWhitespaceVisualizationDialog(dialogOverlay);
        console.log('❌ Whitespace visualization settings cancelled');
    });
    
    // ESCキーでキャンセル
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            setWhitespaceVisualization(originalSettings);
            closeWhitespaceVisualizationDialog(dialogOverlay);
        }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            setWhitespaceVisualization(originalSettings);
            closeWhitespaceVisualizationDialog(dialogOverlay);
        }
    });
    
    dialogOverlay.addEventListener('remove', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
}

/**
 * 空白文字可視化設定ダイアログを閉じる
 */
function closeWhitespaceVisualizationDialog(dialogOverlay) {
    try {
        document.body.removeChild(dialogOverlay);
        
        // エディタにフォーカスを戻す
        setTimeout(() => {
            if (editor && editor.focus) {
                editor.focus();
            }
        }, 100);
    } catch (error) {
        console.warn('⚠️ Error closing whitespace visualization dialog:', error);
    }
}