// Empêche une console Windows supplémentaire de s'ouvrir derrière la
// fenêtre de l'application en mode release (convention Tauri standard).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    c3_digital_desktop_lib::run();
}
