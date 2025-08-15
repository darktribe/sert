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
    
    // OS別の設定
    if cfg!(target_os = "macos") {
        setup_macos_python();
    } else if cfg!(target_os = "linux") {
        setup_linux_python();
    } else if cfg!(target_os = "windows") {
        setup_windows_python();
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

fn setup_linux_python() {
    println!("cargo:warning=Setting up Python for Linux");
    
    // 1. pkg-configを使ってPython3を検出
    if let Ok(output) = Command::new("pkg-config").args(&["--exists", "python3"]).output() {
        if output.status.success() {
            // Python3のcflagsとlibsを取得
            if let Ok(cflags_output) = Command::new("pkg-config").args(&["--cflags", "python3"]).output() {
                if let Ok(libs_output) = Command::new("pkg-config").args(&["--libs", "python3"]).output() {
                    let cflags = String::from_utf8_lossy(&cflags_output.stdout);
                    let libs = String::from_utf8_lossy(&libs_output.stdout);
                    
                    // cflagsを処理
                    for flag in cflags.split_whitespace() {
                        if flag.starts_with("-I") {
                            let path = flag.trim_start_matches("-I");
                            println!("cargo:rustc-link-search=native={}", path);
                        }
                    }
                    
                    // libsを処理
                    for flag in libs.split_whitespace() {
                        if flag.starts_with("-L") {
                            let path = flag.trim_start_matches("-L");
                            println!("cargo:rustc-link-search=native={}", path);
                        } else if flag.starts_with("-l") {
                            let lib = flag.trim_start_matches("-l");
                            println!("cargo:rustc-link-lib={}", lib);
                        }
                    }
                    
                    println!("cargo:warning=Using pkg-config Python3");
                    return;
                }
            }
        }
    }
    
    // 2. python3-configを直接試す
    if let Ok(output) = Command::new("python3-config").args(&["--ldflags", "--embed"]).output() {
        if output.status.success() {
            let ldflags = String::from_utf8_lossy(&output.stdout);
            
            for flag in ldflags.split_whitespace() {
                if flag.starts_with("-L") {
                    let path = flag.trim_start_matches("-L");
                    println!("cargo:rustc-link-search=native={}", path);
                } else if flag.starts_with("-l") && !flag.contains("intl") {
                    let lib = flag.trim_start_matches("-l");
                    println!("cargo:rustc-link-lib={}", lib);
                }
            }
            
            // Pythonパスを取得
            if let Ok(python_output) = Command::new("which").arg("python3").output() {
                if python_output.status.success() {
                    let python_path = String::from_utf8_lossy(&python_output.stdout).trim().to_string();
                    println!("cargo:rustc-env=PYO3_PYTHON={}", python_path);
                    println!("cargo:warning=Using python3-config at: {}", python_path);
                    return;
                }
            }
        }
    }
    
    // 3. 特定バージョンを試す（python3.11, python3.10, python3.9）
    for version in &["3.11", "3.10", "3.9", "3.12"] {
        let python_cmd = format!("python{}", version);
        let config_cmd = format!("python{}-config", version);
        
        if let Ok(output) = Command::new("which").arg(&python_cmd).output() {
            if output.status.success() {
                let python_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                
                if let Ok(config_output) = Command::new(&config_cmd).args(&["--ldflags", "--embed"]).output() {
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
                        println!("cargo:warning=Using Python {} at: {}", version, python_path);
                        return;
                    }
                }
            }
        }
    }
    
    // 4. エラー: サポートされているPythonバージョンが見つからない
    println!("cargo:warning=WARNING: No supported Python version found");
    println!("cargo:warning=Please install Python development packages:");
    println!("cargo:warning=  Ubuntu/Debian: apt install python3-dev");
    println!("cargo:warning=  RHEL/CentOS: yum install python3-devel");
    println!("cargo:warning=  Arch: pacman -S python python-pip");
}

fn setup_windows_python() {
    println!("cargo:warning=Setting up Python for Windows");
    
    // 1. python3コマンドを試す
    if let Ok(output) = Command::new("python3").arg("--version").output() {
        if output.status.success() {
            if let Ok(python_output) = Command::new("where").arg("python3").output() {
                if python_output.status.success() {
                    let python_path = String::from_utf8_lossy(&python_output.stdout).trim().to_string();
                    println!("cargo:rustc-env=PYO3_PYTHON={}", python_path);
                    println!("cargo:warning=Using Python3 at: {}", python_path);
                    return;
                }
            }
        }
    }
    
    // 2. pythonコマンドを試す
    if let Ok(output) = Command::new("python").arg("--version").output() {
        if output.status.success() {
            if let Ok(python_output) = Command::new("where").arg("python").output() {
                if python_output.status.success() {
                    let python_path = String::from_utf8_lossy(&python_output.stdout).trim().to_string();
                    println!("cargo:rustc-env=PYO3_PYTHON={}", python_path);
                    println!("cargo:warning=Using Python at: {}", python_path);
                    return;
                }
            }
        }
    }
    
    println!("cargo:warning=WARNING: No Python found on Windows");
    println!("cargo:warning=Please install Python from python.org or Microsoft Store");
}