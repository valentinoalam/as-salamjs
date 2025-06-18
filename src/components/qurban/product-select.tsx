/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Enums and types based on your schema
const JenisHewan = {
  UNTA: 'UNTA',
  SAPI: 'SAPI',
  DOMBA: 'DOMBA',
  KAMBING: 'KAMBING'
} as const;

const JenisProduk = [
  "Daging",
  "Kaki belakang",
  "Karkas",
  "Jeroan",
  "Kulit",
  "Tulang",
  "Kepala",
  "Lemak",
  "Buntut",
  "Torpedo"
] as const;

// Mock data for TipeHewan and ProdukHewan
const mockTipeHewan = [
  {
    id: 1,
    nama: "Sapi Lokal",
    jenis: JenisHewan.SAPI,
    harga: 15000000,
    icon: "🐄"
  },
  {
    id: 2,
    nama: "Domba Garut",
    jenis: JenisHewan.DOMBA,
    harga: 3000000,
    icon: "🐑"
  },
  {
    id: 3,
    nama: "Kambing Etawa",
    jenis: JenisHewan.KAMBING,
    harga: 2500000,
    icon: "🐐"
  },
  {
    id: 4,
    nama: "Unta Arabia",
    jenis: JenisHewan.UNTA,
    harga: 25000000,
    icon: "🐪"
  }
];

const mockProdukHewan = [
  // Sapi products
  { id: 1, nama: "Daging Sapi Premium 10kg", tipeId: 1, JenisProduk: "Daging", berat: 10 },
  { id: 2, nama: "Kaki Belakang Sapi 3kg", tipeId: 1, JenisProduk: "Kaki belakang", berat: 3 },
  { id: 3, nama: "Karkas Sapi 25kg", tipeId: 1, JenisProduk: "Karkas", berat: 25 },
  { id: 4, nama: "Jeroan Sapi 2kg", tipeId: 1, JenisProduk: "Jeroan", berat: 2 },
  
  // Domba products
  { id: 5, nama: "Daging Domba 5kg", tipeId: 2, JenisProduk: "Daging", berat: 5 },
  { id: 6, nama: "Karkas Domba 12kg", tipeId: 2, JenisProduk: "Karkas", berat: 12 },
  { id: 7, nama: "Kulit Domba", tipeId: 2, JenisProduk: "Kulit", berat: 1 },
  
  // Kambing products
  { id: 8, nama: "Daging Kambing 4kg", tipeId: 3, JenisProduk: "Daging", berat: 4 },
  { id: 9, nama: "Kepala Kambing", tipeId: 3, JenisProduk: "Kepala", berat: 2 },
  { id: 10, nama: "Buntut Kambing", tipeId: 3, JenisProduk: "Buntut", berat: 0.5 },
  
  // Unta products
  { id: 11, nama: "Daging Unta Premium 50kg", tipeId: 4, JenisProduk: "Daging", berat: 50 },
  { id: 12, nama: "Karkas Unta 100kg", tipeId: 4, JenisProduk: "Karkas", berat: 100 },
  { id: 13, nama: "Lemak Unta 5kg", tipeId: 4, JenisProduk: "Lemak", berat: 5 }
];

// Zod schema for validation
const productSelectionSchema = z.object({
  selectedProducts: z.array(
    z.object({
      nama: z.string().min(1, "Product name is required"),
      jumlah: z.number().min(1, "Quantity must be at least 1").max(100, "Quantity cannot exceed 100")
    })
  ).min(1, "Please select at least one product")
});

type ProductSelectionForm = z.infer<typeof productSelectionSchema>;

