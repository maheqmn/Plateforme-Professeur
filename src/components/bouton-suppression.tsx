"use client";

// F2.7 : suppression sécurisée. La confirmation affiche le message nommé
// ("Supprimer définitivement ... ? Cette action est irréversible.").
export default function BoutonSuppression({
  action,
  id,
  message,
  libelle = "Supprimer",
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  message: string;
  libelle?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(evenement) => {
        if (!window.confirm(message)) {
          evenement.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-small btn-danger">
        {libelle}
      </button>
    </form>
  );
}
