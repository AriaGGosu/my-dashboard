import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";

const links = [
  { to: "/portfolio", label: "Home" },
  { to: "/portfolio/about", label: "About" },
  { to: "/portfolio/works", label: "Works" },
  { to: "/portfolio/contact", label: "Contact" },
];

export function SiteNav() {
  return (
    <div className="relative mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
      <NavLink to="/" className="font-test font-medium text-foreground tracking-widest">
        PORTFOLIO
      </NavLink>
      <NavigationMenu className="max-w-none">
        <NavigationMenuList className="gap-2">
          {links.map(({ to, label }) => (
            <NavigationMenuItem key={to}>
              <NavigationMenuLink asChild>
                <NavLink
                  to={to}
                  end={to === "/portfolio"}
                  className={({ isActive }) =>
                    cn(
                      navigationMenuTriggerStyle(),
                      "test-font text-sm sm:text-base tracking-wider px-4 py-2",
                      isActive
                        ? "bg-primary/10 text-primary border border-[#EAEAEA]/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )
                  }
                >
                  {label}
                </NavLink>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
