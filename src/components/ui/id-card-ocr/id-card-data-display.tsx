"use client";

import { useState } from "react";
import { IdCardData } from "@/types/id-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Edit2, Copy, CheckCircle } from 'lucide-react';

interface IdCardDataDisplayProps {
  data: IdCardData;
}

export function IdCardDataDisplay({ data }: IdCardDataDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<IdCardData>(data);
  const [copied, setCopied] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleChange = (field: keyof IdCardData, value: string) => {
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const copyToClipboard = () => {
    const textToCopy = Object.entries(editedData)
      .filter(([, value]) => value) // Filter out empty values
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const displayData = isEditing ? editedData : data;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={isEditing ? handleSave : handleEdit}
        >
          {isEditing ? "Save Changes" : (
            <>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={copyToClipboard}
          className="flex items-center gap-2"
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy All
            </>
          )}
        </Button>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          {isEditing ? (
            <Input
              id="fullName"
              value={displayData.fullName || ''}
              onChange={(e) => handleChange('fullName', e.target.value)}
            />
          ) : (
            <div className="p-2 border rounded-md bg-gray-50">{displayData.fullName || 'Not detected'}</div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="idNumber">ID Number</Label>
          {isEditing ? (
            <Input
              id="idNumber"
              value={displayData.idNumber || ''}
              onChange={(e) => handleChange('idNumber', e.target.value)}
            />
          ) : (
            <div className="p-2 border rounded-md bg-gray-50">{displayData.idNumber || 'Not detected'}</div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          {isEditing ? (
            <Input
              id="dateOfBirth"
              value={displayData.dateOfBirth || ''}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            />
          ) : (
            <div className="p-2 border rounded-md bg-gray-50">{displayData.dateOfBirth || 'Not detected'}</div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiryDate">Expiry Date</Label>
          {isEditing ? (
            <Input
              id="expiryDate"
              value={displayData.expiryDate || ''}
              onChange={(e) => handleChange('expiryDate', e.target.value)}
            />
          ) : (
            <div className="p-2 border rounded-md bg-gray-50">{displayData.expiryDate || 'Not detected'}</div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="issueDate">Issue Date</Label>
          {isEditing ? (
            <Input
              id="issueDate"
              value={displayData.issueDate || ''}
              onChange={(e) => handleChange('issueDate', e.target.value)}
            />
          ) : (
            <div className="p-2 border rounded-md bg-gray-50">{displayData.issueDate || 'Not detected'}</div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          {isEditing ? (
            <Input
              id="gender"
              value={displayData.gender || ''}
              onChange={(e) => handleChange('gender', e.target.value)}
            />
          ) : (
            <div className="p-2 border rounded-md bg-gray-50">{displayData.gender || 'Not detected'}</div>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Address</Label>
          {isEditing ? (
            <Textarea
              id="address"
              value={displayData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={3}
            />
          ) : (
            <div className="p-2 border rounded-md bg-gray-50 min-h-[80px]">{displayData.address || 'Not detected'}</div>
          )}
        </div>
      </Card>

      <div className="text-sm text-gray-500">
        <p>Note: OCR accuracy depends on image quality. You can edit any incorrectly extracted information.</p>
      </div>
    </div>
  );
}
