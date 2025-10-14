"use client";
import { Wallet } from "@mercadopago/sdk-react";

export default function WalletBrick({
  preferenceId,
}: {
  preferenceId: string;
}) {
  return (
    <div className="max-w-sm">
      <Wallet initialization={{ preferenceId }} />
    </div>
  );
}
