import Link from "next/link";
import { Button, Card } from "./components/ui";
import { Logo } from "./components/nav";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <Card className="glass-pill w-full max-w-md rounded-3xl p-10 text-center">
        <div className="flex justify-center">
          <Logo size={44} />
        </div>
        <p className="mt-6 font-mono text-sm text-muted">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          页面不存在
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          你要找的页面已被移动或删除。
        </p>
        <Link href="/hosts" className="mt-6 block">
          <Button className="w-full py-2.5">返回控制台</Button>
        </Link>
      </Card>
    </main>
  );
}
