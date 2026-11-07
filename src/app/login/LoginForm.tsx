"use client";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { ActionForm } from "@/components/ActionForm";
import { loginAction } from "@/server/actions";

export function LoginForm() {
  return (
    <ActionForm action={loginAction} label="Log in" resetOnOk={false}>
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Password<PasswordInput name="password" autoComplete="current-password" required /></label>
    </ActionForm>
  );
}
