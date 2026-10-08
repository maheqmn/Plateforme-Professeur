import InvitationForm from "./invitation-form";

// F1.2 / F1.4 : première étape de l'inscription, saisie de l'invitation.
// Le lien unique d'invitation pointe ici avec ?code=XXXXXXXX.
export default async function PageInvitation({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  return <InvitationForm codeInitial={params.code ?? ""} />;
}
