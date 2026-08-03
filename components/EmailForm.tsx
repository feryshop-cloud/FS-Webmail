"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { validateEmail } from "@/lib/utils";

export function EmailForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Email tidak boleh kosong");
      return;
    }

    if (!validateEmail(email)) {
      setError("Format email tidak valid");
      return;
    }

    setError("");
    setIsLoading(true);
    
    // Redirect to inbox (Fase 4 akan menangani ini)
    router.push(`/inbox/${encodeURIComponent(email)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm mx-auto">
      <div className="flex flex-col gap-1.5 text-center mb-2">
        <p className="text-sm text-slate-500">
          Masukkan alamat email akun game yang kamu beli
        </p>
      </div>
      <Input
        type="email"
        placeholder="contoh: akun001@ferryshop.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError("");
        }}
        error={error}
        disabled={isLoading}
        autoComplete="email"
        autoFocus
      />
      <Button type="submit" isLoading={isLoading} className="w-full">
        Cek Kode OTP
      </Button>
    </form>
  );
}
