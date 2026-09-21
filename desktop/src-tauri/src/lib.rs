// Coquille native minimale : toute la logique applicative vit déjà dans
// `web/` (React), qui appelle l'API backend directement en HTTP comme
// depuis un navigateur — voir web/README.md. Cette application ne fait
// qu'afficher `web/dist` dans une fenêtre native (WebView du système,
// pas de moteur embarqué : c'est ce qui rend l'exécutable léger). Aucune
// commande Tauri personnalisée n'est nécessaire pour l'instant.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("erreur au lancement de l'application c3-digital");
}
