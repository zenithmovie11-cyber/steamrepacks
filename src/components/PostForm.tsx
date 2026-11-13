import { useRef, useState } from "react";
import { FolderUp, FileUp, X, Film } from "lucide-react";
import { zipSync } from "fflate";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Post } from "@/lib/posts";
import { bundleName } from "@/lib/product-access";
import { videoSource } from "@/lib/product-media";

export async function upload(file: File) {
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("media").upload(path, file);
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2) throw e2;
  return data.signedUrl;
}

/** One selected file uploads as-is (zip stays zip); several files or a folder are zipped in the browser first. */
async function bundle(files: File[]): Promise<File> {
  if (files.length === 1 && !files[0].webkitRelativePath.includes("/")) return files[0];
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) {
    let key = f.webkitRelativePath || f.name;
    for (let i = 2; key in entries; i++) key = `${i}-${f.name}`;
    entries[key] = new Uint8Array(await f.arrayBuffer());
  }
  const data = zipSync(entries, { level: 1 });
  return new File([data], bundleName(files.map((f) => f.webkitRelativePath || f.name)), { type: "application/zip" });
}

async function uploadProductFile(file: File) {
  const path = `${crypto.randomUUID()}/${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("product-files").upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw error;
  return path;
}

const fmtSize = (n: number) => (n > 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

export function PostForm({
  open,
  onOpenChange,
  post,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  post: Post | null;
  categories: string[];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [description, setDescription] = useState(post?.description ?? "");
  const [category, setCategory] = useState(post?.category ?? "");
  const [device, setDevice] = useState(post?.device_support ?? "Mobile");
  const [isPaid, setIsPaid] = useState(post?.is_paid ?? false);
  const [price, setPrice] = useState(post?.price ?? "");
  const [coverUrl, setCoverUrl] = useState(post?.cover_url ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [playUrl, setPlayUrl] = useState(post?.play_url ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [dlFiles, setDlFiles] = useState<File[]>([]);
  const [removeDl, setRemoveDl] = useState(false);
  const [videoUrl, setVideoUrl] = useState(post?.video_url ?? "");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const keepsOldFile = !!post?.download_path && !removeDl && dlFiles.length === 0;
  const totalSize = dlFiles.reduce((s, f) => s + f.size, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (dlFiles.length === 0 && !keepsOldFile && !playUrl.trim()) { toast.error("Add a download file or a download link"); return; }
    if (!videoFile && videoUrl.trim() && !videoSource(videoUrl)) { toast.error("Video link must be a valid https link (MP4, YouTube or Vimeo)"); return; }
    if (isPaid && !price.trim()) { toast.error("Price is required for paid posts"); return; }
    if (totalSize > 2e9) { toast.error("Download files must be under 2 GB in total"); return; }
    setSaving(true);
    try {
      let cover_url = coverUrl.trim() || null;
      if (coverFile) cover_url = await upload(coverFile);
      let file_url = post?.file_url ?? null;
      let file_name = post?.file_name ?? null;
      if (docFile) {
        file_url = await upload(docFile);
        file_name = docFile.name;
      }
      let download_path = removeDl ? null : post?.download_path ?? null;
      let download_name = removeDl ? null : post?.download_name ?? null;
      if (dlFiles.length > 0) {
        setStatus(dlFiles.length > 1 || dlFiles[0].webkitRelativePath ? "Zipping files…" : "Uploading download file…");
        const file = await bundle(dlFiles);
        setStatus("Uploading download file…");
        download_path = await uploadProductFile(file);
        download_name = file.name;
      }
      let video_url = videoUrl.trim() || null;
      if (videoFile) { setStatus("Uploading video…"); video_url = await upload(videoFile); }
      if (isPaid && !price.trim()) {
        toast.error("Price is required for paid posts");
        setSaving(false);
        return;
      }
      const row = {
        title: title.trim(),
        description,
        category: category.trim() || "General",
        device_support: device,
        is_paid: isPaid,
        price: isPaid ? price.trim() : null,
        cover_url,
        file_url,
        file_name,
        play_url: playUrl.trim() || null,
        video_url,
        download_path,
        download_name,
        updated_at: new Date().toISOString(),
      };
      const { error } = post
        ? await supabase.from("posts").update(row).eq("id", post.id)
        : await supabase.from("posts").insert(row);
      if (error) throw error;
      if (post?.download_path && post.download_path !== download_path) {
        void supabase.storage.from("product-files").remove([post.download_path]);
      }
      toast.success(post ? "Post updated" : "Post published");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
      setStatus("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {post ? "Edit post" : "New post"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Title *">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <Field label="Description / Document content">
            <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Category">
            <Input
              list="cats"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Pick or type a new one"
            />
            <datalist id="cats">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Device support">
            <select
              className="h-10 w-full rounded-md border bg-card px-3 text-sm"
              value={device}
              onChange={(e) => setDevice(e.target.value)}
            >
              <option value="Mobile">Mobile</option>
              <option value="PC">PC</option>
              <option value="Mobile & PC">Mobile &amp; PC</option>
            </select>
          </Field>
          <Field label="Free or Paid">
            <select
              className="h-10 w-full rounded-md border bg-card px-3 text-sm"
              value={isPaid ? "paid" : "free"}
              onChange={(e) => setIsPaid(e.target.value === "paid")}
            >
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </Field>
          {isPaid && (
            <Field label="Price *">
              <Input
                placeholder="e.g. 50 TK"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>
          )}
          <Field label="Cover image (upload or URL)">
            <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
            <Input
              className="mt-2"
              placeholder="https://…"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              disabled={!!coverFile}
            />
          </Field>
          <Field label="Download file (optional)">
            <input ref={fileInput} type="file" multiple hidden onChange={(e) => { setDlFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
            <input ref={folderInput} type="file" hidden {...{ webkitdirectory: "", directory: "" }} onChange={(e) => { setDlFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="border" onClick={() => fileInput.current?.click()}><FileUp /> Select file / zip</Button>
              <Button type="button" variant="outline" className="border" onClick={() => folderInput.current?.click()}><FolderUp /> Select folder</Button>
            </div>
            {dlFiles.length > 0 ? (
              <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="flex-1 truncate">{dlFiles.length === 1 && !dlFiles[0].webkitRelativePath ? dlFiles[0].name : `${dlFiles.length} files → ${bundleName(dlFiles.map((f) => f.webkitRelativePath || f.name))}`} · {fmtSize(totalSize)}</span>
                <Button type="button" variant="ghost" size="icon" aria-label="Clear selected files" onClick={() => setDlFiles([])}><X /></Button>
              </div>
            ) : keepsOldFile ? (
              <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="flex-1 truncate">Current: {post?.download_name}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRemoveDl(true)}>Remove</Button>
              </div>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">Visitors get this file when they press Download. Several files or a folder are zipped automatically. If you skip this, add a download link below.</p>
          </Field>
          <Field label="Download link (used when no file is uploaded)">
            <Input type="url" placeholder="https://…" value={playUrl} onChange={(e) => setPlayUrl(e.target.value)} />
          </Field>
          <Field label="Product video (optional, 1080p recommended)">
            <Input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
            <Input className="mt-2" type="url" placeholder="Or paste an MP4, YouTube or Vimeo link" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} disabled={!!videoFile} />
            {(videoFile || videoUrl) && <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Film className="size-3" />Plays beside the product image when the product is opened.</p>}
          </Field>
          <Field label="Preview document (visible to everyone)">
            <Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
            {post?.file_name && !docFile && (
              <p className="mt-1 text-xs text-muted-foreground">Current: {post.file_name}</p>
            )}
          </Field>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? status || "Saving…" : post ? "Save changes" : "Publish"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}
