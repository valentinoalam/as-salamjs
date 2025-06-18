/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useRef, useEffect } from 'react';
import { Search, QrCode, Check, X, Camera, Filter } from 'lucide-react';

const PengembalianKuponTab = () => {
  // Sample data kupon dengan status DISALURKAN
  const [kuponList, setKuponList] = useState([
    { id: 1001, status: 'DISALURKAN', penerima: 'Ahmad Santoso', tanggalSalur: '2024-05-15', mudhohi: 'Yayasan ABC' },
    { id: 1002, status: 'DISALURKAN', penerima: 'Siti Rahma', tanggalSalur: '2024-05-16', mudhohi: 'Yayasan ABC' },
    { id: 1003, status: 'DISALURKAN', penerima: 'Budi Hermawan', tanggalSalur: '2024-05-17', mudhohi: 'Masjid Al-Ikhlas' },
    { id: 1004, status: 'DISALURKAN', penerima: 'Maria Dewi', tanggalSalur: '2024-05-18', mudhohi: 'Yayasan XYZ' },
    { id: 1005, status: 'DISALURKAN', penerima: 'Joko Widodo', tanggalSalur: '2024-05-19', mudhohi: 'Masjid Al-Ikhlas' },
  ]);

  const [selectedKupon, setSelectedKupon] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPenerima, setFilterPenerima] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const videoRef = useRef(null);

  // Filter kupon berdasarkan pencarian
  const filteredKupon = kuponList.filter(kupon => 
    kupon.status === 'DISALURKAN' &&
    (kupon.id.toString().includes(searchTerm) || 
     kupon.penerima.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterPenerima === '' || kupon.penerima.toLowerCase().includes(filterPenerima.toLowerCase()))
  );

  // Handle checkbox selection
  const handleKuponSelect = (kuponId: number) => {
    const newSelected = new Set(selectedKupon);
    if (newSelected.has(kuponId)) {
      newSelected.delete(kuponId);
    } else {
      newSelected.add(kuponId);
    }
    setSelectedKupon(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedKupon.size === filteredKupon.length) {
      setSelectedKupon(new Set());
    } else {
      setSelectedKupon(new Set(filteredKupon.map(k => k.id)));
    }
  };

  // Handle pengembalian kupon
  const handlePengembalian = () => {
    if (selectedKupon.size === 0) {
      alert('Pilih minimal satu kupon untuk dikembalikan');
      return;
    }

    const updatedKupon = kuponList.map(kupon => {
      if (selectedKupon.has(kupon.id)) {
        return { ...kupon, status: 'DIKEMBALIKAN', tanggalKembali: new Date().toISOString().split('T')[0] };
      }
      return kupon;
    });

    setKuponList(updatedKupon);
    setSelectedKupon(new Set());
    alert(`${selectedKupon.size} kupon berhasil dikembalikan`);
  };

  // Simulate QR Scanner
  const startQRScanner = () => {
    setShowQRScanner(true);
    // Simulate camera access (dalam implementasi nyata, gunakan library seperti react-qr-scanner)
    setTimeout(() => {
      const randomKuponId = filteredKupon[Math.floor(Math.random() * filteredKupon.length)]?.id;
      if (randomKuponId) {
        setScanResult(randomKuponId.toString());
        handleKuponSelect(randomKuponId);
        setShowQRScanner(false);
        alert(`QR Code terdeteksi! Kupon ID: ${randomKuponId}`);
      }
    }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <h1 className="text-2xl font-bold">Pengembalian Kupon</h1>
          <p className="text-blue-100 mt-2">Kelola pengembalian kupon yang telah disalurkan</p>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari berdasarkan ID atau nama penerima..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Filter penerima..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filterPenerima}
                onChange={(e) => setFilterPenerima(e.target.value)}
              />
            </div>

            {/* QR Scanner Button */}
            <button
              onClick={startQRScanner}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              disabled={showQRScanner}
            >
              <QrCode className="w-5 h-5" />
              {showQRScanner ? 'Scanning...' : 'Scan QR'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {selectedKupon.size === filteredKupon.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
            </button>
            
            <button
              onClick={handlePengembalian}
              className={`px-6 py-2 rounded-lg transition-colors ${
                selectedKupon.size > 0 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={selectedKupon.size === 0}
            >
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                Kembalikan ({selectedKupon.size})
              </div>
            </button>
          </div>
        </div>

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Scanning QR Code...</h3>
                <p className="text-gray-600 mb-4">Arahkan kamera ke QR code pada kupon</p>
                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="animate-pulse text-gray-500">
                    <Camera className="w-12 h-12" />
                  </div>
                </div>
                <button
                  onClick={() => setShowQRScanner(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedKupon.size === filteredKupon.length && filteredKupon.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Kupon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Penerima
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mudhohi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal Salur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredKupon.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada kupon yang tersedia untuk pengembalian
                  </td>
                </tr>
              ) : (
                filteredKupon.map((kupon) => (
                  <tr 
                    key={kupon.id} 
                    className={`hover:bg-gray-50 ${selectedKupon.has(kupon.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedKupon.has(kupon.id)}
                        onChange={() => handleKuponSelect(kupon.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {kupon.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {kupon.penerima}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {kupon.mudhohi}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {kupon.tanggalSalur}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                        {kupon.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              Menampilkan {filteredKupon.length} kupon dari total {kuponList.filter(k => k.status === 'DISALURKAN').length} kupon yang disalurkan
            </div>
            <div className="text-sm text-gray-600">
              {selectedKupon.size} kupon dipilih untuk dikembalikan
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PengembalianKuponTab;