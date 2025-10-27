
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Building, Car, DollarSign, ParkingCircle, Construction, Info, Sparkles, Wrench, ShieldCheck, TrendingUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

export default function ComplexityOptionsCompact({ projectComplexities, setProjectComplexities, onSaveComplexities, isSavingComplexities }) {
  const [localComplexities, setLocalComplexities] = useState({
    transportMethod: 'elevator', // 'elevator', 'stairs', 'crane'
    transportCosts: {
      manualLaborCostPerDay: 500, // This will become general contractor cost for non-crane
      manualLaborCustomerPrice: 0, // This will become general customer price for non-crane
      craneCost: 0,
      craneCustomerPrice: 0,
    },
    floor: 1,
    parkingDistance: 10,
    isOccupied: false,
    workHourRestrictions: false,
    specialSiteConditions: '',
    specialConditionsCost: { contractorCost: 0, customerPrice: 0 },

    // New fields for cleaning and preparation
    cleaningContractorCost: 0,
    cleaningCustomerPrice: 0,
    preparationContractorCost: 0,
    preparationCustomerPrice: 0,

    additionalCostDetails: [], // Placeholder for other generic costs if implemented later
    totalCosts: { contractorCost: 0, customerPrice: 0 } // Will be calculated
  });

  // Sync prop to local state on initial load or prop change
  useEffect(() => {
    if (projectComplexities) {
      setLocalComplexities(prev => ({
        ...prev,
        ...projectComplexities,
        transportCosts: {
          manualLaborCostPerDay: projectComplexities.transportCosts?.manualLaborCostPerDay || prev.transportCosts.manualLaborCostPerDay,
          manualLaborCustomerPrice: projectComplexities.transportCosts?.manualLaborCustomerPrice || prev.transportCosts.manualLaborCustomerPrice,
          craneCost: projectComplexities.transportCosts?.craneCost || prev.transportCosts.craneCost,
          craneCustomerPrice: projectComplexities.transportCosts?.craneCustomerPrice || prev.transportCosts.craneCustomerPrice,
          // manualLaborDays is intentionally omitted as it's being removed
        },
        specialConditionsCost: {
          ...prev.specialConditionsCost,
          ...(projectComplexities.specialConditionsCost || {})
        },
        // Initialize new fields if they exist in projectComplexities or default to 0
        cleaningContractorCost: projectComplexities.cleaningContractorCost || 0,
        cleaningCustomerPrice: projectComplexities.cleaningCustomerPrice || 0,
        preparationContractorCost: projectComplexities.preparationContractorCost || 0,
        preparationCustomerPrice: projectComplexities.preparationCustomerPrice || 0,
      }));
    }
  }, [projectComplexities]);

  // Function to calculate and set total costs based on current localComplexities
  const calculateAndSetCosts = (updatedComplexities) => {
    let totalContractor = 0;
    let totalCustomer = 0;

    // Cleaning and Preparation Costs
    totalContractor += parseFloat(updatedComplexities.cleaningContractorCost || 0);
    totalCustomer += parseFloat(updatedComplexities.cleaningCustomerPrice || updatedComplexities.cleaningContractorCost || 0);

    totalContractor += parseFloat(updatedComplexities.preparationContractorCost || 0);
    totalCustomer += parseFloat(updatedComplexities.preparationCustomerPrice || updatedComplexities.preparationContractorCost || 0);

    // Transport costs
    if (updatedComplexities.transportMethod === 'crane') {
      totalContractor += parseFloat(updatedComplexities.transportCosts?.craneCost || 0);
      totalCustomer += parseFloat(updatedComplexities.transportCosts?.craneCustomerPrice || updatedComplexities.transportCosts?.craneCost || 0);
    } else if (updatedComplexities.transportMethod === 'stairs' || updatedComplexities.transportMethod === 'elevator') {
      // Now uses the direct costs, not days * cost_per_day
      totalContractor += parseFloat(updatedComplexities.transportCosts?.manualLaborCostPerDay || 0); // This is now "עלות שינוע והרמה - קבלן"
      totalCustomer += parseFloat(updatedComplexities.transportCosts?.manualLaborCustomerPrice || updatedComplexities.transportCosts?.manualLaborCostPerDay || 0); // This is "עלות שינוע והרמה - לקוח"
    }

    // Special conditions costs
    totalContractor += parseFloat(updatedComplexities.specialConditionsCost?.contractorCost || 0);
    totalCustomer += parseFloat(updatedComplexities.specialConditionsCost?.customerPrice || updatedComplexities.specialConditionsCost?.contractorCost || 0);

    // Other additional costs from the list (if any were added)
    // This part assumes `additionalCostDetails` is an array of objects like { cost: 100, priceToCustomer: 120 }
    updatedComplexities.additionalCostDetails?.forEach(item => {
      totalContractor += parseFloat(item.cost || 0);
      totalCustomer += parseFloat(item.priceToCustomer || item.cost || 0);
    });

    return {
      ...updatedComplexities,
      totalCosts: { contractorCost: totalContractor, customerPrice: totalCustomer }
    };
  };

  // Generic change handler for all inputs
  const handleChange = (field, value, subField = null) => { // Removed subSubField
    setLocalComplexities(prev => {
      let newState;
      if (subField) {
        newState = {
          ...prev,
          [field]: {
            ...prev[field],
            [subField]: value
          }
        };
      } else {
        newState = { ...prev, [field]: value };
      }
      return calculateAndSetCosts(newState);
    });
  };

  // This useEffect ensures initial calculation when component mounts or projectComplexities changes
  useEffect(() => {
    if (projectComplexities) {
      setLocalComplexities(prev => calculateAndSetCosts(prev));
    }
  }, [projectComplexities]); // Re-calculate when the base prop changes

  const handleSave = () => {
    // The localComplexities state is already updated with totalCosts via handleChange and calculateAndSetCosts
    // Ensure manualLaborDays is not part of the saved data if it's removed from UI
    const { manualLaborDays, ...restOfTransportCosts } = localComplexities.transportCosts;
    const complexitiesToSave = {
      ...localComplexities,
      transportCosts: restOfTransportCosts
    };
    onSaveComplexities(complexitiesToSave);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gray-50">
        <CardTitle className="text-xl text-indigo-700 flex items-center">
          <Construction className="h-6 w-6 mr-2" />
          מורכבות ותנאי פרויקט
        </CardTitle>
        <CardDescription>הגדר תנאים ועלויות נוספות המשפיעות על הפרויקט.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">

        {/* Section 1: Cleaning and Preparation Costs - NOW FIRST */}
        <div>
          <h4 className="text-md font-semibold flex items-center text-gray-700 mb-3">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            עלויות ניקיון והכנה
          </h4>
          <div className="space-y-4 bg-gray-50/70 p-4 rounded-lg border">
            {/* Cleaning Costs */}
            <div>
              <div className="flex items-center mb-2">
                <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">עלויות ניקיון</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cleaningContractorCost" className="text-xs">עלות לקבלן (₪)</Label>
                  <Input
                    id="cleaningContractorCost"
                    type="number"
                    value={localComplexities.cleaningContractorCost || ''}
                    onChange={(e) => handleChange('cleaningContractorCost', parseFloat(e.target.value) || 0)}
                    min="0"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="cleaningCustomerPrice" className="text-xs">מחיר ללקוח (₪)</Label>
                  <Input
                    id="cleaningCustomerPrice"
                    type="number"
                    value={localComplexities.cleaningCustomerPrice || ''}
                    onChange={(e) => handleChange('cleaningCustomerPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Preparation Costs */}
            <div>
              <div className="flex items-center mb-2">
                <Wrench className="h-4 w-4 mr-2 text-orange-500" />
                <span className="text-sm font-medium text-gray-700">עלויות הכנה</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="preparationContractorCost" className="text-xs">עלות לקבלן (₪)</Label>
                  <Input
                    id="preparationContractorCost"
                    type="number"
                    value={localComplexities.preparationContractorCost || ''}
                    onChange={(e) => handleChange('preparationContractorCost', parseFloat(e.target.value) || 0)}
                    min="0"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="preparationCustomerPrice" className="text-xs">מחיר ללקוח (₪)</Label>
                  <Input
                    id="preparationCustomerPrice"
                    type="number"
                    value={localComplexities.preparationCustomerPrice || ''}
                    onChange={(e) => handleChange('preparationCustomerPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Section 2: Access, Transport, Special Conditions - Reordered */}
        <div>
          <h4 className="text-md font-semibold flex items-center text-gray-700 mb-3">
            <Building className="h-5 w-5 mr-2 text-indigo-600" />
            תנאי גישה ושינוע
          </h4>
          <div className="space-y-3 bg-gray-50/70 p-4 rounded-lg border">
            {/* Transport Method - NOW FIRST in this section */}
            <div>
              <Label htmlFor="transportMethod" className="text-xs">שיטת שינוע</Label>
              <Select value={localComplexities.transportMethod} onValueChange={(value) => handleChange('transportMethod', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="בחר שיטת שינוע" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elevator">מעלית (רגיל)</SelectItem>
                  <SelectItem value="stairs">מדרגות (רגיל)</SelectItem>
                  <SelectItem value="crane">מנוף</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Floor and Parking Distance - NOW SECOND */}
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label htmlFor="floor" className="text-xs">קומה</Label>
                <Input id="floor" type="number" value={localComplexities.floor} onChange={(e) => handleChange('floor', parseInt(e.target.value) || 0)} min="0" className="h-9"/>
              </div>
              <div>
                <Label htmlFor="parkingDistance" className="text-xs">מרחק מחניה (מ')</Label>
                <Input id="parkingDistance" type="number" value={localComplexities.parkingDistance} onChange={(e) => handleChange('parkingDistance', parseInt(e.target.value) || 0)} min="0" className="h-9"/>
              </div>
            </div>

            {/* Transport Costs */}
            {localComplexities.transportMethod === 'crane' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="craneCost" className="text-xs">עלות מנוף - קבלן (₪)</Label>
                  <Input
                    id="craneCost"
                    type="number"
                    value={localComplexities.transportCosts.craneCost}
                    onChange={(e) => handleChange('transportCosts', parseFloat(e.target.value) || 0, 'craneCost')}
                    min="0"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="craneCustomerPrice" className="text-xs">עלות מנוף - לקוח (₪)</Label>
                  <Input
                    id="craneCustomerPrice"
                    type="number"
                    value={localComplexities.transportCosts.craneCustomerPrice}
                    onChange={(e) => handleChange('transportCosts', parseFloat(e.target.value) || 0, 'craneCustomerPrice')}
                    min="0"
                    className="h-9"
                  />
                </div>
              </div>
            ) : ( // For 'elevator' or 'stairs' (non-crane methods)
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="manualTransportContractorCost" className="text-xs">עלות שינוע והרמה - קבלן (₪)</Label>
                  <Input
                    id="manualTransportContractorCost"
                    type="number"
                    value={localComplexities.transportCosts.manualLaborCostPerDay} // Using existing state field, but now it represents total cost
                    onChange={(e) => handleChange('transportCosts', parseFloat(e.target.value) || 0, 'manualLaborCostPerDay')}
                    min="0"
                    className="h-9"
                    placeholder="סה״כ עלות לקבלן"
                  />
                </div>
                <div>
                  <Label htmlFor="manualTransportCustomerPrice" className="text-xs">עלות שינוע והרמה - ללקוח (₪)</Label>
                  <Input
                    id="manualTransportCustomerPrice"
                    type="number"
                    value={localComplexities.transportCosts.manualLaborCustomerPrice}  // Using existing state field
                    onChange={(e) => handleChange('transportCosts', parseFloat(e.target.value) || 0, 'manualLaborCustomerPrice')}
                    min="0"
                    className="h-9"
                    placeholder="סה״כ מחיר ללקוח"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Section 3: Special Conditions */}
        <div>
          <h4 className="text-md font-semibold flex items-center text-gray-700 mb-3">
            <AlertCircle className="h-5 w-5 mr-2 text-amber-600" />
            תנאי עבודה מיוחדים
          </h4>
          <div className="space-y-3 bg-gray-50/70 p-4 rounded-lg border">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <Checkbox
                  id="isOccupied"
                  checked={localComplexities.isOccupied}
                  onCheckedChange={(checked) => handleChange('isOccupied', checked)}
                />
                <Label htmlFor="isOccupied" className="mr-2 text-sm cursor-pointer">דירה מאוכלסת</Label>
              </div>
              <div className="flex items-center">
                <Checkbox
                  id="workHourRestrictions"
                  checked={localComplexities.workHourRestrictions}
                  onCheckedChange={(checked) => handleChange('workHourRestrictions', checked)}
                />
                <Label htmlFor="workHourRestrictions" className="mr-2 text-sm cursor-pointer">מגבלות שעות עבודה</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="specialSiteConditions" className="text-xs">תנאי אתר מיוחדים</Label>
              <Textarea
                id="specialSiteConditions"
                value={localComplexities.specialSiteConditions}
                onChange={(e) => handleChange('specialSiteConditions', e.target.value)}
                placeholder="תאר תנאים מיוחדים (אם יש)..."
                className="h-20"
              />
            </div>

            {(localComplexities.isOccupied || localComplexities.workHourRestrictions || localComplexities.specialSiteConditions) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="specialConditionsContractorCost" className="text-xs">עלות נוספת לקבלן (₪)</Label>
                  <Input
                    id="specialConditionsContractorCost"
                    type="number"
                    value={localComplexities.specialConditionsCost.contractorCost}
                    onChange={(e) => handleChange('specialConditionsCost', parseFloat(e.target.value) || 0, 'contractorCost')}
                    min="0"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="specialConditionsCustomerPrice" className="text-xs">מחיר נוסף ללקוח (₪)</Label>
                  <Input
                    id="specialConditionsCustomerPrice"
                    type="number"
                    value={localComplexities.specialConditionsCost.customerPrice}
                    onChange={(e) => handleChange('specialConditionsCost', parseFloat(e.target.value) || 0, 'customerPrice')}
                    min="0"
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Totals Display - Updated */}
        <div>
          <h4 className="text-md font-semibold flex items-center text-gray-700 mb-3">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            סיכום עלויות נוספות
          </h4>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contractor Costs Column */}
              <div className="space-y-2">
                <h5 className="text-sm font-semibold text-gray-700 border-b pb-1">עלויות קבלן:</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>ניקיון:</span>
                    <span>{(localComplexities.cleaningContractorCost || 0).toLocaleString()} ₪</span>
                  </div>
                  <div className="flex justify-between">
                    <span>הכנה:</span>
                    <span>{(localComplexities.preparationContractorCost || 0).toLocaleString()} ₪</span>
                  </div>
                  <div className="flex justify-between">
                    <span>שינוע:</span>
                    <span>
                      {localComplexities.transportMethod === 'crane'
                        ? (localComplexities.transportCosts?.craneCost || 0).toLocaleString()
                        : (localComplexities.transportCosts?.manualLaborCostPerDay || 0).toLocaleString()
                      } ₪
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>תנאים מיוחדים:</span>
                    <span>{(localComplexities.specialConditionsCost?.contractorCost || 0).toLocaleString()} ₪</span>
                  </div>
                  <div className="border-t pt-1 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>סה"כ עלויות קבלן:</span>
                      <span className="text-red-600">{(localComplexities.totalCosts?.contractorCost || 0).toLocaleString()} ₪</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Prices Column */}
              <div className="space-y-2">
                <h5 className="text-sm font-semibold text-gray-700 border-b pb-1">מחירים ללקוח:</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>ניקיון:</span>
                    <span>{(localComplexities.cleaningCustomerPrice || 0).toLocaleString()} ₪</span>
                  </div>
                  <div className="flex justify-between">
                    <span>הכנה:</span>
                    <span>{(localComplexities.preparationCustomerPrice || 0).toLocaleString()} ₪</span>
                  </div>
                  <div className="flex justify-between">
                    <span>שינוע:</span>
                    <span>
                      {localComplexities.transportMethod === 'crane'
                        ? (localComplexities.transportCosts?.craneCustomerPrice || localComplexities.transportCosts?.craneCost || 0).toLocaleString()
                        : (localComplexities.transportCosts?.manualLaborCustomerPrice || localComplexities.transportCosts?.manualLaborCostPerDay || 0).toLocaleString()
                      } ₪
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>תנאים מיוחדים:</span>
                    <span>{(localComplexities.specialConditionsCost?.customerPrice || localComplexities.specialConditionsCost?.contractorCost || 0).toLocaleString()} ₪</span>
                  </div>
                  <div className="border-t pt-1 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>סה"כ מחירים ללקוח:</span>
                      <span className="text-blue-600">{(localComplexities.totalCosts?.customerPrice || 0).toLocaleString()} ₪</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profit Calculation Section - NEW */}
            <Separator className="my-3" />
            <div className="bg-white/60 p-3 rounded-md">
              <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                נתוני רווח מעלויות נוספות:
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-xs text-gray-500">סכום רווח</div>
                  <div className="text-lg font-bold text-green-600">
                    {((localComplexities.totalCosts?.customerPrice || 0) - (localComplexities.totalCosts?.contractorCost || 0)).toLocaleString()} ₪
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">אחוז רווח</div>
                  <div className="text-lg font-bold text-green-600">
                    {(localComplexities.totalCosts?.contractorCost > 0
                      ? (((localComplexities.totalCosts.customerPrice || 0) - (localComplexities.totalCosts.contractorCost || 0)) / (localComplexities.totalCosts.contractorCost || 1) * 100).toFixed(1)
                      : 0
                    )}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">מרווח כספי</div>
                  <div className="text-sm font-medium text-blue-600">
                    {(localComplexities.totalCosts?.customerPrice || 0) > (localComplexities.totalCosts?.contractorCost || 0)
                      ? 'רווחי'
                      : (localComplexities.totalCosts?.customerPrice || 0) === (localComplexities.totalCosts?.contractorCost || 0)
                      ? 'איזון'
                      : 'הפסד'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 pb-4 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSavingComplexities}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isSavingComplexities ? (
            <>
              <span className="mr-2">שומר...</span>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 ml-2" /> שמור והמשך לסיכום
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
