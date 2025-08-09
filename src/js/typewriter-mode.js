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
        console.log('💾 Typewriter mode setting saved:', isEnabled);
    } catch (e) {
        console.warn('⚠️ Could not save typewriter mode setting:', e);
    }
    
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
    
    // カーソル位置を取得
    const cursorPos = editorElement.selectionStart;
    
    // 一時的な要素でカーソル位置の高さを測定
    const measurer = document.createElement('div');
    const editorStyle = window.getComputedStyle(editorElement);
    
    // エディタと同じスタイルを適用
    measurer.style.position = 'absolute';
    measurer.style.left = '-9999px';
    measurer.style.top = '0';
    measurer.style.width = editorElement.clientWidth + 'px';
    measurer.style.font = editorStyle.font;
    measurer.style.fontSize = editorStyle.fontSize;
    measurer.style.fontFamily = editorStyle.fontFamily;
    measurer.style.lineHeight = editorStyle.lineHeight;
    measurer.style.whiteSpace = 'pre-wrap';
    measurer.style.wordBreak = 'break-word';
    measurer.style.overflowWrap = 'break-word';
    measurer.style.padding = editorStyle.padding;
    measurer.style.border = editorStyle.border;
    measurer.style.boxSizing = editorStyle.boxSizing;
    
    // カーソル位置までのテキストを入れて高さを測定
    measurer.textContent = editorElement.value.substring(0, cursorPos);
    document.body.appendChild(measurer);
    
    const cursorTop = measurer.offsetHeight;
    
    // カーソル位置にマーカーを追加して現在行の高さを測定
    measurer.innerHTML = '';
    const beforeText = document.createTextNode(editorElement.value.substring(0, cursorPos));
    const marker = document.createElement('span');
    marker.textContent = '|';
    const afterText = document.createTextNode(editorElement.value.substring(cursorPos));
    
    measurer.appendChild(beforeText);
    measurer.appendChild(marker);
    measurer.appendChild(afterText);
    
    const markerRect = marker.getBoundingClientRect();
    const measuterRect = measurer.getBoundingClientRect();
    const markerRelativeTop = markerRect.top - measuterRect.top;
    
    document.body.removeChild(measurer);
    
    // エディタの中央位置を計算
    const editorCenter = editorElement.clientHeight / 2;
    
    // スクロール位置を計算
    const targetScrollTop = markerRelativeTop - editorCenter + (parseFloat(editorStyle.lineHeight) / 2);
    
    // スクロールを実行
    editorElement.scrollTop = Math.max(0, targetScrollTop);
    
    // 行番号を同期
    if (lineNumbersElement) {
        lineNumbersElement.scrollTop = editorElement.scrollTop;
    }
}

/**
 * 初期化
 */
export function initTypewriterMode() {
    try {
        // ローカルストレージから設定を読み込み
        const saved = localStorage.getItem('vinsert-typewriter-mode');
        console.log('📂 Loading typewriter mode setting:', saved);
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