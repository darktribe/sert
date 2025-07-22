/**
 * =====================================================
 * Vinsert Editor - テキスト入力処理（行番号キャッシュクリア対応版）
 * =====================================================
 */
import {
    editor,
    isUndoRedoOperation,
    setIsUndoRedoOperation,
    isComposing,
    justFinishedComposition,
    currentContent,
    setCurrentContent,
    isModified,
    setIsModified,
    redoStack
} from './globals.js';
import { saveToUndoStack } from './undo-redo.js';
import { updateLineNumbers, updateStatus, clearLineNumberCache } from './ui-updater.js';
import { onInputEvent } from './typewriter-mode.js';

/**
 * テキスト入力時の処理
 * アンドゥ履歴の管理と画面更新を行う
 * タイプライターモードが有効な場合は適切なタイミングでスクロール
 */
export function handleInput(e) {
    console.log('=== INPUT EVENT ===');
    console.log('Input type:', e.inputType);
    console.log('Current content before update:', JSON.stringify(currentContent.substring(0, 50)) + '...');
    console.log('New editor content length:', editor.value.length);
    
    // アンドゥ・リドゥ操作中は履歴作成をスキップ
    if (isUndoRedoOperation) {
        console.log('Skipping history - undo/redo operation');
        setIsUndoRedoOperation(false);
        
        // キャッシュをクリアして行番号を更新
        clearLineNumberCache();
        updateLineNumbers();
        updateStatus();
        
        // タイプライターモード適用（アンドゥ・リドゥ時）
        setTimeout(() => {
            onInputEvent();
        }, 10);
        
        return;
    }

    // IME変換中は履歴作成をスキップ（ただしタイプライターモードは適用）
    if (isComposing) {
        console.log('Skipping history - IME composing');
        
        // IME変換中でもキャッシュクリアと行番号更新は行う
        clearLineNumberCache();
        updateLineNumbers();
        updateStatus();
        
        // IME変換中でもタイプライターモード適用
        setTimeout(() => {
            onInputEvent();
        }, 10);
        
        return;
    }

    // IME確定直後の入力は履歴作成をスキップ
    if (justFinishedComposition) {
        console.log('Skipping history - just finished IME composition');
        
        setCurrentContent(editor.value);
        
        // IME確定後もキャッシュクリアと行番号更新
        clearLineNumberCache();
        updateLineNumbers();
        updateStatus();
        
        // IME確定後のタイプライターモード適用
        setTimeout(() => {
            onInputEvent();
        }, 10);
        
        return;
    }

    const newContent = editor.value;
    const cursorPosition = editor.selectionStart;
    
    console.log('Content comparison:', {
        oldLength: currentContent.length,
        newLength: newContent.length,
        changed: newContent !== currentContent
    });

    if (newContent !== currentContent) {
        if (!isModified) {
            setIsModified(true);
        }

        // 【重要】変更後の内容を履歴に保存（空白も含む）
        console.log('=== SAVING TO HISTORY ===');
        console.log('Saving new content to history, length:', newContent.length);
        console.log('Cursor position:', cursorPosition);
        
        saveToUndoStack(newContent, cursorPosition);
        setCurrentContent(newContent);
        
        // リドゥスタックをクリア
        redoStack.length = 0;
        console.log('Redo stack cleared');
    } else {
        console.log('Content unchanged, not saving to history');
    }

    // テキストが変更された場合は常にキャッシュをクリア
    if (newContent !== currentContent || newContent.length !== currentContent.length) {
        console.log('📝 Clearing line number cache due to content change');
        clearLineNumberCache();
    }

    updateLineNumbers();
    updateStatus();
    
    // タイプライターモード適用（通常の入力時）
    // 入力の種類に応じて適切なタイミングで実行
    const inputType = e.inputType;
    let delay = 10;
    
    // 特定の入力タイプでは即座に実行
    if (inputType === 'insertLineBreak' || inputType === 'insertParagraph') {
        delay = 5; // 改行は即座に
    } else if (inputType === 'insertText' || inputType === 'insertCompositionText') {
        delay = 15; // 通常入力は少し遅延
    } else if (inputType === 'deleteContentBackward' || inputType === 'deleteContentForward') {
        delay = 20; // 削除は少し多めに遅延
    }
    
    setTimeout(() => {
        onInputEvent();
    }, delay);
    
    console.log('=== END INPUT EVENT ===');
}