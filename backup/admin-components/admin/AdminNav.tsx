"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Ana Sayfa" },
  { href: "/admin/organizations", label: "Firma Profili" },
  { href: "/admin/users", label: "Kullanıcılar" },
  { href: "/admin/trainings", label: "Eğitimler" },
  { href: "/admin/assets", label: "İçerikler" },
  { href: "/admin/styles", label: "Stiller" },
  { href: "/admin/frame-configs", label: "Frame Ayarları" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-16 z-10 bg-background/95 backdrop-blur border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center space-x-1">
          {items.map((it) => {
            const active = pathname === it.href || pathname?.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
