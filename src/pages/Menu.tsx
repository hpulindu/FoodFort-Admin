import { useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ImagePlus,
  X,
  UtensilsCrossed,
  Loader2,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Spinner, Textarea, Toggle } from "../components/ui";
import { Modal } from "../components/overlays";
import { useMenuSections, useSauces } from "../lib/data";
import type { MenuItem, MenuSection, Sauce } from "../lib/types";
import {
  adminDeleteMenuItem,
  adminDeleteMenuSection,
  adminDeleteSauce,
  adminReorderSections,
  adminSetItemAvailability,
  adminSetSauceAvailability,
  adminUpsertMenuItem,
  adminUpsertMenuSection,
  adminUpsertSauce,
} from "../lib/admin-api";
import { uploadMenuItemImage } from "../lib/storage";
import { formatCurrency } from "../lib/utils";
import { toast } from "sonner";

function genId(prefix: string) {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rnd}`;
}

// ── Section editor ─────────────────────────────────────────────────────────────
function SectionModal({
  section,
  open,
  onClose,
}: {
  section: MenuSection | null;
  open: boolean;
  onClose: () => void;
}) {
  const [number, setNumber] = useState(section?.number ?? "");
  const [title, setTitle] = useState(section?.title ?? "");
  const [subtitle, setSubtitle] = useState(section?.subtitle ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await adminUpsertMenuSection({
        id: section?.id,
        number: number.trim(),
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        order: section?.order,
      });
      toast.success(section ? "Section updated" : "Section created");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save section");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={section ? "Edit section" : "New section"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Number / label">
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="01" />
        </Field>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pizzas" />
        </Field>
        <Field label="Subtitle (optional)">
          <Input
            value={subtitle ?? ""}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Wood-fired, hand stretched"
          />
        </Field>
      </div>
    </Modal>
  );
}

// ── Item editor ────────────────────────────────────────────────────────────────
function ItemModal({
  sectionId,
  item,
  open,
  onClose,
}: {
  sectionId: string;
  item: MenuItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price != null ? String(item.price) : "");
  const [badge, setBadge] = useState<"chef" | "veg" | "">(item?.badge ?? "");
  const [image, setImage] = useState<string | null>(item?.image ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const itemId =
    item?.id ??
    (item?.name
      ? `item-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`
      : genId("item"));

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMenuItemImage(itemId, file);
      setImage(url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    const priceNum = Number(price);
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setSaving(true);
    try {
      await adminUpsertMenuItem({
        sectionId,
        item: {
          id: itemId,
          name: name.trim(),
          description: description.trim() || null,
          price: priceNum,
          badge: badge || null,
          image: image || null,
        },
      });
      toast.success(item ? "Item updated" : "Item added");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "Edit item" : "New item"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
            {image ? (
              <>
                <img src={image} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => setImage(null)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--color-muted)]">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImagePlus className="h-6 w-6" />
                )}
              </div>
            )}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              size="sm"
              variant="outline"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {image ? "Replace image" : "Upload image"}
            </Button>
            <p className="mt-1 text-xs text-[var(--color-muted)]">JPEG, PNG, WebP, GIF, or AVIF</p>
          </div>
        </div>

        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description (optional)">
          <Textarea
            rows={2}
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (AUD)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Badge">
            <Select value={badge} onChange={(e) => setBadge(e.target.value as "chef" | "veg" | "")}>
              <option value="">None</option>
              <option value="chef">Chef's pick</option>
              <option value="veg">Vegetarian</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

// ── Sauce editor ───────────────────────────────────────────────────────────────
function SauceModal({
  sauce,
  open,
  onClose,
}: {
  sauce: Sauce | null;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(sauce?.name ?? "");
  const [price, setPrice] = useState(sauce?.price != null ? String(sauce.price) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const priceNum = Number(price);
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setSaving(true);
    try {
      await adminUpsertSauce({
        id: sauce?.id,
        name: name.trim(),
        price: priceNum,
        order: sauce?.order,
      });
      toast.success(sauce ? "Sauce updated" : "Sauce added");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save sauce");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={sauce ? "Edit sauce" : "New sauce"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Price (AUD, 0 = free)">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function MenuPage() {
  const { data: sections, loading } = useMenuSections();
  const { data: sauces } = useSauces();

  const [sectionModal, setSectionModal] = useState<{ open: boolean; section: MenuSection | null }>({
    open: false,
    section: null,
  });
  const [itemModal, setItemModal] = useState<{
    open: boolean;
    sectionId: string;
    item: MenuItem | null;
  }>({ open: false, sectionId: "", item: null });
  const [sauceModal, setSauceModal] = useState<{ open: boolean; sauce: Sauce | null }>({
    open: false,
    sauce: null,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function moveSection(index: number, dir: -1 | 1) {
    const next = [...sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusyId("reorder");
    try {
      await adminReorderSections({ order: next.map((s) => s.id) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteSection(section: MenuSection) {
    if (!confirm(`Delete section "${section.title}" and all its items?`)) return;
    try {
      await adminDeleteMenuSection({ id: section.id });
      toast.success("Section deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function deleteItem(sectionId: string, item: MenuItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await adminDeleteMenuItem({ sectionId, itemId: item.id ?? item.name });
      toast.success("Item deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function toggleItem(section: MenuSection, item: MenuItem, available: boolean) {
    const key = `${section.id}:${item.name}`;
    setBusyId(key);
    try {
      await adminSetItemAvailability({ sectionId: section.id, itemName: item.name, available });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteSauce(sauce: Sauce) {
    if (!confirm(`Delete sauce "${sauce.name}"?`)) return;
    try {
      await adminDeleteSauce({ id: sauce.id });
      toast.success("Sauce deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function toggleSauce(sauce: Sauce, available: boolean) {
    setBusyId(`sauce:${sauce.id}`);
    try {
      await adminSetSauceAvailability({ id: sauce.id, available });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Menu"
        description="Manage categories, items, sauces and availability."
        actions={
          <Button size="sm" onClick={() => setSectionModal({ open: true, section: null })}>
            <Plus className="h-4 w-4" />
            Section
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-7 w-7" />
        </div>
      ) : sections.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-8 w-8" />}
          title="No menu sections"
          description="Create your first section to start adding items."
        />
      ) : (
        <div className="space-y-4">
          {sections.map((section, index) => (
            <Card key={section.id} className="p-0">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] p-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button
                      disabled={index === 0 || busyId === "reorder"}
                      onClick={() => moveSection(index, -1)}
                      className="text-[var(--color-muted)] hover:text-[var(--color-fg)] disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      disabled={index === sections.length - 1 || busyId === "reorder"}
                      onClick={() => moveSection(index, 1)}
                      className="text-[var(--color-muted)] hover:text-[var(--color-fg)] disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold">
                      {section.number ? `${section.number}. ` : ""}
                      {section.title}
                    </p>
                    {section.subtitle && (
                      <p className="text-xs text-[var(--color-muted)]">{section.subtitle}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSectionModal({ open: true, section })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteSection(section)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ul className="divide-y divide-[var(--color-border)]">
                {(section.items ?? []).map((item, i) => {
                  const available = section.availability?.[item.name] !== false;
                  return (
                    <li key={item.id ?? `${item.name}-${i}`} className="flex items-center gap-3 p-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[var(--color-bg)] text-[var(--color-muted)]">
                          <UtensilsCrossed className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          {item.badge && (
                            <Badge tone="gold">{item.badge === "chef" ? "Chef" : "Veg"}</Badge>
                          )}
                          {!available && <Badge tone="danger">Sold out</Badge>}
                        </div>
                        <p className="truncate text-xs text-[var(--color-muted)]">
                          {formatCurrency(item.price)}
                          {item.description ? ` · ${item.description}` : ""}
                        </p>
                      </div>
                      <Toggle
                        checked={available}
                        disabled={busyId === `${section.id}:${item.name}`}
                        onChange={(v) => toggleItem(section, item, v)}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setItemModal({ open: true, sectionId: section.id, item })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteItem(section.id, item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>

              <div className="p-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setItemModal({ open: true, sectionId: section.id, item: null })}
                >
                  <Plus className="h-4 w-4" />
                  Add item
                </Button>
              </div>
            </Card>
          ))}

          {/* Sauces */}
          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] p-3">
              <p className="font-display text-lg font-semibold">Sauces</p>
              <Button size="sm" variant="outline" onClick={() => setSauceModal({ open: true, sauce: null })}>
                <Plus className="h-4 w-4" />
                Add sauce
              </Button>
            </div>
            {sauces.length === 0 ? (
              <p className="p-4 text-center text-sm text-[var(--color-muted)]">No sauces yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {sauces.map((sauce) => {
                  const available = sauce.available !== false;
                  return (
                    <li key={sauce.id} className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{sauce.name}</p>
                          {!available && <Badge tone="danger">Sold out</Badge>}
                        </div>
                        <p className="text-xs text-[var(--color-muted)]">
                          {sauce.price > 0 ? formatCurrency(sauce.price) : "Free"}
                        </p>
                      </div>
                      <Toggle
                        checked={available}
                        disabled={busyId === `sauce:${sauce.id}`}
                        onChange={(v) => toggleSauce(sauce, v)}
                      />
                      <Button size="icon" variant="ghost" onClick={() => setSauceModal({ open: true, sauce })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteSauce(sauce)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      <SectionModal
        section={sectionModal.section}
        open={sectionModal.open}
        onClose={() => setSectionModal({ open: false, section: null })}
      />
      {itemModal.open && (
        <ItemModal
          sectionId={itemModal.sectionId}
          item={itemModal.item}
          open={itemModal.open}
          onClose={() => setItemModal({ open: false, sectionId: "", item: null })}
        />
      )}
      <SauceModal
        sauce={sauceModal.sauce}
        open={sauceModal.open}
        onClose={() => setSauceModal({ open: false, sauce: null })}
      />
    </>
  );
}
