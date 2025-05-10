import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle2 } from "lucide-react";
import { QurbanStatus } from './qurban-tracker';
import { toast } from '@/hooks/use-toast';

interface AdminUpdateFormProps {
  onUpdateStatus: (id: string, status: QurbanStatus) => void;
}

const AdminUpdateForm: React.FC<AdminUpdateFormProps> = ({ onUpdateStatus }) => {
  const [qurbanId, setQurbanId] = useState('');
  const [searchResult, setSearchResult] = useState<{ id: string; name: string; status: QurbanStatus } | null>(null);
  const [newStatus, setNewStatus] = useState<QurbanStatus | ''>('');
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!qurbanId) {
      toast({
        title: "Search Error",
        description: "Please enter a Qurban ID to search",
        variant: "destructive"
      });
      return;
    }
    
    // In a real app, this would be an API call to find the Qurban record
    // For demo purposes, we'll simulate finding a record
    setSearchResult({
      id: qurbanId,
      name: "John Doe", // This would come from your database
      status: "scheduled" // This would come from your database
    });
  };
  
  const handleUpdate = () => {
    if (!searchResult || !newStatus) {
      toast({
        title: "Update Error",
        description: "Please select a new status",
        variant: "destructive"
      });
      return;
    }
    
    // In a real app, this would call an API to update the status
    onUpdateStatus(searchResult.id, newStatus as QurbanStatus);
    
    toast({
      title: "Status Updated",
      description: `Qurban ID ${searchResult.id} status updated to ${newStatus}`,
    });
    
    // Update the local search result with the new status
    setSearchResult(prev => prev ? { ...prev, status: newStatus as QurbanStatus } : null);
    setNewStatus('');
  };
  
  return (
    <Card className="w-full border-t-4 border-t-qurban-primary">
      <CardHeader>
        <CardTitle>Admin Control Panel</CardTitle>
        <CardDescription>Update the status of Qurban sacrifices</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input 
              placeholder="Enter Qurban ID" 
              className="pl-10"
              value={qurbanId}
              onChange={(e) => setQurbanId(e.target.value)}
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
        
        {searchResult && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">{searchResult.name}</h3>
                <p className="text-sm text-muted-foreground">ID: {searchResult.id}</p>
              </div>
              <div className="text-sm">
                Current Status: 
                <span className="ml-1 font-semibold">{searchResult.status}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm">Update Status:</label>
              <div className="flex gap-2">
                <Select value={newStatus} onValueChange={()=>setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled for Slaughter</SelectItem>
                    <SelectItem value="slaughtered">Slaughtered</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="ready">Ready for Pickup</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleUpdate} 
                  disabled={!newStatus}
                  className="flex items-center gap-1"
                >
                  <CheckCircle2 className="h-4 w-4" /> Update
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center text-xs text-muted-foreground">
        Only authorized Qurban administrators can update status
      </CardFooter>
    </Card>
  );
};

export default AdminUpdateForm;
