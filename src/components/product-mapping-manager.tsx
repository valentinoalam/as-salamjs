/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProductSpriteIcon } from "./product-sprite-img"
import { createProductMappingTree, type ProductMapping, type MappingResult } from "@/lib/product-mapping"
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Download, Eye, EyeOff } from "lucide-react"

interface ProductMappingManagerProps {
  products: Array<{
    id: number
    nama: string
    jenisProduk?: string | null
    tipe_hewan?: { jenis?: string } | null
  }>
  onUpdateMapping?: (updates: Array<{ productId: string; illustrationId: string | null }>) => void
  isReadOnly?: boolean
}

type ConfidenceLevel = "all" | "high" | "medium" | "low"

export function ProductMappingManager({ 
  products, 
  onUpdateMapping, 
  isReadOnly = false 
}: ProductMappingManagerProps) {
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null)
  const [selectedMapping, setSelectedMapping] = useState<ProductMapping | null>(null)
  const [filterConfidence, setFilterConfidence] = useState<ConfidenceLevel>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMappings, setSelectedMappings] = useState<Set<string>>(new Set())
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false)

  // Memoized processing function to prevent unnecessary re-renders
  const processMapping = useCallback(async () => {
    if (products.length === 0) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      const result = createProductMappingTree(products)
      setMappingResult(result)
    } catch (error) {
      console.error("Error processing mapping:", error)
      setError(error instanceof Error ? error.message : "Terjadi kesalahan saat memproses pemetaan")
    } finally {
      setIsProcessing(false)
    }
  }, [products])

  useEffect(() => {
    processMapping()
  }, [processMapping])

  // Memoized confidence badge function
  const getConfidenceBadge = useCallback((confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge className="bg-green-100 text-green-800 border-green-300">Tinggi ({Math.round(confidence * 100)}%)</Badge>
    } else if (confidence >= 0.5) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Sedang ({Math.round(confidence * 100)}%)</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800 border-red-300">Rendah ({Math.round(confidence * 100)}%)</Badge>
    }
  }, [])

  // Memoized status icon function
  const getStatusIcon = useCallback((mapping: ProductMapping) => {
    if (mapping.matchedIllustration && mapping.confidence >= 0.8) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else if (mapping.matchedIllustration && mapping.confidence >= 0.5) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
  }, [])

  // Memoized filtered mappings
  const filteredMappings = useMemo(() => {
    if (!mappingResult) return []
    
    return mappingResult.mappings.filter((mapping) => {
      const matchesSearch = mapping.productName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesConfidence =
        filterConfidence === "all" ||
        (filterConfidence === "high" && mapping.confidence >= 0.8) ||
        (filterConfidence === "medium" && mapping.confidence >= 0.5 && mapping.confidence < 0.8) ||
        (filterConfidence === "low" && mapping.confidence < 0.5)
      
      const matchesUnmappedFilter = !showUnmappedOnly || !mapping.matchedIllustration

      return matchesSearch && matchesConfidence && matchesUnmappedFilter
    })
  }, [mappingResult, searchTerm, filterConfidence, showUnmappedOnly])

  // Handle bulk selection
  const handleSelectAll = useCallback((checked: boolean | "indeterminate") => {
    if (checked === true) {
      const eligibleMappings = filteredMappings
        .filter(m => m.matchedIllustration && m.confidence >= 0.5)
        .map(m => m.productId)
      setSelectedMappings(new Set(eligibleMappings))
    } else {
      setSelectedMappings(new Set())
    }
  }, [filteredMappings])

  const handleSelectMapping = useCallback((productId: string, checked: boolean | "indeterminate") => {
    setSelectedMappings(prev => {
      const newSet = new Set(prev)
      if (checked === true) {
        newSet.add(productId)
      } else {
        newSet.delete(productId)
      }
      return newSet
    })
  }, [])

  const handleApplyMappings = useCallback(() => {
    if (!mappingResult || !onUpdateMapping) return

    const updates = mappingResult.mappings
      .filter((m) => selectedMappings.has(m.productId) && m.matchedIllustration)
      .map((m) => ({
        productId: m.productId,
        illustrationId: m.matchedIllustration!.id,
      }))

    onUpdateMapping(updates)
    setSelectedMappings(new Set()) // Clear selection after applying
  }, [mappingResult, onUpdateMapping, selectedMappings])

  const handleExportResults = useCallback(() => {
    if (!mappingResult) return

    const exportData = mappingResult.mappings.map(mapping => ({
      productId: mapping.productId,
      productName: mapping.productName,
      detectedAnimalType: mapping.detectedAnimalType || '',
      detectedCategory: mapping.detectedCategory || '',
      matchedIllustration: mapping.matchedIllustration?.name || '',
      confidence: Math.round(mapping.confidence * 100),
      status: mapping.matchedIllustration ? 'Mapped' : 'Unmapped'
    }))

    const csv = [
      ['Product ID', 'Product Name', 'Animal Type', 'Category', 'Illustration', 'Confidence (%)', 'Status'].join(','),
      ...exportData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `product-mapping-results-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [mappingResult])

  // Loading state
  if (isProcessing) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-lg font-medium">Memproses pemetaan produk...</p>
            <p className="text-sm text-muted-foreground mt-2">Mohon tunggu sebentar</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button onClick={processMapping} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    )
  }

  // No data state
  if (!mappingResult) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-yellow-500" />
            <p className="text-lg font-medium">Tidak ada data untuk diproses</p>
            <p className="text-sm text-muted-foreground mt-2">Pastikan produk telah dimuat dengan benar</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const eligibleMappingsCount = filteredMappings.filter(m => m.matchedIllustration && m.confidence >= 0.5).length
  const allEligibleSelected = eligibleMappingsCount > 0 && selectedMappings.size === eligibleMappingsCount

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{mappingResult.statistics.totalProducts}</div>
            <p className="text-sm text-muted-foreground">Total Produk</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{mappingResult.statistics.mappedProducts}</div>
            <p className="text-sm text-muted-foreground">Berhasil Dipetakan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{mappingResult.statistics.unmappedProducts}</div>
            <p className="text-sm text-muted-foreground">Belum Dipetakan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {mappingResult.statistics.totalProducts > 0 
                ? Math.round((mappingResult.statistics.mappedProducts / mappingResult.statistics.totalProducts) * 100)
                : 0}%
            </div>
            <p className="text-sm text-muted-foreground">Tingkat Keberhasilan</p>
          </CardContent>
        </Card>
      </div>

      {/* Confidence Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribusi Tingkat Kepercayaan</CardTitle>
          <CardDescription>Sebaran tingkat kepercayaan hasil pemetaan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tinggi (≥80%)</span>
              <div className="flex items-center space-x-2">
                <Progress
                  value={
                    mappingResult.statistics.totalProducts > 0
                      ? (mappingResult.statistics.confidenceDistribution.high / mappingResult.statistics.totalProducts) * 100
                      : 0
                  }
                  className="w-32"
                />
                <span className="text-sm font-medium w-8 text-right">
                  {mappingResult.statistics.confidenceDistribution.high}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sedang (50-79%)</span>
              <div className="flex items-center space-x-2">
                <Progress
                  value={
                    mappingResult.statistics.totalProducts > 0
                      ? (mappingResult.statistics.confidenceDistribution.medium / mappingResult.statistics.totalProducts) * 100
                      : 0
                  }
                  className="w-32"
                />
                <span className="text-sm font-medium w-8 text-right">
                  {mappingResult.statistics.confidenceDistribution.medium}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rendah (&lt;50%)</span>
              <div className="flex items-center space-x-2">
                <Progress
                  value={
                    mappingResult.statistics.totalProducts > 0
                      ? (mappingResult.statistics.confidenceDistribution.low / mappingResult.statistics.totalProducts) * 100
                      : 0
                  }
                  className="w-32"
                />
                <span className="text-sm font-medium w-8 text-right">
                  {mappingResult.statistics.confidenceDistribution.low}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mapping Results */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Hasil Pemetaan Produk</CardTitle>
              <CardDescription>Pemetaan otomatis produk hewan dengan ilustrasi</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportResults}
                disabled={!mappingResult}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              {!isReadOnly && (
                <Button 
                  onClick={handleApplyMappings} 
                  disabled={!onUpdateMapping || selectedMappings.size === 0}
                >
                  Terapkan Pemetaan ({selectedMappings.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterConfidence} onValueChange={(value: ConfidenceLevel) => setFilterConfidence(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter kepercayaan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="high">Tinggi (≥80%)</SelectItem>
                <SelectItem value="medium">Sedang (50-79%)</SelectItem>
                <SelectItem value="low">Rendah (&lt;50%)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="unmapped-only"
                checked={showUnmappedOnly}
                onCheckedChange={(checked) => setShowUnmappedOnly(checked === true)}
              />
              <label htmlFor="unmapped-only" className="text-sm font-medium">
                {showUnmappedOnly ? <EyeOff className="h-4 w-4 inline mr-1" /> : <Eye className="h-4 w-4 inline mr-1" />}
                Hanya yang belum dipetakan
              </label>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Menampilkan {filteredMappings.length} dari {mappingResult.mappings.length} produk
              {selectedMappings.size > 0 && ` • ${selectedMappings.size} dipilih`}
            </p>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {!isReadOnly && (
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={allEligibleSelected}
                        onCheckedChange={handleSelectAll}
                        disabled={eligibleMappingsCount === 0}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-12">Status</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Jenis Hewan</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Ilustrasi</TableHead>
                  <TableHead>Kepercayaan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isReadOnly ? 6 : 7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>Tidak ada produk yang cocok dengan filter</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMappings.map((mapping) => (
                    <TableRow key={mapping.productId}>
                      {!isReadOnly && (
                        <TableCell>
                          <Checkbox 
                            checked={selectedMappings.has(mapping.productId)}
                            onCheckedChange={(checked) => handleSelectMapping(mapping.productId, checked)}
                            disabled={!mapping.matchedIllustration || mapping.confidence < 0.5}
                          />
                        </TableCell>
                      )}
                      <TableCell>{getStatusIcon(mapping)}</TableCell>
                      <TableCell className="font-medium">{mapping.productName}</TableCell>
                      <TableCell>
                        {mapping.detectedAnimalType ? (
                          <Badge variant="outline">{mapping.detectedAnimalType}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {mapping.detectedCategory ? (
                          <Badge variant="outline">{mapping.detectedCategory}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {mapping.matchedIllustration ? (
                          <div className="flex items-center space-x-2">
                            <ProductSpriteIcon 
                              productId={mapping.matchedIllustration.id} 
                              size="sm" 
                              showTooltip={true} 
                            />
                            <span className="text-sm">{mapping.matchedIllustration.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Tidak ditemukan</span>
                        )}
                      </TableCell>
                      <TableCell>{getConfidenceBadge(mapping.confidence)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}