import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useDiscoverSuppliers,
  useSupplierCategories,
  useCreateQuoteRequest,
  useSupplierReviews,
  useMySupplierReview,
  useCreateSupplierInvite,
  useSupplierInvites,
} from "@/hooks/useSuppliers";
import { SupplierReviewDialog } from "@/components/fornecedor/SupplierReviewDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  Store,
  X,
  Filter,
  Phone,
  Building2,
  Send,
  MessageSquare,
  PenSquare,
  UserPlus,
  Copy,
  Check,
  Mail,
} from "lucide-react";
import type { SupplierProfile } from "@/types/suppliers";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const DISTRICTS = [
  "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco",
  "Coimbra", "Évora", "Faro", "Guarda", "Leiria",
  "Lisboa", "Portalegre", "Porto", "Santarém",
  "Setúbal", "Viana do Castelo", "Vila Real", "Viseu",
];

function StarRating({ rating, count }: { rating: number; count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">({count})</span>
    </div>
  );
}

function SupplierCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-1/3" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

interface QuoteDialogProps {
  supplier: SupplierProfile | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function QuoteDialog({ supplier, open, onOpenChange }: QuoteDialogProps) {
  const { data: categories = [] } = useSupplierCategories();
  const createQuote = useCreateQuoteRequest();
  const [deadline, setDeadline] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const supplierCategories = useMemo(() => {
    if (!supplier) return [];
    const catIds = (supplier as any).supplier_category_link?.map(
      (l: any) => l.category_id
    ) as string[] | undefined;
    return categories.filter((c) => catIds?.includes(c.id));
  }, [supplier, categories]);

  const handleSubmit = async () => {
    if (!supplier || !deadline) return;
    await createQuote.mutateAsync({
      form: {
        category_ids: selectedCategories.length > 0 ? selectedCategories : supplierCategories.map((c) => c.id),
        requested_deadline: deadline,
        message_to_suppliers: message || undefined,
        supplier_ids: [supplier.id],
      },
    });
    onOpenChange(false);
    setDeadline("");
    setMessage("");
    setSelectedCategories([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Cotação</DialogTitle>
          {supplier && (
            <p className="text-sm text-muted-foreground">
              a {supplier.trade_name || supplier.legal_name}
            </p>
          )}
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Prazo pretendido *</Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="mt-1"
            />
          </div>
          {supplierCategories.length > 0 && (
            <div>
              <Label>Categorias</Label>
              <div className="mt-2 space-y-1">
                {supplierCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`qcat-${cat.id}`}
                      checked={selectedCategories.includes(cat.id)}
                      onCheckedChange={(checked) =>
                        setSelectedCategories((prev) =>
                          checked ? [...prev, cat.id] : prev.filter((id) => id !== cat.id)
                        )
                      }
                    />
                    <Label htmlFor={`qcat-${cat.id}`} className="font-normal">
                      {cat.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label>Mensagem (opcional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva os trabalhos ou materiais necessários..."
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!deadline || createQuote.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar Pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteSupplierDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [email, setEmail] = useState("");
  const createInvite = useCreateSupplierInvite();
  const { data: invites = [] } = useSupplierInvites();
  const { toast } = useToast();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleInvite = () => {
    if (!email.trim()) return;
    createInvite.mutate(email, {
      onSuccess: () => setEmail(""),
    });
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/fornecedor/auth?invite=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({ title: "Link copiado!" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Convidar Fornecedor
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Convide fornecedores para se registarem na plataforma. A aprovação e certificação será feita pela equipa ObraSys.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Input
              placeholder="Email do fornecedor..."
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <Button onClick={handleInvite} disabled={!email.trim() || createInvite.isPending}>
              <Mail className="w-4 h-4 mr-2" />
              Enviar
            </Button>
          </div>

          {invites.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Convites enviados</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-muted/30 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(inv.created_at), "d MMM yyyy", { locale: pt })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={inv.status === "accepted" ? "default" : inv.status === "expired" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {inv.status === "accepted" ? "Aceite" : inv.status === "expired" ? "Expirado" : "Pendente"}
                      </Badge>
                      {inv.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyLink(inv.token)}
                        >
                          {copiedToken === inv.token ? (
                            <Check className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SupplierDrawerProps {
  supplier: SupplierProfile | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRequestQuote: (s: SupplierProfile) => void;
  onReview: (s: SupplierProfile) => void;
}

function ReviewsSection({ supplierId }: { supplierId: string }) {
  const { data: reviews = [], isLoading } = useSupplierReviews(supplierId);
  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (reviews.length === 0)
    return <p className="text-sm text-muted-foreground italic">Ainda sem avaliações.</p>;

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-lg border bg-muted/30 p-3 space-y-1">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${i <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          {r.comment && (
            <p className="text-sm text-foreground">{r.comment}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(r.created_at).toLocaleDateString("pt-PT")}
          </p>
        </div>
      ))}
    </div>
  );
}

function SupplierDrawer({ supplier, open, onOpenChange, onRequestQuote, onReview }: SupplierDrawerProps) {
  const { data: myReview } = useMySupplierReview(supplier?.id);
  if (!supplier) return null;
  const catLinks = (supplier as any).supplier_category_link as Array<{ supplier_categories: { name: string } }> | undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <SheetTitle className="text-xl">
                {supplier.trade_name || supplier.legal_name}
              </SheetTitle>
              {supplier.trade_name && (
                <SheetDescription className="mt-0.5 text-sm">
                  {supplier.legal_name}
                </SheetDescription>
              )}
            </div>
            {supplier.is_certified && (
              <Badge variant="default" className="gap-1 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                Certificado
              </Badge>
            )}
          </div>
          <StarRating rating={supplier.rating_avg} count={supplier.rating_count} />
        </SheetHeader>

        <div className="space-y-5">
          {/* Location */}
          {(supplier.location_district || supplier.location_municipality) && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-sm">
                {[supplier.location_municipality, supplier.location_district].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          {/* SLA */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              Resposta em até <strong>{supplier.sla_response_hours}h</strong>
            </span>
          </div>

          {/* Contact */}
          {supplier.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{supplier.phone}</span>
            </div>
          )}

          {supplier.nif && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">NIF: {supplier.nif}</span>
            </div>
          )}

          <Separator />

          {/* Categories */}
          {catLinks && catLinks.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Categorias</p>
              <div className="flex flex-wrap gap-1.5">
                {catLinks.map((l, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {l.supplier_categories?.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Service areas */}
          {supplier.service_areas && (
            <div>
              <p className="text-sm font-medium mb-1">Áreas de serviço</p>
              <p className="text-sm text-muted-foreground">{supplier.service_areas}</p>
            </div>
          )}

          {/* Delivery capability */}
          {supplier.delivery_capability && (
            <div>
              <p className="text-sm font-medium mb-1">Capacidade de entrega</p>
              <p className="text-sm text-muted-foreground">{supplier.delivery_capability}</p>
            </div>
          )}

          {/* Payment terms */}
          {supplier.payment_terms && (
            <div>
              <p className="text-sm font-medium mb-1">Condições de pagamento</p>
              <p className="text-sm text-muted-foreground">{supplier.payment_terms}</p>
            </div>
          )}

          {supplier.min_order_value > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Encomenda mínima</p>
              <p className="text-sm text-muted-foreground">
                {supplier.min_order_value.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
              </p>
            </div>
          )}

          <Separator />

          {/* Reviews */}
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              Avaliações
            </p>
            <ReviewsSection supplierId={supplier.id} />
          </div>

          <Separator />

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                onRequestQuote(supplier);
              }}
            >
              <Send className="w-4 h-4 mr-2" />
              Solicitar Cotação
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                onReview(supplier);
              }}
            >
              <PenSquare className="w-4 h-4 mr-2" />
              {myReview ? "Editar avaliação" : "Avaliar fornecedor"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface SupplierCardProps {
  supplier: SupplierProfile;
  onViewProfile: (s: SupplierProfile) => void;
  onRequestQuote: (s: SupplierProfile) => void;
}

function SupplierCard({ supplier, onViewProfile, onRequestQuote }: SupplierCardProps) {
  const catLinks = (supplier as any).supplier_category_link as Array<{ supplier_categories: { name: string } }> | undefined;

  return (
    <div className="group rounded-xl border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-card-foreground truncate">
            {supplier.trade_name || supplier.legal_name}
          </h3>
          {supplier.trade_name && (
            <p className="text-xs text-muted-foreground truncate">{supplier.legal_name}</p>
          )}
        </div>
        {supplier.is_certified && (
          <Badge variant="default" className="gap-1 shrink-0">
            <ShieldCheck className="w-3 h-3" />
            Certificado
          </Badge>
        )}
      </div>

      <StarRating rating={supplier.rating_avg} count={supplier.rating_count} />

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {(supplier.location_district || supplier.location_municipality) && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {supplier.location_municipality
              ? `${supplier.location_municipality}, ${supplier.location_district || ""}`
              : supplier.location_district}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Resp. em {supplier.sla_response_hours}h
        </span>
      </div>

      {catLinks && catLinks.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {catLinks.slice(0, 3).map((l, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {l.supplier_categories?.name}
            </Badge>
          ))}
          {catLinks.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{catLinks.length - 3}
            </Badge>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onViewProfile(supplier)}
        >
          Ver perfil
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onRequestQuote(supplier)}
        >
          <Send className="w-3.5 h-3.5 mr-1.5" />
          Cotação
        </Button>
      </div>
    </div>
  );
}

export default function RedeFornecedoresPage() {
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [certifiedOnly, setCertifiedOnly] = useState(false);
  const [drawerSupplier, setDrawerSupplier] = useState<SupplierProfile | null>(null);
  const [quoteSupplier, setQuoteSupplier] = useState<SupplierProfile | null>(null);
  const [reviewSupplier, setReviewSupplier] = useState<SupplierProfile | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories = [] } = useSupplierCategories();
  const { data: suppliers = [], isLoading } = useDiscoverSuppliers({
    search,
    district: district === "all" ? "" : district,
    categoryIds: selectedCategories,
    certifiedOnly,
  });

  const hasActiveFilters =
    !!search || (district && district !== "all") || selectedCategories.length > 0 || certifiedOnly;

  const clearFilters = () => {
    setSearch("");
    setDistrict("all");
    setSelectedCategories([]);
    setCertifiedOnly(false);
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const FiltersPanel = () => (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-semibold text-foreground mb-2 block">Pesquisar</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nome do fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold text-foreground mb-2 block">Distrito</Label>
        <Select value={district} onValueChange={setDistrict}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os distritos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os distritos</SelectItem>
            {DISTRICTS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-semibold text-foreground mb-2 block">Categorias</Label>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              <Checkbox
                id={`cat-${cat.id}`}
                checked={selectedCategories.includes(cat.id)}
                onCheckedChange={() => toggleCategory(cat.id)}
              />
              <Label
                htmlFor={`cat-${cat.id}`}
                className="font-normal text-sm cursor-pointer"
              >
                {cat.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Label htmlFor="certified-toggle" className="text-sm font-semibold cursor-pointer">
          Apenas certificados
        </Label>
        <Switch
          id="certified-toggle"
          checked={certifiedOnly}
          onCheckedChange={setCertifiedOnly}
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>
          <X className="w-4 h-4 mr-2" />
          Limpar filtros
        </Button>
      )}
    </div>
  );

  return (
    <AppLayout title="Rede de Fornecedores" subtitle="Diretório de fornecedores certificados para a sua obra">
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Rede de Fornecedores</h1>
              <p className="text-sm text-muted-foreground">
                Diretório de fornecedores certificados para a sua obra
              </p>
            </div>
          </div>
          {/* Mobile filter toggle */}
          <Button
            variant="outline"
            size="sm"
            className="mt-3 lg:hidden"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                !
              </Badge>
            )}
          </Button>
        </div>

        <div className="flex gap-8">
          {/* Filters sidebar — desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-4 rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground">Filtros</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <FiltersPanel />
            </div>
          </aside>

          {/* Mobile filters drawer */}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetContent side="left" className="w-72 overflow-y-auto">
              <SheetHeader className="mb-6">
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <FiltersPanel />
            </SheetContent>
          </Sheet>

          {/* Results */}
          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "A carregar..." : `${suppliers.length} fornecedor${suppliers.length !== 1 ? "es" : ""} encontrado${suppliers.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SupplierCardSkeleton key={i} />
                ))}
              </div>
            ) : suppliers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Store className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  Nenhum fornecedor encontrado
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                  {hasActiveFilters
                    ? "Tente ajustar os filtros para encontrar mais fornecedores."
                    : "Ainda não existem fornecedores certificados disponíveis."}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {suppliers.map((supplier) => (
                  <SupplierCard
                    key={supplier.id}
                    supplier={supplier}
                    onViewProfile={setDrawerSupplier}
                    onRequestQuote={setQuoteSupplier}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <SupplierDrawer
        supplier={drawerSupplier}
        open={!!drawerSupplier}
        onOpenChange={(v) => !v && setDrawerSupplier(null)}
        onRequestQuote={setQuoteSupplier}
        onReview={setReviewSupplier}
      />

      <QuoteDialog
        supplier={quoteSupplier}
        open={!!quoteSupplier}
        onOpenChange={(v) => !v && setQuoteSupplier(null)}
      />

      {reviewSupplier && (
        <SupplierReviewDialog
          open={!!reviewSupplier}
          onOpenChange={(v) => !v && setReviewSupplier(null)}
          supplierId={reviewSupplier.id}
          supplierName={reviewSupplier.trade_name || reviewSupplier.legal_name}
        />
      )}
    </AppLayout>
  );
}
