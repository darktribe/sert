// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/*
 * =====================================================
 * Vinsert Editor - Rustバックエンド
 * Python拡張機能対応のシンプルなテキストエディタ
 * =====================================================
 */

use tauri::Manager;
use pyo3::prelude::*;
use pyo3::types::PyDict;
use std::env;

static mut PYTHON_TYPE: PythonType = PythonType::Unknown;

#[derive(Debug, Clone, Copy, PartialEq)]
enum PythonType {
    Unknown,
    Embedded,    // python-build-standaloneによる組み込みPython
    System,      // システム環境のPython
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
 * Python詳細情報を取得（組み込み判定機能強化版）
 */
#[tauri::command]
fn get_python_info() -> Result<String, String> {
    Python::with_gil(|py| {
        // 基本情報を取得
        let sys = py.import_bound("sys").map_err(|e| format!("sysモジュール取得失敗: {}", e))?;
        let version = sys.getattr("version").and_then(|v| v.extract::<String>()).unwrap_or_else(|_| "Unknown".to_string());
        let executable = sys.getattr("executable").and_then(|v| v.extract::<String>()).unwrap_or_else(|_| "Unknown".to_string());
        
        // 組み込みPython判定
        let is_embedded = detect_embedded_python(&executable);
        let python_type = if is_embedded {
            "🔗 EMBEDDED (組み込みPython)"
        } else {
            "🖥️ SYSTEM (システムPython)"
        };
        
        // site-packagesのパス
        let site_packages = sys.getattr("path")
            .and_then(|path_list| path_list.extract::<Vec<String>>())
            .unwrap_or_else(|_| vec![]);
        
        let site_packages_info = site_packages.iter()
            .map(|p| format!("  - {}", p))
            .collect::<Vec<_>>()
            .join("\n");
        
        let result = format!(
            "🐍 Python環境情報 🐍\n\n\
            📊 環境タイプ: {}\n\
            📋 バージョン: {}\n\
            📁 実行ファイル: {}\n\
            🎯 判定: {}\n\n\
            📦 Python Path:\n{}\n",
            python_type,
            version,
            executable,
            if is_embedded { "アプリケーション組み込み" } else { "システム環境" },
            site_packages_info
        );
        
        Ok(result)
    })
}

/**
 * 開発者向け詳細Python環境診断
 */
#[tauri::command]
fn debug_python_environment() -> Result<String, String> {
    Python::with_gil(|py| {
        let mut result = String::new();
        
        // 基本環境情報
        result.push_str("🔍 PYTHON環境詳細診断\n");
        result.push_str("=" .repeat(50).as_str());
        result.push_str("\n\n");
        
        // Python実行ファイル情報
        match py.import_bound("sys") {
            Ok(sys) => {
                let executable = sys.getattr("executable")
                    .and_then(|v| v.extract::<String>())
                    .unwrap_or_else(|_| "Unknown".to_string());
                    
                result.push_str(&format!("📁 Python実行ファイル: {}\n", executable));
                
                // 組み込み判定の詳細
                let is_embedded = detect_embedded_python(&executable);
                result.push_str(&format!("🎯 組み込み判定: {}\n", is_embedded));
                
                // 判定理由の詳細
                result.push_str("🔍 判定根拠:\n");
                
                if executable.contains("python-standalone") {
                    result.push_str("   ✓ パスに 'python-standalone' が含まれる\n");
                }
                
                if let Ok(current_exe) = std::env::current_exe() {
                    if let Some(exe_dir) = current_exe.parent() {
                        let exe_dir_str = exe_dir.to_string_lossy();
                        if executable.starts_with(exe_dir_str.as_ref()) {
                            result.push_str("   ✓ アプリケーションディレクトリ内のPython\n");
                        }
                    }
                }
                
                // 現在のアプリケーション情報
                if let Ok(current_exe) = std::env::current_exe() {
                    result.push_str(&format!("🏠 アプリ実行ファイル: {}\n", current_exe.display()));
                    if let Some(exe_dir) = current_exe.parent() {
                        result.push_str(&format!("📂 アプリディレクトリ: {}\n", exe_dir.display()));
                    }
                }
                
                result.push_str("\n");
                
                // Python version詳細
                if let Ok(version) = sys.getattr("version").and_then(|v| v.extract::<String>()) {
                    result.push_str(&format!("🐍 Pythonバージョン: {}\n", version));
                }
                
                // Python path詳細
                if let Ok(path_list) = sys.getattr("path").and_then(|p| p.extract::<Vec<String>>()) {
                    result.push_str("📦 Python Path (上位5件):\n");
                    for (i, path) in path_list.iter().take(5).enumerate() {
                        result.push_str(&format!("   {}. {}\n", i + 1, path));
                    }
                    if path_list.len() > 5 {
                        result.push_str(&format!("   ... 他{}件\n", path_list.len() - 5));
                    }
                }
                
            },
            Err(e) => {
                result.push_str(&format!("❌ sys モジュール取得エラー: {}\n", e));
            }
        }
        
        // 環境変数チェック
        result.push_str("\n🌍 関連環境変数:\n");
        let env_vars = ["PYO3_PYTHON", "PYTHONHOME", "PYTHONPATH"];
        for var in &env_vars {
            match std::env::var(var) {
                Ok(value) => result.push_str(&format!("   {}: {}\n", var, value)),
                Err(_) => result.push_str(&format!("   {}: (未設定)\n", var)),
            }
        }
        
        // 最終結論
        result.push_str("\n🎯 最終結論:\n");
        let python_type = unsafe { PYTHON_TYPE };
        match python_type {
            PythonType::Embedded => {
                result.push_str("   🟢 【組み込みPython】を使用中\n");
                result.push_str("   → アプリケーション内蔵のPython環境\n");
                result.push_str("   → ユーザー環境に依存しない独立動作\n");
            },
            PythonType::System => {
                result.push_str("   🔵 【システムPython】を使用中\n");
                result.push_str("   → ユーザーがインストールしたPython環境\n");
                result.push_str("   → 拡張機能はユーザー環境のライブラリを利用可能\n");
            },
            PythonType::Unknown => {
                result.push_str("   🔴 【不明・エラー】\n");
                result.push_str("   → Python環境の判定に失敗\n");
            }
        }
        
        result.push_str("\n");
        result.push_str("=" .repeat(50).as_str());
        
        Ok(result)
    })
}

fn detect_embedded_python(executable: &str) -> bool {
    // 実行ファイルパスからの判定
    if executable.contains("python-standalone") {
        return true;
    }
    
    // アプリケーションバンドル内かチェック
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            let exe_dir_str = exe_dir.to_string_lossy();
            if executable.starts_with(exe_dir_str.as_ref()) {
                return true;
            }
        }
    }
    
    false
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
    // PyO3 0.22.6の初期化
    // auto-initializeフィーチャーが有効な場合、初回のPython::with_gil()で自動初期化される
    
    // Python環境を詳細に確認
    let python_type = detect_python_environment();
    println!("🐍 Python初期化完了: {:?}", python_type);
    python_type
}

