// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/*
 * =====================================================
 * Vinsert Editor - Rustバックエンド
 * Python拡張機能対応のシンプルなテキストエディタ
 * =====================================================
 */

use pyo3::prelude::*;
use pyo3::types::PyDict;
use tauri::Manager;

static mut PYTHON_TYPE: PythonType = PythonType::Unknown;

#[derive(Debug, Clone, Copy, PartialEq)]
#[allow(dead_code)] // Embedded は将来のPyOxidizer統合で使用予定
enum PythonType {
    Unknown,
    Embedded, // 将来のPyOxidizer埋め込みPython用
    System,
}

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
        
        // 標準出力をキャプチャするための設定
        let sys = py.import_bound("sys").map_err(|e| format!("Failed to import sys: {}", e))?;
        let io_module = py.import_bound("io").map_err(|e| format!("Failed to import io: {}", e))?;
        let string_io = io_module.getattr("StringIO").map_err(|e| format!("Failed to get StringIO: {}", e))?;
        let output_buffer = string_io.call0().map_err(|e| format!("Failed to create StringIO: {}", e))?;
        
        // 標準出力を一時的にStringIOにリダイレクト
        let original_stdout = sys.getattr("stdout").map_err(|e| format!("Failed to get stdout: {}", e))?;
        sys.setattr("stdout", &output_buffer).map_err(|e| format!("Failed to redirect stdout: {}", e))?;
        
        let locals = PyDict::new_bound(py);
        let result = py.run_bound(&code, None, Some(&locals));
        
        // 標準出力を元に戻す
        sys.setattr("stdout", original_stdout).map_err(|e| format!("Failed to restore stdout: {}", e))?;
        
        // 出力を取得
        let output = output_buffer.call_method0("getvalue")
            .map_err(|e| format!("Failed to get output: {}", e))?
            .to_string();
        
        match result {
            Ok(_) => {
                // printされた内容を返す
                if !output.is_empty() {
                    Ok(output.trim().to_string())
                } else {
                    // 結果を取得する場合（例：最後の変数の値）
                    match locals.get_item("result") {
                        Ok(Some(val)) => Ok(format!("{}", val)),
                        _ => Ok("Code executed successfully".to_string()),
                    }
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
 * Python詳細情報を取得（PyO3 0.22.6対応版）
 */
#[tauri::command]
fn get_python_info() -> Result<String, String> {
    Python::with_gil(|py| {
        let python_type = unsafe { PYTHON_TYPE };
        let type_str = match python_type {
            PythonType::Embedded => "EMBEDDED (アプリ内蔵)",
            PythonType::System => "SYSTEM (ユーザー環境)",
            PythonType::Unknown => "UNKNOWN (不明)",
        };
        
        // sysモジュールをインポート
        let sys = py.import_bound("sys").map_err(|e| format!("Failed to import sys: {}", e))?;
        let platform = py.import_bound("platform").map_err(|e| format!("Failed to import platform: {}", e))?;
        
        // バージョン情報を取得
        let version = sys
            .getattr("version")
            .and_then(|v| v.extract::<String>())
            .unwrap_or_else(|_| "Unknown".to_string());
        
        // 実行ファイルパスを取得
        let executable = sys
            .getattr("executable")
            .and_then(|v| v.extract::<String>())
            .unwrap_or_else(|_| "Unknown".to_string());
        
        // Python実装を取得
        let implementation = platform
            .call_method0("python_implementation")
            .and_then(|v| v.extract::<String>())
            .unwrap_or_else(|_| "Unknown".to_string());
        
        // PyOxidizerチェック
        let has_oxidizer = sys
            .getattr("modules")
            .and_then(|modules| modules.contains("oxidized_importer"))
            .unwrap_or(false);
        
        // バージョン番号のみを抽出
        let version_number = version.split_whitespace().next().unwrap_or("Unknown");
        
        // パスタイプの判定
        let path_type = if executable.contains("/Applications/") || executable.contains(".app/") {
            "app_bundle"
        } else if executable.starts_with("/usr/") || executable.starts_with("/opt/") || executable.starts_with("/System/") {
            "system_path"
        } else {
            "user_path"
        };
        
        let result = format!(
            "🐍 Python Environment Details 🐍\n\n\
            Type: {}\n\
            Version: {} ({})\n\
            Executable: {}\n\
            Path Type: {}\n\
            PyOxidizer: {}\n\n\
            Status: {} detected and working correctly!",
            type_str,
            version_number,
            implementation,
            executable,
            path_type,
            if has_oxidizer { "Yes (Embedded)" } else { "No (System)" },
            if has_oxidizer { "Embedded Python" } else { "System Python" }
        );
        
        Ok(result)
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
        use std::process::{Command, Stdio};
        use std::io::Write;
        
        let mut child = Command::new("powershell")
            .args(["-Command", "Set-Clipboard"])
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn powershell: {}", e))?;
        
        if let Some(stdin) = child.stdin.as_mut() {
            stdin.write_all(text.as_bytes())
                .map_err(|e| format!("Failed to write to powershell: {}", e))?;
        }
        
        let status = child.wait()
            .map_err(|e| format!("Failed to wait for powershell: {}", e))?;
        
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

/**
 * フォルダを開く（クロスプラットフォーム対応）
 */
#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    println!("📁 Opening folder: {}", path);
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        let result = Command::new("explorer")
            .arg(&path)
            .spawn();
        
        match result {
            Ok(mut child) => {
                // プロセスが正常に起動したかチェック
                match child.try_wait() {
                    Ok(Some(status)) => {
                        // 即座に終了した場合はステータスをチェック
                        if status.success() {
                            println!("✅ Folder opened successfully (Windows)");
                            Ok(())
                        } else {
                            println!("⚠️ Explorer exited with non-zero status, but folder might have opened");
                            Ok(()) // Windows explorerは既に開いているフォルダでも非ゼロで終了することがある
                        }
                    },
                    Ok(None) => {
                        // プロセスがまだ実行中（正常）
                        println!("✅ Folder opened successfully (Windows)");
                        Ok(())
                    },
                    Err(e) => {
                        println!("⚠️ Could not check process status: {}, but explorer started", e);
                        Ok(()) // プロセスは起動したので成功とみなす
                    }
                }
            },
            Err(e) => {
                Err(format!("Failed to start explorer: {}", e))
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let status = Command::new("open")
            .arg(&path)
            .status()
            .map_err(|e| format!("Failed to execute open command: {}", e))?;
        
        if status.success() {
            println!("✅ Folder opened successfully (macOS)");
            Ok(())
        } else {
            Err("Failed to open folder (macOS)".to_string())
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        let status = Command::new("xdg-open")
            .arg(&path)
            .status()
            .map_err(|e| format!("Failed to execute xdg-open command: {}", e))?;
        
        if status.success() {
            println!("✅ Folder opened successfully (Linux)");
            Ok(())
        } else {
            Err("Failed to open folder (Linux)".to_string())
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err("Unsupported operating system".to_string())
    }
}

// =====================================================
// メイン関数とアプリケーション設定
// =====================================================

fn initialize_python() -> PythonType {
    // PyO3 0.22.6のauto-initializeフィーチャーを使用
    // pyo3::prepare_freethreaded_python()は不要（auto-initializeが自動処理）
    
    // Python環境を詳細に確認
    let python_type = detect_python_environment();
    println!("🐍 Python初期化完了: {:?}", python_type);
    python_type
}

/**
 * Python環境の詳細を検出・確認する関数
 */
/**
 * Python環境の詳細を検出・確認する関数（PyO3 0.22.6完全対応版）
 */
/**
 * Python環境の詳細を検出・確認する関数（緊急修正版）
 */
fn detect_python_environment() -> PythonType {
    println!("=== Python環境詳細情報（緊急修正版） ===");
    
    // 最小限のPython情報取得
    match Python::with_gil(|py| -> Result<(), PyErr> {
        // 基本的なテスト
        let simple_test = py.eval_bound("2 + 2", None, None)?;
        println!("🐍 Python基本テスト: {}", simple_test);
        
        // バージョン取得（分離）
        py.run_bound("import sys", None, None)?;
        let version = py.eval_bound("sys.version", None, None)?;
        println!("🐍 Python version: {}", version);
        
        let executable = py.eval_bound("sys.executable", None, None)?;
        println!("🐍 Python executable: {}", executable);
        
        Ok(())
    }) {
        Ok(_) => {
            println!("✅ Python環境確認成功（簡易版）");
            println!("📊 判定: SYSTEM Python（動作確認済み）");
            PythonType::System
        },
        Err(e) => {
            println!("❌ Python環境確認エラー: {}", e);
            PythonType::Unknown
        }
    }
}

fn main() {
    // Pythonの初期化
    let python_type = initialize_python();
    unsafe {
        PYTHON_TYPE = python_type;
    }
    
    tauri::Builder::default()
        // プラグインの初期化
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        
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
            write_file,
            
            // フォルダを開く（カスタムコマンド）
            open_folder
        ])
        
        // アプリケーション初期化処理
        .setup(|app| {
            println!("🚀 Sert Editor starting up...");
            
            // ウィンドウの取得と設定
            let windows = app.webview_windows();
            if let Some(_window) = windows.get("main") {
                println!("✅ Main window found and configured for multi-display support");
                
                // ウィンドウの基本設定はtauri.conf.jsonで設定済みのため、
                // ここでは追加の設定は不要
                
                #[cfg(target_os = "macos")]
                {
                    println!("🖥️ macOS multi-display support enabled via configuration");
                }
                
                #[cfg(not(target_os = "macos"))]
                {
                    println!("🖥️ Multi-display support enabled via configuration");
                }
            } else {
                println!("⚠️ Main window not found, using default configuration");
            }
            
            // PyO3の初期化テスト
            println!("🐍 Testing PyO3 integration...");
            match test_python() {
                Ok(result) => println!("✅ PyO3 test successful: {}", result),
                Err(e) => println!("❌ PyO3 test failed: {}", e),
            }
            
            // Python環境情報の詳細表示
println!("=== Python Environment Verification ===");
match get_python_info() {
    Ok(info) => {
        // 詳細情報をコンソールに表示
        println!("✅ Python環境詳細情報:\n{}", info);
        
        let python_type = unsafe { PYTHON_TYPE };
        match python_type {
            PythonType::Embedded => {
                println!("🎯 検出結果: EMBEDDED Python (アプリ内蔵)");
                println!("📦 This app includes embedded Python interpreter");
                println!("✨ PyOxidizer or similar embedding detected");
            },
            PythonType::System => {
                println!("🎯 検出結果: SYSTEM Python (ユーザー環境)");
                println!("💻 Using user's Python installation");
                println!("📍 Python is loaded from system/user environment");
            },
            PythonType::Unknown => {
                println!("🎯 検出結果: UNKNOWN Python環境");
                println!("⚠️ Could not determine Python source");
            }
        }
        
        // 追加のテスト実行
        println!("🧪 Running additional Python verification tests...");
        match test_python() {
            Ok(test_result) => println!("✅ Python test passed: {}", test_result),
            Err(test_error) => println!("❌ Python test failed: {}", test_error),
        }
    },
    Err(e) => {
        println!("❌ Python環境情報取得エラー: {}", e);
        println!("🔧 Troubleshooting: Check if Python is properly installed");
    }
}
println!("=== End Python Verification ===");
            
            println!("📋 Clipboard operations enabled");
            println!("📁 File operations enabled (JavaScript-based dialogs)");
            println!("🎯 Sert Editor ready!");
            
            Ok(())
        })
        
        // アプリケーション実行
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}