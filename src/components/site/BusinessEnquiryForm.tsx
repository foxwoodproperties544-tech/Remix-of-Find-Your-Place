import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { submitBusinessEnquiry } from "@/lib/directory.functions";
import { rateLimitKey } from "@/lib/rate-limit";
import { useAuth } from "@/hooks/use-auth";

export function BusinessEnquiryForm({
  businessId,
  propertyId,
  propertyTitle,
}: {
  businessId: string;
  propertyId?: string | null;
  propertyTitle?: string | null;
}) {
  const { user } = useAuth();
  const send = useServerFn(submitBusinessEnquiry);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    propertyTitle ? `Hello, I'm interested in "${propertyTitle}". Is it still available?` : "",
  );
  const [done, setDone] = useState(false);

  const m = useMutation({
    mutationFn: () =>
      send({
        data: {
          businessId,
          propertyId: propertyId ?? null,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
          source: propertyId ? "property" : "form",
          clientKey: rateLimitKey(user?.id),
        },
      }),
    onSuccess: () => {
      setDone(true);
      toast.success("Enquiry sent. The company will get back to you.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not send enquiry"),
  });

  if (done) {
    return (
      <div className="rounded-xl border border-border bg-primary-soft/40 p-4 text-sm">
        Thank you — your enquiry has been sent through Foxwood Properties.
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length < 2) return toast.error("Please enter your name");
        if (!email.trim() && !phone.trim()) return toast.error("Add an email or phone number");
        m.mutate();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={255}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Message</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={m.isPending}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send enquiry
      </button>
    </form>
  );
}
