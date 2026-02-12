"use client";

import { NavLink } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { Home, User, Briefcase, FileText, Mail, Layout } from "lucide-react";

const items = [
  { to: "/", label: "Landing", icon: Layout },
  { to: "/portfolio", label: "Home", icon: Home },
  { to: "/portfolio/about", label: "About", icon: User },
  { to: "/portfolio/works", label: "Works", icon: Briefcase },
  { to: "/portfolio/article", label: "Article", icon: FileText },
  { to: "/portfolio/contact", label: "Contact", icon: Mail },
];

/**
 * Navegación con componente Radix NavigationMenu.
 * Solo cambio de color de borde, sin border-radius, centrada en el eje Y.
 */
export function FloatingDock() {
  return (
    <NavigationMenu className="fixed top-1/2 right-6 z-50 -translate-y-1/2 max-w-none">
      <NavigationMenuList
        className={cn(
          "flex flex-col gap-0 border border-[#EAEAEA]/20 bg-[#070707] p-1",
          "rounded-none"
        )}
      >
        {items.map(({ to, label, icon: Icon }) => (
          <NavigationMenuItem key={to} className="list-none">
            <NavigationMenuLink asChild>
              <NavLink
                to={to}
                end={to === "/" || to === "/portfolio"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-center w-11 h-11 text-[#EAEAEA]/70",
                    "border border-transparent rounded-none",
                    "hover:text-[#EAEAEA] hover:bg-transparent",
                    isActive && "text-[#EAEAEA] border-[#EAEAEA]/25"
                  )
                }
              >
                <Icon className="size-5" aria-hidden />
                <span className="sr-only">{label}</span>
              </NavLink>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
