import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Phone } from "lucide-react";
import { toast } from '@/hooks/use-toast';

interface NotificationSettingsProps {
  phoneNumber?: string;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ phoneNumber = "" }) => {
  const [settings, setSettings] = useState({
    smsNotifications: true,
    pushNotifications: false,
    statusUpdates: true,
    readyAlert: true,
  });

  const handleChange = (setting: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSave = () => {
    // In a real app, you'd save these settings to your backend
    toast({
      title: "Settings Saved",
      description: "Your notification preferences have been updated",
    });
  };

  return (
    <Card className="w-full border-t-4 border-t-secondary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" /> Notification Settings
        </CardTitle>
        <CardDescription>Manage how you receive updates about your Qurban</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="font-medium">SMS Notifications</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {phoneNumber || "Your phone number"}
            </div>
          </div>
          <Switch
            checked={settings.smsNotifications}
            onCheckedChange={() => handleChange('smsNotifications')}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="font-medium">Push Notifications</div>
            <div className="text-sm text-muted-foreground">Receive alerts on this device</div>
          </div>
          <Switch
            checked={settings.pushNotifications}
            onCheckedChange={() => handleChange('pushNotifications')}
          />
        </div>
        
        <div className="pt-2 space-y-2">
          <h4 className="font-medium">What to notify me about:</h4>
          
          <div className="flex items-center justify-between pl-2">
            <div className="text-sm">Status updates</div>
            <Switch
              checked={settings.statusUpdates}
              onCheckedChange={() => handleChange('statusUpdates')}
            />
          </div>
          
          <div className="flex items-center justify-between pl-2">
            <div className="text-sm">When my meat is ready</div>
            <Switch
              checked={settings.readyAlert}
              onCheckedChange={() => handleChange('readyAlert')}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} className="w-full bg-secondary hover:bg-secondary/90">
          Save Preferences
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NotificationSettings;
