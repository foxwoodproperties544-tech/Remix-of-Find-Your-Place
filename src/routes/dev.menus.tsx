/**
 * Internal visual-regression harness for menu surfaces.
 *
 * Renders every dropdown-style component (dropdown menu, select, menubar,
 * context menu) with enabled, disabled and active items so automated visual
 * tests can snapshot hover/active/focus/disabled states in light and dark
 * themes. Not linked from navigation and excluded from search engines.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export const Route = createFileRoute("/dev/menus")({
  head: () => ({
    meta: [
      { title: "Menu states harness | Foxwood Properties" },
      {
        name: "description",
        content:
          "Internal harness rendering dropdown, select, menubar and context menu states for visual regression testing.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Menu states harness | Foxwood Properties" },
      {
        property: "og:description",
        content: "Internal harness for dropdown and menu visual regression tests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MenuHarness,
});

function MenuHarness() {
  return (
    <div className="container-page py-12 space-y-10">
      <h1 className="text-2xl font-semibold">Menu states harness</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Dropdown menu</h2>
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="dm-trigger" className="rounded-lg border px-3 py-2 text-sm">
            Open dropdown
          </DropdownMenuTrigger>
          <DropdownMenuContent data-testid="dm-content" align="start">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem data-testid="dm-item">Edit listing</DropdownMenuItem>
            <DropdownMenuItem data-testid="dm-item-2">Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="dm-disabled" disabled>
              Delete (disabled)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Select</h2>
        <Select>
          <SelectTrigger data-testid="sel-trigger" className="w-64">
            <SelectValue placeholder="Choose a county" />
          </SelectTrigger>
          <SelectContent data-testid="sel-content">
            <SelectItem value="nairobi">Nairobi</SelectItem>
            <SelectItem value="mombasa">Mombasa</SelectItem>
            <SelectItem value="kisumu" disabled>
              Kisumu (disabled)
            </SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Menubar</h2>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger data-testid="mb-trigger">Listings</MenubarTrigger>
            <MenubarContent data-testid="mb-content">
              <MenubarItem data-testid="mb-item">New listing</MenubarItem>
              <MenubarSeparator />
              <MenubarItem data-testid="mb-disabled" disabled>
                Archive (disabled)
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Context menu</h2>
        <ContextMenu>
          <ContextMenuTrigger
            data-testid="cm-trigger"
            className="grid h-24 w-64 place-items-center rounded-lg border border-dashed text-sm"
          >
            Right-click here
          </ContextMenuTrigger>
          <ContextMenuContent data-testid="cm-content">
            <ContextMenuItem data-testid="cm-item">Share</ContextMenuItem>
            <ContextMenuItem data-testid="cm-disabled" disabled>
              Report (disabled)
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </section>
    </div>
  );
}
