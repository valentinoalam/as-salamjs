"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileImage, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IdCardData } from "@/types/id-card";
import { IdCardDataDisplay } from "@/components/ui/id-card-ocr/id-card-data-display";
import Image from "next/image";

interface File extends Blob {
    readonly lastModified: number;
    readonly name: string;
    readonly webkitRelativePath: string;
    readonly size: number;
    readonly type: string; // MIME type (e.g., "image/jpeg", "image/png")
    
    // Methods
    slice(start?: number, end?: number, contentType?: string): Blob;
    arrayBuffer(): Promise<ArrayBuffer>;
    text(): Promise<string>;
    stream(): ReadableStream;
}

export function IdCardScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idCardData, setIdCardData] = useState<IdCardData | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': [],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0];
        setFile(selectedFile as File);
        setError(null);
        setIdCardData(null);
        
        // Create preview
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreview(objectUrl);
      }
    },
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection.errors[0].code === 'file-too-large') {
        setError('File is too large. Maximum size is 5MB.');
      } else if (rejection.errors[0].code === 'file-invalid-type') {
        setError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      } else {
        setError('Error uploading file. Please try again.');
      }
    },
  });

  const processImage = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/ocr-extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process image');
      }

      const data = await response.json();
      setIdCardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIdCardData(null);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setIdCardData(null);
    
    // Revoke object URL to avoid memory leaks
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-2">
            <Upload className="h-10 w-10 text-gray-400" />
            <p className="text-lg font-medium">
              {isDragActive
                ? "Drop the ID card image here"
                : "Drag & drop an ID card image, or click to select"}
            </p>
            <p className="text-sm text-gray-500">
              Supports JPEG, PNG, WebP (max 5MB)
            </p>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Preview and Actions */}
      {preview && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Image Preview</h3>
            <div className="relative max-h-[300px] overflow-hidden rounded-md border border-gray-200">
              <Image fill
                src={preview || "/placeholder.svg"}
                alt="ID Card Preview"
                className="mx-auto max-h-[300px] object-contain"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={processImage}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileImage className="h-4 w-4" />
                    Extract Data
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={resetForm} disabled={loading}>
                Reset
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      {idCardData && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-medium">Extracted Data</h3>
            </div>
            <IdCardDataDisplay data={idCardData} />
          </div>
        </Card>
      )}
    </div>
  );
}