import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download } from "lucide-react";
import { toast } from '@/hooks/use-toast';

interface QRCodeCardProps {
  qurbanId: string;
}

const QRCodeCard: React.FC<QRCodeCardProps> = ({ qurbanId }) => {
  const handleDownload = () => {
    // In a real app, this would generate and download the QR code image
    toast({
      title: "QR Code Downloaded",
      description: "Your Qurban QR Code has been downloaded successfully"
    });
  };

  return (
    <Card className="w-full border-t-4 border-t-qurban-accent">
      <CardHeader>
        <CardTitle>Qurban QR Code</CardTitle>
        <CardDescription>Use this code for quick verification at the collection point</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {/* This is just a placeholder for the QR code - in a real app you'd use a QR code library */}
        <div className="w-48 h-48 border-2 border-dashed border-qurban-primary rounded-lg mb-4 flex items-center justify-center p-2">
          <div className="bg-white w-full h-full flex items-center justify-center">
            <QrCode size={120} className="text-qurban-primary" />
            <span className="sr-only">QR Code for Qurban ID: {qurbanId}</span>
          </div>
        </div>
        
        <div className="text-center mb-4">
          <p className="font-semibold">{qurbanId}</p>
          <p className="text-sm text-muted-foreground">Present this QR code when collecting your meat</p>
        </div>
        
        <Button 
          onClick={handleDownload} 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" /> Download QR Code
        </Button>
      </CardContent>
    </Card>
  );
};

export default QRCodeCard;
