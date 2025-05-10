import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, User } from "lucide-react";
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface AuthFormProps {
  onAuthenticate: (userId: string) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onAuthenticate }) => {
  const [phoneTab, setPhoneTab] = useState({
    phoneNumber: '',
    otp: '',
    otpSent: false,
  });
  
  const [idTab, setIdTab] = useState({
    qurbanId: '',
  });
  
  const [activeTab, setActiveTab] = useState('phone');
  
  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneTab.phoneNumber || phoneTab.phoneNumber.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }
    
    // In a real app, you'd call an API to send OTP
    toast({
      title: "OTP Sent",
      description: "Please check your phone for the verification code",
    });
    
    setPhoneTab(prev => ({ ...prev, otpSent: true }));
  };
  
  const handlePhoneLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneTab.otp) {
      toast({
        title: "OTP Required",
        description: "Please enter the verification code",
        variant: "destructive"
      });
      return;
    }
    
    // In a real app, you'd verify the OTP with an API
    // For demo purposes, any 6-digit code is accepted
    if (phoneTab.otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit verification code",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Login Successful",
      description: "Welcome to Qurban Tracker!",
    });
    
    // Pass a dummy user ID for now (in a real app, this would come from your backend)
    onAuthenticate("user_" + phoneTab.phoneNumber.substring(phoneTab.phoneNumber.length - 4));
  };
  
  const handleIdLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idTab.qurbanId) {
      toast({
        title: "Qurban ID Required",
        description: "Please enter your Qurban ID",
        variant: "destructive"
      });
      return;
    }
    
    // In a real app, you'd verify the Qurban ID with an API
    toast({
      title: "Login Successful",
      description: "Welcome to Qurban Tracker!",
    });
    
    // Pass the Qurban ID as the user ID
    onAuthenticate(idTab.qurbanId);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-t-4 border-t-qurban-primary">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Qurban Tracker</CardTitle>
        <CardDescription className="text-center">
          Track the status of your Qurban sacrifice
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="phone" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="phone" className="flex items-center gap-1">
              <Phone className="h-4 w-4" /> Phone
            </TabsTrigger>
            <TabsTrigger value="id" className="flex items-center gap-1">
              <User className="h-4 w-4" /> Qurban ID
            </TabsTrigger>
          </TabsList>
          <TabsContent value="phone">
            <form onSubmit={phoneTab.otpSent ? handlePhoneLogin : handleSendOTP}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      className={cn(
                        "pl-10",
                        phoneTab.otpSent ? "bg-muted" : ""
                      )}
                      value={phoneTab.phoneNumber}
                      onChange={(e) => setPhoneTab(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      disabled={phoneTab.otpSent}
                    />
                  </div>
                </div>

                {phoneTab.otpSent && (
                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium mb-1">
                      Verification Code
                    </label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      value={phoneTab.otp}
                      onChange={(e) => setPhoneTab(prev => ({ ...prev, otp: e.target.value.replace(/[^0-9]/g, '') }))}
                      className="text-center tracking-wider text-lg"
                      autoFocus
                    />
                  </div>
                )}

                <Button type="submit" className="w-full bg-qurban-primary hover:bg-qurban-primary/90">
                  {phoneTab.otpSent ? "Verify & Login" : "Get Verification Code"}
                </Button>

                {phoneTab.otpSent && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full mt-2"
                    onClick={() => setPhoneTab(prev => ({ ...prev, otpSent: false }))}
                  >
                    Change Phone Number
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>

          <TabsContent value="id">
            <form onSubmit={handleIdLogin}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="qurban-id" className="block text-sm font-medium mb-1">
                    Qurban ID
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                    <Input
                      id="qurban-id"
                      placeholder="Enter your Qurban ID"
                      className="pl-10"
                      value={idTab.qurbanId}
                      onChange={(e) => setIdTab(prev => ({ ...prev, qurbanId: e.target.value }))}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-qurban-primary hover:bg-qurban-primary/90">
                  Track Your Qurban
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center text-xs text-muted-foreground">
        Contact your Qurban administrator if you need assistance
      </CardFooter>
    </Card>
  );
};

export default AuthForm;
