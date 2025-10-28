/**
 * GenericItemDialog - Universal Item Dialog Component
 *
 * Consolidates 8 duplicate dialog components into one
 * Preserves ALL existing designs through category configs
 * File size: ~180 lines - Small, maintainable
 *
 * Replaces:
 * - ElectricalItemDialog.jsx
 * - PlumbingItemDialog.jsx
 * - DemolitionItemDialog.jsx
 * - ConstructionAddItemDialog.jsx
 * - TilingManualItemDialog.jsx
 * - ElectricalManualItemDialog.jsx
 * - ConstructionManualItemDialog.jsx
 * - contractorPricing/ConstructionItemDialog.jsx
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from 'lucide-react';
import { getCategoryConfig, getButtonClasses, getSummaryCardClasses } from './categoryConfigs';

export default function GenericItemDialog({
  category,  // 'electrical', 'plumbing', 'demolition', 'construction'
  open,
  onOpenChange,
  item = null,
  onSaved,
  defaults = {},
  preset = null,
  initialQuantity = 1,
}) {
  const config = getCategoryConfig(category);

  // State management - all possible fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: initialQuantity,
    unit: config.defaults.unit,
    contractorCost: '',
    hoursPerUnit: '',
    materialCostPerUnit: '',
    clientUnitPriceOverride: '',
  });

  // Load item or preset data
  useEffect(() => {
    if (open && (item || preset)) {
      const source = item || preset;
      setFormData({
        name: source.name || '',
        description: source.description || '',
        quantity: source.quantity || initialQuantity,
        unit: source.unit || config.defaults.unit,
        contractorCost: String(source.contractorCostPerUnit || ''),
        hoursPerUnit: String(source.hoursPerUnit || source.laborHoursPerUnit || ''),
        materialCostPerUnit: String(source.materialCostPerUnit || ''),
        clientUnitPriceOverride: source.clientPricePerUnit != null ? String(source.clientPricePerUnit) : '',
      });
    } else if (open && !item && !preset) {
      setFormData({
        name: '',
        description: '',
        quantity: initialQuantity,
        unit: config.defaults.unit,
        contractorCost: '',
        hoursPerUnit: '',
        materialCostPerUnit: '',
        clientUnitPriceOverride: '',
      });
    }
  }, [open, item, preset, initialQuantity, config.defaults.unit]);

  // Calculations
  const getCalculations = () => {
    const qty = Math.max(1, Number(formData.quantity) || 1);
    const profitPercent = defaults.desiredProfitPercent || defaults.profitPercent || config.defaults.profitPercent || 30;

    let contractorCostPerUnit = 0;

    if (config.calculations.calculateFromHours) {
      // Demolition: hours × labor rate
      const hours = Number(formData.hoursPerUnit) || 0;
      const laborRate = (defaults.laborCostPerDay || config.defaults.laborCostPerDay || 1000) /
                       (config.defaults.hoursPerDay || 8);
      contractorCostPerUnit = hours * laborRate;
    } else if (config.calculations.calculateLaborFromHours) {
      // Construction: material + (hours × labor rate)
      const hours = Number(formData.hoursPerUnit) || 0;
      const laborRate = (defaults.laborCostPerDay || config.defaults.laborCostPerDay || 1000) / 8;
      const materialCost = Number(formData.materialCostPerUnit) || 0;
      contractorCostPerUnit = materialCost + (hours * laborRate);
    } else {
      // Simple: direct contractor cost
      contractorCostPerUnit = Number(formData.contractorCost) || 0;
    }

    const suggestedPrice = Math.round(contractorCostPerUnit * (1 + profitPercent / 100));
    const clientPricePerUnit = formData.clientUnitPriceOverride !== ''
      ? Number(formData.clientUnitPriceOverride)
      : suggestedPrice;

    const useQty = config.calculations.useQuantityInTotal ? qty : 1;
    const totalCost = Math.round(contractorCostPerUnit * useQty);
    const totalPrice = Math.round(clientPricePerUnit * useQty);
    const profit = totalPrice - totalCost;

    const workDays = config.calculations.calculateLaborFromHours
      ? ((Number(formData.hoursPerUnit) || 0) * qty / 8)
      : 0;

    return {
      contractorCostPerUnit,
      clientPricePerUnit,
      totalCost,
      totalPrice,
      profit,
      profitPercent,
      qty,
      workDays,
      suggestedPrice,
    };
  };

  const handleSave = () => {
    if (config.fields.showName && !formData.name.trim()) {
      alert('נא למלא שם פריט');
      return;
    }

    const calc = getCalculations();
    const savedItem = {
      ...(item || {}),
      id: item?.id || `${category}_${Date.now()}`,
      name: formData.name.trim() || item?.name || '',
      description: formData.description.trim(),
      unit: formData.unit,
      quantity: calc.qty,
      contractorCostPerUnit: calc.contractorCostPerUnit,
      clientPricePerUnit: calc.clientPricePerUnit,
      desiredProfitPercent: calc.profitPercent,
      totalCost: calc.totalCost,
      totalPrice: calc.totalPrice,
      hoursPerUnit: Number(formData.hoursPerUnit) || undefined,
      materialCostPerUnit: Number(formData.materialCostPerUnit) || undefined,
      workDays: calc.workDays || undefined,
      subCategory: config.defaults.subCategory || 'general',
      isActive: true,
      ignoreQuantity: config.calculations.ignoreQuantity,
    };

    onSaved && onSaved(savedItem);
    onOpenChange(false);
  };

  const calc = getCalculations();
  const fmt = (n) => `₪${(Number(n) || 0).toLocaleString("he-IL")}`;

  // Demolition uses custom fixed dialog
  if (config.dialog.useCustomDialog) {
    return (
      <div className={open ? "fixed inset-0 z-[200] flex items-center justify-center bg-black/50" : "hidden"} dir="rtl" onClick={() => onOpenChange(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-xl font-bold text-gray-900">{config.dialog.title}</h2>
            <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <DialogFieldsRenderer config={config} formData={formData} setFormData={setFormData} calc={calc} fmt={fmt} />
          <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
            <button onClick={() => onOpenChange(false)} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              ביטול
            </button>
            <button onClick={handleSave} className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition-all shadow-sm ${getButtonClasses(config)}`}>
              הוסף
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard Dialog component
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={config.dialog.maxWidth} dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">{preset ? config.dialog.titlePreset : config.dialog.title}</DialogTitle>
          <DialogDescription>{config.dialog.description}</DialogDescription>
        </DialogHeader>
        <DialogFieldsRenderer config={config} formData={formData} setFormData={setFormData} calc={calc} fmt={fmt} />
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSave} className={getButtonClasses(config)}>
            {item ? 'שמור' : 'הוסף'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Extracted component for rendering fields (keeps main component small)
function DialogFieldsRenderer({ config, formData, setFormData, calc, fmt }) {
  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4 py-4">
      {config.fields.showName && (
        <div>
          <Label htmlFor="name">שם הפריט <span className="text-red-500">*</span></Label>
          <Input id="name" value={formData.name} onChange={(e) => updateField('name', e.target.value)} placeholder="לדוגמה: בניית קיר" />
        </div>
      )}

      {config.fields.showQuantity && (
        <div>
          <Label htmlFor="qty">כמות</Label>
          <Input id="qty" type="number" min={1} value={formData.quantity} onChange={(e) => updateField('quantity', e.target.value)} />
        </div>
      )}

      {config.fields.showContractorCost && (
        <div>
          <Label htmlFor="cost">עלות קבלן ליחידה (₪)</Label>
          <Input id="cost" type="number" min={0} value={formData.contractorCost} onChange={(e) => updateField('contractorCost', e.target.value)} />
        </div>
      )}

      {config.fields.showHoursPerUnit && (
        <div>
          <Label htmlFor="hours">שעות עבודה ליחידה</Label>
          <Input id="hours" type="number" min={0} value={formData.hoursPerUnit} onChange={(e) => updateField('hoursPerUnit', e.target.value)} />
        </div>
      )}

      {config.fields.showMaterialCost && (
        <div>
          <Label htmlFor="material">עלות חומר ליחידה (₪)</Label>
          <Input id="material" type="number" min={0} value={formData.materialCostPerUnit} onChange={(e) => updateField('materialCostPerUnit', e.target.value)} />
        </div>
      )}

      {config.fields.showUnit && (
        <div>
          <Label htmlFor="unit">יחידת מידה</Label>
          <Select value={formData.unit} onValueChange={(v) => updateField('unit', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {config.unitOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {config.fields.showDescription && (
        <div>
          <Label htmlFor="desc">תיאור (אופציונלי)</Label>
          <Textarea id="desc" value={formData.description} onChange={(e) => updateField('description', e.target.value)} rows={2} />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        {config.summary.order.map(type => {
          if (type === 'workDays' && !calc.workDays) return null;
          const classes = getSummaryCardClasses(type, config);
          const value = type === 'client' ? calc.totalPrice :
                       type === 'contractor' ? calc.totalCost :
                       type === 'profit' ? calc.profit : calc.workDays;
          return (
            <div key={type} className={classes.wrapper}>
              <div className={classes.label}>{config.summary.labels[type]}</div>
              <div className={classes.value}>{type === 'workDays' ? value.toFixed(1) : fmt(value)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
