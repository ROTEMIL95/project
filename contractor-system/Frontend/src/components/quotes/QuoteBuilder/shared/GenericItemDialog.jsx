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
import { getCategoryConfig, getButtonClasses } from './categoryConfigs';

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

    // Build saved item with all necessary fields
    const savedItem = {
      ...(item || {}),
      id: item?.id || `${category}_${Date.now()}`,
      name: formData.name.trim() || item?.name || '',
      description: formData.description.trim(),
      unit: formData.unit,
      quantity: calc.qty,
      contractorCostPerUnit: calc.contractorCostPerUnit,
      clientPricePerUnit: calc.clientPricePerUnit,
      profitPercent: calc.profitPercent,
      totalCost: calc.totalCost,
      totalPrice: calc.totalPrice,
      subCategory: config.defaults.subCategory || 'general',
      isActive: true,
    };

    // Add optional fields only if they have values
    if (formData.hoursPerUnit) {
      savedItem.hoursPerUnit = Number(formData.hoursPerUnit);
    }

    if (formData.materialCostPerUnit) {
      savedItem.materialCostPerUnit = Number(formData.materialCostPerUnit);
    }

    if (calc.workDays) {
      savedItem.workDays = calc.workDays;
    }

    if (config.calculations.ignoreQuantity !== undefined) {
      savedItem.ignoreQuantity = config.calculations.ignoreQuantity;
    }

    console.log('Saving item:', savedItem); // Debug log

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
          <div className="px-6 py-4">
            {config.dialog.description && (
              <p className="text-sm text-gray-600 mb-4">{config.dialog.description}</p>
            )}
            <DialogFieldsRenderer config={config} formData={formData} setFormData={setFormData} calc={calc} fmt={fmt} />
          </div>
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
      <DialogContent className={`${config.dialog.maxWidth} p-6 md:p-8`} dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">{preset ? config.dialog.titlePreset : config.dialog.title}</DialogTitle>
          <DialogDescription>{config.dialog.description}</DialogDescription>
        </DialogHeader>
        <DialogFieldsRenderer config={config} formData={formData} setFormData={setFormData} calc={calc} fmt={fmt} />
        <DialogFooter className="pt-4 border-t gap-3">
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
    <div className="space-y-4">
      {config.fields.showName && (
        <div>
          <Label htmlFor="name">שם הפריט <span className="text-red-500">*</span></Label>
          <Input id="name" value={formData.name} onChange={(e) => updateField('name', e.target.value)} placeholder="לדוגמה: בניית קיר" />
        </div>
      )}

      {config.fields.showDescription && (
        <div>
          <Label htmlFor="desc">תיאור (אופציונלי)</Label>
          <Textarea id="desc" value={formData.description} onChange={(e) => updateField('description', e.target.value)} rows={3} placeholder="פרטים נוספים..." className="resize-none" />
        </div>
      )}

      {/* Grid for Quantity and Hours (Demolition style) or separate fields (other categories) */}
      {config.fields.showQuantity && config.fields.showHoursPerUnit && !config.fields.showContractorCost ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="qty">כמות (לתצוגה)</Label>
            <Input id="qty" type="number" min={1} step="1" value={formData.quantity} onChange={(e) => updateField('quantity', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="hours">שעות עבודה ליחידה</Label>
            <Input id="hours" type="number" min={0} step="1" value={formData.hoursPerUnit} onChange={(e) => updateField('hoursPerUnit', e.target.value)} placeholder="1" />
          </div>
        </div>
      ) : (
        <>
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
              <Input id="hours" type="number" min={0} step="1" value={formData.hoursPerUnit} onChange={(e) => updateField('hoursPerUnit', e.target.value)} placeholder="1" />
            </div>
          )}
        </>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        {config.summary.order.map(type => {
          if (type === 'workDays' && !calc.workDays) return null;
          const value = type === 'client' ? calc.totalPrice :
                       type === 'contractor' ? calc.totalCost :
                       type === 'profit' ? calc.profit : calc.workDays;

          // Color mapping for summary cards
          const colorMap = {
            client: { bg: 'bg-blue-50', border: 'border-blue-200', textLabel: 'text-blue-700', textValue: 'text-blue-900' },
            contractor: { bg: 'bg-red-50', border: 'border-red-200', textLabel: 'text-red-700', textValue: 'text-red-900' },
            profit: { bg: 'bg-green-50', border: 'border-green-200', textLabel: 'text-green-700', textValue: 'text-green-900' },
            workDays: { bg: 'bg-amber-50', border: 'border-amber-200', textLabel: 'text-amber-700', textValue: 'text-amber-900' },
          };

          const colors = colorMap[type] || colorMap.client;

          return (
            <div key={type} className={`${colors.bg} border-2 ${colors.border} rounded-xl p-4 text-center`}>
              <div className={`text-xs font-medium ${colors.textLabel} mb-1`}>{config.summary.labels[type]}</div>
              <div className={`text-xl font-bold ${colors.textValue}`}>
                {type === 'workDays' ? value.toFixed(1) : fmt(value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
