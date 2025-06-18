/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ProdukHewan } from '@/types/qurban';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import React, { useState, useEffect } from 'react';
import type { TipeHewan,  JenisProduk as JenisProdukType } from '@prisma/client';
import { addProdukHewan } from '@/app/dashboard/pengaturan/actions';

const JenisHewan = {
  UNTA: 'UNTA',
  SAPI: 'SAPI', 
  DOMBA: 'DOMBA',
  KAMBING: 'KAMBING',
} as const;

const JenisProduk = {
  Daging: "Daging",
  Kaki: "Kaki",
  Karkas: "Karkas",
  Jeroan: "Jeroan",
  Kulit: "Kulit",
  Tulang: "Tulang",
  Kepala: "Kepala",
  Lemak: "Lemak",
  Buntut: "Buntut",
  Torpedo: "Torpedo",
} as const;

const jenisProduk = Object.values(JenisProduk);

type AnimalType = keyof typeof JenisHewan;
type ProdukType = keyof typeof JenisProduk;
type SelectableAnimalType = AnimalType | "";
type SelectableProductType = ProdukType | "";

interface ProdukHewanForm {
  jenisHewan: SelectableAnimalType;
  jenisProduk: SelectableProductType;
  berat?: string;
  customName?: string;
  target?: string;
}

const BigAnimalTypes = ["SAPI", "UNTA"];
// Produk yang termasuk dalam BigAnimal (semua kecuali "Karkas")
const JenisProdukBigAnimal: ReadonlyArray<Exclude<ProdukType, "Karkas">> = jenisProduk.filter(
  (produk: string) => produk !== "Karkas"
) as ReadonlyArray<Exclude<ProdukType, "Karkas">>;
export function getProdukForAnimal(animal: string): ReadonlyArray<ProdukType> | ReadonlyArray<Exclude<ProdukType, "Karkas">> {
  if (BigAnimalTypes.includes(animal as typeof BigAnimalTypes[number])) {
    return JenisProdukBigAnimal;
  } else 
    return jenisProduk;
}
// Production estimation logic
const getProductionEstimate = (jenisHewan: AnimalType, jenisProduk: ProdukType) => {
  const isBigAnimal = BigAnimalTypes.includes(jenisHewan);
  
  const productionRules: Record<ProdukType, number> = {
    Daging: isBigAnimal ? 8 : 4,
    Kaki: isBigAnimal ? 4 : 1,
    Karkas: 1,
    Jeroan: 1,
    Kulit: 1,
    Tulang: isBigAnimal ? 6 : 3,
    Kepala: 1,
    Lemak: isBigAnimal ? 4 : 2,
    Buntut: 1,
    Torpedo: isBigAnimal ? 2 : 1
  };
  
  return productionRules[jenisProduk] || 1;
};

// Weight estimation for meat products
const getDefaultWeight = (jenisHewan: AnimalType, jenisProduk: ProdukType) => {
  if (jenisProduk !== "Daging") return null;
  
  const weightRules: Record<AnimalType, number> = {
    SAPI: 5,
    UNTA: 6,
    DOMBA: 3,
    KAMBING: 3
  };
  
  return weightRules[jenisHewan] || 3;
};

// Generate product name
const generateProductName = (jenisHewan: AnimalType, jenisProduk: ProdukType, berat: number | null = null) => {
  const hewanName = jenisHewan.charAt(0) + jenisHewan.slice(1).toLowerCase();
  
  if (jenisProduk === "Daging" && berat) {
    return `${JenisProduk[jenisProduk]} ${hewanName} ${berat}kg`;
  }
  
  return `${JenisProduk[jenisProduk]} ${hewanName}`;
};

// Check if product is available for animal type
// const isProductAvailable = (jenisHewan: SelectableAnimalType, jenisProduk: SelectableProductType) => {
//   if (!jenisHewan) return false;
  
//   const isBigAnimal = BigAnimalTypes.includes(jenisHewan);
  
//   // Small animals don't produce Karkas as separate product
//   if (isBigAnimal && jenisProduk === "Karkas") {
//     return false;
//   }
  
//   return true;
// };

