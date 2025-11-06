import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paintbrush, Plus, Layers, ChevronDown, ChevronUp, Trash2, Calculator } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import RoomEstimatesCalculator from './RoomEstimatesCalculator';
import { useUser } from '@/components/utils/UserContext';

export default function PaintSimulatorV2({
  onAddItemToQuote,
  projectComplexities,
  onUpdateRoomBreakdown,
}) {
  const { user: ctxUser } = useUser();
  const [user, setUser] = React.useState(null);
  const [paintItems, setPaintItems] = React.useState([]);

  const [paintOpen, setPaintOpen] = React.useState(true);
  const [plasterOpen, setPlasterOpen] = React.useState(true);

  const [paintAreas, setPaintAreas] = React.useState([]);
  const [plasterAreas, setPlasterAreas] = React.useState([]);

  const [selectedPaintItem, setSelectedPaintItem] = React.useState(null);
  const [selectedPlasterItem, setSelectedPlasterItem] = React.useState(null);

  const [showRoomCalc, setShowRoomCalc] = React.useState(false);
  const [currentCalcType, setCurrentCalcType] = React.useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      const userData = ctxUser;
      setUser(userData);
      if (userData?.paintItems) {
        setPaintItems(userData.paintItems.filter(item => item.itemName));
      }
    };
    if (ctxUser) loadUser();
  }, [ctxUser]);

  const addPaintArea = () => {
    setPaintAreas([...paintAreas, { id: Date.now(), item: null, area: '', layers: 1 }]);
  };

  const addPlasterArea = () => {
    setPlasterAreas([...plasterAreas, { id: Date.now(), item: null, area: '', layers: 1 }]);
  };

  const removePaintArea = (id) => {
    setPaintAreas(paintAreas.filter(a => a.id !== id));
  };

  const removePlasterArea = (id) => {
    setPlasterAreas(plasterAreas.filter(a => a.id !== id));
  };

  const updatePaintArea = (id, field, value) => {
    setPaintAreas(paintAreas.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const updatePlasterArea = (id, field, value) => {
    setPlasterAreas(plasterAreas.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleAddToQuote = (type) => {
    const areas = type === 'paint' ? paintAreas : plasterAreas;
    if (areas.length === 0) return;

    areas.forEach(area => {
      if (area.item && area.area > 0) {
        const item = {
          id: `${type}_${area.id}_${Date.now()}`,
          categoryId: 'cat_paint_plaster',
          categoryName: 'צבע ושפכטל',
          source: `${type}_simulator`,
          description: `${area.item.itemName || area.item.name} - ${area.area} מ"ר`,
          quantity: parseFloat(area.area),
          unit: 'מ"ר',
          layers: parseInt(area.layers) || 1,
          unitPrice: 100,
          totalPrice: parseFloat(area.area) * 100,
          totalCost: parseFloat(area.area) * 60,
          profit: parseFloat(area.area) * 40,
          profitPercent: 40,
          workDuration: parseFloat(area.area) / 20,
        };
        onAddItemToQuote(item);
      }
    });

    if (type === 'paint') {
      setPaintAreas([]);
    } else {
      setPlasterAreas([]);
    }
  };

  const openRoomCalculator = (type) => {
    setCurrentCalcType(type);
    setShowRoomCalc(true);
  };

  const handleRoomCalcResult = (result) => {
    if (currentCalcType === 'paint') {
      onAddItemToQuote({
        id: `paint_room_${Date.now()}`,
        categoryId: 'cat_paint_plaster',
        categoryName: 'צבע ושפכטל',
        source: 'paint_room_calc',
        description: result.description || 'צבע מחדרים',
        ...result
      });
    } else if (currentCalcType === 'plaster') {
      onAddItemToQuote({
        id: `plaster_room_${Date.now()}`,
        categoryId: 'cat_paint_plaster',
        categoryName: 'צבע ושפכטל',
        source: 'plaster_room_calc',
        description: result.description || 'שפכטל מחדרים',
        ...result
      });
    }
    setShowRoomCalc(false);
    setCurrentCalcType(null);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-blue-200">
        <Collapsible open={paintOpen} onOpenChange={setPaintOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 cursor-pointer hover:from-blue-100 hover:to-blue-150 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Paintbrush className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-blue-900">🎨 צבע</CardTitle>
                    <CardDescription className="text-blue-700">הוסף עבודות צבע</CardDescription>
                  </div>
                </div>
                {paintOpen ? (
                  <ChevronUp className="w-5 h-5 text-blue-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-blue-600" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-2 mb-4">
                <Button onClick={addPaintArea} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  הוסף אזור צבע
                </Button>
                <Button onClick={() => openRoomCalculator('paint')} variant="outline" size="sm">
                  <Calculator className="w-4 h-4 mr-2" />
                  חישוב לפי חדרים
                </Button>
              </div>

              {paintAreas.map(area => (
                <Card key={area.id} className="p-4 bg-blue-50/30">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label>סוג צבע</Label>
                      <Select value={area.item?.id} onValueChange={(val) => {
                        const item = paintItems.find(i => i.id === val);
                        updatePaintArea(area.id, 'item', item);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר צבע" />
                        </SelectTrigger>
                        <SelectContent>
                          {paintItems.filter(i => i.paintType !== 'plaster').map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.itemName || item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>שטח (מ"ר)</Label>
                      <Input
                        type="number"
                        value={area.area}
                        onChange={(e) => updatePaintArea(area.id, 'area', e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label>שכבות</Label>
                      <Input
                        type="number"
                        value={area.layers}
                        onChange={(e) => updatePaintArea(area.id, 'layers', e.target.value)}
                        min="1"
                        max="3"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePaintArea(area.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {paintAreas.length > 0 && (
                <Button onClick={() => handleAddToQuote('paint')} className="w-full bg-blue-600 hover:bg-blue-700">
                  הוסף צבע להצעה
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card className="shadow-lg border-orange-200">
        <Collapsible open={plasterOpen} onOpenChange={setPlasterOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 cursor-pointer hover:from-orange-100 hover:to-orange-150 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-orange-900">🪛 שפכטל</CardTitle>
                    <CardDescription className="text-orange-700">הוסף עבודות שפכטל</CardDescription>
                  </div>
                </div>
                {plasterOpen ? (
                  <ChevronUp className="w-5 h-5 text-orange-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-orange-600" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-2 mb-4">
                <Button onClick={addPlasterArea} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  הוסף אזור שפכטל
                </Button>
                <Button onClick={() => openRoomCalculator('plaster')} variant="outline" size="sm">
                  <Calculator className="w-4 h-4 mr-2" />
                  חישוב לפי חדרים
                </Button>
              </div>

              {plasterAreas.map(area => (
                <Card key={area.id} className="p-4 bg-orange-50/30">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label>סוג שפכטל</Label>
                      <Select value={area.item?.id} onValueChange={(val) => {
                        const item = paintItems.find(i => i.id === val);
                        updatePlasterArea(area.id, 'item', item);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר שפכטל" />
                        </SelectTrigger>
                        <SelectContent>
                          {paintItems.filter(i => i.paintType === 'plaster').map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.itemName || item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>שטח (מ"ר)</Label>
                      <Input
                        type="number"
                        value={area.area}
                        onChange={(e) => updatePlasterArea(area.id, 'area', e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label>שכבות</Label>
                      <Input
                        type="number"
                        value={area.layers}
                        onChange={(e) => updatePlasterArea(area.id, 'layers', e.target.value)}
                        min="1"
                        max="3"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePlasterArea(area.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {plasterAreas.length > 0 && (
                <Button onClick={() => handleAddToQuote('plaster')} className="w-full bg-orange-600 hover:bg-orange-700">
                  הוסף שפכטל להצעה
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {showRoomCalc && (
        <RoomEstimatesCalculator
          open={showRoomCalc}
          onClose={() => setShowRoomCalc(false)}
          onSubmit={handleRoomCalcResult}
          paintItems={paintItems}
          type={currentCalcType}
          user={user}
          projectComplexities={projectComplexities}
          onUpdateRoomBreakdown={onUpdateRoomBreakdown}
        />
      )}
    </div>
  );
}