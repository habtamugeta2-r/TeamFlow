"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/error-message";

type RunActionOptions = {
  successMessage: string;
  action: () => Promise<void>;
  refreshMembers?: () => Promise<void>;
  onSuccess?: () => void;
};

export function useActionRunner() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function runAction({
    action,
    successMessage,
    refreshMembers,
    onSuccess,
  }: RunActionOptions): Promise<boolean> {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await refreshMembers?.();
      setNotice(successMessage);
      onSuccess?.();
      return true;
    } catch (reason) {
      setError(errorMessage(reason));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, setError, notice, setNotice, runAction };
}
