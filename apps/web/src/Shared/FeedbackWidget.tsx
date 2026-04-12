import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "./Icon";
import { Message01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = useMutation(api.feedback.submit);

  async function handleSubmit() {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await submit({ message, page: window.location.pathname });
      setMessage("");
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 2000);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-black text-surface shadow-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        aria-label="Enviar feedback"
      >
        <Icon icon={Message01Icon} size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-72 rounded-xl border border-border bg-surface-raised p-4 shadow-xl animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
          FEEDBACK
        </span>
        <button
          onClick={() => setOpen(false)}
          className="text-text-muted transition-colors hover:text-black"
          aria-label="Cerrar"
        >
          <Icon icon={Cancel01Icon} size={16} />
        </button>
      </div>

      {sent ? (
        <p className="mt-3 text-[14px] text-green">Gracias por tu feedback!</p>
      ) : (
        <>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Contanos qué pensás, o reporta una página que no funcione bien..."
            rows={3}
            className="mt-3 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[14px] text-text-primary outline-none placeholder:text-text-muted focus:border-black"
          />
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || sending}
            className="mt-2 w-full rounded-full bg-black py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-surface transition-colors hover:bg-text-primary disabled:opacity-40"
          >
            {sending ? "ENVIANDO..." : "ENVIAR"}
          </button>
        </>
      )}
    </div>
  );
}
