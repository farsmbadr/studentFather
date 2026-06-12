use anyhow::Result;
use hmac::{Hmac, Mac};
use sha2::{Sha256, Digest};
use std::io::Read;

type HmacSha256 = Hmac<Sha256>;

const LICENSE_SECRET: &[u8] = b"baderp-license-signing-key-2025-change-in-production";
const LICENSE_PATH: &str = "license.json";

pub fn sign(obj: &serde_json::Value) -> Result<serde_json::Value> {
    let payload = serde_json::json!({
        "machine_id": obj["machine_id"],
        "activated_at": obj["activated_at"],
        "expires_at": obj["expires_at"]
    });
    let payload_str = payload.to_string();
    let mut mac = HmacSha256::new_from_slice(LICENSE_SECRET)?;
    mac.update(payload_str.as_bytes());
    let sig = hex::encode(mac.finalize().into_bytes());

    let mut result = obj.clone();
    result["sig"] = serde_json::Value::String(sig);
    Ok(result)
}

pub fn verify(obj: &serde_json::Value) -> bool {
    let sig = match obj["sig"].as_str() {
        Some(s) => s,
        None => return false,
    };

    let payload = serde_json::json!({
        "machine_id": obj["machine_id"],
        "activated_at": obj["activated_at"],
        "expires_at": obj["expires_at"]
    });
    let payload_str = payload.to_string();

    let mut mac = match HmacSha256::new_from_slice(LICENSE_SECRET) {
        Ok(m) => m,
        Err(_) => return false,
    };
    mac.update(payload_str.as_bytes());
    let expected = hex::encode(mac.finalize().into_bytes());

    expected.as_bytes() == sig.as_bytes()
}

pub fn read_license_file() -> Result<serde_json::Value> {
    let mut file = std::fs::File::open(LICENSE_PATH)?;
    let mut content = String::new();
    file.read_to_string(&mut content)?;
    Ok(serde_json::from_str(&content)?)
}

pub fn write_license_file(license: &serde_json::Value) -> Result<()> {
    let dir = std::path::Path::new(LICENSE_PATH).parent().unwrap();
    std::fs::create_dir_all(dir)?;
    std::fs::write(LICENSE_PATH, serde_json::to_string_pretty(license)?)?;
    Ok(())
}

pub fn get_machine_id() -> String {
    let hostname = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "UNKNOWN".to_string());
    let hash = Sha256::digest(hostname.as_bytes());
    hex::encode(hash)
}
