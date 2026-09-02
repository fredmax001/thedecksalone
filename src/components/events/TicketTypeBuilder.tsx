import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Ticket, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/formatting';

export interface TicketTypeInput {
  id?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  quantity: string;
  maxPerOrder: number;
  saleStartsAt: string;
  saleEndsAt: string;
  isActive: boolean;
}

interface Props {
  types: TicketTypeInput[];
  onChange: (types: TicketTypeInput[]) => void;
  currency?: string;
}

const emptyType: TicketTypeInput = {
  name: '',
  description: '',
  price: 0,
  currency: 'SLE',
  quantity: '',
  maxPerOrder: 10,
  saleStartsAt: '',
  saleEndsAt: '',
  isActive: true,
};

const presets = ['Early Bird', 'Regular', 'VIP', 'VVIP'];

export default function TicketTypeBuilder({ types, onChange, currency = 'SLE' }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const addType = (preset?: string) => {
    const newType = { ...emptyType, currency, name: preset || '' };
    onChange([...types, newType]);
    setExpanded(types.length);
  };

  const updateType = (index: number, patch: Partial<TicketTypeInput>) => {
    const next = types.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange(next);
  };

  const removeType = (index: number) => {
    const next = types.filter((_, i) => i !== index);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => addType(preset)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 border border-gold/20 text-gold text-xs font-semibold rounded-lg hover:bg-gold/20 transition-colors"
          >
            <Plus className="w-3 h-3" /> {preset}
          </button>
        ))}
        <button
          type="button"
          onClick={() => addType()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-text-secondary text-xs font-semibold rounded-lg hover:border-gold/30 hover:text-gold transition-colors"
        >
          <Plus className="w-3 h-3" /> Custom
        </button>
      </div>

      <AnimatePresence>
        {types.map((type, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-black-elevated border border-dark-gray rounded-xl overflow-hidden"
          >
            <div
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setExpanded(expanded === index ? null : index)}
            >
              <GripVertical className="w-4 h-4 text-text-muted" />
              <Ticket className="w-4 h-4 text-gold" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{type.name || 'New Ticket Type'}</p>
                <p className="text-xs text-text-muted">
                  {formatCurrency(Number(type.price || 0), currency)} · {type.quantity ? `${type.quantity} available` : 'Unlimited'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${type.isActive ? 'bg-green/15 text-green' : 'bg-text-muted/15 text-text-muted'}`}>
                  {type.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeType(index); }}
                  className="p-1.5 text-text-muted hover:text-red hover:bg-red/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {expanded === index && (
              <div className="p-4 border-t border-dark-gray space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-text-secondary text-xs uppercase">Ticket Name *</Label>
                    <Input
                      value={type.name}
                      onChange={(e) => updateType(index, { name: e.target.value })}
                      placeholder="e.g. VIP"
                      className="mt-1 bg-black-surface border-dark-gray text-text-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-text-secondary text-xs uppercase">Price ({currency})</Label>
                    <Input
                      type="number"
                      min={0}
                      value={type.price}
                      onChange={(e) => updateType(index, { price: Number(e.target.value) })}
                      placeholder="0"
                      className="mt-1 bg-black-surface border-dark-gray text-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-text-secondary text-xs uppercase">Description</Label>
                  <Input
                    value={type.description}
                    onChange={(e) => updateType(index, { description: e.target.value })}
                    placeholder="What's included?"
                    className="mt-1 bg-black-surface border-dark-gray text-text-primary"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-text-secondary text-xs uppercase">Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={type.quantity}
                      onChange={(e) => updateType(index, { quantity: e.target.value })}
                      placeholder="Unlimited"
                      className="mt-1 bg-black-surface border-dark-gray text-text-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-text-secondary text-xs uppercase">Max Per Order</Label>
                    <Input
                      type="number"
                      min={1}
                      value={type.maxPerOrder}
                      onChange={(e) => updateType(index, { maxPerOrder: Number(e.target.value) })}
                      className="mt-1 bg-black-surface border-dark-gray text-text-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-text-secondary text-xs uppercase">Sale Starts</Label>
                    <Input
                      type="datetime-local"
                      value={type.saleStartsAt}
                      onChange={(e) => updateType(index, { saleStartsAt: e.target.value })}
                      className="mt-1 bg-black-surface border-dark-gray text-text-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-text-secondary text-xs uppercase">Sale Ends</Label>
                    <Input
                      type="datetime-local"
                      value={type.saleEndsAt}
                      onChange={(e) => updateType(index, { saleEndsAt: e.target.value })}
                      className="mt-1 bg-black-surface border-dark-gray text-text-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label className="text-text-secondary text-xs uppercase">Active</Label>
                  <Switch
                    checked={type.isActive}
                    onCheckedChange={(checked) => updateType(index, { isActive: checked })}
                  />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {types.length === 0 && (
        <div className="text-center py-8 border border-dashed border-dark-gray rounded-xl">
          <Ticket className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-muted">No ticket types yet</p>
          <p className="text-xs text-text-muted mt-1">Add at least one ticket type to sell tickets.</p>
        </div>
      )}
    </div>
  );
}