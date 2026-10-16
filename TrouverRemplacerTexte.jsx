//@target illustrator
/*
 * TrouverRemplacerTexte.jsx  —  v1.0.0
 * ----------------------------------------------------------------------------
 * FR : Recherche et remplacement de texte dans tous les TextFrame d'un
 *      document Illustrator. Portée : document entier, calque actif, ou
 *      sélection (textes sélectionnés / textes contenus dans la sélection).
 *      Bouton « Compter » : nombre d'occurrences sans modification.
 *      Bouton « Remplacer tout » : applique les remplacements.
 * EN : Find and replace text across TextFrames in an Illustrator document.
 *      Scope: whole document, active layer, or selection (selected text
 *      frames / text frames inside the selection).
 *      "Count" button: occurrence count without changing anything.
 *      "Replace all" button: applies replacements.
 *
 * Cible / Target : Illustrator CC (2018+) jusqu'aux versions récentes.
 * Statut / Status : NON TESTÉ DANS ILLUSTRATOR — syntaxe ES3 vérifiée (acorn).
 *                   NOT TESTED IN ILLUSTRATOR — ES3 syntax checked (acorn).
 * Annulation / Undo : chaque modification de .contents peut être un pas
 *      d'annulation distinct (Illustrator n'a pas beginUndoGroup fiable
 *      partout). Plusieurs Ctrl+Z / Cmd+Z peuvent être nécessaires.
 *      Each .contents change may be a separate undo step (no reliable
 *      beginUndoGroup everywhere). Several Ctrl+Z / Cmd+Z may be needed.
 * Conseil : travaillez sur une copie de votre fichier.
 * Tip     : work on a copy of your file.
 * Aucune connexion réseau, aucune collecte de données.
 * No network access, no data collection.
 *
 * Licence MIT — (c) 2026 Amirouche Amwanes. Code original.
 */

