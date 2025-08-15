use std::env;
use std::path::Path;

fn setup_python() {
    // 環境変数でPythonパスが指定されている場合はそれを使用
    if env::var("PYO3_PYTHON").is_ok() {
        println!("cargo:warning=Using PYO3_PYTHON from environment");
        return;
    }
    
    // プラットフォーム別の設定
    if cfg!(target_os = "windows") {
        setup_windows_python();
    } else if cfg!(target_os = "macos") {
        setup_macos_python();
    } else {
        println!("cargo:warning=Unsupported platform for automatic Python setup");
    }
}

fn setup_windows_python() {
    println!("cargo:warning=Setting up Python for Windows");
    
    // 環境変数でPythonパスが指定されている場合はそれを使用
    if env::var("PYO3_PYTHON").is_ok() {
        println!("cargo:warning=Using PYO3_PYTHON from environment");
        return;
    }
    
    // python-build-standaloneのデフォルトパスをチェック
    let python_paths = [
        "C:/python-build-standalone/python-3.11.9-x86_64-pc-windows-msvc-shared-pgo/python.exe",
        "C:/Python311/python.exe",
        "C:/Users/%USERNAME%/AppData/Local/Programs/Python/Python311/python.exe",
    ];
    
    for python_path in &python_paths {
        if Path::new(python_path).exists() {
            let lib_dir = python_path.replace("python.exe", "libs");
            let dll_dir = python_path.replace("python.exe", "");
            
            println!("cargo:rustc-link-search=native={}", lib_dir);
            println!("cargo:rustc-link-search=native={}", dll_dir);
            println!("cargo:rustc-link-lib=python311");
            
            println!("cargo:rustc-env=PYO3_PYTHON={}", python_path);
            println!("cargo:warning=Using Python at: {}", python_path);
            return;
        }
    }
    
    println!("cargo:warning=WARNING: No supported Python version found");
    println!("cargo:warning=Please install Python 3.11 or set PYO3_PYTHON environment variable");
}

fn setup_macos_python() {
    println!("cargo:warning=Setting up Python for macOS");
    
    // 環境変数でPythonパスが指定されている場合はそれを使用
    if env::var("PYO3_PYTHON").is_ok() {
        println!("cargo:warning=Using PYO3_PYTHON from environment");
        return;
    }
    
    // macOS用のPythonパスをチェック
    let python_paths = [
        "/usr/local/bin/python3",
        "/opt/homebrew/bin/python3",
        "/usr/bin/python3",
        "/Library/Frameworks/Python.framework/Versions/3.11/bin/python3",
    ];
    
    for python_path in &python_paths {
        if Path::new(python_path).exists() {
            println!("cargo:rustc-env=PYO3_PYTHON={}", python_path);
            println!("cargo:warning=Using Python at: {}", python_path);
            return;
        }
    }
    
    println!("cargo:warning=WARNING: No supported Python version found on macOS");
    println!("cargo:warning=Please install Python 3.11 via Homebrew or set PYO3_PYTHON environment variable");
}

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-env-changed=PYO3_PYTHON");
    
    // PyO3用のPython設定
    setup_python();
    
    // Tauriビルドを実行
    tauri_build::build();
}