/**
 * Python環境の詳細を検出・確認する関数（PyO3 0.22.6完全対応版）
 */
/**
 * Python環境の詳細を検出・確認する関数（緊急修正版）
 */
fn detect_python_environment() -> PythonType {
    println!("=== Python環境詳細分析（組み込みPython対応版） ===");
    
    // ビルド時の組み込みPythonフラグをチェック（ランタイムで取得）
    let is_embedded_build = std::env::var("VINSERT_EMBEDDED_PYTHON")
        .unwrap_or_else(|_| "0".to_string())
        .parse::<i32>()
        .unwrap_or(0) == 1;
    let embedded_python_path = std::env::var("VINSERT_PYTHON_PATH")
        .unwrap_or_else(|_| "".to_string());
    
    println!("🔍 ビルド時の組み込みPythonフラグ: {}", is_embedded_build);
    println!("🔍 組み込みPythonパス: {}", embedded_python_path);
    
    match Python::with_gil(|py| -> Result<PythonType, PyErr> {
        // 基本的なPython動作テスト
        let simple_test = py.eval_bound("2 + 2", None, None)?;
        println!("🐍 Python基本動作テスト: {}", simple_test);
        
        // Python実行ファイルパスを取得
        let sys = py.import_bound("sys")?;
        let executable = sys.getattr("executable")?.extract::<String>()?;
        println!("🐍 実行中のPython実行ファイル: {}", executable);
        
        // 組み込みPython判定の複数の方法
        let mut embedded_indicators = Vec::new();
        
        // 1. ビルド時フラグによる判定
        if is_embedded_build {
            embedded_indicators.push("ビルド時組み込みフラグ");
        }
        
        // 2. 実行ファイルパスによる判定
        if executable.contains("python-standalone") || (!embedded_python_path.is_empty() && executable.contains(&embedded_python_path)) {
            embedded_indicators.push("実行ファイルパスが組み込みPythonを示している");
        }
        
        // 3. アプリケーション内部パスかチェック
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(exe_dir) = current_exe.parent() {
                let exe_dir_str = exe_dir.to_string_lossy();
                if executable.starts_with(exe_dir_str.as_ref()) {
                    embedded_indicators.push("Pythonがアプリケーションディレクトリ内にある");
                }
            }
        }
        
        // 4. PyOxidizer/組み込み環境の特徴を検出
        if let Ok(modules) = sys.getattr("modules") {
            if modules.contains("oxidized_importer").unwrap_or(false) {
                embedded_indicators.push("PyOxidizer組み込み環境");
            }
        }
        
        // 5. frozen属性チェック
        if let Ok(frozen) = sys.getattr("frozen") {
            if !frozen.is_none() {
                embedded_indicators.push("frozen属性が設定されている");
            }
        }
        
        // 6. site-packagesの場所をチェック
        if let Ok(path_list) = sys.getattr("path") {
            if let Ok(paths) = path_list.extract::<Vec<String>>() {
                for path in &paths {
                    if path.contains("python-standalone") {
                        embedded_indicators.push("site-packagesが組み込みPython内にある");
                        break;
                    }
                }
            }
        }
        
        // 判定結果
        if !embedded_indicators.is_empty() {
            println!("✅ 組み込みPython検出指標:");
            for indicator in &embedded_indicators {
                println!("   - {}", indicator);
            }
            Ok(PythonType::Embedded)
        } else {
            println!("📍 システムPython検出 (組み込み指標なし)");
            Ok(PythonType::System)
        }
    }) {
        Ok(python_type) => {
            println!("🎯 最終判定: {:?}", python_type);
            python_type
        },
        Err(e) => {
            println!("❌ Python環境検出エラー: {}", e);
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
            debug_python_environment,
            
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
            
            // ===== 起動時にPython環境を明確に表示 =====
            println!("");
            println!("=== PYTHON環境検出結果 ===");
            
            let python_type = unsafe { PYTHON_TYPE };
            match python_type {
                PythonType::Embedded => {
                    println!("🟢 使用中のPython: 【組み込みPython】");
                    println!("   → アプリケーション内蔵のPythonインタープリターを使用");
                    println!("   → ユーザーのPython環境に依存せず、独立して動作");
                    println!("   → PyOxidizerまたは類似の組み込み技術を検出");
                },
                PythonType::System => {
                    println!("🔵 使用中のPython: 【ユーザー環境Python】");
                    println!("   → ユーザーがインストールしたPython環境を使用");
                    println!("   → システムまたはHomebrewなどからPythonを読み込み");
                    println!("   → 拡張機能はユーザー環境のPythonライブラリを利用可能");
                },
                PythonType::Unknown => {
                    println!("🔴 使用中のPython: 【不明・エラー】");
                    println!("   → Python環境の検出に失敗しました");
                    println!("   → 拡張機能が正常に動作しない可能性があります");
                }
            }
            println!("========================");
            println!("");
            
            // Python環境情報の詳細表示（詳細版）
            println!("=== Python Environment Details ===");
            match get_python_info() {
                Ok(info) => {
                    println!("✅ Python環境詳細情報:\n{}", info);
                    
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
            println!("=== End Python Details ===");
            
            println!("📋 Clipboard operations enabled");
            println!("📁 File operations enabled (JavaScript-based dialogs)");
            println!("🎯 Sert Editor ready!");
            
            Ok(())
        })
        
        // アプリケーション実行
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}