(function () {

    var VERSION = "1.0.0";

    // ------------------------------------------------------------------
    // Langue / Language (locale Illustrator ou choix manuel FR/EN)
    // ------------------------------------------------------------------
    var FR = String($.locale || app.locale || "").toLowerCase().indexOf("fr") === 0;
    function t(fr, en) { return FR ? fr : en; }

    // ------------------------------------------------------------------
    // Garde-fous / Guards
    // ------------------------------------------------------------------
    if (app.documents.length === 0) {
        alert(t("Aucun document ouvert.\nOuvrez un document puis relancez le script.",
                "No document open.\nOpen a document and run the script again."));
        return;
    }

    var doc = app.activeDocument;

    // ------------------------------------------------------------------
    // Utilitaires texte / Text helpers (ES3)
    // ------------------------------------------------------------------

    /**
     * Compte les occurrences de needle dans haystack.
     * Count occurrences of needle in haystack.
     * caseSensitive : si false, comparaison en minuscules (toLowerCase).
     */
    function countOccurrences(haystack, needle, caseSensitive) {
        if (!needle || needle.length === 0) { return 0; }
        var src = caseSensitive ? String(haystack) : String(haystack).toLowerCase();
        var ndl = caseSensitive ? String(needle) : String(needle).toLowerCase();
        var count = 0;
        var pos = 0;
        var idx;
        while (true) {
            idx = src.indexOf(ndl, pos);
            if (idx < 0) { break; }
            count++;
            pos = idx + ndl.length;
            // Si needle vide (déjà filtré) ou chevauchement : avance d'au moins 1
            // Empty needle already filtered; advance by at least 1 if length 0
            if (ndl.length === 0) { pos++; }
        }
        return count;
    }

    /**
     * Remplace toutes les occurrences. Respecte la casse si caseSensitive.
     * Replace all occurrences. Honours case when caseSensitive is true.
     * Utilise une boucle indexOf (pas de regex) pour rester ES3 et prévisible.
     * Uses an indexOf loop (no regex) for ES3 and predictable behaviour.
     */
    function replaceAll(haystack, needle, replacement, caseSensitive) {
        if (!needle || needle.length === 0) { return String(haystack); }
        var source = String(haystack);
        var result = "";
        var pos = 0;
        var idx;
        var cmpSrc = caseSensitive ? source : source.toLowerCase();
        var cmpNdl = caseSensitive ? String(needle) : String(needle).toLowerCase();
        var nLen = needle.length;

        while (true) {
            idx = cmpSrc.indexOf(cmpNdl, pos);
            if (idx < 0) {
                result += source.substring(pos);
                break;
            }
            result += source.substring(pos, idx);
            result += String(replacement);
            pos = idx + nLen;
        }
        return result;
    }

    /**
     * Vérifie si un calque (ou un ancêtre) est verrouillé.
     * Returns true if the layer or any ancestor layer is locked.
     */
    function isLayerLocked(layer) {
        var L = layer;
        while (L) {
            try {
                if (L.locked) { return true; }
            } catch (eLock) { /* ignore */ }
            try {
                L = L.parent;
                if (!L || L.typename === "Document") { break; }
                if (L.typename !== "Layer") { break; }
            } catch (ePar) {
                break;
            }
        }
        return false;
    }

    /**
     * Indique si un TextFrame est modifiable (non verrouillé, calque OK).
     * Whether a TextFrame can be edited (not locked, layer not locked).
     */
    function isFrameEditable(tf) {
        try {
            if (tf.locked) { return false; }
        } catch (e1) { return false; }
        try {
            if (isLayerLocked(tf.layer)) { return false; }
        } catch (e2) { return false; }
        return true;
    }

    /**
     * Collecte les TextFrame sous un nœud (pageItem, group, layer…).
     * Collect TextFrames under a node (pageItem, group, layer…).
     */
    function collectTextFramesFromItem(item, out) {
        if (!item) { return; }
        var tn;
        try { tn = item.typename; } catch (eTn) { return; }

        if (tn === "TextFrame") {
            out.push(item);
            return;
        }
        if (tn === "GroupItem") {
            var gItems = item.pageItems;
            var gi;
            for (gi = 0; gi < gItems.length; gi++) {
                collectTextFramesFromItem(gItems[gi], out);
            }
            return;
        }
        if (tn === "CompoundPathItem") {
            return;
        }
        // Autres types : pas de texte direct / Other types: no direct text
    }

    /**
     * Collecte récursivement les TextFrame d'un calque (sous-calques inclus).
     * Recursively collect TextFrames from a layer (including sublayers).
     */
    function collectTextFramesFromLayer(layer, out) {
        var i;
        var items = layer.pageItems;
        for (i = 0; i < items.length; i++) {
            collectTextFramesFromItem(items[i], out);
        }
        var subs = layer.layers;
        for (i = 0; i < subs.length; i++) {
            collectTextFramesFromLayer(subs[i], out);
        }
    }

    /**
     * Sélection utilitaire : tableau d'objets (ignore TextRange d'édition).
     * Selection helper: array of items (ignore text-edit TextRange).
     */
    function getSelectionArray() {
        var s = doc.selection;
        var out = [];
        if (!s) { return out; }
        // TextRange (édition de texte) a .typename
        // TextRange (text editing) has .typename
        if (s.typename) { return out; }
        var i;
        for (i = 0; i < s.length; i++) {
            out.push(s[i]);
        }
        return out;
    }

    /**
     * Retourne la liste des TextFrame selon la portée.
     * Returns TextFrame list according to scope.
     * scopeKey : "document" | "layer" | "selection"
     */
    function getTargetFrames(scopeKey) {
        var frames = [];
        var i;

        if (scopeKey === "document") {
            // doc.textFrames inclut tous les TextFrame du document
            // doc.textFrames includes all TextFrames in the document
            var all = doc.textFrames;
            for (i = 0; i < all.length; i++) {
                frames.push(all[i]);
            }
            return frames;
        }

        if (scopeKey === "layer") {
            collectTextFramesFromLayer(doc.activeLayer, frames);
            return frames;
        }

        // selection
        var sel = getSelectionArray();
        if (sel.length === 0) {
            return frames;
        }
        for (i = 0; i < sel.length; i++) {
            collectTextFramesFromItem(sel[i], frames);
        }
        // Dédupliquer par index dans doc.textFrames si possible
        // Deduplicate by identity (simple linear unique)
        var unique = [];
        var j;
        var seen;
        for (i = 0; i < frames.length; i++) {
            seen = false;
            for (j = 0; j < unique.length; j++) {
                if (unique[j] === frames[i]) { seen = true; break; }
            }
            if (!seen) { unique.push(frames[i]); }
        }
        return unique;
    }

    /**
     * Parcourt les cadres : compte ou remplace.
     * Walk frames: count or replace.
     * mode : "count" | "replace"
     * Retourne { occurrences, framesTouched, ignored, emptySearch }
     */
    function processFrames(frames, findStr, replaceStr, caseSensitive, mode) {
        var result = {
            occurrences: 0,
            framesTouched: 0,
            ignored: 0,
            emptySearch: false
        };

        if (!findStr || findStr.length === 0) {
            result.emptySearch = true;
            return result;
        }

        var i;
        var tf;
        var contents;
        var n;
        var newContents;

        for (i = 0; i < frames.length; i++) {
            tf = frames[i];

            if (!isFrameEditable(tf)) {
                // Compter quand même les occurrences « ignorées » (cadre verrouillé)
                // Still count occurrences in locked frames as ignored hits
                try {
                    contents = String(tf.contents);
                    n = countOccurrences(contents, findStr, caseSensitive);
                    if (n > 0) {
                        result.ignored += n;
                    }
                } catch (eIgn) {
                    result.ignored++;
                }
                continue;
            }

            try {
                contents = String(tf.contents);
            } catch (eRead) {
                result.ignored++;
                continue;
            }

            n = countOccurrences(contents, findStr, caseSensitive);
            if (n === 0) { continue; }

            result.occurrences += n;

            if (mode === "replace") {
                newContents = replaceAll(contents, findStr, replaceStr, caseSensitive);
                try {
                    tf.contents = newContents;
                    result.framesTouched++;
                } catch (eWrite) {
                    // Écriture impossible → compter comme ignoré
                    // Write failed → count as ignored
                    result.occurrences -= n;
                    result.ignored += n;
                }
            }
        }

        return result;
    }

    // ------------------------------------------------------------------
    // Dialogue ScriptUI / ScriptUI dialog
    // ------------------------------------------------------------------
    function buildDialog() {
        var w = new Window("dialog", t("Trouver / Remplacer texte", "Find / Replace Text") + "  v" + VERSION);
        w.orientation = "column";
        w.alignChildren = ["fill", "top"];
        w.margins = 16;
        w.spacing = 10;

        // Langue manuelle / Manual language
        var langGrp = w.add("group");
        langGrp.orientation = "row";
        langGrp.alignChildren = ["left", "center"];
        langGrp.add("statictext", undefined, t("Langue :", "Language:"));
        var radioFR = langGrp.add("radiobutton", undefined, "FR");
        var radioEN = langGrp.add("radiobutton", undefined, "EN");
        if (FR) { radioFR.value = true; } else { radioEN.value = true; }

        // Champs / Fields
        var findGrp = w.add("group");
        findGrp.orientation = "row";
        findGrp.alignChildren = ["left", "center"];
        var findLbl = findGrp.add("statictext", undefined, t("Rechercher :", "Find:"));
        findLbl.preferredSize.width = 90;
        var findEdit = findGrp.add("edittext", undefined, "");
        findEdit.characters = 36;
        findEdit.active = true;

        var replGrp = w.add("group");
        replGrp.orientation = "row";
        replGrp.alignChildren = ["left", "center"];
        var replLbl = replGrp.add("statictext", undefined, t("Remplacer :", "Replace:"));
        replLbl.preferredSize.width = 90;
        var replEdit = replGrp.add("edittext", undefined, "");
        replEdit.characters = 36;

        // Options
        var optPanel = w.add("panel", undefined, t("Options", "Options"));
        optPanel.orientation = "column";
        optPanel.alignChildren = ["left", "top"];
        optPanel.margins = 12;

        var caseCb = optPanel.add("checkbox", undefined, t("Respecter la casse", "Case sensitive"));
        caseCb.value = false;

        optPanel.add("statictext", undefined, t("Portée :", "Scope:"));
        var scopeDoc = optPanel.add("radiobutton", undefined, t("Document entier", "Entire document"));
        var scopeLayer = optPanel.add("radiobutton", undefined, t("Calque actif", "Active layer"));
        var scopeSel = optPanel.add("radiobutton", undefined, t("Sélection (textes sélectionnés ou contenus)", "Selection (selected or nested text)"));
        scopeDoc.value = true;

        // Note undo
        var note = w.add("statictext", undefined,
            t("Note : l'annulation peut exiger plusieurs Ctrl+Z. Travaillez sur une copie.",
              "Note: undo may need several Ctrl+Z. Work on a copy."),
            { multiline: true });
        note.preferredSize.width = 420;

        // Boutons / Buttons
        var btnGrp = w.add("group");
        btnGrp.orientation = "row";
        btnGrp.alignment = ["center", "top"];
        var btnCount = btnGrp.add("button", undefined, t("Compter", "Count"));
        var btnReplace = btnGrp.add("button", undefined, t("Remplacer tout", "Replace all"));
        var btnClose = btnGrp.add("button", undefined, t("Fermer", "Close"), { name: "cancel" });

        function currentScope() {
            if (scopeLayer.value) { return "layer"; }
            if (scopeSel.value) { return "selection"; }
            return "document";
        }

        function refreshLabels() {
            // Mise à jour des libellés si l'utilisateur change FR/EN
            // Refresh labels when the user switches FR/EN
            w.text = t("Trouver / Remplacer texte", "Find / Replace Text") + "  v" + VERSION;
            findLbl.text = t("Rechercher :", "Find:");
            replLbl.text = t("Remplacer :", "Replace:");
            optPanel.text = t("Options", "Options");
            caseCb.text = t("Respecter la casse", "Case sensitive");
            // Les radios de portée : recréer le texte
            scopeDoc.text = t("Document entier", "Entire document");
            scopeLayer.text = t("Calque actif", "Active layer");
            scopeSel.text = t("Sélection (textes sélectionnés ou contenus)", "Selection (selected or nested text)");
            note.text = t("Note : l'annulation peut exiger plusieurs Ctrl+Z. Travaillez sur une copie.",
                          "Note: undo may need several Ctrl+Z. Work on a copy.");
            btnCount.text = t("Compter", "Count");
            btnReplace.text = t("Remplacer tout", "Replace all");
            btnClose.text = t("Fermer", "Close");
        }

        radioFR.onClick = function () {
            FR = true;
            refreshLabels();
        };
        radioEN.onClick = function () {
            FR = false;
            refreshLabels();
        };

        btnCount.onClick = function () {
            var findStr = findEdit.text;
            if (!findStr || findStr.length === 0) {
                alert(t("La chaîne de recherche est vide.",
                        "The search string is empty."));
                return;
            }
            var frames = getTargetFrames(currentScope());
            if (frames.length === 0) {
                alert(t("Aucun bloc de texte trouvé dans la portée choisie.",
                        "No text frame found in the selected scope."));
                return;
            }
            var r = processFrames(frames, findStr, "", caseCb.value, "count");
            var msg = t(
                "Occurrences : " + r.occurrences +
                    "\nBlocs de texte parcourus : " + frames.length +
                    (r.ignored > 0 ? ("\nOccurrences ignorées (verrouillés) : " + r.ignored) : ""),
                "Occurrences: " + r.occurrences +
                    "\nText frames scanned: " + frames.length +
                    (r.ignored > 0 ? ("\nIgnored occurrences (locked): " + r.ignored) : "")
            );
            if (r.occurrences === 0 && r.ignored === 0) {
                msg = t("Aucune occurrence trouvée.", "No occurrences found.");
            }
            alert(msg);
        };

        btnReplace.onClick = function () {
            var findStr = findEdit.text;
            if (!findStr || findStr.length === 0) {
                alert(t("La chaîne de recherche est vide.",
                        "The search string is empty."));
                return;
            }
            var frames = getTargetFrames(currentScope());
            if (frames.length === 0) {
                alert(t("Aucun bloc de texte trouvé dans la portée choisie.",
                        "No text frame found in the selected scope."));
                return;
            }
            var r = processFrames(frames, findStr, replEdit.text, caseCb.value, "replace");
            var msg = t(
                "Remplacements effectués : " + r.occurrences +
                    "\nBlocs modifiés : " + r.framesTouched +
                    (r.ignored > 0 ? ("\nOccurrences ignorées (verrouillés) : " + r.ignored) : "") +
                    "\n\nL'annulation peut nécessiter plusieurs Ctrl+Z / Cmd+Z.",
                "Replacements made: " + r.occurrences +
                    "\nFrames modified: " + r.framesTouched +
                    (r.ignored > 0 ? ("\nIgnored occurrences (locked): " + r.ignored) : "") +
                    "\n\nUndo may require several Ctrl+Z / Cmd+Z."
            );
            if (r.occurrences === 0 && r.framesTouched === 0) {
                msg = t(
                    "Aucune occurrence remplacée." +
                        (r.ignored > 0 ? ("\nOccurrences ignorées (verrouillés) : " + r.ignored) : ""),
                    "No occurrences replaced." +
                        (r.ignored > 0 ? ("\nIgnored occurrences (locked): " + r.ignored) : "")
                );
            }
            alert(msg);
        };

        btnClose.onClick = function () {
            w.close();
        };

        w.show();
    }

    buildDialog();

})();
