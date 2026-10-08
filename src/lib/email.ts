type Courriel = {
  to: string;
  subject: string;
  text: string;
};

// Phase 1 : service de développement. Les emails sont journalisés dans la
// console du serveur. En production, brancher un service transactionnel
// (Brevo, Postmark...) à cet endroit (exigence 8.1).
export async function envoyerEmail(courriel: Courriel): Promise<void> {
  console.log("=== EMAIL (mode développement) ===");
  console.log("À      : " + courriel.to);
  console.log("Objet  : " + courriel.subject);
  console.log(courriel.text);
  console.log("==================================");
}
