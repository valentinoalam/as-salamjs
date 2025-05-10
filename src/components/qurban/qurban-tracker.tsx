import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Scissors, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export type QurbanStatus = 
  | "scheduled" 
  | "slaughtered" 
  | "processing" 
  | "ready";

interface QurbanDetails {
  id: string;
  userName: string;
  animalType: string;
  status: QurbanStatus;
  scheduledTime?: string;
  slaughteredTime?: string;
  processingTime?: string;
  readyTime?: string;
  estimatedReadyTime?: string;
}

interface QurbanTrackerProps {
  qurbanDetails: QurbanDetails;
}

export const statusMap = {
  scheduled: { 
    label: "Scheduled for Slaughter", 
    icon: Clock,
    color: "bg-secondary",
    description: "Your animal has been scheduled for slaughter"
  },
  slaughtered: { 
    label: "Slaughtered", 
    icon: Scissors,
    color: "bg-qurban-accent",
    description: "Your animal has been slaughtered according to Islamic requirements"
  },
  processing: { 
    label: "Meat Processing", 
    icon: Package,
    color: "bg-qurban-primary/80",
    description: "Your meat is being processed, cut and packaged"
  },
  ready: { 
    label: "Ready for Pickup", 
    icon: CheckCircle,
    color: "bg-qurban-primary",
    description: "Your meat is ready for pickup or delivery"
  }
};

const QurbanTracker: React.FC<QurbanTrackerProps> = ({ qurbanDetails }) => {
  const currentStatusIndex = 
    qurbanDetails.status === "ready" ? 3 :
    qurbanDetails.status === "processing" ? 2 :
    qurbanDetails.status === "slaughtered" ? 1 : 0;
  
  const statuses: QurbanStatus[] = ["scheduled", "slaughtered", "processing", "ready"];
  
  return (
    <Card className="w-full border-t-4 border-t-qurban-primary">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Qurban Status</CardTitle>
            <CardDescription>ID: {qurbanDetails.id}</CardDescription>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-white",
              statusMap[qurbanDetails.status].color
            )}
          >
            {statusMap[qurbanDetails.status].label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="text-sm space-y-2">
          <p><span className="font-semibold">Participant:</span> {qurbanDetails.userName}</p>
          <p><span className="font-semibold">Animal Type:</span> {qurbanDetails.animalType}</p>
          {qurbanDetails.estimatedReadyTime && qurbanDetails.status !== "ready" && (
            <p><span className="font-semibold">Estimated Completion:</span> {qurbanDetails.estimatedReadyTime}</p>
          )}
        </div>
        
        <div className="status-timeline flex items-center justify-between">
          {statuses.map((status, index) => {
            const StatusIcon = statusMap[status].icon;
            const isCompleted = index < currentStatusIndex;
            const isActive = index === currentStatusIndex;
            // const isPending = index > currentStatusIndex;
            
            return (
              <React.Fragment key={status}>
                <div className="flex flex-col items-center gap-2">
                  <div 
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center relative",
                      isCompleted ? "completed" : isActive ? "active" : "pending"
                    )}
                  >
                    <StatusIcon className={cn(
                      "h-5 w-5",
                      isActive && qurbanDetails.status !== "scheduled" && "animate-status-pulse"
                    )} />
                    
                    {/* Time indicator below icon */}
                    <div className="absolute -bottom-7 text-xs font-medium whitespace-nowrap">
                      {status === "scheduled" && qurbanDetails.scheduledTime ? qurbanDetails.scheduledTime : ""}
                      {status === "slaughtered" && qurbanDetails.slaughteredTime ? qurbanDetails.slaughteredTime : ""}
                      {status === "processing" && qurbanDetails.processingTime ? qurbanDetails.processingTime : ""}
                      {status === "ready" && qurbanDetails.readyTime ? qurbanDetails.readyTime : ""}
                    </div>
                  </div>
                  
                  <p className="text-xs text-center mt-6">{statusMap[status].label}</p>
                </div>
                
                {index < statuses.length - 1 && (
                  <div className="line"></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        <div className="bg-muted p-4 rounded-lg text-sm">
          <p className="font-medium">Current Status:</p>
          <p className="text-muted-foreground">{statusMap[qurbanDetails.status].description}</p>
          
          {qurbanDetails.status === "ready" && (
            <div className="mt-2 text-qurban-primary font-semibold">
              Please bring your QR code and ID when collecting your meat.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QurbanTracker;
