use std::env;
use std::path::Path;
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-env-changed=PYO3_PYTHON");
    
    // PyO3用のPython設定
    setup_python();
    
    // Tauriビルドを実行
    tauri_build::build();
}

fn setup_python() {
    // 環境変数でPythonパスが指定されている場合はそれを使用
    if env::var("PYO3_PYTHON").is_ok() {
        println!("cargo:warning=Using PYO3_PYTHON from environment");
        return;
    }
    
    // ターゲット別の設定
    let target = env::var("TARGET").unwrap_or_default();
    
    match target.as_str() {
        t if t.starts_with("x86_64-pc-windows") || t.starts_with("i686-pc-windows") => {
            setup_windows_python();
        },
        t if t.starts_with("x86_64-apple-darwin") => {
            setup_macos_python();
        },
        _ => {
            // その他のプラットフォームはPyO3のデフォルト検出に任せる
            println!("cargo:warning=Using PyO3 default Python detection for target: {}", target);
        }
    }
}

fn setup_windows_python() {
    println!("cargo:warning=Setting up Python for Windows");
    
    // 1. システムのpython.exeを確認
    if let Ok(output) = Command::new("python").arg("--version").output() {
        if output.status.success() {
            let version_str = String::from_utf8_lossy(&output.stdout);
            println!("cargo:warning=Found Python: {}", version_str.trim());
            
            // python.exeのパスを取得
            if let Ok(which_output) = Command::new("where").arg("python").output() {
                if which_output.status.success() {
                    let python_path = String::from_utf8_lossy(&which_output.stdout);
                    let python_path = python_path.lines().next().unwrap_or("python").trim();
                    
                    if Path::new(python_path).exists() {
                        println!("cargo:rustc-env=PYO3_PYTHON={}", python_path);
                        println!("cargo:warning=Using Python at: {}", python_path);
                        
                        // Python環境の詳細を取得
                        check_python_environment(python_path);
                        return;
                    }
                }
            }
        }
    }
    
    // 2. py.exe (Python Launcher) を試す
    if let Ok(output) = Command::new("py").args(&["-3.11", "--version"]).output() {
        if output.status.success() {
            let version_str = String::from_utf8_lossy(&output.stdout);
            println!("cargo:warning=Found Python via py launcher: {}", version_str.trim());
            
            println!("cargo:rustc-env=PYO3_PYTHON=py -3.11");
            println!("cargo:warning=Using Python 3.11 via py launcher");
            return;
        }
    }
    
    // 3. py.exe (任意のバージョン) を試す
    if let Ok(output) = Command::new("py").args(&["-3", "--version"]).output() {
        if output.status.success() {
            let version_str = String::from_utf8_lossy(&output.stdout);
            println!("cargo:warning=Found Python via py launcher: {}", version_str.trim());
            
            println!("cargo:rustc-env=PYO3_PYTHON=py -3");
            println!("cargo:warning=Using Python 3 via py launcher");
            return;
        }
    }
    
    // 4. エラー: Pythonが見つからない
    println!("cargo:warning=WARNING: Python not found!");
    println!("cargo:warning=Please install Python 3.11 from https://www.python.org/downloads/");
    println!("cargo:warning=Make sure to check 'Add Python to PATH' during installation");
}

fn check_python_environment(python_path: &str) {
    // Python開発用ヘッダの確認
    if let Ok(output) = Command::new(python_path)
        .args(&["-c", "import sysconfig; print(sysconfig.get_path('include'))"])
        .output() 
    {
        if output.status.success() {
            let raw_output = String::from_utf8_lossy(&output.stdout);
            let include_path = raw_output.trim();
            println!("cargo:warning=Python include path: {}", include_path);
            
            // Python.hの存在確認
            let python_h_path = format!("{}\\Python.h", include_path);
            if Path::new(&python_h_path).exists() {
                println!("cargo:warning=Python.h found - development headers OK");
            } else {
                println!("cargo:warning=WARNING: Python.h not found at {}", python_h_path);
                println!("cargo:warning=You may need to install Python development packages");
            }
        }
    }
    
    // Pythonライブラリパスの確認
    if let Ok(output) = Command::new(python_path)
        .args(&["-c", "import sysconfig; print(sysconfig.get_path('stdlib'))"])
        .output() 
    {
        if output.status.success() {
            let raw_output = String::from_utf8_lossy(&output.stdout);
            let lib_path = raw_output.trim();
            println!("cargo:warning=Python library path: {}", lib_path);
        }
    }
}

fn setup_macos_python() {
    println!("cargo:warning=Setting up Python for macOS");
    
    // HomeBrew Python 3.11を優先的に使用
    if let Ok(output) = Command::new("which").arg("python3.11").output() {
        if output.status.success() {
            let python_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !python_path.is_empty() && Path::new(&python_path).exists() {
                println!("cargo:rustc-env=PYO3_PYTHON={}", python_path);
                println!("cargo:warning=Using Python 3.11 at: {}", python_path);
                return;
            }
        }
    }
    
    // システムのpython3を使用
    if let Ok(output) = Command::new("which").arg("python3").output() {
        if output.status.success() {
            let python_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !python_path.is_empty() && Path::new(&python_path).exists() {
                println!("cargo:rustc-env=PYO3_PYTHON={}", python_path);
                println!("cargo:warning=Using Python 3 at: {}", python_path);
                return;
            }
        }
    }
    
    println!("cargo:warning=WARNING: No suitable Python found for macOS");
    println!("cargo:warning=Please install Python 3.11 with: brew install python@3.11");
}