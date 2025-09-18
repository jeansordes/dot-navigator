// French localization
export default {
    // View
    viewName: 'Dot Navigator',
    
    // Commands
    commandOpenTree: 'Ouvrir l\'arborescence des fichiers',
    commandShowFile: 'Afficher le fichier dans Dot Navigator',
    commandCollapseAll: 'Réduire tous les nœuds dans Dot Navigator',
    commandExpandAll: 'Développer tous les nœuds dans Dot Navigator',
    commandCreateChildNote: 'Créer une note enfant',
    commandOpenClosestParent: 'Ouvrir la note parente la plus proche',
    commandRename: 'Renommer le fichier actuel',
    
    // UI Elements
    buttonCollapseAll: 'Tout réduire',
    buttonExpandAll: 'Tout développer',
    tooltipCollapseAll: 'Réduire tous les dossiers',
    tooltipExpandAll: 'Développer tous les dossiers',
    tooltipRevealActiveFile: 'Afficher le fichier actif dans l\'arborescence',
    tooltipCreateNewFile: 'Créer un nouveau fichier',
    tooltipCreateNewFolder: 'Créer un nouveau dossier',
    tooltipOpenSettings: 'Ouvrir les paramètres',
    tooltipFolder: 'Dossier',
    tooltipCreateNote: 'Créer une note : {{path}}',
    tooltipCreateChildNote: 'Créer une note enfant : {{path}}',
    tooltipMoreActions: 'Plus d\'actions',
    menuRename: 'Renommer',
    menuRenameFile: 'Renommer le fichier',
    menuDeleteFile: 'Supprimer le fichier',
    menuDeleteFolder: 'Supprimer le dossier',
    confirmDeleteFile: 'Supprimer ce fichier ?\n{{path}}',
    
    // Notices
    noticeCreatedNote: 'Note créée : {{path}}',
    noticeFailedCreateNote: 'Échec de création de la note : {{path}}',
    noticeRenameNote: 'Appuyez sur F2 pour renommer la note',
    noticeDeletedFile: 'Supprimé : {{path}}',
    noticeFailedDeleteFile: 'Échec de la suppression : {{path}}',
    promptRenameFile: 'Renommer le fichier : {{name}}',
    noticeFileExists: 'Un fichier existe déjà à : {{path}}',
    noticeRenamedFile: 'Renommé en : {{newPath}}',
    noticeFailedRenameFile: 'Échec du renommage : {{path}}',
    noticeNoParentNote: 'Aucune note parente trouvée',
    
    // Ribbon
    ribbonTooltip: 'Ouvrir Dot Navigator',

    // Settings
    settingsHeader: 'Paramètres Dot Navigator',
    settingsFileCreationHeader: 'Création de fichiers',
    settingsFileCreationDescription: 'Personnalisez la façon dont les nouveaux fichiers sont créés.',
    settingsDefaultNewFileName: 'Nom par défaut des nouveaux fichiers',
    settingsDefaultNewFileNameDesc: 'Le nom par défaut des nouveaux fichiers (laissez vide pour utiliser "sans-titre" ou l\'équivalent localisé)',
    settingsAutoOpenRenameDialog: 'Ouverture automatique de la boîte de dialogue de renommage pour les notes enfants',
    settingsAutoOpenRenameDialogDesc: 'Ouvre automatiquement la boîte de dialogue de renommage lors de la création de nouvelles notes enfants',
    settingsTransformDashes: 'Transformer les tirets dans les noms de notes',
    settingsTransformDashesDesc: 'Choisissez comment transformer les noms de notes contenant des tirets pour une meilleure lisibilité dans l\'arborescence',
    settingsDashTransformNone: 'Aucun changement',
    settingsDashTransformSpaces: 'Supprimer les tirets',
    settingsDashTransformSentenceCase: 'Supprimer les tirets + mettre en majuscule la première lettre',
    settingsMoreMenuHeader: 'Menu Plus',
    settingsMoreMenuDescription: 'Personnalisez le menu trois-points. Les éléments intégrés ne peuvent pas être supprimés ; vous pouvez les réorganiser. Vous pouvez ajouter, supprimer et réorganiser les commandes personnalisées.',
    settingsBuiltinItems: 'Éléments intégrés',
    settingsCustomCommands: 'Commandes personnalisées',
    settingsAddCustomCommand: 'Ajouter une commande personnalisée',
    settingsRestoreDefaults: 'Restaurer les valeurs par défaut',
    settingsMoveUp: 'Déplacer vers le haut',
    settingsMoveDown: 'Déplacer vers le bas',
    settingsRemove: 'Supprimer',
    settingsLabel: 'Étiquette',
    settingsLabelDesc: 'Texte affiché dans le menu',
    settingsCommand: 'Commande',
    settingsCommandDesc: 'Sélectionnez une commande dans la palette',
    settingsSelectCommand: 'Sélectionner une commande…',
    settingsOpenFileBeforeExecuting: 'Ouvrir le fichier avant exécution',
    settingsOpenFileBeforeExecutingDesc: 'Ouvre le fichier cliqué avant d\'exécuter la commande (recommandé)',
    settingsBuiltinAddChildNote: 'Ajouter une note enfant',
    settingsBuiltinRename: 'Renommer',
    settingsBuiltinDelete: 'Supprimer',
    settingsBuiltinOpenClosestParent: 'Ouvrir la note parente la plus proche',
    settingsBuiltinUnknown: 'Inconnu',
    settingsAddCustomCommandLink: 'Personnaliser le menu…',
    settingsTipsHeader: 'Astuces et raccourcis',
    settingsTipsDescription: 'Astuces et raccourcis utiles pour améliorer votre productivité.',
    settingsTipDoubleClickRenameTitle: 'Double-clic pour renommer',
    settingsTipDoubleClickRenameDescription: 'Double-cliquez sur n\'importe quel élément de l\'arborescence pour le renommer rapidement',

    // Rename dialog
    renameDialogTitle: 'Renommer {{type}}',
    renameDialogPath: 'Chemin',
    renameDialogName: 'Nom',
    renameDialogExtension: 'Extension',
    renameDialogModeFileOnly: 'Renommer seulement ce fichier',
    renameDialogModeFileOnlyHint: 'Si cette option est désactivée, seul ce fichier sera renommé',
    renameDialogModeFileAndChildren: 'Renommer aussi les sous-fichiers',
    renameDialogCancel: 'Annuler',
    renameDialogConfirm: 'Renommer',
    renameDialogPathNotExists: 'Le chemin n\'existe pas (les dossiers seront créés)',
    renameDialogFoldersWillBeCreated: 'Les dossiers suivants seront créés : {{folders}}',
    renameDialogPathSuggestions: 'Suggestions de chemins',
    renameDialogChildrenPreview: 'Fichiers à renommer ({{count}})',
    renameDialogProgress: 'Renommage terminé : {{completed}}/{{total}} ({{percent}}%) ✓{{successful}} ✗{{failed}}',
    renameDialogProgressInitializing: 'Initialisation...',
    renameDialogProgressStarting: 'Démarrage...',
    renameDialogProgressCompleted: 'Terminé',
    renameDialogProgressFailed: 'Échec',
    renameDialogProgressPreparingDirectories: 'Préparation des dossiers...',
    renameDialogProgressCancelling: 'Annulation...',
    renameDialogProgressCancelled: 'Annulé',
    renameDialogProgressCancelIssues: 'Annulé avec des erreurs',
    
    // Rename notices
    noticeRenameStarted: 'Début de l\'opération de renommage...',
    noticeRenameCompleted: 'Renommage terminé : {{successful}} réussis, {{failed}} échoués',
    noticeRenameCancelled: 'Opération de renommage annulée',
    noticeRenameUndone: 'Opération de renommage annulée',

    // Rename notification
    renameNotificationSuccess: '{{count}} fichier(s) renommé(s) avec succès',
    renameNotificationFailed: 'Échec du renommage de {{count}} fichier(s)',
    renameNotificationPartial: '{{success}} fichier(s) renommé(s), {{failed}} échoué(s)',
    renameNotificationUndo: 'Annuler',

    // Common
    commonClose: 'Fermer',

    // Rename dialog hints
    renameDialogHintNavigate: 'pour naviguer entre les suggestions',
    renameDialogHintUse: 'pour valider la saisie',
    renameDialogHintClose: 'pour fermer',
    renameDialogHintToggleMode: 'pour basculer le mode',

    // Rename dialog warnings
    renameDialogFileExists: 'Un fichier avec ce nom existe déjà',
    renameDialogFileExistsDesc: 'Choisissez un nom différent pour éviter les conflits',

    // Rename dialog info
    renameDialogNoChangesTitle: 'Aucun changement détecté',
    renameDialogNoChangesDesc: 'Modifiez le nom ou le chemin avant de valider le renommage',

    // Untitled
    untitledPath: 'sans-titre',
};