function processTipeHewanData(tipeHewan: TipeHewan[]): {
  uniqueJenis: Set<string>;
  accumulatedTargetsByJenis: Map<string, number[]>;
} {
  // Use reduce to iterate and build both the Set and the Map
  const { uniqueJenis, accumulatedTargetsByJenis } = tipeHewan.reduce(
    (accumulator, item) => {
      // Add the current item's 'jenis' to the Set
      accumulator.uniqueJenis.add(item.jenis);

      // Get the array of targets for the current 'jenis' from the map.
      // If it doesn't exist, initialize it as an empty array.
      const currentTargets = accumulator.accumulatedTargetsByJenis.get(item.jenis) || [];

      // Add the current item's 'target' to the array
      currentTargets.push(item.target);

      // Update the Map with the potentially new or updated array of targets for this 'jenis'
      accumulator.accumulatedTargetsByJenis.set(item.jenis, currentTargets);

      // Return the updated accumulator for the next iteration
      return accumulator;
    },
    { // Initial accumulator value
      uniqueJenis: new Set<string>(),
      accumulatedTargetsByJenis: new Map<string, number[]>(),
    }
  );

  return {
    uniqueJenis,
    accumulatedTargetsByJenis
  };
}

type CreateProdukHewanFormProps = {
  tipeHewan: TipeHewan[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newProduk: ProdukHewan | ProdukHewan[]) => void
}

