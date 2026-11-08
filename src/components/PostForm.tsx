import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Post } from "@/lib/posts";

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
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
        updated_at: new Date().toISOString(),
      };
      const { error } = post
        ? await supabase.from("posts").update(row).eq("id", post.id)
        : await supabase.from("posts").insert(row);
      if (error) throw error;
      toast.success(post ? "Post updated" : "Post published");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
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
          <Field label="Document / file attachment">
            <Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
            {post?.file_name && !docFile && (
              <p className="mt-1 text-xs text-muted-foreground">Current: {post.file_name}</p>
            )}
          </Field>
          <Field label="Play Now link">
            <Input type="url" placeholder="https://…" value={playUrl} onChange={(e) => setPlayUrl(e.target.value)} />
          </Field>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving…" : post ? "Save changes" : "Publish"}
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
