// Rendu du contenu des cours (F2.3 : titres, listes, gras, liens) et des
// articles de blog (F3.4 : images téléchargées, servies par /fichiers/[id]).
// Sous-ensemble de markdown volontairement minimal. Tout le HTML saisi est
// échappé avant transformation : le rendu est sûr par construction (exigence 8.2, XSS).

function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Mise en forme en ligne : **gras**, [texte](https://lien) et
// ![texte](/fichiers/xxxx) pour les images téléchargées sur la plateforme.
function enLigne(texte: string): string {
  let resultat = echapper(texte);
  // Images internes uniquement : aucune source externe ne peut être injectée.
  resultat = resultat.replace(
    /!\[([^\]]*)\]\((\/fichiers\/[a-zA-Z0-9]+)\)/g,
    '<img src="$2" alt="$1" loading="lazy" />'
  );
  resultat = resultat.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  resultat = resultat.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return resultat;
}

export function rendreContenu(contenu: string): string {
  const lignes = contenu.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let dansListe = false;
  let dansParagraphe = false;

  const fermerListe = () => {
    if (dansListe) {
      html += "</ul>";
      dansListe = false;
    }
  };
  const fermerParagraphe = () => {
    if (dansParagraphe) {
      html += "</p>";
      dansParagraphe = false;
    }
  };

  for (const ligneBrute of lignes) {
    const ligne = ligneBrute.trim();
    if (!ligne) {
      fermerListe();
      fermerParagraphe();
      continue;
    }
    if (ligne.startsWith("- ")) {
      fermerParagraphe();
      if (!dansListe) {
        html += "<ul>";
        dansListe = true;
      }
      html += "<li>" + enLigne(ligne.slice(2)) + "</li>";
      continue;
    }
    fermerListe();
    if (ligne.startsWith("### ")) {
      fermerParagraphe();
      html += "<h3>" + enLigne(ligne.slice(4)) + "</h3>";
    } else if (ligne.startsWith("## ")) {
      fermerParagraphe();
      html += "<h2>" + enLigne(ligne.slice(3)) + "</h2>";
    } else if (!dansParagraphe) {
      html += "<p>" + enLigne(ligne);
      dansParagraphe = true;
    } else {
      html += "<br />" + enLigne(ligne);
    }
  }

  fermerListe();
  fermerParagraphe();
  return html;
}
