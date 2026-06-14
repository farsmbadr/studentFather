use serde::{Serialize, Deserialize};
use std::{fs, path::{PathBuf}, time::{SystemTime, UNIX_EPOCH}};
use sha2::{Sha256, Digest};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppPaths {
    pub app_dir: PathBuf,
    pub db_path: PathBuf,
    pub license_path: PathBuf,
    pub backups_dir: PathBuf,
    pub machine_id_path: PathBuf,
}

impl AppPaths {
    pub fn new() -> Self {
        let app_dir = if cfg!(target_os = "windows") {
            let local_app_data = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(local_app_data).join("CenterMasr")
        } else {
            PathBuf::from(".").join("data")
        };

        let backups_dir = app_dir.join("backups");
        fs::create_dir_all(&backups_dir).ok();
        fs::create_dir_all(&app_dir).ok();

        Self {
            app_dir: app_dir.clone(),
            db_path: app_dir.join("data.db"),
            license_path: PathBuf::from("C:\\ProgramData\\CenterMasr\\license.json"),
            backups_dir,
            machine_id_path: app_dir.join("machine.id"),
        }
    }

    pub fn get_machine_id(&self) -> Result<String, String> {
        if self.machine_id_path.exists() {
            fs::read_to_string(&self.machine_id_path)
                .map_err(|e| format!("Failed to read machine ID: {}", e))
        } else {
            let machine_id = Self::generate_machine_id();
            fs::write(&self.machine_id_path, &machine_id)
                .map_err(|e| format!("Failed to write machine ID: {}", e))?;
            Ok(machine_id)
        }
    }

    fn generate_machine_id() -> String {
        let hostname = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "unknown".to_string());
        let platform = std::env::consts::OS;
        let arch = std::env::consts::ARCH;
        let raw = format!("{}-{}-{}", hostname, platform, arch);
        hex::encode(Sha256::digest(raw.as_bytes()))
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseInfo {
    pub machine_id: String,
    pub activated_at: String,
    pub expires_at: String,
    pub sig: String,
    pub center_name: String,
    pub admin_name: String,
}

impl LicenseInfo {
    pub fn is_valid(&self, current_machine_id: &str) -> bool {
        if self.machine_id != current_machine_id {
            return false;
        }
        let now = now_unix_seconds();
        if let Ok(exp) = parse_rfc3339_seconds(&self.expires_at) {
            now < exp
        } else {
            false
        }
    }
}

fn now_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn parse_rfc3339_seconds(s: &str) -> Result<i64, String> {
    // تنسيق بسيط: 2025-06-14T12:34:56Z or 2025-06-14T12:34:56.123Z
    let s = s.trim_end_matches('Z');
    let parts: Vec<&str> = s.split('T').collect();
    if parts.len() != 2 { return Err("Invalid format".into()); }

    let date_parts: Vec<i64> = parts[0].split('-').filter_map(|p| p.parse().ok()).collect();
    let time_parts: Vec<i64> = parts[1].split(':').filter_map(|p| p.parse().ok()).collect();

    if date_parts.len() < 3 || time_parts.len() < 3 {
        return Err("Invalid parts".into());
    }

    // عدد الثواني منذ 1970
    let mut total = 0i64;
    // حساب تقريبي بالسنوات (بسيط)
    let years = date_parts[0] - 1970;
    total += years * 365 * 86400;
    total += (date_parts[1] - 1) * 30 * 86400; // تقريبي
    total += (date_parts[2] - 1) * 86400;
    total += time_parts[0] * 3600;
    total += time_parts[1] * 60;
    total += time_parts[2];

    Ok(total)
}

pub struct LicenseService;

impl LicenseService {
    pub fn load_license(path: &PathBuf) -> Result<Option<LicenseInfo>, String> {
        if !path.exists() {
            return Ok(None);
        }
        let content = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read license: {}", e))?;
        let license: LicenseInfo = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse license: {}", e))?;
        Ok(Some(license))
    }

    pub fn create_trial_license(machine_id: &str, path: &PathBuf) -> Result<LicenseInfo, String> {
        let now_secs = now_unix_seconds();
        let expires_secs = now_secs + 14 * 86400;

        let activated_at = format_rfc3339(now_secs);
        let expires_at = format_rfc3339(expires_secs);

        let payload = format!("{}|{}|{}", machine_id, activated_at, expires_at);
        let sig = hex::encode(Sha256::digest(payload.as_bytes()));

        let license = LicenseInfo {
            machine_id: machine_id.to_string(),
            activated_at,
            expires_at,
            sig,
            center_name: "CenterMasr".into(),
            admin_name: "مدير النظام".into(),
        };

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).ok();
        }
        let json = serde_json::to_string_pretty(&license)
            .map_err(|e| format!("Failed to serialize: {}", e))?;
        fs::write(path, json).map_err(|e| format!("Failed to write license: {}", e))?;

        Ok(license)
    }
}

pub struct BackupService;

impl BackupService {
    pub fn create_backup(paths: &AppPaths) -> Result<String, String> {
        let timestamp = format_timestamp();
        let backup_file = paths.backups_dir.join(format!("backup_{}.json", timestamp));

        let client = reqwest::blocking::Client::new();
        let response = client
            .get("http://localhost:3001/api/backup")
            .send()
            .map_err(|e| format!("Backup API error: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("API returned {}", response.status()));
        }

        let data: serde_json::Value = response
            .json()
            .map_err(|e| format!("Parse error: {}", e))?;

        let json_str = serde_json::to_string_pretty(&data)
            .map_err(|e| format!("Serialize error: {}", e))?;

        fs::write(&backup_file, json_str)
            .map_err(|e| format!("Write error: {}", e))?;

        Self::clean_old_backups(paths, 7)?;

        Ok(backup_file.to_string_lossy().to_string())
    }

    fn clean_old_backups(paths: &AppPaths, days: u64) -> Result<(), String> {
        let now = SystemTime::now();
        let cutoff = now - std::time::Duration::from_secs(days * 86400);

        if let Ok(entries) = fs::read_dir(&paths.backups_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Ok(meta) = entry.metadata() {
                    if let Ok(modified) = meta.modified() {
                        if modified < cutoff && path.extension().map_or(false, |e| e == "json") {
                            fs::remove_file(&path).ok();
                        }
                    }
                }
            }
        }
        Ok(())
    }
}

fn format_timestamp() -> String {
    let secs = now_unix_seconds();
    // بسيط: أجزاء من اليوم
    let days = secs / 86400;
    let hours = (secs % 86400) / 3600;
    let minutes = (secs % 3600) / 60;
    let seconds = secs % 60;
    format!("days{}h{}m{}s{}", days % 365, hours, minutes, seconds)
}

fn format_rfc3339(secs: i64) -> String {
    let days = secs / 86400;
    let year = 1970 + (days / 365) as i32;
    let day_of_year = (days % 365) as i32;
    let month = 1 + day_of_year / 30;
    let day = 1 + (day_of_year % 30);
    let hours = (secs % 86400) / 3600;
    let minutes = (secs % 3600) / 60;
    let seconds = secs % 60;
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", year, month, day, hours, minutes, seconds)
}
