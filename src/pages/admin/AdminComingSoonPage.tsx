import { Link } from "react-router-dom";
import { Construction } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description: string;
};

export default function AdminComingSoonPage({ title, description }: Props) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Administração
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-8 text-center">
        <Construction className="size-10 text-muted-foreground" />

        <div className="space-y-2">
          <h2 className="font-semibold">Funcionalidade em desenvolvimento</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Esta seção será disponibilizada nas próximas etapas do painel administrativo.
          </p>
        </div>

        <Button variant="outline">
          <Link to="/admin">Voltar para visão geral</Link>
        </Button>
      </div>
    </div>
  );
}
