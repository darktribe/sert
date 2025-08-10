def make_exe():
    dist = default_python_distribution()
    
    config = dist.make_python_interpreter_config()
    config.run_mode = "module:oxidized_importer"
    
    python_config = dist.make_python_packaging_policy()
    
    exe = dist.to_python_executable(
        name = "python_embedded",
        packaging_policy = python_config,
        config = config,
    )
    
    # 標準ライブラリを含める
    exe.add_python_resources(dist.python_resources())
    
    return exe

def make_embedded_resources(exe):
    return exe.to_embedded_resources()

def make_install(exe):
    files = FileManifest()
    files.add_python_resource(".", exe)
    return files

register_target("exe", make_exe)
resolve_targets()