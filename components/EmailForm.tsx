"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { validateEmail } from "@/lib/utils";
import { checkEmailAccountExists } from "@/app/actions/email";

export function EmailForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Email tidak boleh kosong");
      return;
    }

    if (!validateEmail(email)) {
      setError("Format email tidak valid");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const result = await checkEmailAccountExists(email);
      if (!result.exists) {
        setError(result.message || "Email tidak ditemukan di database.");
        setIsLoading(false);
        return;
      }

      router.push(`/inbox/${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat mengecek akun email.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <div className="mb-2 flex flex-col gap-1.5 text-center">
        <p className="text-sm text-slate-500">Masukkan alamat email akun game yang kamu beli</p>
      </div>
      <Input
        type="email"
        placeholder="contoh: akun001@feryshop.com"
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
