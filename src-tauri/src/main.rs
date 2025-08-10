// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/*
 * =====================================================
 * Vinsert Editor - Rustバックエンド
 * Python拡張機能対応のシンプルなテキストエディタ
 * Python.framework内蔵対応版
 * =====================================================
 */

use std::env;
use std::path::PathBuf;
use pyo3::prelude::*;
use pyo3::types::PyDict;
use tauri::Manager;

// =====================================================
// Python環境初期化（macOS用Python.framework内蔵対応）
// =====================================================

#[cfg(target_os = "macos")]
fn initialize_embedded_python() -> Result<(), Box<dyn std::error::Error>> {
    println!("🐍 Initializing embedded Python environment for macOS...");
    
    // アプリケーションバンドル内のPythonパスを取得
    let bundle_path = env::current_exe()?
        .parent()
        .ok_or("Could not get parent directory")?
        .parent()
        .ok_or("Could not get bundle directory")?
        .to_path_buf();
    
    println!("📁 App bundle path: {:?}", bundle_path);
    
    // Python.frameworkの場所を確認（複数のパターンを試行）
    let python_framework_paths = vec![
        bundle_path.join("Frameworks").join("Python.framework").join("Versions").join("3.11"),
        bundle_path.join("Contents").join("Frameworks").join("Python.framework").join("Versions").join("3.11"),
        bundle_path.join("Resources").join("python").join("3.11"),
    ];
    
    let mut python_home: Option<PathBuf> = None;
    
    for path in python_framework_paths {
        if path.exists() {
            println!("✅ Found Python framework at: {:?}", path);
            python_home = Some(path);
            break;
        } else {
            println!("❌ Python framework not found at: {:?}", path);
        }
    }
    
    if let Some(python_home) = python_home {
        // Python環境変数を設定
        let python_home_str = python_home.to_string_lossy();
        let python_lib = python_home.join("lib");
        let python_site_packages = python_lib.join("python3.11").join("site-packages");
        
        // PYTHONHOMEを設定
        env::set_var("PYTHONHOME", python_home_str.as_ref());
        println!("🏠 PYTHONHOME set to: {}", python_home_str);
        
        // PYTHONPATHを設定
        let python_path = format!("{}:{}:{}",
            python_lib.to_string_lossy(),
            python_lib.join("python3.11").to_string_lossy(),
            python_site_packages.to_string_lossy()
        );
        env::set_var("PYTHONPATH", &python_path);
        println!("📚 PYTHONPATH set to: {}", python_path);
        
        // Python実行可能ファイルのパスを設定
        let python_bin = python_home.join("bin").join("python3.11");
        if python_bin.exists() {
            env::set_var("PYTHON_EXECUTABLE", python_bin.to_string_lossy().as_ref());
            println!("🐍 Python executable found: {:?}", python_bin);
        }
        
        // dyldライブラリパスを設定（macOS用）
        let dylib_path = python_lib.join("libpython3.11.dylib");
        if dylib_path.exists() {
            if let Ok(current_path) = env::var("DYLD_LIBRARY_PATH") {
                env::set_var("DYLD_LIBRARY_PATH", format!("{}:{}", python_lib.to_string_lossy(), current_path));
            } else {
                env::set_var("DYLD_LIBRARY_PATH", python_lib.to_string_lossy().as_ref());
            }
            println!("🔗 DYLD_LIBRARY_PATH updated: {}", python_lib.to_string_lossy());
        }
        
        println!("✅ Embedded Python environment configured successfully");
    } else {
        println!("⚠️ Embedded Python not found, falling back to system Python");
        println!("💡 This is normal during development. Embedded Python is only available in built app bundles.");
    }
    
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn initialize_embedded_python() -> Result<(), Box<dyn std::error::Error>> {
    println!("⚠️ Embedded Python is only supported on macOS. Using system Python.");
    Ok(())
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
 * Pythonのバージョン情報を取得
 * デバッグ・環境確認用
 */
#[tauri::command]
fn get_python_info() -> Result<String, String> {
    Python::with_gil(|py| {
        let code = r#"
import sys
import os
result = {
    'version': sys.version,
    'executable': sys.executable,
    'path': sys.path,
    'prefix': sys.prefix,
    'pythonhome': os.environ.get('PYTHONHOME', 'Not set'),
    'pythonpath': os.environ.get('PYTHONPATH', 'Not set')
}
"#;
        let locals = PyDict::new_bound(py);
        match py.run_bound(code, None, Some(&locals)) {
            Ok(_) => {
                match locals.get_item("result") {
                    Ok(Some(info)) => {
                        // 辞書の内容を文字列として整形
                        let version = info.get_item("version").unwrap().unwrap().to_string();
                        let executable = info.get_item("executable").unwrap().unwrap().to_string();
                        let prefix = info.get_item("prefix").unwrap().unwrap().to_string();
                        let pythonhome = info.get_item("pythonhome").unwrap().unwrap().to_string();
                        
                        Ok(format!(
                            "Python Version: {}\nExecutable: {}\nPrefix: {}\nPYTHONHOME: {}",
                            version.trim_matches('"'),
                            executable.trim_matches('"'),
                            prefix.trim_matches('"'),
                            pythonhome.trim_matches('"')
                        ))
                    },
                    _ => Err("Could not get Python info".to_string()),
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

fn main() {
    // Python環境の初期化（PyO3初期化の前に実行）
    if let Err(e) = initialize_embedded_python() {
        eprintln!("❌ Python environment initialization failed: {}", e);
        eprintln!("⚠️ Continuing with system Python...");
    }
    
    // PyO3の初期化
    pyo3::prepare_freethreaded_python();
    
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
            
            // Python環境情報の表示
            match get_python_info() {
                Ok(info) => println!("✅ Python environment info:\n{}", info),
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