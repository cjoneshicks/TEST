import { chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";
import PortalClient from "./portal-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getChatGPTUser();

  return (
    <PortalClient
      authenticatedUser={
        user
          ? { email: user.email, displayName: user.displayName }
          : null
      }
      signOutUrl={chatGPTSignOutPath("/")}
    />
  );
}
