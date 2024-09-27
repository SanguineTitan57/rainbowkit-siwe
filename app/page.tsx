import { ConnectButton } from "@rainbow-me/rainbowkit";
//There's a hydration error, try fix it :)

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 text-black">
      <ConnectButton/>      
    </main>
  );
}
