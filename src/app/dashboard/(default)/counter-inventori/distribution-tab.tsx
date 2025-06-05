/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Minus, User, Users, Search, ShoppingCart, CheckCircle, History } from 'lucide-react';
import { useQurban } from '@/contexts/qurban-context';
import type { Penerima, ProdukDiterima, ProdukHewan } from '@/types/qurban';
import { JenisDistribusi } from '@prisma/client';

const DistributionContentTab = () => {
  const {
    penerimaQuery,
    distribusiQuery,
    createDistribusi,
    createPenerima,
    getPenerimaByJenis,
    getAvailableProducts,
    updateLogDistribusi,
  } = useQurban()
  const { data:existingRecipients, isLoading, isError} = penerimaQuery
  const availableProducts = getAvailableProducts();
  console.log(penerimaQuery.data)
  const transactionHistory = useMemo(() => {
    return penerimaQuery.data
      ?.filter(p => p.logDistribusi !== null)
      .map(p => ({
        id: p.id,
        penerima: p.nama,
        jenis: p.jenis,
        produk: p.logDistribusi?.listProduk.map(lp => ({
          nama: lp.jenisProduk.nama,
          jumlah: lp.jumlahPaket
        })),
        waktu: new Date(p.logDistribusi?.dibuatPada || "").toLocaleString("id-ID"),
        status: p.logDistribusi?.sudahMenerima ? "Selesai" : "Belum"
      }))
  }, [penerimaQuery.data])

  // const [transactionHistory, setTransactionHistory] = useState([
  //   {
  //     id: '1',
  //     penerima: 'Masjid Al-Ikhlas',
  //     jenis: 'KELOMPOK',
  //     produk: [{ nama: 'Daging Sapi Premium', jumlah: 5 }],
  //     waktu: '2024-06-05 10:30',
  //     status: 'Selesai'
  //   }
  // ]);

  // States
  const [selectedRecipient, setSelectedRecipient] = useState<Penerima | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<ProdukDiterima[]>([]);
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [selectedProductForQuantity, setSelectedProductForQuantity] = useState<ProdukHewan | null>(null);
  const [quantityInput, setQuantityInput] = useState(1);
  const [activeTab, setActiveTab] = useState('distribution');

  // New recipient form data
  const [newRecipientData, setNewRecipientData] = useState<Omit<Penerima, 'id' | 'distribusiId' | 'logDistribusi' | 'dibuatPada' | 'distribusi'>>({
    nama: '',
    jenis: JenisDistribusi.INDIVIDU,
    alamat: '',
    telepon: '',
    noIdentitas: '',
    keterangan: ''
  });

  // Filter recipients based on search
  const filteredRecipients = existingRecipients.filter(recipient =>
    recipient.nama!.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipient.noKupon!.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectRecipient = (recipient: Penerima) => {
    setSelectedRecipient(recipient);
    setIsCreatingNew(false);
  };

  const handleCreateNewRecipient = () => {
    setIsCreatingNew(true);
    setSelectedRecipient(null);
  };

  const handleProductClick = (product: ProdukHewan) => {
    setSelectedProductForQuantity(product);
    setQuantityInput(1);
    setIsQuantityDialogOpen(true);
  };

  const handleAddProductToCart = () => {
    if (selectedProductForQuantity && quantityInput > 0) {
      const existingIndex = selectedProducts.findIndex(p => p.jenisProdukId === selectedProductForQuantity.id);
      
      if (existingIndex >= 0) {
        const updated = [...selectedProducts];
        updated[existingIndex].jumlahPaket += quantityInput;
        setSelectedProducts(updated);
      } else {
        setSelectedProducts([...selectedProducts, {
          ...selectedProductForQuantity,
          jumlahPaket: quantityInput,
          logDistribusiId: '',
          jenisProdukId: 0,
          jenisProduk: {
            id: 0,
            nama: '',
            tipeId: null,
            berat: null,
            avgProdPerHewan: 0,
            kumulatif: 0,
            targetPaket: 0,
            diTimbang: 0,
            diInventori: 0,
            sdhDiserahkan: 0,
            JenisProduk: 'KEPALA',
            tipe_hewan: undefined
          }
        }]);
      }
      
      setIsQuantityDialogOpen(false);
      setSelectedProductForQuantity(null);
      setQuantityInput(1);
    }
  };

  const updateProductQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeProductFromCart(index);
      return;
    }
    
    const updated = [...selectedProducts];
    updated[index].jumlahPaket = newQuantity;
    setSelectedProducts(updated);
  };

  const removeProductFromCart = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const handleCompleteTransaction = () => {
    if (!selectedRecipient && !isCreatingNew) {
      alert('Pilih penerima terlebih dahulu');
      return;
    }
    
    if (selectedProducts.length === 0) {
      alert('Pilih produk yang akan didistribusikan');
      return;
    }
    const produkDistribusi = selectedProducts.map(p => ({
      produkId: p.jenisProdukId,
      jumlah: p.jumlahPaket,
    }));

    const recipient = isCreatingNew ? 
      { nama: newRecipientData.nama, jenis: newRecipientData.jenis } : 
      selectedRecipient;

    const newTransaction = {
      id: Date.now().toString(),
      penerima: recipient!.nama,
      jenis: recipient!.jenis,
      produk: selectedProducts.map(p => ({ nama: p.jenisProduk.nama, jumlah: p.jumlahPaket })),
      waktu: new Date().toLocaleString('id-ID'),
      status: 'Selesai'
    };
    try {
      if (isCreatingNew) {
        createPenerima({
          distribusiId: distribusiQuery.data?.[0]?.id || "",
          nama: newRecipientData.nama || '',
          alamat: newRecipientData.alamat || '',
          telepon: newRecipientData.telepon || '',
          noIdentitas: newRecipientData.noIdentitas || '',
          keterangan: newRecipientData.keterangan || '',
          jenis: newRecipientData.jenis,
          produkDistribusi,
        });
      } else if(selectedRecipient) {
        updateLogDistribusi(selectedRecipient.id, produkDistribusi);
      }

      alert("Transaksi distribusi berhasil dicatat!");

      // Reset UI states
      setSelectedRecipient(null);
      setIsCreatingNew(false);
      setSelectedProducts([]);
      setNewRecipientData({
        nama: '',
        jenis: 'INDIVIDU',
        alamat: '',
        telepon: '',
        noIdentitas: '',
        keterangan: '',
      });

      // No need to manually update transactionHistory.
      // React Query will auto-update it from qurban.penerimaQuery.
    } catch (err) {
      alert("Gagal mencatat transaksi");
      console.error(err);
    }
    // Reset form
    setSelectedRecipient(null);
    setIsCreatingNew(false);
    setSelectedProducts([]);
    setNewRecipientData({
      nama: '',
      jenis: 'INDIVIDU',
      alamat: '',
      telepon: '',
      noIdentitas: '',
      keterangan: ''
    });

    alert('Transaksi distribusi berhasil dicatat!');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="distribution" className="flex items-center gap-2">
            <ShoppingCart size={16} />
            Distribusi Qurban
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History size={16} />
            Riwayat Transaksi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="space-y-6">
          {/* Recipient Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={20} />
                Pilih Penerima
              </CardTitle>
              <CardDescription>
                Pilih penerima dari daftar yang ada atau buat data penerima baru
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari penerima berdasarkan nama atau nomor kupon..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleCreateNewRecipient}
                    className="flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Buat Baru
                  </Button>
                </div>

                {/* Existing Recipients */}
                {!isCreatingNew && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {filteredRecipients.map(recipient => (
                      <div
                        key={recipient.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          selectedRecipient?.id === recipient.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleSelectRecipient(recipient)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{recipient.nama}</h4>
                            <p className="text-sm text-gray-600">{recipient.alamat}</p>
                            <p className="text-sm text-gray-500">Kupon: {recipient.noKupon}</p>
                          </div>
                          <Badge variant={recipient.jenis === 'KELOMPOK' ? 'default' : 'secondary'}>
                            {recipient.jenis === 'KELOMPOK' ? (
                              <Users size={12} className="mr-1" />
                            ) : (
                              <User size={12} className="mr-1" />
                            )}
                            {recipient.jenis}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* New Recipient Form */}
                {isCreatingNew && (
                  <Card className="border-dashed">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="nama">Nama</Label>
                          <Input
                            id="nama"
                            value={newRecipientData.nama || ''}
                            onChange={(e) => setNewRecipientData(prev => ({
                              ...prev,
                              nama: e.target.value
                            }))}
                            placeholder="Nama penerima"
                          />
                        </div>
                        <div>
                          <Label htmlFor="jenis">Jenis Penerima</Label>
                          <Select
                            value={newRecipientData.jenis}
                            onValueChange={(value) => setNewRecipientData(prev => ({
                              ...prev,
                              jenis: value as JenisDistribusi
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={JenisDistribusi.INDIVIDU}>Individu</SelectItem>
                              <SelectItem value={JenisDistribusi.KELOMPOK}>Kelompok/Organisasi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="alamat">Alamat</Label>
                          <Input
                            id="alamat"
                            value={newRecipientData.alamat || ''}
                            onChange={(e) => setNewRecipientData(prev => ({
                              ...prev,
                              alamat: e.target.value
                            }))}
                            placeholder="Alamat lengkap"
                          />
                        </div>
                        <div>
                          <Label htmlFor="telepon">Telepon</Label>
                          <Input
                            id="telepon"
                            value={newRecipientData.telepon || ''}
                            onChange={(e) => setNewRecipientData(prev => ({
                              ...prev,
                              telepon: e.target.value
                            }))}
                            placeholder="Nomor telepon"
                          />
                        </div>
                        <div>
                          <Label htmlFor="noIdentitas">No. Identitas</Label>
                          <Input
                            id="noIdentitas"
                            value={newRecipientData.noIdentitas || ''}
                            onChange={(e) => setNewRecipientData(prev => ({
                              ...prev,
                              noIdentitas: e.target.value
                            }))}
                            placeholder="KTP/NIK"
                          />
                        </div>
                        <div>
                          <Label htmlFor="keterangan">Keterangan</Label>
                          <Textarea
                            id="keterangan"
                            value={newRecipientData.keterangan || ''}
                            onChange={(e) => setNewRecipientData(prev => ({
                              ...prev,
                              keterangan: e.target.value
                            }))}
                            placeholder="Catatan tambahan"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product Selection */}
          {(selectedRecipient || isCreatingNew) && (
            <Card>
              <CardHeader>
                <CardTitle>Pilih Produk</CardTitle>
                <CardDescription>
                  Klik produk untuk menambahkan ke daftar distribusi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {availableProducts.map(product => (
                    <div
                      key={product.id}
                      className="border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300"
                      onClick={() => handleProductClick(product)}
                    >
                      <h3 className="font-semibold text-lg mb-2">{product.nama}</h3>
                      <p className="text-sm text-gray-600">Stok: {product.diInventori}</p>
                    </div>
                  ))}
                </div>

                {/* Selected Products Cart */}
                {selectedProducts.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h4 className="font-medium">Produk yang Akan Didistribusikan</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Produk
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                              Jumlah
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedProducts.map((item, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.jenisProduk.nama}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => updateProductQuantity(index, item.jumlahPaket - 1)}
                                  >
                                    <Minus size={16} />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.jumlahPaket}
                                    onChange={(e) => 
                                      updateProductQuantity(index, parseInt(e.target.value) || 1)
                                    }
                                    className="text-center w-16"
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => updateProductQuantity(index, item.jumlahPaket + 1)}
                                  >
                                    <Plus size={16} />
                                  </Button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removeProductFromCart(index)}
                                >
                                  <Minus size={16} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Complete Transaction Button */}
                {selectedProducts.length > 0 && (
                  <div className="flex justify-end mt-4">
                    <Button 
                      onClick={handleCompleteTransaction}
                      className="flex items-center gap-2"
                      size="lg"
                    >
                      <CheckCircle size={16} />
                      Selesaikan Transaksi
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Transaksi Distribusi</CardTitle>
              <CardDescription>
                Daftar semua transaksi distribusi qurban yang telah dilakukan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactionHistory.map(transaction => (
                  <div key={transaction.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{transaction.penerima}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={transaction.jenis === 'KELOMPOK' ? 'default' : 'secondary'}>
                            {transaction.jenis === 'KELOMPOK' ? (
                              <Users size={12} className="mr-1" />
                            ) : (
                              <User size={12} className="mr-1" />
                            )}
                            {transaction.jenis}
                          </Badge>
                          <Badge variant="outline" className="text-green-600">
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">{transaction.waktu}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Produk:</strong> {transaction?.produk!.map(p => `${p.nama} (${p.jumlah})`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quantity Dialog */}
      <Dialog open={isQuantityDialogOpen} onOpenChange={setIsQuantityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tentukan Jumlah</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Berapa jumlah <strong>{selectedProductForQuantity?.nama}</strong> yang akan didistribusikan?</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setQuantityInput(Math.max(1, quantityInput - 1))}
              >
                <Minus size={16} />
              </Button>
              <Input
                type="number"
                min="1"
                value={quantityInput}
                onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
                className="text-center w-20"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddProductToCart();
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => setQuantityInput(quantityInput + 1)}
              >
                <Plus size={16} />
              </Button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsQuantityDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleAddProductToCart}>
                Tambahkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DistributionContentTab;