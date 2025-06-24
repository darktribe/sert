// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/*
 * =====================================================
 * Sert Editor - Rustバックエンド
 * Python拡張機能対応のシンプルなテキストエディタ
 * =====================================================
 */

use pyo3::prelude::*;
use pyo3::types::PyDict;

// =====================================================
// Python統合機能（PyO3）
// =====================================================

/**
 * PyO3の基本テスト関数
 * Python環境が正常に動作するかテストする
 */
#[tauri::command]
fn test_python() -> Result<String, String> {
    Python::with_gil(|py| {
        let result = py.eval_bound("2 + 2", None, None);
        match result {
            Ok(val) => Ok(format!("Python result: {}", val)),
            Err(e) => Err(format!("Python error: {}", e)),
        }
    })
}

/**
 * 任意のPythonコードを実行
 * 機能拡張で使用される予定
 */
#[tauri::command]
fn execute_python(code: String) -> Result<String, String> {
    Python::with_gil(|py| {
        let locals = PyDict::new_bound(py);
        match py.run_bound(&code, None, Some(&locals)) {
            Ok(_) => {
                // 結果を取得する場合（例：最後の変数の値）
                match locals.get_item("result") {
                    Ok(Some(val)) => Ok(format!("{}", val)),
                    _ => Ok("Code executed successfully".to_string()),
                }
            },
            Err(e) => Err(format!("Python execution error: {}", e)),
        }
    })
}

/**
 * Python式を評価する関数
 * 機能拡張で使用される予定
 */
#[tauri::command]
fn evaluate_python_expression(expression: String) -> Result<String, String> {
    Python::with_gil(|py| {
        match py.eval_bound(&expression, None, None) {
            Ok(val) => Ok(format!("{}", val)),
            Err(e) => Err(format!("Python evaluation error: {}", e)),
        }
    })
}

/**
 * Pythonファイルを実行する関数
 * 機能拡張読み込みで使用される予定
 */
#[tauri::command]
fn run_python_file(file_path: String) -> Result<String, String> {
    Python::with_gil(|py| {
        match std::fs::read_to_string(&file_path) {
            Ok(code) => {
                let locals = PyDict::new_bound(py);
                match py.run_bound(&code, None, Some(&locals)) {
                    Ok(_) => Ok("Python file executed successfully".to_string()),
                    Err(e) => Err(format!("Python file execution error: {}", e)),
                }
            },
            Err(e) => Err(format!("Failed to read Python file: {}", e)),
        }
    })
}

/**
 * Pythonのバージョン情報を取得
 * デバッグ・環境確認用
 */
#[tauri::command]
fn get_python_info() -> Result<String, String> {
    Python::with_gil(|py| {
        let code = "import sys\nresult = sys.version";
        let locals = PyDict::new_bound(py);
        match py.run_bound(code, None, Some(&locals)) {
            Ok(_) => {
                match locals.get_item("result") {
                    Ok(Some(version)) => Ok(format!("Python version: {}", version)),
                    _ => Err("Could not get version info".to_string()),
                }
            },
            Err(e) => Err(format!("Failed to get Python info: {}", e)),
        }
    })
}

// =====================================================
// アプリケーション制御
// =====================================================

/**
 * アプリケーション終了コマンド
 * 即座に強制終了する
 */
#[tauri::command]
fn exit_app() {
    println!("🔥 Exit app command called - immediate shutdown");
    std::process::exit(0);
}

// =====================================================
// クリップボード操作（クロスプラットフォーム対応）
// =====================================================

/**
 * クリップボードにテキストを書き込む
 * Windows/macOS/Linux対応
 */