const QurbanProductForm = () => {
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: number}>({});
  const [activeTab, setActiveTab] = useState<number>(1);

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ProductSelectionForm>({
    resolver: zodResolver(productSelectionSchema),
    defaultValues: {
      selectedProducts: []
    }
  });

  // Group products by TipeHewan
  const groupedProducts = mockTipeHewan.reduce((acc, tipe) => {
    acc[tipe.id] = {
      tipe,
      products: mockProdukHewan.filter(p => p.tipeId === tipe.id)
    };
    return acc;
  }, {} as Record<number, { tipe: typeof mockTipeHewan[0], products: typeof mockProdukHewan }>);

  const handleQuantityChange = (productName: string, quantity: number) => {
    const newSelected = { ...selectedProducts };
    
    if (quantity > 0) {
      newSelected[productName] = quantity;
    } else {
      delete newSelected[productName];
    }
    
    setSelectedProducts(newSelected);
    
    // Update form value
    const selectedArray = Object.entries(newSelected).map(([nama, jumlah]) => ({
      nama,
      jumlah
    }));
    setValue('selectedProducts', selectedArray);
  };

  const onSubmit = (data: ProductSelectionForm) => {
    console.log('Form submitted:', data);
    alert(`Selected ${data.selectedProducts.length} products:\n${data.selectedProducts.map(p => `${p.nama}: ${p.jumlah}x`).join('\n')}`);
  };

  const getProductsByJenis = (products: typeof mockProdukHewan, jenis: string) => {
    return products.filter(p => p.JenisProduk === jenis);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8 text-green-800">
        Form Pemilihan Produk Qurban
      </h1>

      <div className="space-y-6">
        {/* Tabs for TipeHewan */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {mockTipeHewan.map((tipe) => (
              <button
                key={tipe.id}
                type="button"
                onClick={() => setActiveTab(tipe.id)}
                className={`py-2 px-4 border-b-2 font-medium text-sm rounded-t-lg ${
                  activeTab === tipe.id
                    ? 'border-green-500 text-green-600 bg-green-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl mr-2">{tipe.icon}</span>
                {tipe.nama}
              </button>
            ))}
          </nav>
        </div>

        {/* Products for active tab */}
        <div className="min-h-96">
          {groupedProducts[activeTab] && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {groupedProducts[activeTab].tipe.nama}
                </h3>
                <p className="text-gray-600">
                  Harga: Rp {groupedProducts[activeTab].tipe.harga.toLocaleString('id-ID')}
                </p>
              </div>

              {/* Group products by JenisProduk */}
              {JenisProduk.map((jenis) => {
                const productsInCategory = getProductsByJenis(groupedProducts[activeTab].products, jenis);
                
                if (productsInCategory.length === 0) return null;

                return (
                  <div key={jenis} className="space-y-3">
                    <h4 className="text-lg font-medium text-gray-700 border-b pb-2">
                      {jenis}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {productsInCategory.map((product) => (
                        <div
                          key={product.id}
                          className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 mb-1">
                                {product.nama}
                              </h5>
                              <p className="text-sm text-gray-600">
                                Berat: {product.berat}kg
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <label className="text-sm font-medium text-gray-700">
                              Jumlah:
                            </label>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(
                                  product.nama, 
                                  Math.max(0, (selectedProducts[product.nama] || 0) - 1)
                                )}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={selectedProducts[product.nama] || 0}
                                onChange={(e) => handleQuantityChange(
                                  product.nama, 
                                  parseInt(e.target.value) || 0
                                )}
                                className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(
                                  product.nama, 
                                  (selectedProducts[product.nama] || 0) + 1
                                )}
                                className="w-8 h-8 rounded-full bg-green-200 hover:bg-green-300 flex items-center justify-center text-green-600"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Products Summary */}
        {Object.keys(selectedProducts).length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">
              Produk Terpilih ({Object.keys(selectedProducts).length})
            </h3>
            <div className="space-y-2">
              {Object.entries(selectedProducts).map(([nama, jumlah]) => (
                <div key={nama} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{nama}</span>
                  <span className="font-medium text-blue-600">{jumlah}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {errors.selectedProducts && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm font-medium">
              {errors.selectedProducts.message}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-center pt-6">
          <button
            onClick={handleSubmit(onSubmit)}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={Object.keys(selectedProducts).length === 0}
          >
            Submit Pilihan Produk
          </button>
        </div>
      </div>
    </div>
  );
};

export default QurbanProductForm;