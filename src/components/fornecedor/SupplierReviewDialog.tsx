import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSubmitSupplierReview, useMySupplierReview } from "@/hooks/useSuppliers";

interface SupplierReviewDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplierId: string;
  supplierName: string;
  quoteRequestId?: string;
}

export function SupplierReviewDialog({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  quoteRequestId,
}: SupplierReviewDialogProps) {
  const { data: existing } = useMySupplierReview(supplierId);
  const submit = useSubmitSupplierReview();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");

  // Pre-fill if the builder already submitted a review
  useEffect(() => {
    if (existing) {
      setRating(existing.rating);
      setComment(existing.comment || "");
    } else {
      setRating(0);
      setComment("");
    }
  }, [existing, open]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    await submit.mutateAsync({ supplierId, quoteRequestId, rating, comment });
    onOpenChange(false);
  };

  const displayRating = hovered || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Editar avaliação" : "Avaliar fornecedor"}</DialogTitle>
          <p className="text-sm text-muted-foreground">{supplierName}</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Star picker */}
          <div>
            <Label className="mb-2 block">Classificação *</Label>
            <div
              className="flex gap-1"
              onMouseLeave={() => setHovered(0)}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHovered(i)}
                  className="focus:outline-none"
                  aria-label={`${i} estrelas`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      i <= displayRating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30 hover:text-yellow-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {["", "Muito mau", "Mau", "Razoável", "Bom", "Excelente"][displayRating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <Label htmlFor="review-comment" className="mb-1 block">
              Comentário <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="review-comment"
              placeholder="Partilhe a sua experiência com este fornecedor..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {comment.length}/1000
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submit.isPending}
          >
            {existing ? "Atualizar avaliação" : "Submeter avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