#[tauri::command]
fn write_clipboard(text: String) -> Result<(), String> {
    println!("📋 Writing to clipboard: {} characters", text.len());
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let mut child = Command::new("cmd")
            .args(["/C", "echo", &text, "|", "clip"])
            .spawn()
            .map_err(|e| format!("Failed to spawn clipboard command: {}", e))?;
        
        let status = child.wait()
            .map_err(|e| format!("Failed to wait for clipboard command: {}", e))?;
        
        if status.success() {
            println!("✅ Clipboard write successful (Windows)");
            Ok(())
        } else {
            Err("Clipboard write failed (Windows)".to_string())
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::{Command, Stdio};
        use std::io::Write;
        
        let mut child = Command::new("pbcopy")
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn pbcopy: {}", e))?;
        
        if let Some(stdin) = child.stdin.as_mut() {
            stdin.write_all(text.as_bytes())
                .map_err(|e| format!("Failed to write to pbcopy: {}", e))?;
        }
        
        let status = child.wait()
            .map_err(|e| format!("Failed to wait for pbcopy: {}", e))?;
        
        if status.success() {
            println!("✅ Clipboard write successful (macOS)");
            Ok(())
        } else {
            Err("Clipboard write failed (macOS)".to_string())
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::{Command, Stdio};
        use std::io::Write;
        
        // xclipを試行
        let mut child = Command::new("xclip")
            .args(["-selection", "clipboard"])
            .stdin(Stdio::piped())
            .spawn();
        
        if let Ok(mut child_proc) = child {
            if let Some(stdin) = child_proc.stdin.as_mut() {
                if stdin.write_all(text.as_bytes()).is_ok() {
                    if let Ok(status) = child_proc.wait() {
                        if status.success() {
                            println!("✅ Clipboard write successful (Linux/xclip)");
                            return Ok(());
                        }
                    }
                }
            }
        }
        
        // xclipが失敗した場合、xselを試行
        let mut child = Command::new("xsel")
            .args(["-b", "-i"])
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn xsel: {}", e))?;
        
        if let Some(stdin) = child.stdin.as_mut() {
            stdin.write_all(text.as_bytes())
                .map_err(|e| format!("Failed to write to xsel: {}", e))?;
        }
        
        let status = child.wait()
            .map_err(|e| format!("Failed to wait for xsel: {}", e))?;
        
        if status.success() {
            println!("✅ Clipboard write successful (Linux/xsel)");
            Ok(())
        } else {
            Err("Clipboard write failed (Linux)".to_string())
        }
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Clipboard operation not supported on this platform".to_string())
    }
}

/**
 * クリップボードからテキストを読み込む
 * Windows/macOS/Linux対応
 */
#[tauri::command]
fn read_clipboard() -> Result<String, String> {
    println!("📋 Reading from clipboard");
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let output = Command::new("powershell")
            .args(["-Command", "Get-Clipboard"])
            .output()
            .map_err(|e| format!("Failed to execute clipboard read command: {}", e))?;
        
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
            println!("✅ Clipboard read successful (Windows): {} characters", text.len());
            Ok(text)
        } else {
            Err("Clipboard read failed (Windows)".to_string())
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let output = Command::new("pbpaste")
            .output()
            .map_err(|e| format!("Failed to execute pbpaste: {}", e))?;
        
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout).to_string();
            println!("✅ Clipboard read successful (macOS): {} characters", text.len());
            Ok(text)
        } else {
            Err("Clipboard read failed (macOS)".to_string())
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        
        // xclipを試行
        let output = Command::new("xclip")
            .args(["-selection", "clipboard", "-o"])
            .output();
        
        if let Ok(output) = output {
            if output.status.success() {
                let text = String::from_utf8_lossy(&output.stdout).to_string();
                println!("✅ Clipboard read successful (Linux/xclip): {} characters", text.len());
                return Ok(text);
            }
        }
        
        // xclipが失敗した場合、xselを試行
        let output = Command::new("xsel")
            .args(["-b", "-o"])
            .output()
            .map_err(|e| format!("Failed to execute xsel: {}", e))?;
        
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout).to_string();
            println!("✅ Clipboard read successful (Linux/xsel): {} characters", text.len());
            Ok(text)
        } else {
            Err("Clipboard read failed (Linux)".to_string())
        }
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Clipboard operation not supported on this platform".to_string())
    }
}

// =====================================================
// ファイル操作（読み書きのみ、ダイアログはJavaScript側で処理）
// =====================================================

/**
 * ファイルを読み込む
 */
#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    println!("📖 Reading file: {}", path);
    
    match std::fs::read_to_string(&path) {
        Ok(content) => {
            println!("✅ File read successfully: {} characters", content.len());
            Ok(content)
        },
        Err(e) => {
            let error_msg = format!("Failed to read file '{}': {}", path, e);
            println!("❌ {}", error_msg);
            Err(error_msg)
        }
    }
}

/**
 * ファイルに書き込む
 */
#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    println!("💾 Writing file: {} ({} characters)", path, content.len());
    
    match std::fs::write(&path, &content) {
        Ok(_) => {
            println!("✅ File written successfully: {}", path);
            Ok(())
        },
        Err(e) => {
            let error_msg = format!("Failed to write file '{}': {}", path, e);
            println!("❌ {}", error_msg);
            Err(error_msg)
        }
    }
}

// =====================================================
// メイン関数とアプリケーション設定
// =====================================================

fn main() {
    // PyO3の初期化
    pyo3::prepare_freethreaded_python();
    
    tauri::Builder::default()
        // プラグインの初期化
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        
        // Tauriコマンドの登録
        .invoke_handler(tauri::generate_handler![
            // Python関連
            test_python,
            execute_python,
            evaluate_python_expression,
            run_python_file,
            get_python_info,
            
            // アプリケーション制御
            exit_app,
            
            // クリップボード操作
            write_clipboard,
            read_clipboard,
            
            // ファイル操作
            read_file,
            write_file
        ])
        
        // アプリケーション初期化処理
        .setup(|_app| {
            println!("🚀 Sert Editor starting up...");
            
            // PyO3の初期化テスト
            println!("🐍 Testing PyO3 integration...");
            match test_python() {
                Ok(result) => println!("✅ PyO3 test successful: {}", result),
                Err(e) => println!("❌ PyO3 test failed: {}", e),
            }
            
            // Python環境情報の表示
            match get_python_info() {
                Ok(info) => println!("✅ {}", info),
                Err(e) => println!("❌ Python info error: {}", e),
            }
            
            println!("📋 Clipboard operations enabled");
            println!("📁 File operations enabled (JavaScript-based dialogs)");
            println!("🎯 Sert Editor ready!");
            
            Ok(())
        })
        
        // アプリケーション実行
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}