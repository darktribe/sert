/*
 * =====================================================
 * Vinsert Editor - タイプライターモード機能
 * =====================================================
 */

let isEnabled = false;
let editorElement = null;
let lineNumbersElement = null;
let animationFrame = null;

/**
 * タイプライターモードの切り替え
 */
export function toggleTypewriterMode() {
    editorElement = document.getElementById('editor');
    lineNumbersElement = document.getElementById('line-numbers');
    
    if (!editorElement) return;
    
    isEnabled = !isEnabled;
    
    // メニューのチェックマーク更新
    updateMenuCheckmark();
    
    // 保存
    try {
        localStorage.setItem('vinsert-typewriter-mode', isEnabled ? 'true' : 'false');
    } catch (e) {}
    
    if (isEnabled) {
        // パディング追加
        const halfHeight = Math.floor(editorElement.clientHeight / 2);
        editorElement.style.paddingTop = `${halfHeight}px`;
        editorElement.style.paddingBottom = `${halfHeight}px`;
        if (lineNumbersElement) {
            lineNumbersElement.style.paddingTop = `${halfHeight}px`;
            lineNumbersElement.style.paddingBottom = `${halfHeight}px`;
        }
        
        // 継続的な監視を開始
        startContinuousCenter();
    } else {
        // パディングを元に戻す
        editorElement.style.paddingTop = '10px';
        editorElement.style.paddingBottom = '10px';
        if (lineNumbersElement) {
            lineNumbersElement.style.paddingTop = '10px';
            lineNumbersElement.style.paddingBottom = '10px';
        }
        
        // 監視を停止
        stopContinuousCenter();
    }
    
    // メニューを閉じる
    document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
}

/**
 * メニューのチェックマーク更新
 */
function updateMenuCheckmark() {
    const menuOption = document.getElementById('typewriter-mode-menu-option');
    if (menuOption) {
        const checkmark = menuOption.querySelector('.menu-checkmark');
        if (checkmark) {
            checkmark.style.visibility = isEnabled ? 'visible' : 'hidden';
        }
    }
}

/**
 * 継続的にカーソル位置を中央に保つ
 */
function startContinuousCenter() {
    // 前回のループをキャンセル
    stopContinuousCenter();
    
    function centerLoop() {
        if (!isEnabled) return;
        
        centerCurrentLine();
        animationFrame = requestAnimationFrame(centerLoop);
    }
    
    centerLoop();
}

/**
 * 継続的な中央配置を停止
 */
function stopContinuousCenter() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}

/**
 * 現在のカーソル位置の物理行を中央に配置
 */
function centerCurrentLine() {
    if (!editorElement || !isEnabled) return;
    
    try {
        // カーソル位置を取得
        const cursorPos = editorElement.selectionStart;
        
        // カーソルの物理的な位置を正確に計算
        const physicalCursorTop = calculatePhysicalCursorPosition(cursorPos);
        
        // エディタの中央位置を計算
        const editorCenter = editorElement.clientHeight / 2;
        
        // カーソルが表示されている物理行を中央に配置
        const targetScrollTop = physicalCursorTop - editorCenter;
        
        // スクロールを実行
        editorElement.scrollTop = Math.max(0, targetScrollTop);
        
        // 行番号を同期
        if (lineNumbersElement) {
            lineNumbersElement.scrollTop = editorElement.scrollTop;
        }
        
        // タイプライターモードでは行番号位置を更新
        updateLineNumbersForTypewriter();
        
        console.log(`Typewriter: centered physical cursor position ${physicalCursorTop}, scroll: ${editorElement.scrollTop}`);
        
    } catch (error) {
        console.error('❌ Error in centerCurrentLine:', error);
    }
}

/**
 * カーソルの物理的な位置を計算
 */
function calculatePhysicalCursorPosition(cursorPos) {
    try {
        const computedStyle = window.getComputedStyle(editorElement);
        const actualPaddingTop = parseFloat(editorElement.style.paddingTop) || parseFloat(computedStyle.paddingTop);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editorElement.clientWidth - paddingLeft - paddingRight;
        
        // 測定用要素を作成
        const measurer = document.createElement('div');
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
        
        // カーソル位置にマーカーを挿入して正確な位置を取得
        const textBeforeCursor = editorElement.value.substring(0, cursorPos);
        const textAfterCursor = editorElement.value.substring(cursorPos);
        
        const beforeNode = document.createTextNode(textBeforeCursor);
        const cursorMarker = document.createElement('span');
        cursorMarker.textContent = '|';
        const afterNode = document.createTextNode(textAfterCursor);
        
        measurer.appendChild(beforeNode);
        measurer.appendChild(cursorMarker);
        measurer.appendChild(afterNode);
        
        const markerRect = cursorMarker.getBoundingClientRect();
        const measurerRect = measurer.getBoundingClientRect();
        const relativeTop = markerRect.top - measurerRect.top;
        
        document.body.removeChild(measurer);
        
        return actualPaddingTop + relativeTop;
        
    } catch (error) {
        console.error('Error calculating physical cursor position:', error);
        // フォールバック
        const computedStyle = window.getComputedStyle(editorElement);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const actualPaddingTop = parseFloat(editorElement.style.paddingTop) || parseFloat(computedStyle.paddingTop);
        const textBeforeCursor = editorElement.value.substring(0, cursorPos);
        const logicalLine = textBeforeCursor.split('\n').length;
        return actualPaddingTop + (logicalLine - 1) * lineHeight;
    }
}

/**
 * タイプライターモード用の行番号更新
 */
function updateLineNumbersForTypewriter() {
    if (!isEnabled || !editorElement) return;
    
    try {
        // 行番号更新を遅延実行（スクロール完了後）
        setTimeout(() => {
            try {
                // ui-updater.jsのupdateLineNumbers関数を動的インポートで呼び出し
                import('./ui-updater.js').then(module => {
                    if (module && module.updateLineNumbers) {
                        module.updateLineNumbers();
                    }
                });
            } catch (error) {
                console.warn('⚠️ Failed to update line numbers:', error);
            }
        }, 10);
    } catch (error) {
        console.warn('⚠️ updateLineNumbersForTypewriter failed:', error);
    }
}


/**
 * 初期化
 */
export function initTypewriterMode() {
    try {
        // ローカルストレージから設定を読み込み
        const saved = localStorage.getItem('vinsert-typewriter-mode');
        if (saved === 'true') {
            isEnabled = true;
            
            // DOM要素を取得
            editorElement = document.getElementById('editor');
            lineNumbersElement = document.getElementById('line-numbers');
            
            // メニューのチェックマークを更新
            updateMenuCheckmark();
            
            if (editorElement) {
                // パディング追加
                const halfHeight = Math.floor(editorElement.clientHeight / 2);
                editorElement.style.paddingTop = `${halfHeight}px`;
                editorElement.style.paddingBottom = `${halfHeight}px`;
                if (lineNumbersElement) {
                    lineNumbersElement.style.paddingTop = `${halfHeight}px`;
                    lineNumbersElement.style.paddingBottom = `${halfHeight}px`;
                }
                
                // 継続的な監視を開始
                startContinuousCenter();
            }
        } else {
            // 無効な場合もメニューのチェックマークを更新
            isEnabled = false;
            updateMenuCheckmark();
        }
    } catch (e) {
        console.warn('Could not load typewriter mode setting:', e);
        isEnabled = false;
        updateMenuCheckmark();
    }
}