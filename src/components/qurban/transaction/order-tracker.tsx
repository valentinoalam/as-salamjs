'use client'
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  CircleAlert,
  Clock,
  Loader,
  Search,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Order, useOrder } from "@/contexts/order-context";

const OrderTracker: React.FC = () => {
  const { orders } = useOrder();
  const [trackingId, setTrackingId] = React.useState("");
  const [searchPerformed, setSearchPerformed] = React.useState(false);
  const [foundOrder, setFoundOrder] = React.useState<Order | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const order = orders.find((o) => o.id === trackingId);
    setFoundOrder(order || null);
    setSearchPerformed(true);
  };

  const statusSteps = [
    { key: "pending", label: "Order Received" },
    { key: "payment-confirmed", label: "Payment Confirmed" },
    { key: "animal-assigned", label: "Animal Assigned" },
    { key: "scheduled", label: "Sacrifice Scheduled" },
    { key: "slaughtered", label: "Animal Sacrificed" },
    { key: "processed", label: "Meat Processed" },
    { key: "distributed", label: "Meat Distributed" },
    { key: "completed", label: "Completed" },
  ];

  const getStatusIndex = (status: string) => {
    return statusSteps.findIndex((step) => step.key === status);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "payment-confirmed":
      case "animal-assigned":
      case "scheduled":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-500">
            <Loader className="w-3 h-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      case "slaughtered":
      case "processed":
      case "distributed":
        return (
          <Badge variant="outline" className="border-green-500 text-green-500">
            <Loader className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="border-green-600 text-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <CircleAlert className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium mb-4">Track Your Qurbani</h3>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter your order ID (e.g., ord-001)"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className="pl-8"
              required
            />
          </div>
          <Button type="submit">Track</Button>
        </form>

        {searchPerformed && !foundOrder && (
          <div className="mt-6 text-center p-8">
            <CircleAlert className="mx-auto h-12 w-12 text-amber-500 mb-2" />
            <h4 className="text-lg font-medium">Order Not Found</h4>
            <p className="text-muted-foreground">
              The order ID you entered doesn&apos;t exist in our system. Please check
              and try again.
            </p>
          </div>
        )}

        {foundOrder && (
          <div className="mt-6">
            <div className="bg-qurbani-light p-4 rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-medium">Order #{foundOrder.id}</h4>
                  <p className="text-sm text-muted-foreground">
                    Placed on{" "}
                    {format(new Date(foundOrder.createdAt), "MMMM d, yyyy")}
                  </p>
                </div>
                <div>{renderStatusBadge(foundOrder.status)}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground">
                    Qurbani Details
                  </h5>
                  <p className="font-medium capitalize">
                    {foundOrder.animalType}
                    {foundOrder.quantity !== 1 &&
                      ` (${
                        foundOrder.quantity < 1
                          ? `${foundOrder.quantity * 100}% share`
                          : `x${foundOrder.quantity}`
                      })`}
                  </p>
                  <p className="text-sm">
                    On behalf of:{" "}
                    {foundOrder.onBehalfOf.map((name, i) => (
                      <span key={i} className="font-medium">
                        {name}
                        {i < foundOrder.onBehalfOf.length - 1 && ", "}
                      </span>
                    ))}
                  </p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground">
                    Amount
                  </h5>
                  <p className="font-medium">${foundOrder.totalAmount.toFixed(2)}</p>
                  <p className="text-sm">Payment status: Confirmed</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Progress tracker */}
              <div className="space-y-6">
                <h5 className="font-medium">Tracking Progress</h5>

                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute left-4 top-5 h-full w-0.5 bg-gray-200"></div>

                  {/* Progress Steps */}
                  <div className="space-y-8">
                    {statusSteps.map((step, index) => {
                      const currentStepIndex = getStatusIndex(foundOrder.status);
                      const isCompleted = index <= currentStepIndex;
                      const isActive = index === currentStepIndex;
                      const update = foundOrder.trackingUpdates.find(
                        (u) => u.status === step.key
                      );

                      return (
                        <div
                          key={step.key}
                          className={`flex gap-4 pl-0 ${
                            isCompleted ? "" : "opacity-50"
                          }`}
                        >
                          <div className="relative z-10">
                            {isCompleted ? (
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                  isActive
                                    ? "bg-qurbani-green text-white ring-4 ring-qurbani-green/20"
                                    : "bg-qurbani-green text-white"
                                }`}
                              >
                                <CheckCircle className="h-5 w-5" />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-full border-2 border-gray-300 bg-white"></div>
                            )}
                          </div>

                          <div className="pt-1">
                            <h6
                              className={`font-medium ${
                                isActive ? "text-qurbani-green" : ""
                              }`}
                            >
                              {step.label}
                            </h6>
                            {update && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(update.timestamp), "MMM d, h:mm a")}
                                {update.notes && ` - ${update.notes}`}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracker;
