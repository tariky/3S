import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { nanoid } from "nanoid";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Loader2,
  Link as LinkIcon,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Sun,
  Moon,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import {
  getFooterConfigQueryOptions,
  updateFooterConfigServerFn,
  FOOTER_QUERY_KEY,
} from "@/queries/footer";
import type { FooterConfig, FooterColumn, FooterLink } from "@/queries/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SingleImageUploader } from "@/components/ui/single-image-uploader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { COLOR_PRESETS } from "@/components/homepage-builder/types";
import { useTheme } from "@/components/theme-provider";
import { ProxyImage } from "@/components/ui/proxy-image";

export const Route = createFileRoute("/admin/footer")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getFooterConfigQueryOptions());
  },
  component: FooterRoute,
});

function FooterRoute() {
  const queryClient = useQueryClient();
  const { data: initialConfig } = useSuspenseQuery(getFooterConfigQueryOptions());
  const [config, setConfig] = useState<FooterConfig>(initialConfig);
  const { resolvedTheme } = useTheme();

  const saveMutation = useMutation({
    mutationFn: async (newConfig: Partial<FooterConfig>) => {
      return await updateFooterConfigServerFn({ data: newConfig });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FOOTER_QUERY_KEY] });
      toast.success("Footer sačuvan");
    },
    onError: () => {
      toast.error("Greška pri čuvanju");
    },
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const updateConfig = (updates: Partial<FooterConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const addColumn = () => {
    const newColumn: FooterColumn = {
      id: nanoid(),
      title: "Nova kolona",
      links: [],
    };
    updateConfig({ columns: [...config.columns, newColumn] });
  };

  const updateColumn = (columnId: string, updates: Partial<FooterColumn>) => {
    updateConfig({
      columns: config.columns.map((col) =>
        col.id === columnId ? { ...col, ...updates } : col
      ),
    });
  };

  const deleteColumn = (columnId: string) => {
    updateConfig({
      columns: config.columns.filter((col) => col.id !== columnId),
    });
  };

  const addLink = (columnId: string) => {
    const newLink: FooterLink = {
      id: nanoid(),
      title: "Novi link",
      url: "/",
    };
    updateConfig({
      columns: config.columns.map((col) =>
        col.id === columnId ? { ...col, links: [...col.links, newLink] } : col
      ),
    });
  };

  const updateLink = (columnId: string, linkId: string, updates: Partial<FooterLink>) => {
    updateConfig({
      columns: config.columns.map((col) =>
        col.id === columnId
          ? {
              ...col,
              links: col.links.map((link) =>
                link.id === linkId ? { ...link, ...updates } : link
              ),
            }
          : col
      ),
    });
  };

  const deleteLink = (columnId: string, linkId: string) => {
    updateConfig({
      columns: config.columns.map((col) =>
        col.id === columnId
          ? { ...col, links: col.links.filter((link) => link.id !== linkId) }
          : col
      ),
    });
  };

  const moveColumn = (fromIndex: number, toIndex: number) => {
    const newColumns = [...config.columns];
    const [removed] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, removed);
    updateConfig({ columns: newColumns });
  };

  // Preview colors based on theme
  const previewBgColor = resolvedTheme === "dark" ? config.darkBgColor : config.bgColor;
  const previewTextColor = resolvedTheme === "dark" ? config.darkTextColor : config.textColor;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Panel - Editor */}
      <div className="w-[420px] flex-shrink-0 border-r overflow-y-auto bg-background">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-lg">Footer Builder</h1>
          <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm">
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            Sačuvaj
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {/* First Column - Logo & Subtitle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Prva kolona (Logo)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Logo</Label>
                <SingleImageUploader
                  value={config.logoUrl}
                  onChange={(url) => updateConfig({ logoUrl: url })}
                  placeholder="Prebaci logo ovdje"
                  className="max-w-[200px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Podnaslov</Label>
                <Textarea
                  value={config.subtitle || ""}
                  onChange={(e) => updateConfig({ subtitle: e.target.value || null })}
                  placeholder="Kratak opis vašeg shopa..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Link Columns */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Kolone s linkovima</CardTitle>
                <Button onClick={addColumn} size="sm" variant="outline">
                  <Plus className="size-4 mr-1" />
                  Dodaj
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {config.columns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nema kolona. Kliknite "Dodaj" za kreiranje.
                </p>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {config.columns.map((column, index) => (
                    <AccordionItem
                      key={column.id}
                      value={column.id}
                      className="border rounded-lg px-3"
                    >
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-center gap-2 flex-1">
                          <GripVertical className="size-4 text-muted-foreground cursor-grab" />
                          <span className="text-sm font-medium">{column.title}</span>
                          <span className="text-xs text-muted-foreground">
                            ({column.links.length} linkova)
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Input
                              value={column.title}
                              onChange={(e) =>
                                updateColumn(column.id, { title: e.target.value })
                              }
                              placeholder="Naslov kolone"
                              className="flex-1"
                            />
                            <Button
                              onClick={() => deleteColumn(column.id)}
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">
                                Linkovi
                              </Label>
                              <Button
                                onClick={() => addLink(column.id)}
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                              >
                                <Plus className="size-3 mr-1" />
                                Dodaj link
                              </Button>
                            </div>

                            {column.links.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                Nema linkova
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {column.links.map((link) => (
                                  <div
                                    key={link.id}
                                    className="flex items-center gap-2 bg-muted/50 rounded-lg p-2"
                                  >
                                    <LinkIcon className="size-3 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                      <Input
                                        value={link.title}
                                        onChange={(e) =>
                                          updateLink(column.id, link.id, {
                                            title: e.target.value,
                                          })
                                        }
                                        placeholder="Tekst"
                                        className="h-8 text-xs"
                                      />
                                      <Input
                                        value={link.url}
                                        onChange={(e) =>
                                          updateLink(column.id, link.id, {
                                            url: e.target.value,
                                          })
                                        }
                                        placeholder="/putanja"
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <Button
                                      onClick={() => deleteLink(column.id, link.id)}
                                      size="icon"
                                      variant="ghost"
                                      className="size-7 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="size-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Move buttons */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => moveColumn(index, index - 1)}
                              disabled={index === 0}
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                            >
                              Pomjeri lijevo
                            </Button>
                            <Button
                              onClick={() => moveColumn(index, index + 1)}
                              disabled={index === config.columns.length - 1}
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                            >
                              Pomjeri desno
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Društvene mreže</CardTitle>
                <Switch
                  checked={config.showSocials}
                  onCheckedChange={(checked) => updateConfig({ showSocials: checked })}
                />
              </div>
            </CardHeader>
            {config.showSocials && (
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Facebook className="size-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    value={config.facebookUrl || ""}
                    onChange={(e) => updateConfig({ facebookUrl: e.target.value || null })}
                    placeholder="https://facebook.com/..."
                    className="h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Instagram className="size-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    value={config.instagramUrl || ""}
                    onChange={(e) => updateConfig({ instagramUrl: e.target.value || null })}
                    placeholder="https://instagram.com/..."
                    className="h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Twitter className="size-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    value={config.twitterUrl || ""}
                    onChange={(e) => updateConfig({ twitterUrl: e.target.value || null })}
                    placeholder="https://twitter.com/..."
                    className="h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <svg className="size-4 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                  <Input
                    value={config.tiktokUrl || ""}
                    onChange={(e) => updateConfig({ tiktokUrl: e.target.value || null })}
                    placeholder="https://tiktok.com/..."
                    className="h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Youtube className="size-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    value={config.youtubeUrl || ""}
                    onChange={(e) => updateConfig({ youtubeUrl: e.target.value || null })}
                    placeholder="https://youtube.com/..."
                    className="h-9"
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Copyright */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Copyright</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={config.copyrightText || ""}
                onChange={(e) => updateConfig({ copyrightText: e.target.value || null })}
                placeholder="© 2024 Vaš Shop. Sva prava zadržana."
              />
            </CardContent>
          </Card>

          {/* Color Scheme */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Boje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Light Mode Colors */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sun className="h-4 w-4" />
                  Light Mode
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Boja pozadine</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_PRESETS.slice(0, 10).map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateConfig({ bgColor: color.value })}
                        className={`w-8 h-8 rounded-md border-2 transition-all ${
                          config.bgColor === color.value
                            ? "border-primary ring-2 ring-primary ring-offset-2"
                            : "border-transparent hover:border-muted-foreground/50"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <Input
                    value={config.bgColor}
                    onChange={(e) => updateConfig({ bgColor: e.target.value })}
                    placeholder="#ffffff"
                    className="mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Boja teksta</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_PRESETS.slice(0, 10).map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateConfig({ textColor: color.value })}
                        className={`w-8 h-8 rounded-md border-2 transition-all ${
                          config.textColor === color.value
                            ? "border-primary ring-2 ring-primary ring-offset-2"
                            : "border-transparent hover:border-muted-foreground/50"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <Input
                    value={config.textColor}
                    onChange={(e) => updateConfig({ textColor: e.target.value })}
                    placeholder="#0f172a"
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Dark Mode Colors */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Moon className="h-4 w-4" />
                  Dark Mode
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Boja pozadine</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_PRESETS.slice(0, 10).map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateConfig({ darkBgColor: color.value })}
                        className={`w-8 h-8 rounded-md border-2 transition-all ${
                          config.darkBgColor === color.value
                            ? "border-primary ring-2 ring-primary ring-offset-2"
                            : "border-transparent hover:border-muted-foreground/50"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <Input
                    value={config.darkBgColor}
                    onChange={(e) => updateConfig({ darkBgColor: e.target.value })}
                    placeholder="#0f172a"
                    className="mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Boja teksta</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_PRESETS.slice(0, 10).map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateConfig({ darkTextColor: color.value })}
                        className={`w-8 h-8 rounded-md border-2 transition-all ${
                          config.darkTextColor === color.value
                            ? "border-primary ring-2 ring-primary ring-offset-2"
                            : "border-transparent hover:border-muted-foreground/50"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <Input
                    value={config.darkTextColor}
                    onChange={(e) => updateConfig({ darkTextColor: e.target.value })}
                    placeholder="#f8fafc"
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 overflow-y-auto bg-muted/30 p-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Pregled</h2>
          <div
            className="rounded-xl overflow-hidden shadow-lg"
            style={{
              backgroundColor: previewBgColor,
              color: previewTextColor,
            }}
          >
            <div className="px-8 py-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {/* First Column - Logo */}
                <div className="col-span-2 md:col-span-1">
                  {config.logoUrl ? (
                    <ProxyImage
                      src={config.logoUrl}
                      alt="Logo"
                      width={120}
                      height={40}
                      resizingType="fit"
                      className="h-8 w-auto mb-4"
                    />
                  ) : (
                    <div className="h-8 w-24 bg-current/20 rounded mb-4" />
                  )}
                  {config.subtitle && (
                    <p className="text-sm opacity-70 leading-relaxed">
                      {config.subtitle}
                    </p>
                  )}

                  {/* Social Icons */}
                  {config.showSocials && (
                    <div className="flex gap-3 mt-6">
                      {config.facebookUrl && (
                        <a
                          href={config.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <Facebook className="size-5" />
                        </a>
                      )}
                      {config.instagramUrl && (
                        <a
                          href={config.instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <Instagram className="size-5" />
                        </a>
                      )}
                      {config.twitterUrl && (
                        <a
                          href={config.twitterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <Twitter className="size-5" />
                        </a>
                      )}
                      {config.tiktokUrl && (
                        <a
                          href={config.tiktokUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                        </a>
                      )}
                      {config.youtubeUrl && (
                        <a
                          href={config.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <Youtube className="size-5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Link Columns */}
                {config.columns.map((column) => (
                  <div key={column.id}>
                    <h3 className="font-semibold text-sm mb-4">{column.title}</h3>
                    <ul className="space-y-2">
                      {column.links.map((link) => (
                        <li key={link.id}>
                          <a
                            href={link.url}
                            className="text-sm opacity-70 hover:opacity-100 transition-opacity inline-flex items-center gap-1"
                          >
                            {link.title}
                            {link.url.startsWith("http") && (
                              <ExternalLink className="size-3" />
                            )}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Copyright */}
            {config.copyrightText && (
              <div
                className="px-8 py-4 border-t"
                style={{ borderColor: `${previewTextColor}20` }}
              >
                <p className="text-xs opacity-60 text-center">
                  {config.copyrightText}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
