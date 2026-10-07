import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings/settings-form";
import { getKey } from "@/lib/credentials";
import { KEY_FIELDS } from "@/lib/keys";
import { isMockMode } from "@/lib/mock-mode";

export const metadata: Metadata = { title: "retracted: settings" };
export const dynamic = "force-dynamic";

export default function Page() {
  const onServer = Object.fromEntries(
    KEY_FIELDS.map((field) => [field.variable, Boolean(getKey(field.variable))]),
  );

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 sm:px-6">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Settings</h1>
        <p className="mt-3 leading-relaxed text-muted">
          Keys you save here stay in this browser. They are sent to this app's server with each request, which
          uses them only to call the services they belong to and does not store or log them. A key set in{" "}
          <code>.env.local</code> is used when none is saved here. The command-line tools read only{" "}
          <code>.env.local</code>.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Anyone who can open this browser profile, or run a script on this page, can read saved keys. Use
          keys you can revoke, and remove them on a shared computer.
        </p>
        <div className="mt-8">
          <SettingsForm onServer={onServer} mock={isMockMode()} />
        </div>
      </div>
    </main>
  );
}
