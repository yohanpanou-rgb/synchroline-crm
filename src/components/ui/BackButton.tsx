"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/ui/icons";

/**
 * Χρησιμοποιεί browser history (router.back()) αντί για σταθερό href, ώστε
 * να επιστρέφει ακριβώς εκεί που ήταν ο χρήστης πριν — π.χ. με τα ίδια
 * φίλτρα/scroll στη λίστα γιατρών, όχι πάντα στην κορυφή της λίστας.
 */
export function BackButton({ fallbackHref }: { fallbackHref?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else if (fallbackHref) router.push(fallbackHref);
      }}
      className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink/60 hover:text-primary"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      Πίσω
    </button>
  );
}
