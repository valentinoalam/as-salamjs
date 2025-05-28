"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { BudgetManagement } from "@/components/settings/budget-management";
import { toast } from "@/hooks/use-toast";
import { Wallet, Bell, Download, DatabaseBackup } from "lucide-react";
import { set } from "date-fns";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    currency: "IDR",
    notifications: false,
    dailyReminder: false,
    autoBackup: false,
  });
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // In a real application, you would fetch settings from API
        // const response = await fetch('/api/settings');
        // if (response.ok) {
        //   const data = await response.json();
        //   setSettings(data);
        // }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    
    fetchSettings();
  }, []);
  
  const saveSettings = () => {
    // In a real application, you would send settings to API
    // fetch('/api/settings', {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(settings),
    // });
    
    toast({
      title: "Pengaturan disimpan",
      description: "Perubahan pengaturan berhasil disimpan.",
    });
  };
  
  const exportData = () => {
    // In a real application, you would generate and download data
    toast({
      title: "Data diekspor",
      description: "Data transaksi berhasil diekspor ke CSV.",
    });
  };
  
  const backupData = () => {
    // In a real application, you would create a backup
    toast({
      title: "Backup dibuat",
      description: "Backup data berhasil dibuat.",
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Kelola pengaturan aplikasi keuangan
        </p>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Pengaturan Umum
            </CardTitle>
            <CardDescription>
              Konfigurasi dasar aplikasi keuangan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="currency">Mata Uang</Label>
              <Input
                id="currency"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Format mata uang untuk menampilkan nilai nominal
              </p>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Notifikasi</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Aktifkan Notifikasi</Label>
                  <p className="text-sm text-muted-foreground">
                    Terima notifikasi terkait transaksi
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, notifications: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dailyReminder">Pengingat Harian</Label>
                  <p className="text-sm text-muted-foreground">
                    Pengingat untuk mencatat transaksi harian
                  </p>
                </div>
                <Switch
                  id="dailyReminder"
                  checked={settings.dailyReminder}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, dailyReminder: checked })
                  }
                  disabled={!settings.notifications}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <BudgetManagement />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Ekspor & Backup Data
            </CardTitle>
            <CardDescription>
              Ekspor data transaksi dan buat backup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-medium">Ekspor Data</h3>
                <p className="text-sm text-muted-foreground">
                  Ekspor data transaksi ke format CSV
                </p>
              </div>
              <Button onClick={exportData} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Ekspor CSV
              </Button>
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-medium">Backup Otomatis</h3>
                <p className="text-sm text-muted-foreground">
                  Buat backup data secara otomatis
                </p>
              </div>
              <Switch
                id="autoBackup"
                checked={settings.autoBackup}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, autoBackup: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-medium">Backup Manual</h3>
                <p className="text-sm text-muted-foreground">
                  Buat backup data secara manual
                </p>
              </div>
              <Button onClick={backupData} variant="outline">
                <DatabaseBackup className="mr-2 h-4 w-4" />
                Backup Sekarang
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end">
          <Button onClick={saveSettings}>Simpan Pengaturan</Button>
        </div>
      </div>
    </div>
  );
}