// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    collections::hash_map::DefaultHasher,
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

use chrono::{Datelike, TimeZone, Utc};
use std::hash::{Hash, Hasher};



#[tauri::command]
/// 删除备份文件的函数
fn delete_backup(passwd: &str, file: &str) -> Result<String, String> {
    // 构建删除备份文件的Shell命令
    let command_str = format!("echo '{}' | sudo -S rm -f /etc/{}", passwd, file);

    // 使用Command执行Shell命令
    let output = Command::new("bash")
        .arg("-c")
        .arg(&command_str)
        .output()
        .map_err(|e| format!("Command execution error: {}", e))?;

    if output.status.success() {
        Ok(format!("备份文件 {} 删除成功", file))
    } else {
        let stderr_msg = String::from_utf8_lossy(&output.stderr);
        if stderr_msg.contains("try again") {
            Err("Password authentication failed".to_string())
        } else {
            Err(format!("Command failed with error: {}", stderr_msg))
        }
    }


}


#[tauri::command]
fn fetch_baks(passwd: &str) -> Result<String, String> {
    let output = Command::new("bash")
        .arg("-c")
        .arg(format!("echo '{}' | sudo -S ls /etc/hosts_*.bak", passwd))
        .output();

    match output {
        Ok(o) => {
            if o.status.success() {
                let stdout_str = String::from_utf8_lossy(&o.stdout);
                let files_list: Vec<&str> = stdout_str.trim().split('\n').collect();
                Ok(files_list.join(","))
            } else {
                let stderr_msg = String::from_utf8_lossy(&o.stderr);
                if stderr_msg.contains("try again") {
                    Err("Password authentication failed".to_string())
                } else {
                    Err(format!("Command failed with error: {}", stderr_msg))
                }
            }
        }
        Err(msg) => Err(format!("{}", msg)),
    }
}

#[tauri::command]
fn get_hosts(passwd: &str, file: Option<String>) -> Result<String, String> {
    let output = Command::new("bash")
        .arg("-c")
        .arg(format!(
            "echo '{}' | sudo -S cat {}",
            passwd,
            file.or(Some("/etc/hosts".to_string())).unwrap()
        ))
        .output();

    match output {
        Ok(o) => {
            if o.status.success() {
                Ok(String::from_utf8_lossy(&o.stdout).into_owned())
            } else {
                let stderr_msg = String::from_utf8_lossy(&o.stderr);
                if stderr_msg.contains("Password authentication failed") {
                    Err("Password authentication failed".to_string())
                } else {
                    Err(format!("Command failed with error: {}", stderr_msg))
                }
            }
        }
        Err(msg) => Err(format!("{}", msg)),
    }
}

#[tauri::command]
fn save_hosts(
    hosts: &str,
    passwd: &str,
    backup: bool,
    bakname: Option<String>,
) -> Result<String, String> {
    // 获取当前时间
    let now = SystemTime::now();
    let since_epoch = now
        .duration_since(UNIX_EPOCH)
        .expect("SystemTime before UNIX EPOCH!");
    let datetime = Utc.timestamp_opt(since_epoch.as_secs() as i64, 0);
    let datetime = datetime.unwrap();
    let mut hasher = DefaultHasher::new();
    hosts.hash(&mut  hasher);

    let mut backup_filename = "".to_string();
    if backup {
        // 构建备份文件名
        backup_filename = match bakname {
            Some(s) if !s.is_empty() => format!("/etc/hosts_{}.bak", s),
            _ => format!(
                "/etc/hosts_{}_{}_{}_{}.bak",
                datetime.year(),
                datetime.month(),
                datetime.day(),
                hasher.finish()
            ),
        };
        // 备份 hosts 文件到新的备份文件名
        let backup_command = format!(
            "echo '{}' | sudo -S cp /etc/hosts {}",
            passwd, &backup_filename
        );
        let backup_output = std::process::Command::new("bash")
            .arg("-c")
            .arg(&backup_command)
            .output()
            .expect("Failed to execute backup command");

        if !backup_output.status.success() {
            let stderr_str = String::from_utf8(backup_output.stderr)
                .unwrap_or_else(|_| "Failed to read STDERR".to_string());
            return Err(format!("Backup failed: {}", stderr_str));
        }
    }

    // 更新 hosts 文件
    let update_command = format!(
        "echo '{}' | sudo -S sh -c 'echo \"{}\" > /etc/hosts'",
        passwd, hosts
    );
    let update_output = std::process::Command::new("bash")
        .arg("-c")
        .arg(&update_command)
        .output()
        .expect("Failed to execute update command");

    if update_output.status.success() {
        Ok(backup_filename) // 返回备份文件名
    } else {
        let stderr_str = String::from_utf8(update_output.stderr)
            .unwrap_or_else(|_| "Failed to read STDERR".to_string());
        Err(format!("Update failed: {}", stderr_str))
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_hosts, save_hosts, fetch_baks,delete_backup])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
