"use client";
import { ActionForm } from "@/components/ActionForm";
import { loginAction } from "@/server/actions";

export function LoginForm() {
  return (
    <ActionForm action={loginAction} label="Log in" resetOnOk={false}>
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
    </ActionForm>
  );
}
