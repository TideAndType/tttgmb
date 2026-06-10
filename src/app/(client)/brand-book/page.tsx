"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { FileUpload } from "@/components/brand/file-upload";
import { ColorSwatch } from "@/components/brand/color-swatch";
import { FontRow } from "@/components/brand/font-row";
import { Download, File, Trash2, Plus } from "lucide-react";
import { CommentThread } from "@/components/comments/comment-thread";

interface BrandColor { id: string; name: string; hex: string; }
interface BrandFont { id: string; name: string; usage: string; }
interface BrandAsset { id: string; filename: string; originalName: string; type: string; mimeType: string; size: number; commentCount?: number; }

export default function BrandBookPage() {
  const [logo, setLogo] = useState<BrandAsset | null>(null);
  const [colors, setColors] = useState<BrandColor[]>([]);
  const [fonts, setFonts] = useState<BrandFont[]>([]);
  const [files, setFiles] = useState<BrandAsset[]>([]);

  const [logoLoading, setLogoLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [colorLoading, setColorLoading] = useState(false);
  const [fontLoading, setFontLoading] = useState(false);

  const [colorForm, setColorForm] = useState({ name: "", hex: "#000000" });
  const [fontForm, setFontForm] = useState({ name: "", usage: "BODY" });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAll = async () => {
    const [colorsRes, fontsRes, filesRes] = await Promise.all([
      fetch("/api/brand/colors"),
      fetch("/api/brand/fonts"),
      fetch("/api/brand/files"),
    ]);
    const colorsData = await colorsRes.json();
    const fontsData = await fontsRes.json();
    const filesData = await filesRes.json();

    setColors(colorsData.colors || []);
    setFonts(fontsData.fonts || []);
    const allAssets: BrandAsset[] = filesData.files || [];
    setLogo(allAssets.find((a) => a.type === "LOGO") || null);
    setFiles(allAssets.filter((a) => a.type === "FILE"));
  };

  useEffect(() => { fetchAll(); }, []);

  const flash = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(""); setSuccess(""); }, 3000);
  };

  const handleLogoUpload = async (file: File) => {
    setLogoLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/brand/logo", { method: "POST", body: fd });
    if (res.ok) { flash("Logo uploaded"); await fetchAll(); }
    else flash("Upload failed", true);
    setLogoLoading(false);
  };

  const handleFileUpload = async (file: File) => {
    setFileLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/brand/files", { method: "POST", body: fd });
    if (res.ok) { flash("File uploaded"); await fetchAll(); }
    else flash("Upload failed", true);
    setFileLoading(false);
  };

  const handleDeleteFile = async (id: string) => {
    await fetch(`/api/brand/files/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const handleAddColor = async (e: React.FormEvent) => {
    e.preventDefault();
    setColorLoading(true);
    const res = await fetch("/api/brand/colors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(colorForm),
    });
    if (res.ok) {
      setColorForm({ name: "", hex: "#000000" });
      flash("Color added");
      fetchAll();
    } else flash("Failed to add color", true);
    setColorLoading(false);
  };

  const handleDeleteColor = async (id: string) => {
    await fetch(`/api/brand/colors/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const handleAddFont = async (e: React.FormEvent) => {
    e.preventDefault();
    setFontLoading(true);
    const res = await fetch("/api/brand/fonts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fontForm),
    });
    if (res.ok) {
      setFontForm({ name: "", usage: "BODY" });
      flash("Font added");
      fetchAll();
    } else flash("Failed to add font", true);
    setFontLoading(false);
  };

  const handleDeleteFont = async (id: string) => {
    await fetch(`/api/brand/fonts/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Brand Book</h1>
        <p className="text-muted-foreground mt-1">Manage your brand assets, colors, typography, and files</p>
      </div>

      {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}
      {success && <Alert className="mb-4 border-primary/50 text-primary">{success}</Alert>}

      <Tabs defaultValue="logo">
        <TabsList className="mb-6">
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        {/* Logo Tab */}
        <TabsContent value="logo">
          <Card>
            <CardHeader>
              <CardTitle>Brand Logo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {logo && (
                <div className="border border-border rounded-lg p-6 flex items-center gap-6 bg-muted/20">
                  <div className="bg-white rounded-md p-4 flex-shrink-0">
                    <img
                      src={`/api/uploads/${logo.filename}`}
                      alt="Brand Logo"
                      className="max-h-24 max-w-48 object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{logo.originalName}</p>
                    <p className="text-sm text-muted-foreground mt-1">{formatBytes(logo.size)}</p>
                  </div>
                </div>
              )}
              <FileUpload
                accept=".png,.svg,.jpg,.jpeg,.webp"
                onUpload={handleLogoUpload}
                label={logo ? "Replace Logo" : "Upload Logo"}
                loading={logoLoading}
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: PNG, SVG, JPG, WebP. Max 10MB.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Color</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddColor} className="flex items-end gap-3">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="colorName">Color Name</Label>
                    <Input
                      id="colorName"
                      placeholder="Primary Blue"
                      value={colorForm.name}
                      onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="colorHex">Hex</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorForm.hex}
                        onChange={(e) => setColorForm({ ...colorForm, hex: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border border-input bg-transparent"
                      />
                      <Input
                        id="colorHex"
                        value={colorForm.hex}
                        onChange={(e) => setColorForm({ ...colorForm, hex: e.target.value })}
                        className="w-32"
                        placeholder="#000000"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={colorLoading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Brand Colors</CardTitle>
              </CardHeader>
              <CardContent>
                {colors.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No colors added yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-6">
                    {colors.map((color) => (
                      <ColorSwatch
                        key={color.id}
                        id={color.id}
                        name={color.name}
                        hex={color.hex}
                        onDelete={handleDeleteColor}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Font</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddFont} className="flex items-end gap-3">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="fontName">Font Name</Label>
                    <Input
                      id="fontName"
                      placeholder="Inter"
                      value={fontForm.name}
                      onChange={(e) => setFontForm({ ...fontForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2 w-40">
                    <Label htmlFor="fontUsage">Usage</Label>
                    <Select
                      id="fontUsage"
                      value={fontForm.usage}
                      onChange={(e) => setFontForm({ ...fontForm, usage: e.target.value })}
                    >
                      <option value="HEADING">Heading</option>
                      <option value="BODY">Body</option>
                      <option value="ACCENT">Accent</option>
                      <option value="OTHER">Other</option>
                    </Select>
                  </div>
                  <Button type="submit" disabled={fontLoading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Typography</CardTitle>
              </CardHeader>
              <CardContent>
                {fonts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No fonts added yet.</p>
                ) : (
                  <div>
                    {fonts.map((font) => (
                      <FontRow
                        key={font.id}
                        id={font.id}
                        name={font.name}
                        usage={font.usage}
                        onDelete={handleDeleteFont}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload File</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  accept=".pdf,.png,.jpg,.jpeg,.svg,.gif,.webp,.doc,.docx"
                  onUpload={handleFileUpload}
                  label="Upload File"
                  loading={fileLoading}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Brand Files</CardTitle>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No files uploaded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="rounded-md border border-border"
                      >
                        <div className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded">
                              <File className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{file.originalName}</p>
                              <p className="text-xs text-muted-foreground">{formatBytes(file.size)} &middot; {file.mimeType}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={`/api/uploads/${file.filename}`} download={file.originalName}>
                              <Button size="sm" variant="outline">
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </a>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteFile(file.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="px-4 pb-3">
                          <CommentThread
                            commentsUrl={`/api/brand/files/${file.id}/comments`}
                            initialCount={file.commentCount ?? 0}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