export default function ProductHewanForm({ 
  tipeHewan, 
  isOpen, 
  onOpenChange,
  onSuccess
}: CreateProdukHewanFormProps) {
  const availableJenisHewan = processTipeHewanData(tipeHewan)//tipeHewan.map(tipe=>tipe.jenis)
  const [formData, setFormData] = useState<ProdukHewanForm>({
    jenisHewan: '',
    jenisProduk: '',
    target: '0'
  });
  
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<ProdukType>>(new Set());
  const [productWeights, setProductWeights] = useState<Record<ProdukType, string>>({} as Record<ProdukType, string>);
  
  const [generatedName, setGeneratedName] = useState('');
  const [productionEstimate, setProductionEstimate] = useState(1);
  const [availableProducts, setAvailableProducts] = useState<ProdukType[]>([]);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [loading, setLoading] = useState(false);
  // Update available products when animal type changes
  useEffect(() => {
    if (formData.jenisHewan) {
      // const filtered = jenisProduk.filter((produk) => 
      //   isProductAvailable(formData.jenisHewan, produk)
      // ) as ProdukType[];
      const result = getProdukForAnimal(formData.jenisHewan)
      const availableProduct = [...result]
      setAvailableProducts(availableProduct);
      
      // Reset product selection if current selection is not available
      if (!isMultiMode) {
        if (formData.jenisProduk && !availableProduct.includes(formData.jenisProduk as ProdukType)) {
          setFormData(prev => ({ ...prev, jenisProduk: '' }));
        }
      } else {
        // Reset multi-mode selections
        setSelectedProducts(new Set());
        setProductWeights({} as Record<ProdukType, string>);
      }
    } else {
      setAvailableProducts([]);
    }
  }, [formData.jenisHewan, formData.jenisProduk, isMultiMode]);

  // Update form when selections change (single mode)
  useEffect(() => {
    if (!isMultiMode && formData.jenisHewan && formData.jenisProduk) {
      const isWeightNeeded = formData.jenisProduk === "Daging";
      setShowWeightInput(isWeightNeeded);
      
      if (isWeightNeeded && !formData.berat) {
        const defaultWeight = getDefaultWeight(
          formData.jenisHewan as AnimalType, 
          formData.jenisProduk as ProdukType
        );
        setFormData(prev => ({ 
          ...prev, 
          berat: defaultWeight?.toString() || '1'
        }));
      }
      
      const weight = formData.berat && isWeightNeeded ? 
        parseFloat(formData.berat) || null : 
        null;
        
      const name = generateProductName(
        formData.jenisHewan as AnimalType, 
        formData.jenisProduk as ProdukType, 
        weight
      );
      
      setGeneratedName(name);
      
      const estimate = getProductionEstimate(
        formData.jenisHewan as AnimalType, 
        formData.jenisProduk as ProdukType
      );
      
      setProductionEstimate(estimate);
    }
  }, [formData.jenisHewan, formData.jenisProduk, formData.berat, isMultiMode]);

  // Handle product selection in multi-mode
  const handleProductSelection = (produk: ProdukType, isChecked: boolean) => {
    const newSelected = new Set(selectedProducts);
    
    if (isChecked) {
      newSelected.add(produk);
      
      // Initialize weight if it's a meat product
      if (produk === "Daging" && !productWeights[produk]) {
        const defaultWeight = getDefaultWeight(
          formData.jenisHewan as AnimalType, 
          produk
        );
        
        setProductWeights(prev => ({
          ...prev,
          [produk]: defaultWeight?.toString() || '1'
        }));
      }
    } else {
      newSelected.delete(produk);
    }
    
    setSelectedProducts(newSelected);
  };

  // Handle weight change in multi-mode
  const handleWeightChange = (produk: ProdukType, value: string) => {
    setProductWeights(prev => ({
      ...prev,
      [produk]: value
    }));
  };

  // Select all available products
  const selectAllProducts = () => {
    if (formData.jenisHewan) {
      const allProductsSet = new Set(availableProducts);
      setSelectedProducts(allProductsSet);
      
      // Initialize weights for meat products
      const weights: Record<ProdukType, string> = { ...productWeights };
      
      availableProducts.forEach(produk => {
        if (produk === "Daging" && !weights[produk]) {
          const defaultWeight = getDefaultWeight(
            formData.jenisHewan as AnimalType, 
            produk
          );
          weights[produk] = defaultWeight?.toString() || '1';
        }
      });
      
      setProductWeights(weights);
    }
  };

  // Clear all selected products
  const clearAllProducts = () => {
    setSelectedProducts(new Set());
    setProductWeights({} as Record<ProdukType, string>);
  };

  // Toggle between single and multi mode
  const toggleMultiMode = () => {
    setIsMultiMode(!isMultiMode);
    setSelectedProducts(new Set());
    setProductWeights({} as Record<ProdukType, string>);
    setFormData(prev => ({ 
      ...prev, 
      jenisProduk: '', 
      berat: '' 
    }));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  
  if (!formData.jenisHewan) {
    toast.error("Jenis hewan wajib dipilih");
    setLoading(false);
    return;
  }
  
  try {
    if (isMultiMode) {
      // Handle multi-product submission
      if (selectedProducts.size === 0) {
        toast.error("Pilih setidaknya satu jenis produk");
        return;
      }
      
      const productData = Array.from(selectedProducts).map(produk => {
        const weight = produk === "Daging" ? 
          parseFloat(productWeights[produk] || '0') : 
          null;
        const avgProdPerHewan = getProductionEstimate(
            formData.jenisHewan as AnimalType,
            produk
          )
        // Use accumulated target for non-Daging products
        const target = produk !== "Daging" ? 
          availableJenisHewan.accumulatedTargetsByJenis.get(formData.jenisHewan)!.
          reduce((sum, target) => sum + target, 0) * avgProdPerHewan || 0 :
          Number(formData.target);
        return {
          nama: generateProductName(
            formData.jenisHewan as AnimalType,
            produk,
            weight
          ),
          JenisHewan: formData.jenisHewan,
          berat: weight,
          avgProdPerHewan,
          JenisProduk: produk.toUpperCase() as JenisProdukType,
          targetPaket: target
        };
      });

      // Create all products
      const creationPromises = productData.filter(produk => produk.JenisHewan !== '').map(produk => 
        addProdukHewan({...produk, JenisHewan: produk.JenisHewan as AnimalType})
      );
      
      const results = await Promise.all(creationPromises);
      
      // Check for any failures
      const failedResults = results.filter(result => !result.success);
      if (failedResults.length > 0) {
        toast.error(`Gagal menambahkan ${failedResults.length} produk`);
      }
      
      const successResults = results.filter(result => result.success && result.data);
      if (successResults.length > 0) {
        toast.success(`Berhasil menambahkan ${successResults.length} produk`);
        
        // Update UI with new products
        const newProducts: ProdukHewan[] = successResults.map(result => result.data!);
        
        onSuccess(newProducts);
      }
      
      onOpenChange(false);
      resetForm();
    } else {
      // Handle single product submission
      if (!formData.jenisProduk) {
        toast.error("Jenis produk wajib dipilih");
        return;
      }
      
      const weight = formData.berat && showWeightInput ? 
        Number.parseFloat(formData.berat) : 
        null;
        
      const result = await addProdukHewan({
        nama: formData.customName || generatedName,
        JenisHewan: formData.jenisHewan,
        berat: weight,
        avgProdPerHewan: productionEstimate,
        JenisProduk: formData.jenisProduk.toUpperCase() as JenisProdukType,
        targetPaket: Number(formData.target)
      });

      if (result.success && result.data) {
        toast.success("Produk hewan berhasil ditambahkan");
        
        // Update UI with new product
        const newProduct = result.data;
        
        onSuccess(newProduct);
        onOpenChange(false);
        resetForm();
      } else {
        toast.error("Gagal menambahkan produk hewan");
      }
    }
  } catch (error) {
    console.error("Error adding produk hewan:", error);
    toast.error("Terjadi kesalahan saat menambahkan produk");
  } finally {
    setLoading(false);
  }
};

  const resetForm = () => {
    setFormData({
      jenisHewan: '',
      jenisProduk: '',
      target: '',
      berat: '',
      customName: ''
    });
    setGeneratedName('');
    setProductionEstimate(1);
    // setValidationErrors({});
  };

  const handleInputChange = (field: keyof ProdukHewanForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl mx-auto p-6 my-3 bg-white rounded-lg shadow-lg max-h-[80vh] overflow-y-scroll">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800 mb-6">Buat Produk Hewan</DialogTitle>
            <DialogDescription>Tambahkan produk hewan baru ke dalam sistem</DialogDescription>
          </DialogHeader>
          {/* Mode Toggle */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <Button
                onClick={toggleMultiMode}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  !isMultiMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Single Product
              </Button>
              <Button
                onClick={toggleMultiMode}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  isMultiMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Multiple Products
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {isMultiMode 
                ? 'Select multiple products to create at once' 
                : 'Create one product at a time'
              }
            </p>
          </div>
          
          {/* Jenis Hewan Selection */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Jenis Hewan
            </Label>
            <Select 
              value={formData.jenisHewan}
              onValueChange={(value) => handleInputChange('jenisHewan', value as SelectableAnimalType)}
              // className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Jenis Hewan" />
              </SelectTrigger>
              <SelectContent>
              {Object.entries(JenisHewan).filter(
                ([_key, value]) => availableJenisHewan.uniqueJenis.has(value)).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.charAt(0) + value.slice(1).toLowerCase()}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
          </div>

          {/* Jenis Produk Selection */}
          {!isMultiMode ? (
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Jenis Produk
              </Label>
              <Select 
                value={formData.jenisProduk}
                onValueChange={(value) => handleInputChange('jenisProduk', value as SelectableProductType)}
                // className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!formData.jenisHewan}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Jenis Produk" />
                </SelectTrigger>
                <SelectContent>
                {availableProducts.map(produk => (
                  <SelectItem key={produk} value={produk}>
                    {JenisProduk[produk]}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
              {formData.jenisHewan && !BigAnimalTypes.includes(formData.jenisHewan) && (
                <p className="text-sm text-gray-500 mt-1">
                  * Hewan kecil: Kaki belakang diambil 1, sisanya dikemas sebagai Karkas
                </p>
              )}
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-3">
                <Label className="block text-sm font-medium text-gray-700">
                  Pilih Jenis Produk (Multiple)
                </Label>
                <div className="space-x-2">
                  <Button
                    onClick={selectAllProducts}
                    disabled={!formData.jenisHewan}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={clearAllProducts}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 p-4 border border-gray-300 rounded-md max-h-64 overflow-y-auto">
                {availableProducts.map(produk => (
                  <div key={produk} className="flex items-center space-x-2">
                    <Input
                      type="checkbox"
                      id={`product-${produk}`}
                      checked={selectedProducts.has(produk)}
                      onChange={(e) => handleProductSelection(produk, e.target.checked)}
                      disabled={!formData.jenisHewan}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Label 
                      htmlFor={`product-${produk}`}
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      {JenisProduk[produk]}
                    </Label>
                  </div>
                ))}
              </div>
              
              {selectedProducts.size > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  {selectedProducts.size} produk dipilih
                </p>
              )}
              
              {formData.jenisHewan && !BigAnimalTypes.includes(formData.jenisHewan) && (
                <p className="text-sm text-gray-500 mt-1">
                  * Hewan kecil: Kaki belakang diambil 1, sisanya dikemas sebagai Karkas
                </p>
              )}
            </div>
          )}

          {/* Weight Input for Daging in single mode */}
          {!isMultiMode && showWeightInput && (
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Berat (kg)
              </Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.berat || ''}
                onChange={(e) => handleInputChange('berat', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan berat dalam kg"
                required
              />
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Target Paket
              </Label>
              <Input
                type="number"
                min="0"
                value={formData.target || ''}
                onChange={(e) => handleInputChange('target', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan target paket"
                required
                readOnly={formData.jenisProduk !== "Daging"}
              />
              {formData.jenisProduk !== "Daging" && (
                <p className="text-sm text-gray-500 mt-1">
                  Target diambil dari akumulasi target jenis hewan
                </p>
              )}
            </div>
          )}

          {/* Weight Input for Daging in multi-mode */}
          {isMultiMode && selectedProducts.size > 0 && selectedProducts.has("Daging") && (
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Berat Daging (kg)
              </Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={productWeights["Daging"] || ''}
                onChange={(e) => handleWeightChange("Daging", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan berat daging dalam kg"
                required
              />
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Target Paket
              </Label>
              <Input
                type="number"
                min="0"
                value={formData.target || ''}
                onChange={(e) => handleInputChange('target', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan target paket untuk semua produk"
                required
                readOnly={!selectedProducts.has("Daging")}
              />
              {!selectedProducts.has("Daging") && (
                <p className="text-sm text-gray-500 mt-1">
                  Target diambil dari akumulasi target jenis hewan
                </p>
              )}
            </div>
          )}

          {/* Generated Name Preview (single mode) */}
          {!isMultiMode && generatedName && (
            <div className="bg-gray-50 p-4 rounded-md">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Produk (Generated)
              </Label>
              <p className="text-lg font-semibold text-blue-600">{generatedName}</p>
              <p className="text-sm text-gray-600 mt-1">
                Estimasi produksi: {productionEstimate} unit per hewan
              </p>
            </div>
          )}
          
          {/* Preview for multi-mode */}
          {isMultiMode && selectedProducts.size > 0 && formData.jenisHewan && (
            <div className="bg-gray-50 p-4 rounded-md">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Preview Produk yang akan dibuat ({selectedProducts.size} produk)
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Array.from(selectedProducts).map(produk => {
                  const weight = produk === "Daging" ? 
                    parseFloat(productWeights[produk] || '0') : 
                    null;
                    
                  const name = generateProductName(
                    formData.jenisHewan as AnimalType,
                    produk,
                    weight
                  );
                  
                  const estimate = getProductionEstimate(
                    formData.jenisHewan as AnimalType,
                    produk
                  );
                  
                  return (
                    <div key={produk} className="flex justify-between items-center py-1 px-2 bg-white rounded border">
                      <span className="font-medium text-blue-600">{name}</span>
                      <span className="text-sm text-gray-600">{estimate} unit/hewan</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Name Override (single mode) */}
          {!isMultiMode && (
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Name (Optional)
              </Label>
              <Input
                type="text"
                value={formData.customName || ''}
                onChange={(e) => handleInputChange('customName', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Override nama produk jika diperlukan"
              />
            </div>
          )}

          {/* Production Logic Info */}
          {formData.jenisHewan && (
            (!isMultiMode && formData.jenisProduk) || 
            (isMultiMode && selectedProducts.size > 0)
          ) && (
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-800 mb-2">Production Logic:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Jenis Hewan: {BigAnimalTypes.includes(formData.jenisHewan) ? 'Hewan Besar' : 'Hewan Kecil'}</li>
                {!isMultiMode && (
                  <>
                    <li>• Produksi per Hewan: {productionEstimate} unit</li>
                    {!BigAnimalTypes.includes(formData.jenisHewan) && formData.jenisProduk === "Kaki" && (
                      <li>• Hewan kecil: Hanya 1 kaki belakang yang diambil, sisanya menjadi Karkas</li>
                    )}
                  </>
                )}
                {isMultiMode && (
                  <li>• Total Produk: {selectedProducts.size} jenis produk berbeda</li>
                )}
                {!BigAnimalTypes.includes(formData.jenisHewan) && (
                  <li>• Hewan kecil: Produksi terbatas, bagian lain menjadi Karkas</li>
                )}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Batal
            </Button>
            {/* Submit Button */}
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.jenisHewan || 
                (!isMultiMode && !formData.jenisProduk) || 
                (isMultiMode && selectedProducts.size === 0)
              }
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Menyimpan..." : isMultiMode ? `Buat ${selectedProducts.size} Produk` : 'Buat Produk'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}