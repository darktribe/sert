use std::env;
use std::path::Path;
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-env-changed=PYO3_PYTHON");
    
    // Linux用の組み込みフラグを設定
    #[cfg(target_os = "linux")]
    {
        println!("cargo:warning=🐧 Setting up embedded Python for Linux");
        println!("cargo:rustc-env=VINSERT_EMBEDDED_PYTHON=1");
        
        // システムPythonのパスを取得して設定
        if let Ok(output) = Command::new("which").arg("python3").output() {
            if output.status.success() {
                let python_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                println!("cargo:rustc-env=VINSERT_PYTHON_PATH={}", python_path);
                println!("cargo:warning=🐍 Linux embedded Python: {}", python_path);
            }
        }
    }
    
    // macOS用の組み込みフラグを設定
    #[cfg(target_os = "macos")]
    {
        println!("cargo:warning=🍎 Setting up embedded Python for macOS");
        println!("cargo:rustc-env=VINSERT_EMBEDDED_PYTHON=1");
    }
    
    // Windows用の組み込みフラグを設定
    #[cfg(target_os = "windows")]
    {
        println!("cargo:warning=🪟 Setting up embedded Python for Windows");
        println!("cargo:rustc-env=VINSERT_EMBEDDED_PYTHON=1");
    }
    
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
    
    // macOSでの設定
    if cfg!(target_os = "macos") {
        setup_macos_python();
    }
    
    // Linux用の設定
    #[cfg(target_os = "linux")]
    {
        setup_linux_python();
    }
}

#[cfg(target_os = "linux")]
fn setup_linux_python() {
    println!("cargo:warning=Setting up Python for Linux");
    
    // Ubuntu 24.04のPython 3.12を明示的に指定
    if let Ok(output) = Command::new("which").arg("python3").output() {
        if output.status.success() {
            let python_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            println!("cargo:rustc-env=PYO3_PYTHON={}", python_path);
            println!("cargo:warning=🐍 Set PYO3_PYTHON to {}", python_path);
            
            // Python版本確認
            if let Ok(version_output) = Command::new(&python_path).arg("--version").output() {
                if version_output.status.success() {
                    let version = String::from_utf8_lossy(&version_output.stdout);
                    println!("cargo:warning=✅ Python version: {}", version.trim());
                }
            }
        }
    }
}

fn setup_macos_python() {
    println!("cargo:warning=Setting up Python for macOS");
    
    // 1. Homebrewのpython@3.11を最優先で試す
    if let Ok(output) = Command::new("brew").args(&["--prefix", "python@3.11"]).output() {
        if output.status.success() {
            let prefix = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let python_path = format!("{}/bin/python3.11", prefix);
            
            if Path::new(&python_path).exists() {
                // Python 3.11のパスとライブラリを設定
                let lib_path = format!("{}/lib", prefix);
                let framework_path = format!("{}/Frameworks/Python.framework/Versions/3.11", prefix);
                
                println!("cargo:rustc-link-search=native={}", lib_path);
                if Path::new(&framework_path).exists() {
                    println!("cargo:rustc-link-search=framework={}", framework_path);
                }
                println!("cargo:rustc-link-lib=python3.11");
                
                // PYO3_PYTHON環境変数を設定
                println!("cargo:rustc-env=PYO3_PYTHON={}", python_path);
                println!("cargo:warning=Using Homebrew Python 3.11 at: {}", python_path);
                return;
            }
        }
    }
    
    // 2. python3.11コマンドが直接利用可能か確認
    if let Ok(output) = Command::new("which").arg("python3.11").output() {
        if output.status.success() {
            let python_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !python_path.is_empty() {
                // python3.11-configを使用
                if let Ok(config_output) = Command::new("python3.11-config")
                    .arg("--embed")
                    .arg("--ldflags")
                    .output() 
                {
                    if config_output.status.success() {
                        let ldflags = String::from_utf8_lossy(&config_output.stdout);
                        
                        for flag in ldflags.split_whitespace() {
                            if flag.starts_with("-L") {
                                let path = flag.trim_start_matches("-L");
                                println!("cargo:rustc-link-search=native={}", path);
                            } else if flag.starts_with("-l") && !flag.contains("intl") {
                                let lib = flag.trim_start_matches("-l");
                                println!("cargo:rustc-link-lib={}", lib);
                            }
                        }
                        
                        println!("cargo:rustc-env=PYO3_PYTHON={}", python_path);
                        println!("cargo:warning=Using Python 3.11 at: {}", python_path);
                        return;
                    }
                }
            }
        }
    }
    
    // 3. Python 3.12を試す（PyO3 0.22.6でサポート）
    if let Ok(output) = Command::new("brew").args(&["--prefix", "python@3.12"]).output() {
        if output.status.success() {
            let prefix = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let python_path = format!("{}/bin/python3.12", prefix);
            
            if Path::new(&python_path).exists() {
                let lib_path = format!("{}/lib", prefix);
                let framework_path = format!("{}/Frameworks/Python.framework/Versions/3.12", prefix);
                
                println!("cargo:rustc-link-search=native={}", lib_path);
                if Path::new(&framework_path).exists() {
                    println!("cargo:rustc-link-search=framework={}", framework_path);
                }
                println!("cargo:rustc-link-lib=python3.12");
                
                println!("cargo:rustc-env=PYO3_PYTHON={}", python_path);
                println!("cargo:warning=Using Homebrew Python 3.12 at: {}", python_path);
                return;
            }
        }
    }
    
    // 4. エラー: サポートされているPythonバージョンが見つからない
    println!("cargo:warning=WARNING: No supported Python version found (3.11 or 3.12)");
    println!("cargo:warning=Please install Python 3.11 with: brew install python@3.11");
}